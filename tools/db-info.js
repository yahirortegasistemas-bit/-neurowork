// tools/db-info.js — Muestra el esquema y el conteo de filas de la base de datos.
// Uso:  node tools/db-info.js [ruta.db]
'use strict';

const path = require('node:path');
const db = require('../server/db.js');

const file = process.argv[2] || db.resolveDbPath();
console.log('NeuroWork — Base de datos relacional (SQLite)');
console.log('Archivo:', file === db.DEFAULT_DB_PATH ? path.relative(path.join(__dirname, '..'), file) : file);
console.log('Versión de esquema:', db.SCHEMA_VERSION);
console.log('');

const conn = db.openDatabase(file === db.DEFAULT_DB_PATH ? undefined : file);
const tables = db.listTables(conn);
const counts = db.tableCounts(conn);

console.log('Tablas (' + tables.length + '):');
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
tables.forEach((t) => {
  console.log('  ' + pad(t, 22) + String(counts[t]).padStart(6) + ' filas');
});

const fk = conn.prepare('PRAGMA foreign_key_list(experiences)').all();
console.log('');
console.log('Claves foráneas de "experiences":');
fk.forEach((f) => console.log('  ' + f.from + ' -> ' + f.table + '(' + f.to + ')'));
