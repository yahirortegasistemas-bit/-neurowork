// analytics.js — Módulo de minería de datos y analítica de NeuroWork
// ---------------------------------------------------------------------------
// Funciones PURAS (reciben el estado y devuelven datos), más generadores de
// gráficas SVG sin dependencias externas.
//
// Funciona en dos entornos:
//   - Navegador: expone window.NWAnalytics
//   - Node (pruebas): module.exports
// ---------------------------------------------------------------------------

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NWAnalytics = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  /* ------------------------------ utilidades ------------------------------ */
  function esc(s) {
    s = (s === undefined || s === null) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function norm(s) { return String(s === undefined || s === null ? '' : s).toLowerCase().trim(); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }

  function dayKey(d) {
    d = d ? new Date(d) : new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function startOfWeek(d) {
    const x = new Date(d);
    if (isNaN(x.getTime())) return null;
    const day = (x.getDay() + 6) % 7; // lunes = 0
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x;
  }
  function fmtShort(d) {
    try {
      return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) { return dayKey(d).slice(5); }
  }

  /* --------------------------- indicadores base --------------------------- */
  const PROFILE_FIELDS = ['name', 'title', 'location', 'email', 'summary'];

  function profileCompleteness(profile) {
    profile = profile || {};
    const filled = PROFILE_FIELDS.filter(function (k) { return profile[k] && String(profile[k]).trim(); }).length;
    return Math.round((filled / PROFILE_FIELDS.length) * 100);
  }
  function checklistRate(checklist) {
    if (!checklist || checklist.length === 0) return null;
    const done = checklist.filter(function (i) { return i.done; }).length;
    return Math.round((done / checklist.length) * 100);
  }
  function goalsAvg(goals) {
    if (!goals || goals.length === 0) return null;
    const sum = goals.reduce(function (a, g) { return a + num(g.progress); }, 0);
    return Math.round(sum / goals.length);
  }

  /* ------------------------------ actividad ------------------------------- */
  const TYPE_LABELS = {
    perfil: 'Perfil', habilidades: 'Habilidades', cv: 'Currículum',
    entrevistas: 'Entrevistas', reuniones: 'Reuniones', checklist: 'Checklist',
    objetivos: 'Objetivos', preferencias: 'Preferencias', datos: 'Datos'
  };

  function activityByType(activity) {
    const counts = {};
    (activity || []).forEach(function (a) {
      const t = a && a.type ? a.type : 'otros';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.keys(counts).map(function (t) {
      return { type: t, label: TYPE_LABELS[t] || t, count: counts[t] };
    }).sort(function (a, b) { return b.count - a.count; });
  }

  // Actividad agrupada en las últimas N semanas (lunes a domingo).
  function weeklyActivity(activity, weeks) {
    weeks = weeks || 6;
    const currentMonday = startOfWeek(new Date());
    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(currentMonday);
      ws.setDate(currentMonday.getDate() - i * 7);
      buckets.push({ start: ws, label: fmtShort(ws), count: 0 });
    }
    (activity || []).forEach(function (a) {
      const ws = startOfWeek(a && a.date);
      if (!ws) return;
      const t = ws.getTime();
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].start.getTime() === t) { buckets[i].count++; break; }
      }
    });
    return buckets;
  }

  /* ------------------------------ habilidades ----------------------------- */
  function skillsByCategory(skills) {
    const map = {};
    (skills || []).forEach(function (s) {
      const c = s.category || 'Otra';
      if (!map[c]) map[c] = { category: c, count: 0, sum: 0 };
      map[c].count++;
      map[c].sum += num(s.level);
    });
    return Object.keys(map).map(function (c) {
      return { category: c, count: map[c].count, avgLevel: map[c].count ? map[c].sum / map[c].count : 0 };
    }).sort(function (a, b) { return b.count - a.count; });
  }

  function averageSkillLevel(skills) {
    if (!skills || skills.length === 0) return 0;
    const sum = skills.reduce(function (a, s) { return a + num(s.level); }, 0);
    return sum / skills.length;
  }

  /* ------------------------- práctica de entrevistas ---------------------- */
  function allPractice(state) {
    const items = [];
    const iv = (state && state.interview) || {};
    (iv.history || []).forEach(function (x) {
      items.push({ date: x.date, difficulty: x.difficulty });
    });
    (iv.sessions || []).forEach(function (s) {
      (s.questions || []).forEach(function (q) {
        items.push({ date: s.date, difficulty: q.difficulty });
      });
    });
    return items;
  }

  function difficultyCounts(items) {
    const counts = { facil: 0, media: 0, dificil: 0 };
    (items || []).forEach(function (x) {
      if (counts[x.difficulty] !== undefined) counts[x.difficulty]++;
    });
    return counts;
  }

  // Dificultad de las últimas N semanas (para ver evolución).
  function weeklyDifficulty(state, weeks) {
    weeks = weeks || 6;
    const currentMonday = startOfWeek(new Date());
    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(currentMonday);
      ws.setDate(currentMonday.getDate() - i * 7);
      buckets.push({ start: ws, label: fmtShort(ws), facil: 0, media: 0, dificil: 0, total: 0 });
    }
    allPractice(state).forEach(function (x) {
      const ws = startOfWeek(x.date);
      if (!ws) return;
      const t = ws.getTime();
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].start.getTime() === t) {
          if (buckets[i][x.difficulty] !== undefined) { buckets[i][x.difficulty]++; buckets[i].total++; }
          break;
        }
      }
    });
    return buckets;
  }

  /* ------------------------------- snapshots ------------------------------ */
  function makeSnapshot(state) {
    state = state || {};
    return {
      date: dayKey(),
      completeness: profileCompleteness(state.profile),
      checklist: checklistRate(state.checklist),
      goals: goalsAvg(state.goals),
      skills: (state.skills || []).length,
      interviews: allPractice(state).length
    };
  }

  // Añade/actualiza el snapshot de hoy. Muta el estado recibido.
  function ensureSnapshots(state) {
    if (!state) return state;
    if (!Array.isArray(state.snapshots)) state.snapshots = [];
    const s = makeSnapshot(state);
    let idx = -1;
    for (let i = 0; i < state.snapshots.length; i++) {
      if (state.snapshots[i].date === s.date) { idx = i; break; }
    }
    if (idx >= 0) state.snapshots[idx] = s; else state.snapshots.push(s);
    if (state.snapshots.length > 120) state.snapshots = state.snapshots.slice(-120);
    return state;
  }

  function metricSeries(state, key, limit) {
    limit = limit || 12;
    const snaps = ((state && state.snapshots) || []).slice(-limit);
    return {
      labels: snaps.map(function (s) { return String(s.date).slice(5); }),
      values: snaps.map(function (s) { return s[key] === null || s[key] === undefined ? 0 : num(s[key]); })
    };
  }

  /* ----------------------------- brecha de skills ------------------------- */
  function userHasSkill(userSkills, name) {
    const n = norm(name);
    if (!n) return false;
    return (userSkills || []).some(function (s) {
      const u = norm(s.name);
      if (!u) return false;
      return u === n || (u.length > 2 && (n.indexOf(u) !== -1 || u.indexOf(n) !== -1));
    });
  }

  function skillGap(userSkills, targetSkills) {
    const matched = [], missing = [];
    (targetSkills || []).forEach(function (t) {
      const name = typeof t === 'string' ? t : (t && t.name ? t.name : '');
      if (!name) return;
      if (userHasSkill(userSkills, name)) matched.push(name); else missing.push(name);
    });
    return { matched: matched, missing: missing };
  }

  /* ------------------------------- gráficas ------------------------------- */
  function emptyChart(msg) {
    return '<div class="empty" style="margin:0;">' + esc(msg) + '</div>';
  }

  function barChart(data, opts) {
    opts = opts || {};
    const W = 720, H = opts.height || 240;
    const padL = 46, padR = 16, padT = 18, padB = 44;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    data = data || [];
    if (data.length === 0) return emptyChart(opts.empty || 'Sin datos todavía');
    const max = Math.max.apply(null, data.map(function (d) { return num(d.value); }).concat([1]));
    const slot = plotW / data.length;
    const bw = Math.min(48, slot * 0.6);
    const color = opts.color || 'var(--primary)';
    let svg = '';
    for (let g = 0; g <= 4; g++) {
      const gy = padT + plotH - (plotH * g / 4);
      const val = Math.round(max * g / 4);
      svg += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';
      svg += '<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--ink-faint)">' + val + '</text>';
    }
    data.forEach(function (d, i) {
      const cx = padL + slot * i + slot / 2;
      const h = (num(d.value) / max) * plotH;
      const y = padT + plotH - h;
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="4" fill="' + color + '"/>';
      if (num(d.value) > 0) {
        svg += '<text x="' + cx.toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="11" fill="var(--ink-soft)">' + num(d.value) + '</text>';
      }
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - padB + 18) + '" text-anchor="middle" font-size="11" fill="var(--ink-faint)">' + esc(d.label) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" aria-hidden="true">' + svg + '</svg>';
  }

  function lineChart(labels, values, opts) {
    opts = opts || {};
    const W = 720, H = opts.height || 240;
    const padL = 46, padR = 16, padT = 18, padB = 44;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    labels = labels || []; values = values || [];
    const n = values.length;
    if (n === 0) return emptyChart(opts.empty || 'Sin datos todavía');
    const max = Math.max.apply(null, values.map(num).concat([1]));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? padL + plotW / 2 : padL + (plotW * i / (n - 1));
      const y = padT + plotH - (num(values[i]) / max) * plotH;
      pts.push([x, y]);
    }
    let svg = '';
    for (let g = 0; g <= 4; g++) {
      const gy = padT + plotH - (plotH * g / 4);
      const val = Math.round(max * g / 4);
      svg += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';
      svg += '<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--ink-faint)">' + val + '</text>';
    }
    const poly = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    svg += '<polyline points="' + poly + '" fill="none" stroke="' + (opts.color || 'var(--accent)') + '" stroke-width="2.5" stroke-linejoin="round"/>';
    pts.forEach(function (p, i) {
      svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="' + (opts.color || 'var(--accent)') + '"/>';
      svg += '<text x="' + p[0].toFixed(1) + '" y="' + (H - padB + 18) + '" text-anchor="middle" font-size="11" fill="var(--ink-faint)">' + esc(labels[i] || '') + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" aria-hidden="true">' + svg + '</svg>';
  }

  function radarChart(axes, opts) {
    opts = opts || {};
    axes = axes || [];
    const S = 360, c = S / 2, r = c - 52;
    const N = axes.length;
    if (N < 3) return emptyChart(opts.empty || 'Necesitas al menos 3 categorías');
    function pt(i, val) {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      return [c + Math.cos(ang) * r * val, c + Math.sin(ang) * r * val];
    }
    let svg = '';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      const p = [];
      for (let i = 0; i < N; i++) { const q = pt(i, f); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      svg += '<polygon points="' + p.join(' ') + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
    });
    for (let i = 0; i < N; i++) {
      const q = pt(i, 1);
      svg += '<line x1="' + c + '" y1="' + c + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';
      const lp = pt(i, 1.2);
      svg += '<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" text-anchor="middle" font-size="11" fill="var(--ink-soft)">' + esc(axes[i].label) + '</text>';
    }
    const poly = [];
    for (let i = 0; i < N; i++) {
      const v = Math.max(0, Math.min(1, num(axes[i].value)));
      const q = pt(i, v);
      poly.push(q[0].toFixed(1) + ',' + q[1].toFixed(1));
    }
    svg += '<polygon points="' + poly.join(' ') + '" fill="color-mix(in srgb, var(--primary) 40%, transparent)" stroke="var(--primary)" stroke-width="2"/>';
    for (let i = 0; i < N; i++) {
      const v = Math.max(0, Math.min(1, num(axes[i].value)));
      const q = pt(i, v);
      svg += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.2" fill="var(--primary)"/>';
    }
    return '<svg viewBox="0 0 ' + S + ' ' + S + '" style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto;" aria-hidden="true">' + svg + '</svg>';
  }

  /* ----------------------------- recomendaciones -------------------------- */
  function recommendations(state) {
    state = state || {};
    const out = [];
    const skills = state.skills || [];
    const checklist = state.checklist || [];
    const goals = state.goals || [];
    const cv = state.cv || {};
    const iv = state.interview || {};

    if (skills.length === 0) out.push({ title: 'Registra tu primera habilidad', detail: 'La minería de datos mejora cuando hay habilidades que analizar.', go: 'habilidades' });
    if (profileCompleteness(state.profile) < 100) out.push({ title: 'Completa tu perfil profesional', detail: 'Es la base del CV y de las comparaciones con vacantes.', go: 'perfil' });
    if (!cv.text) out.push({ title: 'Genera un borrador de CV', detail: 'Sin CV no podemos medir tu preparación documental.', go: 'cv' });
    if (!iv.vacancySkills || iv.vacancySkills.length === 0) out.push({ title: 'Analiza una vacante', detail: 'Permite calcular la brecha entre tus habilidades y lo que piden.', go: 'entrevistas' });
    if (checklist.length === 0) out.push({ title: 'Crea tu checklist laboral', detail: 'Ayuda a medir tu progreso semanal.', go: 'checklist' });
    if (goals.length === 0) out.push({ title: 'Define un objetivo', detail: 'Sin metas no hay evolución que analizar.', go: 'objetivos' });

    const diff = difficultyCounts(allPractice(state));
    const totalDiff = diff.facil + diff.media + diff.dificil;
    if (totalDiff >= 3 && diff.dificil > diff.facil) {
      out.push({ title: 'Refuerza las preguntas difíciles', detail: 'La mayoría de tus prácticas fueron difíciles; repetir simulacros suele ayudar.', go: 'entrevistas' });
    }
    const gAvg = goalsAvg(goals);
    if (gAvg !== null && gAvg < 40 && goals.length > 0) {
      out.push({ title: 'Revisa tus objetivos', detail: 'El avance medio es bajo; quizá conviene dividirlos en pasos más pequeños.', go: 'objetivos' });
    }
    return out;
  }

  /* --------------------------- informe exportable ------------------------- */
  function buildReport(state) {
    state = state || {};
    const profile = state.profile || {};
    const skills = state.skills || [];
    const cv = state.cv || {};
    const goals = state.goals || [];
    const checklist = state.checklist || [];
    const cats = skillsByCategory(skills);
    const byType = activityByType(state.activity || []);
    const diff = difficultyCounts(allPractice(state));
    const gap = skillGap(skills, (state.interview || {}).vacancySkills || []);

    const sections = [];
    sections.push({
      heading: 'Resumen del perfil',
      lines: [
        'Nombre: ' + (profile.name || 'No especificado'),
        'Título profesional: ' + (profile.title || 'No especificado'),
        'Perfil completo: ' + profileCompleteness(profile) + '%',
        'Habilidades registradas: ' + skills.length,
        'Nivel medio de confianza: ' + (skills.length ? averageSkillLevel(skills).toFixed(1) + '/5' : 'sin datos')
      ]
    });

    sections.push({
      heading: 'Habilidades por categoría',
      lines: cats.length
        ? cats.map(function (c) { return '- ' + c.category + ': ' + c.count + ' (nivel medio ' + c.avgLevel.toFixed(1) + '/5)'; })
        : ['Sin habilidades registradas todavía.']
    });

    if ((state.interview || {}).vacancySkills && (state.interview || {}).vacancySkills.length) {
      sections.push({
        heading: 'Brecha frente a la vacante analizada',
        lines: [
          'Coincidencias (' + gap.matched.length + '): ' + (gap.matched.join(', ') || 'ninguna'),
          'Faltantes (' + gap.missing.length + '): ' + (gap.missing.join(', ') || 'ninguna')
        ]
      });
    }

    sections.push({
      heading: 'Currículum',
      lines: [
        cv.text ? 'CV redactado (última edición: ' + (cv.updated || 'sin fecha') + ')' : 'Todavía no hay CV.',
        cv.role ? 'Puesto objetivo: ' + cv.role : 'Sin puesto objetivo definido.'
      ]
    });

    sections.push({
      heading: 'Objetivos y checklist',
      lines: [
        'Objetivos: ' + goals.length + (goalsAvg(goals) !== null ? ' (avance medio ' + goalsAvg(goals) + '%)' : ''),
        'Checklist: ' + checklist.length + ' tareas' + (checklistRate(checklist) !== null ? ' (' + checklistRate(checklist) + '% completado)' : '')
      ]
    });

    sections.push({
      heading: 'Práctica de entrevistas',
      lines: [
        'Preguntas practicadas: ' + (diff.facil + diff.media + diff.dificil),
        '- Fáciles: ' + diff.facil,
        '- Medias: ' + diff.media,
        '- Difíciles: ' + diff.dificil
      ]
    });

    sections.push({
      heading: 'Actividad por sección',
      lines: byType.length
        ? byType.map(function (t) { return '- ' + t.label + ': ' + t.count + ' acciones'; })
        : ['Sin actividad registrada todavía.']
    });

    const recs = recommendations(state);
    sections.push({
      heading: 'Recomendaciones derivadas de los datos',
      lines: recs.length ? recs.map(function (r) { return '- ' + r.title + ': ' + r.detail; }) : ['Sin recomendaciones por ahora.']
    });

    return {
      title: 'Informe de progreso — NeuroWork',
      generated: fmtShort(new Date()) + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      sections: sections
    };
  }

  /* --------------------------------- API ---------------------------------- */
  return {
    // utilidades
    esc: esc, dayKey: dayKey, fmtShort: fmtShort,
    // indicadores
    profileCompleteness: profileCompleteness,
    checklistRate: checklistRate,
    goalsAvg: goalsAvg,
    averageSkillLevel: averageSkillLevel,
    // actividad
    TYPE_LABELS: TYPE_LABELS,
    activityByType: activityByType,
    weeklyActivity: weeklyActivity,
    // habilidades
    skillsByCategory: skillsByCategory,
    // entrevistas
    allPractice: allPractice,
    difficultyCounts: difficultyCounts,
    weeklyDifficulty: weeklyDifficulty,
    // snapshots
    makeSnapshot: makeSnapshot,
    ensureSnapshots: ensureSnapshots,
    metricSeries: metricSeries,
    // brecha
    userHasSkill: userHasSkill,
    skillGap: skillGap,
    // gráficas
    barChart: barChart,
    lineChart: lineChart,
    radarChart: radarChart,
    // análisis
    recommendations: recommendations,
    buildReport: buildReport
  };
});
