'use strict';
// Pruebas del generador de documentos de CV (ai.js -> buildProfessionalDoc).
// ai.js es código de navegador (usa window/location), por eso se evalúa con
// stubs mínimos en lugar de requerirse como módulo.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function loadBuilder() {
  global.window = {};
  global.location = { protocol: 'http:' };
  const code = fs.readFileSync(path.join(__dirname, '..', 'ai.js'), 'utf8') +
    '\n;globalThis.__buildCvDoc = buildProfessionalDoc;';
  // eslint-disable-next-line no-eval
  eval(code);
  return global.__buildCvDoc;
}

const SAMPLE = [
  'Juan Pérez',
  'Asistente administrativo',
  'juan@example.com | +52 664 123 4567 | Tijuana',
  '',
  'PERFIL',
  'Persona organizada y detallista.',
  '',
  'EXPERIENCIA',
  '- Atención a clientes en mostrador.',
  '- Manejo de inventario.',
  '',
  'EDUCACIÓN',
  'Bachillerato técnico en administración',
  '',
  'HABILIDADES',
  'Excel, Word, comunicación, trabajo en equipo'
].join('\n');

const PROFILE = {
  name: 'Juan Pérez', title: 'Asistente administrativo',
  email: 'juan@example.com', phone: '+52 664 123 4567', location: 'Tijuana'
};

test('buildProfessionalDoc genera un documento HTML con los datos del CV', () => {
  const build = loadBuilder();
  const html = build(SAMPLE, 'moderno', PROFILE);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.ok(html.includes('Juan Pérez'), 'incluye el nombre');
  assert.ok(html.includes('Asistente administrativo'), 'incluye el título');
  assert.ok(html.includes('Perfil profesional'), 'usa el título canónico de perfil');
  assert.ok(html.includes('Experiencia laboral'), 'usa el título canónico de experiencia');
  assert.ok(html.includes('Educación'), 'incluye la sección de educación');
});

test('el diseño moderno usa dos columnas con barra lateral de color', () => {
  const build = loadBuilder();
  const html = build(SAMPLE, 'moderno', PROFILE);
  assert.ok(html.includes('class="page"'));
  assert.ok(html.includes('class="sidebar"'));
  assert.ok(html.includes('bgcolor="#24544C"'));
  assert.ok(html.includes('class="cvmain"'));
});

test('las habilidades en una sola línea se convierten en lista', () => {
  const build = loadBuilder();
  const html = build(SAMPLE, 'moderno', PROFILE);
  assert.ok(html.includes('<li>Excel</li>'));
  assert.ok(html.includes('<li>Word</li>'));
  assert.ok(html.includes('<li>trabajo en equipo</li>'));
});

test('clasico y minimalista son de una columna con encabezado', () => {
  const build = loadBuilder();
  ['clasico', 'minimalista'].forEach((t) => {
    const html = build(SAMPLE, t, PROFILE);
    assert.ok(html.includes('class="cvhead"'), t + ' tiene encabezado');
    assert.ok(!html.includes('class="sidebar"'), t + ' no tiene barra lateral');
  });
});

test('el contacto se toma del texto y del perfil sin duplicar', () => {
  const build = loadBuilder();
  const html = build(SAMPLE, 'moderno', PROFILE);
  const veces = (html.match(/juan@example\.com/g) || []).length;
  assert.strictEqual(veces, 1, 'el correo aparece una sola vez');
});

test('escapa HTML para evitar inyección en el documento', () => {
  const build = loadBuilder();
  const evil = 'Nombre\nPuesto\nPERFIL\n<img src=x onerror=alert(1)>';
  const html = build(evil, 'moderno', {});
  assert.ok(!html.includes('<img'), 'no se inserta HTML sin escapar');
  assert.ok(html.includes('&lt;img'), 'el HTML aparece escapado');
});

test('un CV vacío no rompe la generación', () => {
  const build = loadBuilder();
  const html = build('', 'minimalista', {});
  assert.ok(html.startsWith('<!DOCTYPE html>'));
});
