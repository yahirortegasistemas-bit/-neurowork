// tests/db.test.js — Pruebas de la capa de persistencia relacional (SQLite).
// Ejecutar:  node --test
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const db = require('../server/db.js');

// Estado de ejemplo con TODAS las colecciones del sistema.
function sampleState() {
  return {
    profile: {
      name: 'Ana Torres', title: 'Técnica en soporte', location: 'Tijuana',
      email: 'ana@example.com', phone: '+52 664 000 0000', summary: 'Resumen breve.',
      experience: [
        { id: 'e1', role: 'Auxiliar', company: 'Empresa A', period: '2022 - 2024', desc: 'Atención a clientes.' }
      ],
      education: [
        { id: 'd1', degree: 'Bachillerato', school: 'CBTIS 146', period: '2019 - 2021' }
      ]
    },
    skills: [
      { id: 's1', name: 'Excel', category: 'Ofimática', level: 4 },
      { id: 's2', name: 'Redes', category: 'TI', level: 3 }
    ],
    cv: { text: 'CV de prueba', role: 'Soporte', updated: '2026-11-01T10:00:00.000Z', template: 'ejecutivo' },
    interview: {
      vacancyNotes: 'Oferta de soporte técnico.',
      vacancySkills: ['Windows', 'Redes'],
      history: [],
      sessions: [
        {
          id: 'ses1', date: '2026-11-02T10:00:00.000Z', role: 'Soporte', summary: 'Buen desempeño.',
          questions: [
            { text: '¿Cómo resuelves un problema?', answer: 'Paso a paso.', feedback: 'Clara.', difficulty: 'media' }
          ]
        }
      ],
      preparedAnswers: [
        { id: 'pa1', question: 'Cuéntame de ti', answer: 'Soy...', date: '2026-11-02T11:00:00.000Z' }
      ],
      prepPlan: { text: 'Plan de preparación.', date: '2026-11-02T09:00:00.000Z' }
    },
    meetings: {
      history: [
        { id: 'm1', date: '2026-11-03T09:00:00.000Z', raw: 'Instrucciones', steps: ['Paso 1', 'Paso 2'] }
      ]
    },
    checklist: [
      { id: 'c1', text: 'Enviar CV', done: true, recurring: false }
    ],
    goals: [
      { id: 'g1', text: 'Postular a 5 vacantes', deadline: '2026-11-30', progress: 40 }
    ],
    activity: [
      { id: 'a1', date: '2026-11-04T08:00:00.000Z', type: 'cv', detail: 'Generó un CV' }
    ],
    snapshots: [
      { date: '2026-11-04', completeness: 80, checklist: 50, goals: 40, skills: 2, interviews: 1 }
    ],
    preferences: {
      modality: 'Híbrido', schedule: 'Matutino', communication: 'Escrita',
      pace: 'Pocas tareas', accommodations: 'Espacio silencioso', notes: 'Ninguna.'
    }
  };
}

test('el esquema crea las tablas relacionales esperadas', () => {
  const conn = db.openDatabase(':memory:');
  const tables = db.listTables(conn);
  ['workspace', 'profile', 'experiences', 'education', 'skills', 'interview_sessions',
    'interview_questions', 'prepared_answers', 'meetings', 'meeting_steps',
    'checklist_items', 'goals', 'preferences', 'activity_log', 'snapshots'].forEach((t) => {
    assert.ok(tables.includes(t), 'existe la tabla ' + t);
  });
  assert.ok(tables.length >= 20, 'hay al menos 20 tablas (hay ' + tables.length + ')');
  // El catálogo de plantillas de CV se siembra con los 4 diseños.
  const tpl = conn.prepare('SELECT COUNT(*) AS n FROM cv_templates').get().n;
  assert.strictEqual(tpl, 4);
});

test('saveState + loadState conservan toda la información (ida y vuelta)', () => {
  const conn = db.openDatabase(':memory:');
  const original = sampleState();
  db.saveState(conn, 'local', original);
  const loaded = db.loadState(conn, 'local');
  assert.ok(loaded, 'se recupera el estado');
  assert.deepStrictEqual(loaded, original);
});

test('loadState devuelve null si el workspace no existe', () => {
  const conn = db.openDatabase(':memory:');
  assert.strictEqual(db.loadState(conn, 'no-existe'), null);
});

test('guardar de nuevo reemplaza el estado (no duplica filas)', () => {
  const conn = db.openDatabase(':memory:');
  const original = sampleState();
  db.saveState(conn, 'local', original);
  db.saveState(conn, 'local', original);
  const s2 = conn.prepare('SELECT COUNT(*) AS n FROM skills WHERE workspace_id = ?').get('local').n;
  assert.strictEqual(s2, 2, 'siguen existiendo 2 habilidades, sin duplicados');
  const q = conn.prepare('SELECT COUNT(*) AS n FROM interview_questions').get().n;
  assert.strictEqual(q, 1, 'sigue habiendo 1 pregunta, sin duplicados');
});

test('las relaciones N:1 se guardan y recuperan ordenadas', () => {
  const conn = db.openDatabase(':memory:');
  const st = sampleState();
  st.profile.experience = [
    { id: 'x1', role: 'A', company: 'C1', period: '1', desc: 'd1' },
    { id: 'x2', role: 'B', company: 'C2', period: '2', desc: 'd2' }
  ];
  db.saveState(conn, 'local', st);
  const loaded = db.loadState(conn, 'local');
  assert.strictEqual(loaded.profile.experience.length, 2);
  assert.strictEqual(loaded.profile.experience[0].role, 'A');
  assert.strictEqual(loaded.profile.experience[1].role, 'B');
});

test('borrar el workspace elimina sus datos hijos (ON DELETE CASCADE)', () => {
  const conn = db.openDatabase(':memory:');
  db.saveState(conn, 'local', sampleState());
  db.deleteState(conn, 'local');
  assert.strictEqual(conn.prepare('SELECT COUNT(*) AS n FROM experiences').get().n, 0);
  assert.strictEqual(conn.prepare('SELECT COUNT(*) AS n FROM goals').get().n, 0);
  assert.strictEqual(conn.prepare('SELECT COUNT(*) AS n FROM interview_sessions').get().n, 0);
  assert.strictEqual(conn.prepare('SELECT COUNT(*) AS n FROM meeting_steps').get().n, 0);
});

test('tableCounts refleja las filas guardadas por tabla', () => {
  const conn = db.openDatabase(':memory:');
  db.saveState(conn, 'local', sampleState());
  const counts = db.tableCounts(conn);
  assert.strictEqual(counts.profile, 1);
  assert.strictEqual(counts.skills, 2);
  assert.strictEqual(counts.snapshots, 1);
  assert.strictEqual(counts.cv_templates, 4);
});
