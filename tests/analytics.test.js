// tests/analytics.test.js — Pruebas del módulo de minería de datos
// Ejecutar:  node --test tests/
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const A = require('../analytics.js');

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function sampleState() {
  return {
    profile: { name: 'Ana', title: 'Auxiliar administrativa', location: 'Madrid', email: 'ana@x.com', summary: '' },
    skills: [
      { id: 's1', name: 'Excel', category: 'Ofimática', level: 4 },
      { id: 's2', name: 'Word', category: 'Ofimática', level: 3 },
      { id: 's3', name: 'Comunicación', category: 'Sociales', level: 2 },
      { id: 's4', name: 'Organización', category: 'Gestión', level: 5 }
    ],
    cv: { text: 'CV de prueba', role: 'Auxiliar', updated: new Date().toISOString(), template: 'moderno' },
    interview: {
      vacancyNotes: '',
      vacancySkills: ['Excel', 'Inglés', 'Organización'],
      history: [{ id: 'h1', date: isoDaysAgo(1), difficulty: 'facil' }],
      sessions: [
        {
          id: 'k1', date: isoDaysAgo(2), role: 'Auxiliar',
          questions: [
            { text: 'q1', answer: 'a1', feedback: 'f1', difficulty: 'media' },
            { text: 'q2', answer: 'a2', feedback: 'f2', difficulty: 'dificil' }
          ],
          summary: 'resumen'
        }
      ]
    },
    meetings: { history: [] },
    checklist: [{ id: 'c1', text: 't1', done: true }, { id: 'c2', text: 't2', done: false }],
    goals: [{ id: 'g1', title: 'Empleo', progress: 50 }, { id: 'g2', title: 'Curso', progress: 30 }],
    activity: [
      { id: 'a1', date: isoDaysAgo(0), type: 'perfil', detail: 'x' },
      { id: 'a2', date: isoDaysAgo(0), type: 'perfil', detail: 'y' },
      { id: 'a3', date: isoDaysAgo(60), type: 'cv', detail: 'z' }
    ],
    snapshots: [],
    preferences: {}
  };
}

test('profileCompleteness cuenta campos llenos', () => {
  assert.strictEqual(A.profileCompleteness({}), 0);
  assert.strictEqual(A.profileCompleteness({ name: 'a', title: 'b', location: 'c', email: 'd', summary: 'e' }), 100);
  assert.strictEqual(A.profileCompleteness({ name: 'a', title: 'b', location: 'c', email: 'd' }), 80);
});

test('checklistRate y goalsAvg manejan listas vacías (null, no NaN)', () => {
  assert.strictEqual(A.checklistRate([]), null);
  assert.strictEqual(A.checklistRate([{ done: true }, { done: false }]), 50);
  assert.strictEqual(A.goalsAvg([]), null);
  assert.strictEqual(A.goalsAvg([{ progress: 50 }, { progress: 30 }]), 40);
});

test('skillsByCategory agrupa y promedia niveles', () => {
  const cats = A.skillsByCategory(sampleState().skills);
  assert.strictEqual(cats.length, 3);
  const ofi = cats.find((c) => c.category === 'Ofimática');
  assert.strictEqual(ofi.count, 2);
  assert.strictEqual(ofi.avgLevel, 3.5);
  assert.strictEqual(A.averageSkillLevel(sampleState().skills), 3.5);
});

test('activityByType suma por tipo y ordena desc', () => {
  const by = A.activityByType(sampleState().activity);
  assert.strictEqual(by[0].type, 'perfil');
  assert.strictEqual(by[0].count, 2);
});

test('weeklyActivity incluye la actividad de hoy en la última semana', () => {
  const w = A.weeklyActivity(sampleState().activity, 6);
  assert.strictEqual(w.length, 6);
  assert.strictEqual(w[w.length - 1].count, 2);
  // la actividad de hace 60 días cae fuera de las 6 semanas -> no debe aparecer sumada
  const total = w.reduce((a, x) => a + x.count, 0);
  assert.strictEqual(total, 2);
});

test('allPractice y difficultyCounts combinan historial y sesiones', () => {
  const st = sampleState();
  const items = A.allPractice(st);
  assert.strictEqual(items.length, 3); // 1 historial + 2 de la sesión
  const c = A.difficultyCounts(items);
  assert.deepStrictEqual(c, { facil: 1, media: 1, dificil: 1 });
});

test('allPractice cuenta las sesiones aunque el historial esté vacío (regresión del panel)', () => {
  // El simulador escribe en interview.sessions. El panel leía solo
  // interview.history y marcaba "0 entrevistas practicadas". allPractice
  // debe ser la fuente única que cuenta ambos.
  const st = sampleState();
  st.interview.history = [];
  const items = A.allPractice(st);
  assert.strictEqual(items.length, 2); // solo las 2 preguntas de la sesión
  assert.strictEqual(A.difficultyCounts(items).media, 1);
  assert.strictEqual(A.difficultyCounts(items).dificil, 1);
});

test('ensureSnapshots añade el de hoy y no lo duplica', () => {
  const st = sampleState();
  A.ensureSnapshots(st);
  assert.strictEqual(st.snapshots.length, 1);
  const first = st.snapshots[0];
  assert.strictEqual(first.completeness, 80);
  assert.strictEqual(first.checklist, 50);
  assert.strictEqual(first.goals, 40);
  assert.strictEqual(first.skills, 4);
  assert.strictEqual(first.interviews, 3);
  // segunda llamada: actualiza, no añade
  A.ensureSnapshots(st);
  assert.strictEqual(st.snapshots.length, 1);
});

test('metricSeries devuelve etiquetas y valores alineados', () => {
  const st = sampleState();
  A.ensureSnapshots(st);
  const s = A.metricSeries(st, 'completeness');
  assert.strictEqual(s.labels.length, 1);
  assert.strictEqual(s.values[0], 80);
});

test('skillGap clasifica coincidencias y faltantes', () => {
  const st = sampleState();
  const gap = A.skillGap(st.skills, st.interview.vacancySkills);
  assert.deepStrictEqual(gap.matched.sort(), ['Excel', 'Organización'].sort());
  assert.deepStrictEqual(gap.missing, ['Inglés']);
});

test('skillGap acepta coincidencia parcial (contiene)', () => {
  const gap = A.skillGap([{ name: 'Microsoft Excel avanzado' }], ['Excel']);
  assert.deepStrictEqual(gap.matched, ['Excel']);
});

test('recommendations propone acciones cuando faltan datos', () => {
  const empty = {
    profile: {}, skills: [], cv: {}, interview: {}, checklist: [], goals: [], activity: [], snapshots: []
  };
  const recs = A.recommendations(empty);
  const titles = recs.map((r) => r.title).join(' | ');
  assert.ok(recs.length >= 5);
  assert.match(titles, /habilidad/i);
  assert.match(titles, /perfil/i);
  assert.match(titles, /vacante/i);
});

test('recommendations no recomienda nada con datos completos y sin dificultad excesiva', () => {
  const st = sampleState();
  st.profile.summary = 'Resumen profesional completo'; // perfil al 100%
  st.interview.history = [];
  st.interview.sessions = [];
  const recs = A.recommendations(st);
  assert.strictEqual(recs.length, 0);
});

test('buildReport produce secciones con datos verificables', () => {
  const rep = A.buildReport(sampleState());
  assert.strictEqual(rep.title.indexOf('NeuroWork') !== -1, true);
  assert.ok(rep.sections.length >= 6);
  const resumen = rep.sections.find((s) => s.heading === 'Resumen del perfil');
  assert.ok(resumen.lines.some((l) => l.indexOf('Ana') !== -1));
  const brecha = rep.sections.find((s) => /Brecha/.test(s.heading));
  assert.ok(brecha, 'debe existir la sección de brecha');
  assert.ok(brecha.lines.join(' ').indexOf('Inglés') !== -1);
});

test('los gráficos devuelven SVG y estado vacío cuando no hay datos', () => {
  const bars = A.barChart([{ label: 'a', value: 3 }, { label: 'b', value: 1 }]);
  assert.match(bars, /^<svg /);
  assert.match(bars, /<rect /);
  const empty = A.barChart([]);
  assert.match(empty, /empty/);

  const line = A.lineChart(['x', 'y'], [1, 2]);
  assert.match(line, /<polyline /);

  const radar = A.radarChart([{ label: 'A', value: 1 }, { label: 'B', value: 0.5 }, { label: 'C', value: 0.2 }]);
  assert.match(radar, /<polygon /);
  const radarEmpty = A.radarChart([{ label: 'A', value: 1 }]);
  assert.match(radarEmpty, /empty/);
});

test('esc neutraliza HTML', () => {
  assert.strictEqual(A.esc('<b>&"'), '&lt;b&gt;&amp;&quot;');
});
