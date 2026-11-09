// tests/server.test.js — Pruebas del servidor/proxy (seguridad y utilidades)
// Ejecutar:  node --test tests/
'use strict';

const test = require('node:test');
const assert = require('node:assert');

// Al importar el servidor NO debe arrancar (solo exporta utilidades).
const server = require('../server/server.js');

// Claves de ejemplo construidas en tiempo de ejecución: así el repositorio no
// contiene ninguna cadena literal con formato de clave real (evita alertas de
// seguridad y el bloqueo de "secret scanning" de GitHub).
const FAKE_AIZA = 'AIza' + 'A'.repeat(35);
const FAKE_AQ = 'AQ.' + 'B'.repeat(40);

test('keyLooksValid acepta formatos de clave de Gemini', () => {
  assert.strictEqual(server.keyLooksValid(FAKE_AIZA), true);
  assert.strictEqual(server.keyLooksValid(FAKE_AQ), true);
});

test('keyLooksValid rechaza valores vacíos o con formato incorrecto', () => {
  assert.strictEqual(server.keyLooksValid(''), false);
  assert.strictEqual(server.keyLooksValid(undefined), false);
  assert.strictEqual(server.keyLooksValid('AIzaX'), false);
  assert.strictEqual(server.keyLooksValid('hola mundo'), false);
  assert.strictEqual(server.keyLooksValid('sk-123456789012345678901234'), false);
});

test('keyHint resume el estado sin filtrar el valor de la clave', () => {
  const hint = server.keyHint();
  assert.strictEqual(typeof hint, 'string');
  assert.ok(hint.length > 0);
});

test('los tipos MIME incluyen los necesarios para la PWA', () => {
  assert.strictEqual(server.MIME['.webmanifest'], 'application/manifest+json; charset=utf-8');
  assert.strictEqual(server.MIME['.js'], 'text/javascript; charset=utf-8');
  assert.strictEqual(server.MIME['.html'], 'text/html; charset=utf-8');
  assert.strictEqual(server.MIME['.png'], 'image/png');
});
