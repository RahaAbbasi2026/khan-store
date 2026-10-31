const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { PrismaClient } = require('@prisma/client');
const { CartService } = require('../dist/src/cart/cart.service');
const { OrdersService } = require('../dist/src/orders/orders.service');
const { CaptchaService } = require('../dist/src/captcha/captcha.service');
const { RateLimitGuard } = require('../dist/src/security/rate-limit.guard');
const { ProductsService } = require('../dist/src/products/products.service');
const { ReviewsService } = require('../dist/src/reviews/reviews.service');
const { assertDelivery } = require('../dist/src/orders/delivery-policy');
const { decodeImage } = require('../dist/src/media/media-utils');
let db, server, prisma, carts, orders, product, customer, calls, localUrl;
const oldSecret = process.env.ADMIN_JWT_SECRET;
const nowDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
const dto = (cart) => ({ cartToken: cart.token, customerName: 'Test Customer', phone: '09123456789', address: 'Test Address', city: 'Test City', deliveryDate: nowDate(), deliverySlot: '۹ تا ۱۲' });
let payment;

before(async () => {
  process.env.ADMIN_JWT_SECRET = crypto.randomBytes(48).toString('hex');
  db = await PGlite.create();
  await db.exec(fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261022000000_baseline/migration.sql'), 'utf8'));
  await db.exec(`INSERT INTO "Category" ("id", "slug", "nameFa") VALUES ('preserved', 'preserved', 'Before migration')`);
  await db.exec(fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261022010000_security_state/migration.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261029000000_seo_fields/migration.sql'), 'utf8'));
  assert.equal((await db.query(`SELECT "nameFa" FROM "Category" WHERE "id"='preserved'`)).rows[0].nameFa, 'Before migration');
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 8 });
  await server.start();
  // Only a new local in-memory database is ever used, never DATABASE_URL.
  localUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&sslmode=disable`;
  prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
  await prisma.$connect();
});
beforeEach(async () => {
  await prisma.review.deleteMany(); await prisma.orderItem.deleteMany(); await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany(); await prisma.cart.deleteMany(); await prisma.product.deleteMany();
  await prisma.customer.deleteMany(); await prisma.captchaChallenge.deleteMany(); await prisma.rateLimitBucket.deleteMany();
  customer = await prisma.customer.create({ data: { name: 'Test', phone: '09123456789', passwordHash: 'unused' } });
  product = await prisma.product.create({ data: { slug: 'test-flower', nameFa: 'Test Flower', description: 'Test', priceToman: 1000, images: [], categoryId: 'preserved' } });
  calls = 0;
  payment = {
    requestPayment: async () => { calls++; return { authority: 'real-authority', paymentUrl: 'https://example.invalid/gateway' }; },
    paymentUrl: () => 'https://example.invalid/gateway',
    verifyPayment: async () => ({ verified: true, refId: '12345' }),
  };
  carts = new CartService(prisma); orders = new OrdersService(prisma, payment, {});
});
after(async () => {
  if (prisma) await prisma.$disconnect();
  if (server) await server.stop();
  if (db) await db.close();
  if (oldSecret === undefined) delete process.env.ADMIN_JWT_SECRET; else process.env.ADMIN_JWT_SECRET = oldSecret;
});
async function filled() { const cart = await carts.createCart(); return carts.addItem(cart.token, product.id, 2); }

test('baseline plus additive migration preserve existing records and introduce durable security tables', async () => {
  assert.equal((await prisma.category.findUnique({ where: { id: 'preserved' } })).nameFa, 'Before migration');
  assert.equal(await prisma.captchaChallenge.count(), 0);
  assert.equal(await prisma.rateLimitBucket.count(), 0);
});

test('CAPTCHA has unique tokens, expires, and can be consumed only once across service instances', async () => {
  const first = new CaptchaService(prisma), second = new CaptchaService(prisma);
  const a = await first.generate(), b = await first.generate();
  assert.notEqual(a.token, b.token);
  const answer = a.question.match(/\d+/g).map(Number).reduce((x, y) => x + y);
  const results = await Promise.all([first.verify(a.token, answer), second.verify(a.token, answer)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await second.verify(a.token, answer), false);
  const id = crypto.createHash('sha256').update(b.token).digest('hex');
  await prisma.captchaChallenge.update({ where: { id }, data: { expiresAt: new Date(0) } });
  assert.equal(await first.verify(b.token, 1), false);
});

test('an incorrect CAPTCHA answer consumes the challenge', async () => {
  const captcha = new CaptchaService(prisma); const challenge = await captcha.generate();
  const answer = challenge.question.match(/\d+/g).map(Number).reduce((a, b) => a + b);
  assert.equal(await captcha.verify(challenge.token, 999), false);
  assert.equal(await captcha.verify(challenge.token, answer), false);
});

test('rate limits share counters between server instances and return Retry-After', async () => {
  const a = new RateLimitGuard(prisma), b = new RateLimitGuard(prisma); let retry;
  const ctx = { switchToHttp: () => ({ getRequest: () => ({ path: '/admin/auth/login', method: 'POST', ip: '127.0.0.1', body: {} }), getResponse: () => ({ setHeader: (key, value) => { if (key === 'Retry-After') retry = value; } }) }) };
  for (let i = 0; i < 10; i++) assert.equal(await (i % 2 ? a : b).canActivate(ctx), true);
  await assert.rejects(a.canActivate(ctx), { status: 429 }); assert(Number(retry) > 0);
});

test('concurrent increments retain all quantities and cart versions', async () => {
  const cart = await carts.createCart();
  await Promise.all(Array.from({ length: 5 }, () => carts.addItem(cart.token, product.id, 1)));
  const current = await carts.getByToken(cart.token);
  assert.equal(current.items.length, 1); assert.equal(current.items[0].quantity, 5); assert.equal(current.revision, 5);
});

test('unavailable products and out-of-range quantities are rejected without changing the cart', async () => {
  const cart = await filled();
  await prisma.product.update({ where: { id: product.id }, data: { stockStatus: 'OUT_OF_STOCK' } });
  await assert.rejects(carts.addItem(cart.token, product.id, 1), { status: 400 });
  await assert.rejects(carts.updateItem(cart.token, cart.items[0].id, { quantity: 4 }), { status: 400 });
  await assert.rejects(orders.createOrder(dto(cart), customer.id), { status: 400 });
  await assert.rejects(carts.addItem(cart.token, product.id, 100), { status: 400 });
  assert.equal((await carts.getByToken(cart.token)).items[0].quantity, 2); assert.equal(calls, 0);
});

test('concurrent checkout of one snapshot creates one order and one bank request', async () => {
  const cart = await filled();
  const results = await Promise.allSettled([orders.createOrder(dto(cart), customer.id), orders.createOrder(dto(cart), customer.id)]);
  assert(results.some((r) => r.status === 'fulfilled'));
  for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.status, 409);
  assert.equal(await prisma.order.count(), 1); assert.equal(calls, 1);
  assert.equal((await carts.getByToken(cart.token)).items.length, 1);
});

test('bank request failure preserves both pending order and cart, and owner can retry', async () => {
  const cart = await filled(); payment.requestPayment = async () => { throw new Error('offline'); };
  await assert.rejects(orders.createOrder(dto(cart), customer.id), /offline/);
  assert.equal((await carts.getByToken(cart.token)).items[0].quantity, 2);
  const order = await prisma.order.findFirst();
  assert.equal(order.status, 'PENDING_PAYMENT'); assert.equal(order.paymentRequestStartedAt, null);
  payment.requestPayment = async () => ({ authority: 'real-authority', paymentUrl: 'https://example.invalid/gateway' });
  await assert.rejects(orders.retryPayment(order.orderNumber, 'someone-else'), { status: 404 });
  assert.equal((await orders.retryPayment(order.orderNumber, customer.id)).order.id, order.id);
  assert.equal(await prisma.order.count(), 1);
});

test('failed callbacks keep the cart; successful repeated callbacks clear its unchanged snapshot only once', async () => {
  const cart = await filled(); const { order } = await orders.createOrder(dto(cart), customer.id);
  await orders.handlePaymentCallback(order.orderNumber, 'real-authority', 'NOK');
  assert.equal((await carts.getByToken(cart.token)).items.length, 1);
  await orders.handlePaymentCallback(order.orderNumber, 'real-authority', 'OK');
  await orders.handlePaymentCallback(order.orderNumber, 'real-authority', 'NOK');
  assert.equal((await carts.getByToken(cart.token)).items.length, 0);
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PROCESSING');
});

test('payment does not clear a cart edited after checkout', async () => {
  const cart = await filled(); const { order } = await orders.createOrder(dto(cart), customer.id);
  await carts.addItem(cart.token, product.id, 1);
  await orders.handlePaymentCallback(order.orderNumber, 'real-authority', 'OK');
  assert.equal((await carts.getByToken(cart.token)).items[0].quantity, 3);
});

test('catalog pages are bounded, counted independently and never embed base64 images', async () => {
  await prisma.product.update({ where: { id: product.id }, data: { images: ['data:image/png;base64,AAAA'] } });
  const products = new ProductsService(prisma);
  const page = await products.findAll({ page: 1, limit: 1 });
  assert.equal(page.count, 1); assert.equal(page.products.length, 1);
  assert(page.products[0].images[0].includes('/media/products/'));
  assert(!JSON.stringify(page).includes('base64'));
  assert.equal((await products.findAll({ page: 2, limit: 1 })).products.length, 0);
});

test('delivery policy rejects invalid dates, past dates, excessive future dates and arbitrary slots', () => {
  for (const [date, slot] of [['2020-01-01', '۹ تا ۱۲'], ['2099-01-01', '۹ تا ۱۲'], ['2026-02-30', '۹ تا ۱۲'], [nowDate(), 'anything']]) {
    assert.throws(() => assertDelivery(date, slot), { status: 400 });
  }
  assert.doesNotThrow(() => assertDelivery(nowDate(), '۹ تا ۱۲'));
});

test('media rejects SVG and mismatched image data instead of serving executable content', () => {
  assert.throws(() => decodeImage('data:image/svg+xml;base64,PHN2Zy8+'), { status: 400 });
  assert.throws(() => decodeImage('data:image/png;base64,AAAA'), { status: 400 });
});

test('an invalid high-value cart write rolls back the item and revision together', async () => {
  const cart = await carts.createCart();
  await prisma.product.update({ where: { id: product.id }, data: { priceToman: 100000000 } });
  await assert.rejects(carts.addItem(cart.token, product.id, 99), { status: 400 });
  const current = await carts.getByToken(cart.token);
  assert.equal(current.items.length, 0); assert.equal(current.revision, 0);
});

test('payment record and cart clearing roll back together if clearing fails', async () => {
  const cart = await filled(); const { order } = await orders.createOrder(dto(cart), customer.id);
  const failing = new Proxy(prisma, { get(target, key) {
    if (key !== '$transaction') return target[key];
    return (action) => target.$transaction((tx) => action(new Proxy(tx, { get(value, field) {
      if (field !== 'cartItem') return value[field];
      return { ...value.cartItem, deleteMany: async () => { throw new Error('simulated clear failure'); } };
    } })));
  } });
  await assert.rejects(new OrdersService(failing, payment, {}).handlePaymentCallback(order.orderNumber, 'real-authority', 'OK'), /simulated/);
  assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).status, 'PENDING_PAYMENT');
  assert.equal((await carts.getByToken(cart.token)).items.length, 1);
  await orders.handlePaymentCallback(order.orderNumber, 'real-authority', 'OK');
  assert.equal((await carts.getByToken(cart.token)).items.length, 0);
});

test('startup scripts never alter a database and production entry point exists after build', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.scripts.start, 'node dist/src/main.js');
  assert.equal(pkg.scripts['start:prod'], pkg.scripts.start);
  assert(!/prisma|db push|accept-data-loss/.test(pkg.scripts.start));
  assert(fs.existsSync(path.join(__dirname, '../dist/src/main.js')));
});

test('actual production entry boots with new modules, enforces login and serves single-use CAPTCHAs over HTTP', async () => {
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ['dist/src/main.js'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: localUrl, PORT: String(port), NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = ''; child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (child.exitCode !== null) throw new Error(output);
      try { ready = (await fetch(`${base}/categories`)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert(ready, output);
    assert.equal((await fetch(`${base}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    assert.equal((await fetch(`${base}/orders/KHAN-NUMBER-ONLY`)).status, 401);
    const challenge = await (await fetch(`${base}/captcha`)).json();
    const answer = challenge.question.match(/\d+/g).map(Number).reduce((a, b) => a + b);
    const login = () => fetch(`${base}/customers/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      phone: customer.phone, password: 'wrong-password', captchaToken: challenge.token, captchaAnswer: answer,
    }) });
    assert.equal((await login()).status, 401);
    assert.equal((await login()).status, 400);
    const invalidImage = await fetch(`${base}/media/products/${product.id}/9`);
    assert.equal(invalidImage.status, 404);
  } finally {
    if (child.exitCode === null) { const closed = once(child, 'exit'); child.kill(); await closed; }
  }
});
