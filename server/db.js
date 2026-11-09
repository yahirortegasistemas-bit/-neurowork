// server/db.js — Capa de persistencia relacional de NeuroWork (SQLite)
// ---------------------------------------------------------------------------
// Usa el módulo nativo `node:sqlite` (Node 22+): sin dependencias externas.
//
// El estado de la aplicación (un objeto JSON en el navegador) se normaliza en
// un conjunto de tablas relacionales con claves primarias y foráneas. La base
// de datos vive en un archivo LOCAL del servidor (server/data/neurowork.db),
// por lo que la información no sale del equipo del usuario.
//
// Modelo general:  workspace (1) ──< experiences, education, skills,
// languages, certifications, projects, cv_documents, interview_sessions,
// prepared_answers, meetings, checklist_items, goals, activity_log,
// snapshots ...  y  workspace (1) ──1 profile / preferences / prep_plans.

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, 'data', 'neurowork.db');
const DEFAULT_WORKSPACE = 'local';
const SCHEMA_VERSION = 1;

/* ------------------------------- esquema -------------------------------- */
// DDL completo. Se expone para documentación y pruebas.
const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace (
  id             TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile (
  workspace_id TEXT PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
  name    TEXT, title TEXT, location TEXT,
  email   TEXT, phone TEXT, summary TEXT
);

CREATE TABLE IF NOT EXISTS professional_links (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  label TEXT, url TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS experiences (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  role TEXT, company TEXT, period TEXT, description TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS education (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  degree TEXT, school TEXT, period TEXT, status TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS skills (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT, category TEXT, level INTEGER, position INTEGER
);

CREATE TABLE IF NOT EXISTS languages (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT, level TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS certifications (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT, issuer TEXT, year TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT, description TEXT, url TEXT, year TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS cv_templates (
  id TEXT PRIMARY KEY, label TEXT, description TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS cv_documents (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  template TEXT, role TEXT, content TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  role TEXT, session_date TEXT, summary TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question TEXT, answer TEXT, feedback TEXT, difficulty TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS prepared_answers (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  question TEXT, answer TEXT, answer_date TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS prep_plans (
  workspace_id TEXT PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
  text TEXT, plan_date TEXT
);

CREATE TABLE IF NOT EXISTS vacancy_analyses (
  workspace_id TEXT PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
  notes TEXT, skills TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  meeting_date TEXT, raw TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS meeting_steps (
  id         TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  text TEXT, done INTEGER, recurring INTEGER, position INTEGER
);

CREATE TABLE IF NOT EXISTS goals (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  text TEXT, deadline TEXT, progress INTEGER, position INTEGER
);

CREATE TABLE IF NOT EXISTS preferences (
  workspace_id TEXT PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
  modality TEXT, schedule TEXT, communication TEXT, pace TEXT,
  accommodations TEXT, notes TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  activity_date TEXT, type TEXT, detail TEXT, position INTEGER
);

CREATE TABLE IF NOT EXISTS snapshots (
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  snap_date TEXT NOT NULL,
  completeness REAL, checklist REAL, goals REAL,
  skills INTEGER, interviews INTEGER,
  PRIMARY KEY (workspace_id, snap_date)
);

CREATE INDEX IF NOT EXISTS idx_exp_ws   ON experiences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skills_ws ON skills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_act_ws  ON activity_log(workspace_id);
`;

// Catálogo de plantillas de CV (se siembra una vez).
const CV_TEMPLATES_SEED = [
  ['moderno', 'Moderno', 'Dos columnas, barra lateral', 0],
  ['ejecutivo', 'Ejecutivo', 'Una columna, cabecera azul', 1],
  ['clasico', 'Clásico', 'Serif, centrado, elegante', 2],
  ['minimalista', 'Minimalista', 'Limpio, con mucho aire', 3]
];

/* ------------------------------- apertura ------------------------------- */
function resolveDbPath(file) {
  return file || process.env.NEUROWORK_DB || DEFAULT_DB_PATH;
}

function openDatabase(file) {
  const dbFile = resolveDbPath(file);
  if (dbFile !== ':memory:') {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  }
  // require perezoso: permite importar el módulo aunque node:sqlite no exista.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA foreign_keys = ON;');
  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(SCHEMA_SQL);
  const insert = db.prepare(
    'INSERT OR IGNORE INTO cv_templates (id, label, description, position) VALUES (?, ?, ?, ?)'
  );
  CV_TEMPLATES_SEED.forEach((row) => insert.run(row[0], row[1], row[2], row[3]));
  return db;
}

function listTables(db) {
  return db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map((r) => r.name);
}

function tableCounts(db) {
  const out = {};
  listTables(db).forEach((t) => {
    out[t] = db.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n;
  });
  return out;
}

/* ------------------------------- helpers -------------------------------- */
const bool = (v) => (v ? 1 : 0);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v === undefined || v === null ? null : String(v));

function wipeWorkspace(db, wsId) {
  // El borrado de workspace dispara los ON DELETE CASCADE.
  ['interview_questions', 'meeting_steps'].forEach((t) => {
    const col = t === 'interview_questions' ? 'session_id' : 'meeting_id';
    const parent = t === 'interview_questions' ? 'interview_sessions' : 'meetings';
    db.prepare('DELETE FROM ' + t + ' WHERE ' + col + ' IN (SELECT id FROM ' + parent + ' WHERE workspace_id = ?)').run(wsId);
  });
  ['experiences', 'education', 'skills', 'languages', 'certifications', 'projects',
    'cv_documents', 'interview_sessions', 'prepared_answers', 'meetings',
    'checklist_items', 'goals', 'activity_log', 'snapshots', 'professional_links',
    'profile', 'preferences', 'prep_plans', 'vacancy_analyses'].forEach((t) => {
      db.prepare('DELETE FROM ' + t + ' WHERE workspace_id = ?').run(wsId);
    });
}

/* -------------------------------- guardar ------------------------------- */
function saveState(db, workspaceId, state) {
  const wsId = workspaceId || DEFAULT_WORKSPACE;
  const now = new Date().toISOString();
  state = state || {};

  db.exec('BEGIN');
  try {
    db.prepare(
      'INSERT INTO workspace (id, schema_version, created_at, updated_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, schema_version = excluded.schema_version'
    ).run(wsId, SCHEMA_VERSION, now, now);

    wipeWorkspace(db, wsId);

    const p = state.profile || {};

    // profile (1:1)
    db.prepare(
      'INSERT INTO profile (workspace_id, name, title, location, email, phone, summary) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(wsId, str(p.name), str(p.title), str(p.location), str(p.email), str(p.phone), str(p.summary));

    // experiences / education (1:N) — viven dentro de profile en el JSON.
    const expIns = db.prepare(
      'INSERT INTO experiences (id, workspace_id, role, company, period, description, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    arr(p.experience).forEach((e, i) => expIns.run(str(e.id) || ('exp' + i), wsId, str(e.role), str(e.company), str(e.period), str(e.desc), i));

    const eduIns = db.prepare(
      'INSERT INTO education (id, workspace_id, degree, school, period, status, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    arr(p.education).forEach((e, i) => eduIns.run(str(e.id) || ('edu' + i), wsId, str(e.degree), str(e.school), str(e.period), str(e.status), i));

    // skills (1:N)
    const skIns = db.prepare(
      'INSERT INTO skills (id, workspace_id, name, category, level, position) VALUES (?, ?, ?, ?, ?, ?)'
    );
    arr(state.skills).forEach((s, i) => skIns.run(str(s.id) || ('sk' + i), wsId, str(s.name), str(s.category), Number(s.level) || 0, i));

    // cv (1:1 lógico -> 1 fila)
    const cv = state.cv || {};
    db.prepare(
      'INSERT INTO cv_documents (id, workspace_id, template, role, content, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('cv-' + wsId, wsId, str(cv.template) || 'moderno', str(cv.role), str(cv.text), str(cv.updated));

    // interview: vacancy analysis + sessions + questions + prepared answers + plan
    const iv = state.interview || {};
    db.prepare(
      'INSERT INTO vacancy_analyses (workspace_id, notes, skills, updated_at) VALUES (?, ?, ?, ?)'
    ).run(wsId, str(iv.vacancyNotes), JSON.stringify(arr(iv.vacancySkills)), now);

    const sessIns = db.prepare(
      'INSERT INTO interview_sessions (id, workspace_id, role, session_date, summary, position) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const qIns = db.prepare(
      'INSERT INTO interview_questions (id, session_id, question, answer, feedback, difficulty, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    arr(iv.sessions).forEach((s, i) => {
      const sid = str(s.id) || ('sess' + i);
      sessIns.run(sid, wsId, str(s.role), str(s.date), str(s.summary), i);
      arr(s.questions).forEach((q, j) => {
        qIns.run(sid + '-' + j, sid, str(q.text), str(q.answer), str(q.feedback), str(q.difficulty) || 'media', j);
      });
    });

    const paIns = db.prepare(
      'INSERT INTO prepared_answers (id, workspace_id, question, answer, answer_date, position) VALUES (?, ?, ?, ?, ?, ?)'
    );
    arr(iv.preparedAnswers).forEach((a, i) => paIns.run(str(a.id) || ('pa' + i), wsId, str(a.question), str(a.answer), str(a.date), i));

    if (iv.prepPlan && iv.prepPlan.text) {
      db.prepare('INSERT INTO prep_plans (workspace_id, text, plan_date) VALUES (?, ?, ?)')
        .run(wsId, str(iv.prepPlan.text), str(iv.prepPlan.date));
    }

    // meetings + steps
    const meetIns = db.prepare(
      'INSERT INTO meetings (id, workspace_id, meeting_date, raw, position) VALUES (?, ?, ?, ?, ?)'
    );
    const stepIns = db.prepare(
      'INSERT INTO meeting_steps (id, meeting_id, text, position) VALUES (?, ?, ?, ?)'
    );
    arr((state.meetings || {}).history).forEach((m, i) => {
      const mid = str(m.id) || ('meet' + i);
      meetIns.run(mid, wsId, str(m.date), str(m.raw), i);
      arr(m.steps).forEach((t, j) => stepIns.run(mid + '-' + j, mid, str(t), j));
    });

    // checklist / goals
    const ckIns = db.prepare(
      'INSERT INTO checklist_items (id, workspace_id, text, done, recurring, position) VALUES (?, ?, ?, ?, ?, ?)'
    );
    arr(state.checklist).forEach((c, i) => ckIns.run(str(c.id) || ('ck' + i), wsId, str(c.text), bool(c.done), bool(c.recurring), i));

    const goalIns = db.prepare(
      'INSERT INTO goals (id, workspace_id, text, deadline, progress, position) VALUES (?, ?, ?, ?, ?, ?)'
    );
    arr(state.goals).forEach((g, i) => goalIns.run(str(g.id) || ('goal' + i), wsId, str(g.text), str(g.deadline), Number(g.progress) || 0, i));

    // preferences (1:1)
    const pr = state.preferences || {};
    db.prepare(
      'INSERT INTO preferences (workspace_id, modality, schedule, communication, pace, accommodations, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(wsId, str(pr.modality), str(pr.schedule), str(pr.communication), str(pr.pace), str(pr.accommodations), str(pr.notes));

    // activity log
    const actIns = db.prepare(
      'INSERT INTO activity_log (id, workspace_id, activity_date, type, detail, position) VALUES (?, ?, ?, ?, ?, ?)'
    );
    arr(state.activity).forEach((a, i) => actIns.run(str(a.id) || ('act' + i), wsId, str(a.date), str(a.type), str(a.detail), i));

    // snapshots
    const snapIns = db.prepare(
      'INSERT INTO snapshots (workspace_id, snap_date, completeness, checklist, goals, skills, interviews) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    arr(state.snapshots).forEach((s) => {
      snapIns.run(wsId, str(s.date), numOrNull(s.completeness), numOrNull(s.checklist), numOrNull(s.goals),
        numOrNull(s.skills), numOrNull(s.interviews));
    });

    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) { /* ignore */ }
    throw e;
  }
  return { workspaceId: wsId, savedAt: now };
}

function numOrNull(v) {
  return (v === undefined || v === null || v === '') ? null : Number(v);
}

/* -------------------------------- cargar -------------------------------- */
function loadState(db, workspaceId) {
  const wsId = workspaceId || DEFAULT_WORKSPACE;
  const ws = db.prepare('SELECT id FROM workspace WHERE id = ?').get(wsId);
  if (!ws) return null;

  const rows = (sql, ...params) => db.prepare(sql).all(...params);

  const p = db.prepare('SELECT * FROM profile WHERE workspace_id = ?').get(wsId) || {};
  const cv = db.prepare('SELECT * FROM cv_documents WHERE workspace_id = ? LIMIT 1').get(wsId) || {};
  const vac = db.prepare('SELECT * FROM vacancy_analyses WHERE workspace_id = ?').get(wsId) || {};
  const plan = db.prepare('SELECT * FROM prep_plans WHERE workspace_id = ?').get(wsId) || null;
  const pref = db.prepare('SELECT * FROM preferences WHERE workspace_id = ?').get(wsId) || {};

  const sessions = rows('SELECT * FROM interview_sessions WHERE workspace_id = ? ORDER BY position', wsId).map((s) => ({
    id: s.id,
    date: s.session_date,
    role: s.role,
    summary: s.summary || '',
    questions: rows('SELECT * FROM interview_questions WHERE session_id = ? ORDER BY position', s.id).map((q) => ({
      text: q.question, answer: q.answer, feedback: q.feedback, difficulty: q.difficulty || 'media'
    }))
  }));

  const meetings = rows('SELECT * FROM meetings WHERE workspace_id = ? ORDER BY position', wsId).map((m) => ({
    id: m.id,
    date: m.meeting_date,
    raw: m.raw,
    steps: rows('SELECT * FROM meeting_steps WHERE meeting_id = ? ORDER BY position', m.id).map((s) => s.text)
  }));

  return {
    profile: {
      name: p.name || '', title: p.title || '', location: p.location || '',
      email: p.email || '', phone: p.phone || '', summary: p.summary || '',
      experience: rows('SELECT * FROM experiences WHERE workspace_id = ? ORDER BY position', wsId)
        .map((e) => ({ id: e.id, role: e.role || '', company: e.company || '', period: e.period || '', desc: e.description || '' })),
      education: rows('SELECT * FROM education WHERE workspace_id = ? ORDER BY position', wsId)
        .map((e) => ({ id: e.id, degree: e.degree || '', school: e.school || '', period: e.period || '' }))
    },
    skills: rows('SELECT * FROM skills WHERE workspace_id = ? ORDER BY position', wsId)
      .map((s) => ({ id: s.id, name: s.name || '', category: s.category || '', level: s.level || 0 })),
    cv: {
      text: cv.content || '', role: cv.role || '',
      updated: cv.updated_at || null, template: cv.template || 'moderno'
    },
    interview: {
      vacancyNotes: vac.notes || '',
      vacancySkills: safeParseArray(vac.skills),
      history: [],
      sessions: sessions,
      preparedAnswers: rows('SELECT * FROM prepared_answers WHERE workspace_id = ? ORDER BY position', wsId)
        .map((a) => ({ id: a.id, question: a.question || '', answer: a.answer || '', date: a.answer_date || null })),
      prepPlan: plan ? { text: plan.text || '', date: plan.plan_date || null } : null
    },
    meetings: { history: meetings },
    checklist: rows('SELECT * FROM checklist_items WHERE workspace_id = ? ORDER BY position', wsId)
      .map((c) => ({ id: c.id, text: c.text || '', done: !!c.done, recurring: !!c.recurring })),
    goals: rows('SELECT * FROM goals WHERE workspace_id = ? ORDER BY position', wsId)
      .map((g) => ({ id: g.id, text: g.text || '', deadline: g.deadline || '', progress: g.progress || 0 })),
    activity: rows('SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY position', wsId)
      .map((a) => ({ id: a.id, date: a.activity_date, type: a.type, detail: a.detail })),
    snapshots: rows('SELECT * FROM snapshots WHERE workspace_id = ? ORDER BY snap_date', wsId)
      .map((s) => ({ date: s.snap_date, completeness: s.completeness, checklist: s.checklist, goals: s.goals, skills: s.skills, interviews: s.interviews })),
    preferences: {
      modality: pref.modality || '', schedule: pref.schedule || '',
      communication: pref.communication || '', pace: pref.pace || '',
      accommodations: pref.accommodations || '', notes: pref.notes || ''
    }
  };
}

function safeParseArray(txt) {
  try { const v = JSON.parse(txt || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}

function deleteState(db, workspaceId) {
  const wsId = workspaceId || DEFAULT_WORKSPACE;
  wipeWorkspace(db, wsId);
  db.prepare('DELETE FROM workspace WHERE id = ?').run(wsId);
}

module.exports = {
  DEFAULT_DB_PATH,
  DEFAULT_WORKSPACE,
  SCHEMA_VERSION,
  SCHEMA_SQL,
  CV_TEMPLATES_SEED,
  resolveDbPath,
  openDatabase,
  initSchema,
  listTables,
  tableCounts,
  saveState,
  loadState,
  deleteState
};
