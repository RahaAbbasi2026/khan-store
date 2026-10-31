const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { PrismaClient } = require('@prisma/client');
const { ProductsService } = require('../dist/src/products/products.service');
const { ArticlesService } = require('../dist/src/articles/articles.service');
const { SeoService } = require('../dist/src/seo/seo.service');
let db, server, prisma, localUrl, products, articles, seo;

async function startDb() {
  const database = await PGlite.create();
  const dir = path.join(__dirname, '../prisma/migrations');
  for (const name of fs.readdirSync(dir).filter((n) => /^\d/.test(n)).sort()) {
    await database.exec(fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8'));
  }
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const socket = new PGLiteSocketServer({ db: database, port, host: '127.0.0.1', maxConnections: 8 });
  await socket.start();
  // Only a new local in-memory database is ever used, never DATABASE_URL.
  return { database, socket, url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&sslmode=disable` };
}

before(async () => {
  ({ database: db, socket: server, url: localUrl } = await startDb());
  await db.exec(`INSERT INTO "Category" ("id", "slug", "nameFa") VALUES ('c1', 'plants', 'گیاهان')`);
  prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
  await prisma.$connect();
  products = new ProductsService(prisma); articles = new ArticlesService(prisma); seo = new SeoService(prisma);
});
beforeEach(async () => {
  await prisma.slugRedirect.deleteMany(); await prisma.product.deleteMany(); await prisma.article.deleteMany();
});
after(async () => {
  if (prisma) await prisma.$disconnect();
  if (server) await server.stop();
  if (db) await db.close();
});
const productData = (slug, extra = {}) => ({ slug, nameFa: 'مونسترا', description: 'متن', priceToman: 1000, images: [], categoryId: 'c1', ...extra });

test('versioned migrations produce exactly the Prisma schema', { timeout: 60000 }, async () => {
  const { database, socket, url } = await startDb();
  try {
    const child = spawn(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-url', `${url}&statement_cache_size=0`,
      '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], { cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url } });
    let output = ''; child.stdout.on('data', (d) => { output += d; }); child.stderr.on('data', (d) => { output += d; });
    assert.equal(await new Promise((resolve) => child.on('exit', resolve)), 0, output);
  } finally { await socket.stop(); await database.close(); }
});

test('SEO overrides are trimmed, empty ones cleared and invalid canonical URLs rejected', async () => {
  const p = await products.create(productData('monstera', { seoTitle: '  خرید مونسترا  ', canonicalUrl: '', noindex: true }));
  assert.equal(p.seoTitle, 'خرید مونسترا');
  assert.equal(p.canonicalUrl, null);
  assert.equal(p.noindex, true);
  const cleared = await products.update(p.id, { seoTitle: '' });
  assert.equal(cleared.seoTitle, null);
  for (const bad of ['//evil.example/x', 'http://example.com/x', 'javascript:alert(1)', 'https://u:p@example.com/', '/a b']) {
    await assert.rejects(products.update(p.id, { canonicalUrl: bad }), /canonical/);
  }
  assert.equal((await products.update(p.id, { canonicalUrl: '/product/other' })).canonicalUrl, '/product/other');
  await assert.rejects(products.update(p.id, { ogImage: 'http://insecure.example/a.jpg' }));
});

test('renaming a product keeps every old slug as a redirect to the current one', async () => {
  const p = await products.create(productData('old-name'));
  await products.update(p.id, { slug: 'middle-name' });
  await products.update(p.id, { slug: 'new-name' });
  assert.equal(await seo.resolveRedirect('product', 'old-name'), 'new-name');
  assert.equal(await seo.resolveRedirect('product', 'middle-name'), 'new-name');
  assert.equal(await seo.resolveRedirect('product', 'new-name'), null);

  // Renaming back to an old slug frees it, and a new product may reuse a retired slug.
  await products.update(p.id, { slug: 'old-name' });
  assert.equal(await seo.resolveRedirect('product', 'old-name'), null);
  assert.equal(await seo.resolveRedirect('product', 'new-name'), 'old-name');
  const other = await products.create(productData('new-name'));
  assert.equal(await seo.resolveRedirect('product', 'new-name'), null);
  await assert.rejects(products.update(other.id, { slug: 'old-name' }), /اسلاگ/);

  await products.remove(p.id);
  assert.equal(await prisma.slugRedirect.count({ where: { targetId: p.id } }), 0);
});

test('article redirects are kept only after publication and never reveal drafts', async () => {
  const draft = await articles.create({ slug: 'draft-a', title: 'پیش‌نویس', excerpt: 'خلاصه', content: 'متن کامل مقاله' });
  await articles.update(draft.id, { slug: 'draft-b' });
  assert.equal(await prisma.slugRedirect.count(), 0);

  const live = await articles.create({ slug: 'live-a', title: 'منتشرشده', excerpt: 'خلاصه', content: 'متن کامل مقاله', status: 'PUBLISHED' });
  await articles.update(live.id, { slug: 'live-b' });
  assert.equal(await seo.resolveRedirect('article', 'live-a'), 'live-b');
  await articles.update(live.id, { status: 'DRAFT' });
  assert.equal(await seo.resolveRedirect('article', 'live-a'), null);
});

test('duplicate titles and descriptions are found across products and articles', async () => {
  const p = await products.create(productData('a', { seoTitle: 'راهنمای نگهداری كاكتوس' }));
  const a = await articles.create({ slug: 'b', title: 'عنوان دیگر', excerpt: 'توضیح مشترک', content: 'متن کامل مقاله' });
  const found = await seo.findDuplicates({ title: 'راهنمای  نگهداری کاکتوس', description: 'توضیح مشترک' });
  assert.deepEqual(found.title.map((d) => d.id), [p.id]);
  assert.deepEqual(found.description.map((d) => d.id), [a.id]);
  const excluded = await seo.findDuplicates({ title: 'راهنمای نگهداری کاکتوس', excludeType: 'product', excludeId: p.id });
  assert.equal(excluded.title.length, 0);
});

test('public product response exposes SEO fields but never an inline OG image', async () => {
  const png = 'data:image/png;base64,' + Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16)]).toString('base64');
  await products.create(productData('with-og', { ogImage: png, seoDescription: 'توضیح' }));
  const p = await products.findBySlug('with-og');
  assert.match(p.ogImage, /\/media\/products\/.+\/og$/);
  assert.equal(p.seoDescription, 'توضیح');
  const list = await products.findAll({ page: 1, limit: 12 });
  assert.equal(list.products[0].noindex, false);
});
