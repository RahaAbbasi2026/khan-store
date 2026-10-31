const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

test('verified baseline plus migrate deploy upgrades an existing database without deleting its data', { timeout: 120000 }, async () => {
  const db = await PGlite.create(); let server;
  try {
    await db.exec(fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261022000000_baseline/migration.sql'), 'utf8'));
    await db.exec(`INSERT INTO "Category" ("id", "slug", "nameFa") VALUES ('kept', 'kept', 'Keep existing data')`);
    const reservation = net.createServer();
    await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port; await new Promise((resolve) => reservation.close(resolve));
    server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 8 }); await server.start();
    const env = { ...process.env, DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable&statement_cache_size=0` };
    async function command(args) {
      const child = spawn(process.execPath, args, { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = ''; child.stdout.on('data', (data) => { output += data; }); child.stderr.on('data', (data) => { output += data; });
      const code = await new Promise((resolve) => child.on('exit', resolve)); assert.equal(code, 0, output); return output;
    }
    await command(['scripts/baseline.cjs']);
    await command(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
    assert.equal((await db.query(`SELECT "nameFa" FROM "Category" WHERE "id"='kept'`)).rows[0].nameFa, 'Keep existing data');
    const history = (await db.query(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name`)).rows;
    assert.equal(history.length, 3);
    assert((await command(['scripts/baseline.cjs'])).includes('already recorded'));
    assert.equal((await db.query(`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name='Order' AND column_name='checkoutKey'`)).rows[0].count, 1);
  } finally { if (server) await server.stop(); await db.close(); }
});
