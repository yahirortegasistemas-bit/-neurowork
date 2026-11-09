'use strict';
// Script temporal: genera un CV de ejemplo con cada diseño para inspección.
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
global.location = { protocol: 'http:' };
const code = fs.readFileSync(path.join(__dirname, '..', 'ai.js'), 'utf8') +
  '\n;globalThis.__buildCvDoc = buildProfessionalDoc;';
// eslint-disable-next-line no-eval
eval(code);
const build = global.__buildCvDoc;

const SAMPLE = [
  'María López Hernández',
  'Auxiliar administrativa',
  'maria.lopez@example.com | +52 664 555 1234 | Tijuana, B.C.',
  '',
  'PERFIL PROFESIONAL',
  'Persona organizada y meticulosa, con experiencia en atención al cliente y control de inventario. Busco un puesto donde pueda aportar orden y claridad.',
  '',
  'EXPERIENCIA LABORAL',
  'Auxiliar administrativa, Farmacia del Valle (2022 - 2024)',
  '- Atención a clientes y manejo de caja.',
  '- Control de inventario y pedidos a proveedores.',
  '- Elaboración de reportes semanales en Excel.',
  '',
  'Atención a clientes, Cafetería Central (2021 - 2022)',
  '- Toma de pedidos y servicio en mostrador.',
  '',
  'EDUCACIÓN',
  'Bachillerato técnico en Administración, CBTIS 146 (2019 - 2021)',
  '',
  'HABILIDADES',
  'Excel, Word, comunicación, trabajo en equipo, atención al detalle, organización',
  '',
  'IDIOMAS',
  'Español (nativo)',
  'Inglés (intermedio, B1)',
  '',
  'CURSOS Y CERTIFICACIONES',
  'Curso de Excel intermedio, Fundación Carlos Slim (2023)'
].join('\n');

const profile = {
  name: 'María López Hernández', title: 'Auxiliar administrativa',
  email: 'maria.lopez@example.com', phone: '+52 664 555 1234', location: 'Tijuana, B.C.'
};

const dir = path.join(__dirname, '..', 'tmp');
fs.mkdirSync(dir, { recursive: true });
['moderno', 'ejecutivo', 'clasico', 'minimalista'].forEach((t) => {
  fs.writeFileSync(path.join(dir, 'cv-' + t + '.html'), build(SAMPLE, t, profile), 'utf8');
});
console.log('Generados en tmp/: cv-moderno.html, cv-ejecutivo.html, cv-clasico.html, cv-minimalista.html');
