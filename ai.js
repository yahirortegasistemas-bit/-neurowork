// ai.js - puente de IA para la app (sin exponer la clave en el cliente)
'use strict';

// ---------------------------------------------------------------------------
const PROXY_URL = '/api/gemini';

/* ------------------------- llamada al proxy ----------------------------- */
async function callGemini(prompt, { json = false } = {}) {
  // Si la app se abrió con doble clic (file://), no existe el servidor.
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('Abre la app desde el servidor: http://127.0.0.1:8787 (no con doble clic). Ejecuta "node server/server.js".');
  }

  // Reintentos con backoff exponencial para errores de red o 429/503/502.
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1200;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, json })
      });

      // 429, 503 o 502: reintentar con backoff exponencial.
      if (resp.status === 429 || resp.status === 503 || resp.status === 502) {
        const wait = BASE_DELAY * Math.pow(2, attempt);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
      }

      // Errores de red (sin status) o errores de la API: propagar.
      if (!resp.ok) {
        let detail = '';
        try { detail = (await resp.json()).error || ''; } catch (e) { /* sin cuerpo */ }
        const err = new Error(detail || ('Error ' + resp.status));
        err.status = resp.status;
        throw err;
      }

      const data = await resp.json();
      return { text: (data && data.text ? data.text : '').trim() };

    } catch (e) {
      lastError = e;
      // Errores de red (sin status): reintentar. Errores de la API: propagar.
      if (!e.status && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
        continue;
      }
      if (!e.status && e.name === 'TypeError') {
        throw new Error('No se pudo conectar con el servidor. Comprueba que está activo en http://127.0.0.1:8787.');
      }
      throw e;
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
async function callGeminiJson(prompt) {
  const r = await callGemini(prompt, { json: true });
  try {
    return JSON.parse(r.text);
  } catch (e) {
    const m = r.text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Respuesta JSON inválida');
  }
}

/* -------------------------------- helpers ------------------------------- */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------ documento .doc con diseños profesionales (CV) ------------- */

// Normaliza un título: sin acentos, mayúsculas y sin ":" final.
function cvNorm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[:.]+$/, '').trim();
}

// Títulos de sección reconocidos -> clave canónica.
const CV_SECTION_KEYS = {
  'PERFIL': 'profile', 'PERFIL PROFESIONAL': 'profile', 'RESUMEN': 'profile',
  'RESUMEN PROFESIONAL': 'profile', 'SOBRE MI': 'profile', 'ACERCA DE MI': 'profile',
  'OBJETIVO': 'profile', 'OBJETIVO PROFESIONAL': 'profile',
  'EXPERIENCIA': 'experience', 'EXPERIENCIA LABORAL': 'experience',
  'EXPERIENCIA PROFESIONAL': 'experience',
  'EDUCACION': 'education', 'FORMACION': 'education',
  'FORMACION ACADEMICA': 'education', 'ESTUDIOS': 'education',
  'HABILIDADES': 'skills', 'COMPETENCIAS': 'skills', 'SKILLS': 'skills',
  'APTITUDES': 'skills', 'HABILIDADES CLAVE': 'skills',
  'CONTACTO': 'contact', 'DATOS DE CONTACTO': 'contact',
  'INFORMACION DE CONTACTO': 'contact',
  'IDIOMAS': 'languages', 'LANGUAGES': 'languages',
  'CURSOS': 'courses', 'CERTIFICACIONES': 'courses', 'CERTIFICADOS': 'courses',
  'CURSOS Y CERTIFICACIONES': 'courses',
  'PROYECTOS': 'projects', 'PROYECTOS PERSONALES': 'projects'
};

const CV_SECTION_TITLES = {
  profile: 'Perfil profesional', experience: 'Experiencia laboral',
  education: 'Educación', skills: 'Habilidades', contact: 'Contacto',
  languages: 'Idiomas', courses: 'Cursos y certificaciones',
  projects: 'Proyectos', other: 'Información adicional'
};

// Convierte el texto plano del CV en un modelo estructurado.
function cvParse(cvText, profile) {
  profile = profile || {};
  const lines = String(cvText || '').split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');

  const bulletRe = /^\s*(?:[-•*·◦‣▪–—]|\d+[.)])\s+/;
  const isHeading = (line) => {
    const n = cvNorm(line);
    if (CV_SECTION_KEYS[n]) return true;
    return line.length <= 48 && /:$/.test(line) && line.split(/\s+/).length <= 6;
  };

  const contact = [];
  const seen = {};
  const addContact = (t) => {
    t = String(t || '').trim();
    if (t && !seen[t.toLowerCase()]) { seen[t.toLowerCase()] = 1; contact.push(t); }
  };
  // Divide líneas con varios datos ("correo | teléfono | ciudad").
  const addContactLine = (t) => {
    String(t || '').split(/[|•·]|\s{2,}/).forEach((part) => addContact(part));
  };

  // Nombre y título: primeras dos líneas (si no son encabezados ni viñetas).
  let name = '', role = '', idx = 0;
  if (lines.length) {
    name = lines[0]; idx = 1;
    if (lines[1] && lines[1].length <= 60 && !isHeading(lines[1]) &&
        !bulletRe.test(lines[1]) && !/@/.test(lines[1])) {
      role = lines[1]; idx = 2;
    }
  }
  if (!name && profile.name) name = profile.name;
  if (!role && profile.title) role = profile.title;

  const byKey = {};
  const sections = [];
  const ensure = (key, title) => {
    if (!byKey[key]) {
      const s = { key: key, title: title || CV_SECTION_TITLES[key] || CV_SECTION_TITLES.other, blocks: [] };
      byKey[key] = s; sections.push(s);
    }
    return byKey[key];
  };

  let current = null;
  for (let i = idx; i < lines.length; i++) {
    const line = lines[i];
    if (isHeading(line)) {
      const known = CV_SECTION_KEYS[cvNorm(line)];
      if (known) { current = known; ensure(known); }
      else { const key = 'other#' + cvNorm(line); current = key; ensure(key, line.replace(/:$/, '')); }
      continue;
    }
    // Línea de contacto suelta (correo o teléfono) antes del primer encabezado.
    if (current === null && !bulletRe.test(line) &&
        (/@/.test(line) || /\+?\d[\d\s().-]{6,}/.test(line))) {
      addContactLine(line); continue;
    }
    const key2 = current || 'other';
    const sec = ensure(key2);
    if (bulletRe.test(line)) sec.blocks.push({ type: 'li', text: line.replace(bulletRe, '') });
    else sec.blocks.push({ type: 'p', text: line });
  }

  // Contacto: combina lo detectado en el texto con los datos del perfil.
  if (profile.email) addContact(profile.email);
  if (profile.phone) addContact(profile.phone);
  if (profile.location) addContact(profile.location);
  if (byKey.contact) {
    byKey.contact.blocks.forEach((b) => addContactLine(b.text));
    byKey.contact.blocks = [];
  }

  // Habilidades en una sola línea con separadores -> lista.
  const sk = byKey.skills;
  if (sk && sk.blocks.length && sk.blocks.every((b) => b.type === 'p')) {
    const items = [];
    sk.blocks.forEach((b) => {
      b.text.split(/[,;|·•]/).forEach((t) => { t = t.trim(); if (t) items.push({ type: 'li', text: t }); });
    });
    if (items.length > sk.blocks.length) sk.blocks = items;
  }

  return { name: name, role: role, contact: contact, byKey: byKey, sections: sections };
}

// Renderiza una lista de bloques (párrafos y viñetas).
function cvBlocks(list) {
  let out = '', inList = false;
  list.forEach((b) => {
    if (b.type === 'li') {
      if (!inList) { out += '<ul>'; inList = true; }
      out += '<li>' + escapeHtml(b.text) + '</li>';
    } else {
      if (inList) { out += '</ul>'; inList = false; }
      out += '<p>' + escapeHtml(b.text) + '</p>';
    }
  });
  if (inList) out += '</ul>';
  return out;
}

// Ordena las secciones de la columna principal.
function cvOrderedMain(doc, sidebarKeys, priority) {
  const out = [];
  priority.forEach((k) => { if (doc.byKey[k] && doc.byKey[k].blocks.length) out.push(doc.byKey[k]); });
  doc.sections.forEach((s) => {
    if (s.key === 'contact' || sidebarKeys[s.key]) return;
    if (priority.indexOf(s.key) >= 0) return;
    if (s.blocks.length) out.push(s);
  });
  return out;
}

// Rango de fechas al final de una línea de experiencia/educación.
const CV_DATE_RE = /((?:ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)[a-záéíóúñ]*\.?\s*(?:de\s+)?(?:19|20)\d{2}\s*[-–—]\s*(?:(?:ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)[a-záéíóúñ]*\.?\s*(?:de\s+)?(?:19|20)\d{2}|presente|actual(?:idad)?|hoy)|(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|presente|actual(?:idad)?|hoy)|(?:ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)[a-záéíóúñ]*\.?\s*(?:de\s+)?(?:19|20)\d{2})/i;

// Separa una entrada de experiencia/educación en título, subtítulo y fecha.
function cvEntry(text) {
  let label = String(text).trim();
  let date = '';
  const m = label.match(CV_DATE_RE);
  if (m) {
    date = m[0].replace(/\s+/g, ' ').replace(/\s*[-–—]\s*/, ' – ').trim();
    label = label.replace(m[0], '');
  }
  label = label.replace(/[()]/g, ' ').replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—,;|·]+/, '').replace(/[\s\-–—,;|·]+$/, '').trim();

  let title = label, sub = '';
  const sep = label.match(/^(.*?)\s*[—–|·]\s*(.+)$/) || label.match(/^(.*?)\s+-\s+(.+)$/);
  if (sep) {
    title = sep[1].trim(); sub = sep[2].trim();
  } else {
    const comma = label.indexOf(',');
    if (comma > 0) { title = label.slice(0, comma).trim(); sub = label.slice(comma + 1).trim(); }
  }
  return { title: title, sub: sub, date: date };
}

// Sección tipo línea de tiempo: entradas con la fecha alineada a la derecha.
function cvTimeline(blocks) {
  let out = '', inList = false, open = false;
  const closeList = () => { if (inList) { out += '</ul>'; inList = false; } };
  blocks.forEach((b) => {
    if (b.type === 'p') {
      closeList();
      if (open) out += '</div>';
      const e = cvEntry(b.text);
      out += '<div class="entry"><table class="entry-h" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>';
      out += '<td class="e-main"><div class="e-title">' + escapeHtml(e.title) + '</div>' +
        (e.sub ? '<div class="e-sub">' + escapeHtml(e.sub) + '</div>' : '') + '</td>';
      if (e.date) out += '<td class="e-date">' + escapeHtml(e.date) + '</td>';
      out += '</tr></table>';
      open = true;
    } else {
      if (!open) { out += '<div class="entry">'; open = true; }
      if (!inList) { out += '<ul>'; inList = true; }
      out += '<li>' + escapeHtml(b.text) + '</li>';
    }
  });
  closeList();
  if (open) out += '</div>';
  return out;
}

// "Nombre (nivel)" -> { name, level }.
const CV_LEVEL_RE = /(básico|basico|principiante|inicial|beginner|elemental|intermedio|media|avanzado|advanced|experto|experta|nativo|nativa|native|fluido|fluida|\b[abc][12]\b)/i;
function cvSkillParse(text) {
  const t = String(text).trim();
  if (CV_LEVEL_RE.test(t)) {
    const m = t.match(/^(.*?)\s*[(\-–—:|·]\s*(.+)$/);
    if (m) return { name: m[1].trim(), level: m[2].replace(/[()]/g, '').trim() };
  }
  return { name: t, level: '' };
}

// Lista de habilidades; si hay niveles, tabla con el nivel a la derecha.
function cvSkills(blocks) {
  const parsed = blocks.map((b) => cvSkillParse(b.text));
  const withLevels = parsed.some((p) => p.level);
  if (!withLevels) {
    return '<ul>' + parsed.map((p) => '<li>' + escapeHtml(p.name) + '</li>').join('') + '</ul>';
  }
  return '<table class="skills" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    parsed.map((p) => '<tr><td class="sk-name">' + escapeHtml(p.name) + '</td>' +
      '<td class="sk-level">' + (p.level ? escapeHtml(p.level) : '') + '</td></tr>').join('') +
    '</table>';
}

// Elige el renderizador según el tipo de sección.
function cvSectionBody(section) {
  const k = section.key;
  if (k === 'experience' || k === 'education' || k === 'projects') return cvTimeline(section.blocks);
  if (k === 'skills' || k === 'languages') return cvSkills(section.blocks);
  return cvBlocks(section.blocks);
}

function buildProfessionalDoc(cvText, template, profile) {
  template = template || 'moderno';
  const doc = cvParse(cvText, profile);
  const name = doc.name || 'Currículum';
  const role = doc.role || '';
  const contact = doc.contact;

  // Estilos compartidos por los diseños de una columna.
  const entryCss = `
      .entry { margin:0 0 10pt 0; }
      .entry td { vertical-align:top; }
      td.e-main { padding-right:10pt; }
      .e-title { font-weight:700; font-size:10.8pt; }
      .e-sub { font-style:italic; font-size:9.8pt; color:#556; }
      td.e-date { text-align:right; white-space:nowrap; font-size:9.5pt; color:#556; }
      table.skills td { padding:1.5pt 0; }
      .sk-name { font-size:10pt; }
      .sk-level { text-align:right; font-size:9.5pt; color:#556; }
  `;

  const styles = {
    moderno: `
      @page { margin: 0; }
      html { background:#ffffff; }
      body { margin:0; padding:0; font-family:'Calibri','Segoe UI',Arial,sans-serif; color:#2b2b2b; font-size:10.5pt; line-height:1.45; }
      table.page { width:100%; border-collapse:collapse; }
      td.sidebar { padding:1.3cm 0.85cm; vertical-align:top; }
      td.cvmain { padding:1.3cm 1.1cm; vertical-align:top; }
      .cvname { font-size:21pt; font-weight:700; line-height:1.12; color:#ffffff; margin:0 0 3pt 0; }
      .cvrole { font-size:9.5pt; color:#E9C79A; text-transform:uppercase; letter-spacing:1.3pt; margin:0 0 4pt 0; font-weight:600; }
      td.sidebar h2 { font-size:9pt; text-transform:uppercase; letter-spacing:1.5pt; color:#E9C79A; border-bottom:1pt solid #5E8A82; padding-bottom:3pt; margin:15pt 0 6pt 0; font-weight:700; }
      td.sidebar p, td.sidebar li { font-size:9.3pt; color:#ffffff; margin:0 0 3pt 0; }
      td.sidebar ul { margin:0; padding-left:13pt; }
      td.sidebar .cline { margin:0 0 2pt 0; }
      td.sidebar .sk-name { color:#ffffff; font-size:9.3pt; }
      td.sidebar .sk-level { color:#BEE0D8; font-size:8.8pt; text-align:right; }
      td.cvmain h2 { font-size:11.5pt; text-transform:uppercase; letter-spacing:1.1pt; color:#24544C; border-bottom:1.5pt solid #24544C; padding-bottom:3pt; margin:14pt 0 7pt 0; font-weight:700; }
      td.cvmain p { margin:4pt 0; }
      td.cvmain ul { margin:4pt 0 6pt 0; padding-left:16pt; }
      td.cvmain li { margin-bottom:3pt; }
      .entry { margin:0 0 10pt 0; }
      .entry td { vertical-align:top; }
      td.e-main { padding-right:10pt; }
      td.cvmain .e-title { font-weight:700; color:#24544C; font-size:10.8pt; }
      td.cvmain .e-sub { color:#5a6b64; font-style:italic; font-size:9.8pt; }
      td.cvmain td.e-date { text-align:right; white-space:nowrap; color:#5a6b64; font-size:9.5pt; }
      td.cvmain table.skills td { padding:1pt 0; }
      td.cvmain .sk-name { color:#2b2b2b; font-size:10pt; }
      td.cvmain .sk-level { color:#5a6b64; font-size:9.5pt; text-align:right; }
    `,
    ejecutivo: `
      @page { margin: 1.8cm 2cm; }
      body { font-family:'Calibri','Segoe UI',Arial,sans-serif; color:#232323; font-size:10.5pt; line-height:1.5; max-width:21cm; margin:0 auto; }
      table.exec-head { width:100%; border-collapse:collapse; margin:0 0 14pt 0; }
      td.exec-head { padding:18pt 20pt; }
      .exec-name { font-size:26pt; font-weight:700; color:#ffffff; letter-spacing:0.4pt; }
      .exec-role { font-size:11pt; color:#BBD0E8; letter-spacing:1.4pt; text-transform:uppercase; margin-top:3pt; }
      .exec-contact { font-size:9.5pt; color:#DCE6F2; margin-top:7pt; }
      h2 { font-size:11.5pt; text-transform:uppercase; letter-spacing:1.6pt; color:#1F3A5F; border-bottom:1.5pt solid #1F3A5F; padding-bottom:3pt; margin:16pt 0 7pt 0; font-weight:700; }
      p { margin:4pt 0; }
      ul { margin:4pt 0 6pt 0; padding-left:18pt; }
      li { margin-bottom:3pt; }
      .e-title { color:#1F3A5F; }
      ${entryCss}
    `,
    clasico: `
      @page { margin: 2cm 2.2cm; }
      body { font-family:'Georgia','Times New Roman',serif; color:#1c1c1c; font-size:10.5pt; line-height:1.5; max-width:21cm; margin:0 auto; }
      .cvhead { text-align:center; border-bottom:1.5pt solid #1c1c1c; padding-bottom:11pt; margin:0 0 6pt 0; }
      .cvname { font-size:25pt; letter-spacing:3pt; text-transform:uppercase; margin:0; font-weight:400; }
      .cvrole { font-size:11pt; font-style:italic; color:#555; letter-spacing:1pt; margin:5pt 0 0 0; }
      .cvcontact { font-size:9.5pt; color:#444; margin:7pt 0 0 0; }
      h2 { font-size:11.5pt; text-transform:uppercase; letter-spacing:2pt; color:#1c1c1c; border-bottom:0.75pt solid #b9b9b9; padding-bottom:3pt; margin:18pt 0 8pt 0; font-weight:700; }
      p { margin:4pt 0; }
      ul { margin:4pt 0 6pt 0; padding-left:20pt; }
      li { margin-bottom:3pt; }
      .e-title { color:#1c1c1c; }
      td.e-date { color:#444; }
      ${entryCss}
    `,
    minimalista: `
      @page { margin: 2.4cm 3cm; }
      body { font-family:'Helvetica','Arial',sans-serif; color:#333; font-size:10.5pt; line-height:1.7; max-width:21cm; margin:0 auto; }
      .cvname { font-size:22pt; font-weight:300; letter-spacing:0.6pt; margin:0; }
      .cvrole { font-size:10.5pt; color:#8a8a8a; letter-spacing:0.8pt; margin:4pt 0 0 0; }
      .cvcontact { font-size:9.5pt; color:#8a8a8a; margin:7pt 0 0 0; }
      .cvrule { border-bottom:0.75pt solid #e0e0e0; margin:18pt 0 0 0; }
      h2 { font-size:9.5pt; text-transform:uppercase; letter-spacing:2.6pt; color:#111; margin:22pt 0 9pt 0; font-weight:600; }
      p { margin:6pt 0; }
      ul { margin:5pt 0 8pt 0; padding-left:16pt; }
      li { margin-bottom:5pt; }
      .entry { margin:0 0 12pt 0; }
      .e-title { font-weight:600; color:#111; }
      .e-sub { color:#888; }
      td.e-date { color:#999; }
      ${entryCss}
    `
  };

  let body = '';

  if (template === 'moderno') {
    // Dos columnas con barra lateral de color.
    const sidebarKeys = { skills: 1, languages: 1, courses: 1 };
    const priority = ['profile', 'experience', 'education', 'projects'];

    let side = '<div class="cvname">' + escapeHtml(name) + '</div>';
    if (role) side += '<div class="cvrole">' + escapeHtml(role) + '</div>';
    if (contact.length) {
      side += '<h2>Contacto</h2><div class="contact">';
      contact.forEach((c) => { side += '<p class="cline">' + escapeHtml(c) + '</p>'; });
      side += '</div>';
    }
    ['skills', 'languages', 'courses'].forEach((k) => {
      const s = doc.byKey[k];
      if (!s || !s.blocks.length) return;
      side += '<h2>' + escapeHtml(s.title) + '</h2>' + cvSectionBody(s);
    });

    const mainSections = cvOrderedMain(doc, sidebarKeys, priority);
    let mainHtml = '';
    mainSections.forEach((s) => { mainHtml += '<h2>' + escapeHtml(s.title) + '</h2>' + cvSectionBody(s); });

    body = '<table class="page" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td class="sidebar" bgcolor="#24544C" width="34%" valign="top">' + side + '</td>' +
      '<td class="cvmain" width="66%" valign="top">' + mainHtml + '</td>' +
      '</tr></table>';
  } else {
    // Diseños de una columna.
    const contactLine = contact.map((c) => escapeHtml(c)).join(' &nbsp;•&nbsp; ');

    let header = '';
    if (template === 'ejecutivo') {
      header = '<table class="exec-head" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td class="exec-head" bgcolor="#1F3A5F">' +
        '<div class="exec-name">' + escapeHtml(name) + '</div>' +
        (role ? '<div class="exec-role">' + escapeHtml(role) + '</div>' : '') +
        (contactLine ? '<div class="exec-contact">' + contactLine + '</div>' : '') +
        '</td></tr></table>';
    } else {
      header = '<div class="cvhead"><div class="cvname">' + escapeHtml(name) + '</div>' +
        (role ? '<div class="cvrole">' + escapeHtml(role) + '</div>' : '') +
        (contactLine ? '<div class="cvcontact">' + contactLine + '</div>' : '') +
        '</div>';
      if (template === 'minimalista') header += '<div class="cvrule"></div>';
    }

    const priority = ['profile', 'experience', 'education', 'projects', 'skills', 'languages', 'courses'];
    const main = cvOrderedMain(doc, {}, priority);
    body = header;
    main.forEach((s) => { body += '<h2>' + escapeHtml(s.title) + '</h2>' + cvSectionBody(s); });
  }

  const style = '<style>' + (styles[template] || styles.moderno) + '</style>';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Currículum Profesional</title>${style}</head>
<body>${body}</body>
</html>`;
}

/* ------------- documento .doc para el informe de progreso --------------- */
function buildReportDoc(report) {
  // report = { title, generated, sections: [{heading, lines:[...]}] }
  let html = '';
  if (report.title) html += `<h1 class="name">${escapeHtml(report.title)}</h1>`;
  if (report.generated) html += `<p class="title">Generado el ${escapeHtml(report.generated)}</p>`;
  report.sections.forEach((sec) => {
    html += `<h2 class="section">${escapeHtml(sec.heading)}</h2>`;
    (sec.lines || []).forEach((line) => {
      if (/^[-•*]\s+/.test(line)) html += `<ul><li>${escapeHtml(line.replace(/^[-•*]\s+/, ''))}</li></ul>`;
      else html += `<p class="body">${escapeHtml(line)}</p>`;
    });
  });
  const style = `<style>
    @page { margin: 2cm 2.2cm; }
    body { font-family:'Calibri','Segoe UI',sans-serif; color:#2b2b2b; line-height:1.55; font-size:11pt; max-width:21cm; margin:0 auto; }
    h1.name { font-size:22pt; color:#2F6259; border-bottom:3pt solid #2F6259; padding-bottom:6pt; }
    p.title { font-size:11pt; color:#C0863C; margin:6pt 0 18pt; }
    h2.section { font-size:12pt; color:#2F6259; text-transform:uppercase; letter-spacing:1pt; border-bottom:1pt solid #D6DED3; padding-bottom:3pt; margin:16pt 0 6pt; }
    p.body { margin:4pt 0; }
    ul { margin:2pt 0 6pt; padding-left:18pt; }
    li { margin-bottom:2pt; }
  </style>`;
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(report.title || 'Informe')}</title>${style}</head>
<body>${html}</body>
</html>`;
}

/* ----------------------------- descargas -------------------------------- */
function triggerDownload(filename, data, mime) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

/* ---------------- shim compatible con app.js ---------------------------- */
window.NW = window.NW || {};
window.NW.use = async function (cap) {
  if (cap === 'sample') {
    function sample(prompt, opts) { return callGemini(prompt, opts || {}); }
    sample.json = function (prompt) { return callGeminiJson(prompt); };
    return sample;
  }

  if (cap === 'downloads') {
    return {
      save: async ({ filename, data }) => {
        triggerDownload(filename, data, 'text/plain;charset=utf-8');
      },
      saveDoc: async ({ filename, cvText, template, profile }) => {
        const html = buildProfessionalDoc(cvText, template, profile);
        triggerDownload(filename, '\ufeff' + html, 'application/msword;charset=utf-8');
      },
      saveReportDoc: async ({ filename, report }) => {
        const html = buildReportDoc(report);
        triggerDownload(filename, '\ufeff' + html, 'application/msword;charset=utf-8');
      }
    };
  }

  throw new Error('Capacidad no soportada: ' + cap);
};

// Expuesto para la vista previa dentro de la app.
window.NW.buildCvDoc = buildProfessionalDoc;

console.log('[ai.js] Puente de IA cargado — usando proxy /api/gemini (sin clave en el cliente)');
