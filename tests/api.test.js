// tests/api.test.js — Pruebas de integración del servidor HTTP + base de datos.
// Levanta el servidor real en un puerto efímero y usa fetch contra /api/*.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Base de datos temporal para no tocar la real del usuario.
const TMP_DB = path.join(os.tmpdir(), 'neurowork-api-' + process.pid + '-' + Date.now() + '.db');
process.env.NEUROWORK_DB = TMP_DB;

const srv = require('../server/server.js');

let base = '';

test.before(async () => {
  await new Promise((resolve) => srv.server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + srv.server.address().port;
});

test.after(async () => {
  await new Promise((resolve) => srv.server.close(resolve));
  [TMP_DB, TMP_DB + '-journal', TMP_DB + '-wal', TMP_DB + '-shm'].forEach((f) => {
    try { fs.rmSync(f, { force: true }); } catch (e) { /* ignore */ }
  });
});

function demoState() {
  return {
    profile: { name: 'Prueba API', title: 'Tester', location: '', email: '', phone: '', summary: '',
      experience: [{ id: 'e1', role: 'Dev', company: 'Acme', period: '2024', desc: 'x' }], education: [] },
    skills: [{ id: 's1', name: 'JS', category: 'TI', level: 5 }],
    cv: { text: 'CV', role: '', updated: null, template: 'moderno' },
    interview: { vacancyNotes: '', vacancySkills: [], history: [], sessions: [], preparedAnswers: [], prepPlan: null },
    meetings: { history: [] }, checklist: [], goals: [], activity: [], snapshots: [],
    preferences: { modality: '', schedule: '', communication: '', pace: '', accommodations: '', notes: '' }
  };
}

test('PUT /api/state guarda y GET /api/state recupera el estado', async () => {
  const put = await fetch(base + '/api/state', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: 'local', state: demoState() })
  });
  assert.strictEqual(put.status, 200);
  assert.strictEqual((await put.json()).ok, true);

  const get = await fetch(base + '/api/state?workspaceId=local');
  assert.strictEqual(get.status, 200);
  const body = await get.json();
  assert.strictEqual(body.exists, true);
  assert.strictEqual(body.state.profile.name, 'Prueba API');
  assert.strictEqual(body.state.skills.length, 1);
  assert.strictEqual(body.state.profile.experience[0].company, 'Acme');
});

test('GET /api/state devuelve exists:false para un workspace sin datos', async () => {
  const get = await fetch(base + '/api/state?workspaceId=otro');
  const body = await get.json();
  assert.strictEqual(body.exists, false);
  assert.strictEqual(body.state, null);
});

test('GET /api/db informa el motor y el conteo de tablas', async () => {
  const res = await fetch(base + '/api/db');
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.engine, 'sqlite');
  assert.ok(body.tables && body.tables.workspace >= 1);
  assert.ok(Object.keys(body.tables).length >= 20);
});

test('PUT /api/state rechaza un cuerpo sin "state"', async () => {
  const res = await fetch(base + '/api/state', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: 'local' })
  });
  assert.strictEqual(res.status, 400);
});

test('DELETE /api/state borra el respaldo del workspace', async () => {
  const res = await fetch(base + '/api/state?workspaceId=local', { method: 'DELETE' });
  assert.strictEqual(res.status, 200);
  const get = await fetch(base + '/api/state?workspaceId=local');
  assert.strictEqual((await get.json()).exists, false);
});

test('POST /api/state devuelve 405 (método no permitido)', async () => {
  const res = await fetch(base + '/api/state', { method: 'POST', body: '{}' });
  assert.strictEqual(res.status, 405);
});

test('GET /api/health incluye información de la base de datos', async () => {
  const res = await fetch(base + '/api/health');
  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.db.engine, 'sqlite');
});
