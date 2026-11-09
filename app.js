(function(){
"use strict";

/* ---------------- DEBUG / DIAGNOSTICS ---------------- */
var debugLines = [];
function debugLog(msg){
  var t = new Date().toLocaleTimeString('es-ES');
  debugLines.push('['+t+'] '+msg);
  if(debugLines.length>150) debugLines.shift();
  var body = document.getElementById('debugBody');
  if(body) body.textContent = debugLines.join('\n');
}
window.addEventListener('error', function(e){
  debugLog('ERROR JS: '+e.message+' ('+(e.filename?e.filename.split('/').pop():'?')+':'+e.lineno+')');
});
window.addEventListener('unhandledrejection', function(e){
  var r = e.reason;
  var msg = (r && (r.message||r.code)) ? (r.message||r.code) : JSON.stringify(r);
  debugLog('PROMESA RECHAZADA: '+msg);
});
debugLog('App iniciando. window.NW disponible: '+(!!(window.NW && window.NW.use)));

/* ---------------- ICONS ---------------- */
var ICONS = {
  dashboard:'<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-6h2v6h5v-9"/>',
  analitica:'<path d="M4 4v16h16"/><rect x="7" y="13" width="3" height="4"/><rect x="12" y="9" width="3" height="8"/><rect x="17" y="6" width="3" height="11"/>',
  perfil:'<circle cx="12" cy="8.6" r="3.3"/><path d="M5 20c1.1-4.2 3.9-6.2 7-6.2s5.9 2 7 6.2"/>',
  habilidades:'<path d="M12 3.2c2.8 2.8 4.7 5.7 4.7 8.6a4.7 4.7 0 0 1-9.4 0c0-2.9 1.9-5.8 4.7-8.6Z"/>',
  cv:'<rect x="6" y="3.4" width="12" height="17.2" rx="1.6"/><path d="M9 8h6M9 11.4h6M9 14.8h3.6"/>',
  entrevistas:'<path d="M4 5.3h16v10.2H9.2L5 19v-3.5H4Z"/>',
  reuniones:'<circle cx="9" cy="8.8" r="2.6"/><circle cx="16.3" cy="10" r="2.05"/><path d="M4 19.2c.7-3.4 2.7-5 5-5s4.3 1.6 5 5"/><path d="M14.4 15.6c1.8.3 3 1.6 3.5 3.6"/>',
  checklist:'<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2.4"/><path d="M8 12.2l2.6 2.6L16.4 9"/>',
  objetivos:'<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="3.9"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  preferencias:'<path d="M4 6.5h10M4 12h6M4 17.5h13"/><circle cx="16.5" cy="6.5" r="2.1"/><circle cx="12" cy="17.5" r="2.1"/>',
  privacidad:'<path d="M12 3.4 19 6v5.4c0 4.6-3 7.8-7 9.2-4-1.4-7-4.6-7-9.2V6Z"/><path d="M9.4 12 11.3 13.9 15 10"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24">'+ICONS[name]+'</svg>';}

var NAV = [
  {id:'dashboard', label:'Panel'},
  {id:'analitica', label:'Progreso'},
  {id:'perfil', label:'Perfil'},
  {id:'habilidades', label:'Habilidades'},
  {id:'cv', label:'CV'},
  {id:'entrevistas', label:'Entrevistas'},
  {id:'reuniones', label:'Reuniones'},
  {id:'checklist', label:'Checklist'},
  {id:'objetivos', label:'Objetivos'},
  {id:'preferencias', label:'Preferencias'},
  {id:'privacidad', label:'Privacidad'}
];
var TITLES = {
  dashboard:['Panel','Tu progreso de hoy'],
  analitica:['Progreso','Minería de datos de tu avance'],
  perfil:['Perfil profesional','La base de tu CV y tus entrevistas'],
  habilidades:['Habilidades','Lo que sabes hacer, a tu propio ritmo'],
  cv:['Currículum','Genera y ajusta tu CV'],
  entrevistas:['Entrevistas','Entiende vacantes y practica respuestas'],
  reuniones:['Reuniones','Convierte instrucciones en pasos claros'],
  checklist:['Checklist laboral','Tus tareas, sin sobrecarga'],
  objetivos:['Objetivos','Metas pequeñas, avance real'],
  preferencias:['Preferencias','Cómo te gusta trabajar'],
  privacidad:['Privacidad y datos','Qué guardamos y cómo lo protegemos']
};

/* ---------------- STATE ---------------- */
var STORE_KEY = 'neurowork_state_v1';
var localStorageOK = true;
(function testLocalStorage(){
  try{
    var k = '__neurowork_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
  }catch(e){ localStorageOK = false; }
})();
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

function defaultState(){
  return {
    profile:{name:'',title:'',location:'',email:'',phone:'',summary:'',experience:[],education:[]},
    skills:[],
    cv:{text:'', role:'', updated:null, template:'moderno'},
    interview:{vacancyNotes:'', vacancySkills:[], history:[], sessions:[], preparedAnswers:[], prepPlan:null},
    meetings:{history:[]},
    checklist:[],
    goals:[],
    activity:[],
    snapshots:[],
    preferences:{modality:'', schedule:'', communication:'', pace:'', accommodations:'', notes:''}
  };
}
var state = loadLocalState();
function fillDefaults(parsed){
  var d = defaultState();
  for(var k in d){
    if(!(k in parsed)) parsed[k]=d[k];
  }
  if(!parsed.preferences) parsed.preferences = d.preferences;
  if(!parsed.cv.template) parsed.cv.template = 'moderno';
  if(!parsed.interview) parsed.interview = d.interview;
  if(!parsed.interview.sessions) parsed.interview.sessions = [];
  if(!parsed.interview.vacancySkills) parsed.interview.vacancySkills = [];
  if(!parsed.interview.preparedAnswers) parsed.interview.preparedAnswers = [];
  if(parsed.interview.prepPlan === undefined) parsed.interview.prepPlan = null;
  if(!parsed.snapshots) parsed.snapshots = [];
  return parsed;
}
var hadLocalData = false;
function loadLocalState(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    hadLocalData = true;
    return fillDefaults(JSON.parse(raw));
  }catch(e){ console.error('load error', e); return defaultState(); }
}
var userInteracted = false;
var storageWarnShown = false;
function saveState(){
  userInteracted = true;
  if(window.NWAnalytics){ try{ window.NWAnalytics.ensureSnapshots(state); }catch(e){} }
  if(!localStorageOK){
    debugLog('saveState: localStorage NO disponible. Se intentará guardar solo en la base de datos.');
    scheduleServerSave();
    showStorageWarning();
    return false;
  }
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    debugLog('saveState: guardado en localStorage OK ('+JSON.stringify(state).length+' bytes).');
    scheduleServerSave();
    return true;
  }catch(e){
    console.error('save error', e);
    debugLog('saveState: EXCEPCIÓN al guardar en localStorage: '+e.message);
    localStorageOK = false;
    showStorageWarning();
    return false;
  }
}
function showStorageWarning(){
  if(storageWarnShown) return;
  storageWarnShown = true;
  var bar = document.createElement('div');
  bar.id = 'storageWarnBar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100;background:var(--danger);color:#fff;padding:10px 16px;font-size:13px;text-align:center;font-weight:700;';
  bar.textContent = 'Tu navegador está bloqueando el guardado local en este sitio. Tus cambios se mantendrán solo mientras esta pestaña siga abierta.';
  document.body.prepend(bar);
  document.body.style.paddingTop = '42px';
}

/* ---------------- VERIFICACIÓN DE SALUD / DIAGNÓSTICO IA ---------------- */
function showTopBanner(id, text){
  if(document.getElementById(id)) return;
  if(document.getElementById('storageWarnBar')) return; // evitar solapamiento
  var bar = document.createElement('div');
  bar.id = id;
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100;background:var(--accent);color:#22201a;padding:10px 16px;font-size:13px;text-align:center;font-weight:700;line-height:1.35;';
  bar.textContent = text;
  document.body.prepend(bar);
  document.body.style.paddingTop = '46px';
}

function initHealthCheck(){
  if(location.protocol === 'file:'){
    showTopBanner('bannerFile', 'Estás abriendo la app como archivo. Ábrela en http://127.0.0.1:8787 para que la IA funcione. Ejecuta "node server/server.js".');
    return;
  }
  fetch('/api/health').then(function(r){ return r.json(); }).then(function(h){
    if(!h.keyConfigured){
      showTopBanner('bannerKey', 'La IA no está configurada: falta la API key de Gemini. Crea una en aistudio.google.com/app/apikey y colócala en server/.env (GEMINI_API_KEY=...).');
    } else if(!h.keyLooksValid){
      showTopBanner('bannerKey', 'La API key configurada no parece válida. Corrígela en server/.env y reinicia el servidor.');
    }
  }).catch(function(){
    showTopBanner('bannerSrv', 'No se pudo contactar al servidor de IA. Ejecuta "node server/server.js" y abre http://127.0.0.1:8787.');
  });
}

/* ---------------- ALMACENAMIENTO ---------------- */
// Doble persistencia:
//   1) localStorage  -> siempre (funciona incluso sin servidor / offline).
//   2) Base de datos -> si el servidor está activo (server/data/neurowork.db).
// Si no hay servidor, la app sigue funcionando solo con localStorage.
var storageMode = 'local';

/* --------- respaldo/recuperación en la base de datos relacional ---------- */
var serverSync = { supported:false, available:false, lastSaved:null, lastError:null };
var syncTimer = null;
function serverReachable(){ return typeof location !== 'undefined' && location.protocol !== 'file:'; }

function scheduleServerSave(){
  if(!serverReachable()) return;
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(serverSaveNow, 800);
}

function deleteServerState(){
  if(!serverReachable()) return;
  if(syncTimer){ clearTimeout(syncTimer); syncTimer = null; }
  fetch('/api/state?workspaceId=local', {method:'DELETE'})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(){ serverSync.lastSaved = null; serverSync.available = false; debugLog('sync: respaldo borrado de la base de datos.'); })
    .catch(function(e){ debugLog('sync: no se pudo borrar el respaldo ('+((e && e.message) || e)+').'); });
}

function serverSaveNow(){
  if(!serverReachable()) return;
  var body;
  try{ body = JSON.stringify({ workspaceId:'local', state:state }); }
  catch(e){ serverSync.lastError = 'No se pudo serializar el estado'; return; }
  fetch('/api/state', {method:'PUT', headers:{'Content-Type':'application/json'}, body:body})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(){
      serverSync.supported = true; serverSync.available = true;
      serverSync.lastError = null; serverSync.lastSaved = new Date().toISOString();
      debugLog('sync: estado respaldado en la base de datos (SQLite).');
    })
    .catch(function(e){
      serverSync.available = false; serverSync.lastError = String((e && e.message) || e);
      debugLog('sync: base de datos no disponible ('+serverSync.lastError+'). Se mantiene localStorage.');
    });
}

// Al iniciar: si NO había datos locales pero el servidor tiene un respaldo, se
// recupera. Nunca se sobrescribe un estado local existente.
function restoreFromServer(){
  if(!serverReachable() || hadLocalData) return;
  fetch('/api/state?workspaceId=local').then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if(d && d.exists && d.state){
        state = fillDefaults(d.state);
        hadLocalData = true;
        saveState();
        render();
        toast('Datos recuperados de la base de datos local');
      }
    })
    .catch(function(){ /* sin servidor: no pasa nada */ });
}

function updateIdentityUI(){
  var nameEl = document.getElementById('identityName');
  var modeEl = document.getElementById('identityMode');
  var avatarEl = document.getElementById('identityAvatar');
  if(!nameEl) return;
  nameEl.textContent = 'Modo local';
  var extra = serverSync.available ? ' + base de datos' : '';
  modeEl.innerHTML = '<span class="identity-dot"></span>Guardado en este navegador' + extra;
  if(avatarEl) avatarEl.style.display = 'none';
}
function logActivity(type, detail){
  state.activity.unshift({id:uid(), date:new Date().toISOString(), type:type, detail:detail});
  state.activity = state.activity.slice(0,60);
}

/* ---------------- TOAST ---------------- */
function toast(msg){
  var wrap = document.getElementById('toastWrap');
  var el = document.createElement('div');
  el.className='toast'; el.textContent=msg;
  wrap.appendChild(el);
  setTimeout(function(){ el.remove(); }, 2600);
}

/* ---------------- CAPABILITIES ---------------- */
var sampleFn = null;
var downloadsFn = null;
var capsReady = false;
function initCapabilities(){
  if(!window.NW || !window.NW.use){ capsReady=true; return; }
  Promise.all([
    window.NW.use('sample').catch(function(){ return null; }),
    window.NW.use('downloads').catch(function(){ return null; })
  ]).then(function(res){
    sampleFn = res[0]; downloadsFn = res[1]; capsReady = true;
    debugLog('sample disponible: '+(!!sampleFn)+' | downloads disponible: '+(!!downloadsFn));
    render();
  }).catch(function(){ capsReady = true; });
}

function aiUnavailableNote(){
  return '<p class="ai-unavailable">La generación con IA no está disponible en esta vista. Puedes completar esta sección manualmente.</p>';
}

/* ---------------- NAV / RENDER SHELL ---------------- */
var current = 'dashboard';

function buildNav(){
  var navList = document.getElementById('navList');
  navList.innerHTML = NAV.map(function(item){
    return '<button class="nav-item'+(item.id===current?' active':'')+'" data-nav="'+item.id+'" type="button"'+(item.id===current?' aria-current="page"':'')+'>'+
      icon(item.id)+'<span class="nav-label-sub">'+item.label+'</span></button>';
  }).join('');
  Array.prototype.forEach.call(navList.querySelectorAll('[data-nav]'), function(btn){
    btn.addEventListener('click', function(){ go(btn.getAttribute('data-nav')); });
  });
}

function go(section){
  current = section;
  document.getElementById('topTitle').textContent = TITLES[section][0];
  document.getElementById('topSub').textContent = TITLES[section][1];
  buildNav();
  render();
  document.getElementById('content').scrollTop = 0;
  window.scrollTo(0,0);
}

function render(){
  var fn = {
    dashboard: renderDashboard,
    analitica: renderAnalitica,
    perfil: renderPerfil,
    habilidades: renderHabilidades,
    cv: renderCV,
    entrevistas: renderEntrevistas,
    reuniones: renderReuniones,
    checklist: renderChecklist,
    objetivos: renderObjetivos,
    preferencias: renderPreferencias,
    privacidad: renderPrivacidad
  }[current];
  document.getElementById('content').innerHTML = fn();
  updateIdentityUI();
  wireCurrentSection();
}

/* ================= DASHBOARD ================= */
function profileCompleteness(){
  var p = state.profile; var fields=[p.name,p.title,p.location,p.email,p.summary];
  var filled = fields.filter(function(v){return v && v.trim();}).length;
  return Math.round((filled/fields.length)*100);
}
function checklistRate(){
  if(state.checklist.length===0) return null;
  var done = state.checklist.filter(function(i){return i.done;}).length;
  return Math.round((done/state.checklist.length)*100);
}
function goalsAvg(){
  if(state.goals.length===0) return null;
  var sum = state.goals.reduce(function(a,g){return a+g.progress;},0);
  return Math.round(sum/state.goals.length);
}
function difficultyPattern(){
  var A = window.NWAnalytics;
  var items = A ? A.allPractice(state) : (state.interview.history||[]);
  if(items.length===0) return null;
  var counts={facil:0,media:0,dificil:0};
  items.forEach(function(x){ if(counts[x.difficulty]!==undefined) counts[x.difficulty]++; });
  return counts;
}
// Cuenta las prácticas de entrevista usando la MISMA fuente que la gráfica de
// dificultad (allPractice = historial + sesiones). Antes el panel leía solo
// state.interview.history, que el simulador ya no usa, y marcaba 0.
function practiceCount(){
  var A = window.NWAnalytics;
  var items = A ? A.allPractice(state) : (state.interview.history||[]);
  return items.length;
}

function renderDashboard(){
  var name = state.profile.name ? state.profile.name.split(' ')[0] : '';
  var pct = profileCompleteness();
  var ck = checklistRate();
  var ga = goalsAvg();
  var diff = difficultyPattern();

  var html = '';
  html += '<div class="card row decl-hide" style="align-items:center;">';
  html += '  <div style="display:flex;align-items:center;gap:16px;">';
  html += '    <div class="avatar-ring" style="--pct:'+pct+'"><div class="avatar-ring-inner">'+pct+'%</div></div>';
  html += '    <div><h2 style="margin-bottom:4px;">'+(name?('Hola, '+esc(name)):'Bienvenido/a')+'</h2>';
  html += '    <p style="margin:0;">Perfil completo al '+pct+'%. '+(pct<100?'Suma algunos datos más para fortalecer tu CV.':'Tu perfil está completo.')+'</p></div>';
  html += '  </div>';
  html += '  <button class="btn btn-primary" data-go="perfil">Completar perfil</button>';
  html += '</div>';

  html += '<div class="grid-stats">';
  html += statCard(state.skills.length, 'Habilidades registradas');
  html += statCard(ck===null?'—':ck+'%', 'Checklist completado');
  html += statCard(ga===null?'—':ga+'%', 'Avance en objetivos');
  html += statCard(practiceCount(), 'Entrevistas practicadas');
  html += '</div>';

  html += '<div class="grid-2">';
  html += '<div class="card"><h2>Actividad reciente</h2>';
  if(state.activity.length===0){
    html += '<div class="empty">Todavía no hay actividad. Empieza por tu perfil o tus habilidades.</div>';
  } else {
    html += state.activity.slice(0,6).map(function(a){
      return '<div class="list-row"><div><div style="font-size:13.5px;color:var(--ink);">'+esc(a.detail)+'</div>'+
        '<div style="font-size:12px;color:var(--ink-faint);margin-top:2px;">'+fmtDate(a.date)+'</div></div></div>';
    }).join('');
  }
  html += '</div>';

  html += '<div class="card"><h2>Patrones de dificultad</h2>';
  if(!diff){
    html += '<div class="empty">Practica una entrevista en el simulador para ver tus patrones aquí.</div>';
  } else {
    var total = diff.facil+diff.media+diff.dificil;
    html += diffBar('Fácil', diff.facil, total);
    html += diffBar('Media', diff.media, total);
    html += diffBar('Difícil', diff.dificil, total);
  }
  html += '</div>';
  html += '</div>';

  html += '<div class="card decl-hide"><h2>Próximos pasos sugeridos</h2>';
  var sugs = [];
  if(state.skills.length===0) sugs.push({t:'Agrega tu primera habilidad', s:'habilidades'});
  if(!state.cv.text) sugs.push({t:'Genera un borrador de CV', s:'cv'});
  if(state.checklist.length===0) sugs.push({t:'Crea tu checklist laboral', s:'checklist'});
  if(state.goals.length===0) sugs.push({t:'Define un primer objetivo', s:'objetivos'});
  if(sugs.length===0){
    html += '<div class="empty">Vas muy bien. Sigue registrando tu progreso cada semana.</div>';
  } else {
    html += sugs.map(function(s){
      return '<div class="list-row"><div style="font-size:13.5px;">'+s.t+'</div><button class="btn btn-sm" data-go="'+s.s+'">Ir</button></div>';
    }).join('');
  }
  html += '</div>';
  return html;
}
function statCard(num,label){
  return '<div class="stat-card"><div class="stat-num">'+num+'</div><div class="stat-label">'+label+'</div></div>';
}
function diffBar(label,count,total){
  var pct = total? Math.round((count/total)*100):0;
  return '<div style="margin-bottom:10px;"><div class="row" style="margin-bottom:5px;"><span style="font-size:13px;">'+label+'</span><span style="font-size:12px;color:var(--ink-faint);">'+count+'</span></div>'+
    '<div class="bar-track"><div class="bar-fill accent" style="width:'+pct+'%"></div></div></div>';
}

/* ================= PROGRESO (MINERÍA DE DATOS) ================= */
var analiticaWeeks = 6;
function renderAnalitica(){
  var A = window.NWAnalytics;
  if(!A){ return '<div class="empty">Módulo de analítica no disponible (analytics.js no cargó).</div>'; }
  A.ensureSnapshots(state);

  var pct = A.profileCompleteness(state.profile);
  var ck = A.checklistRate(state.checklist);
  var ga = A.goalsAvg(state.goals);
  var practice = A.allPractice(state);
  var diff = A.difficultyCounts(practice);
  var totalPractice = diff.facil + diff.media + diff.dificil;

  var html = '';

  // Encabezado + filtro de rango temporal
  html += '<div class="card"><div class="section-head" style="margin-bottom:8px;"><h2 style="margin:0;">Panel de progreso</h2>';
  html += '<div class="btn-row" id="weeksFilter">';
  [4,6,12].forEach(function(w){
    html += '<button class="btn btn-sm'+(analiticaWeeks===w?' btn-primary':'')+'" data-weeks="'+w+'" type="button">'+w+' sem</button>';
  });
  html += '</div></div>';
  html += '<p style="margin:0;">Todos los indicadores se calculan a partir de tus datos guardados. No se inventa ninguna cifra: si falta información, verás un estado vacío que explica cómo generarla.</p></div>';

  // Métricas principales
  html += '<div class="grid-stats">';
  html += statCard(pct+'%','Perfil completo');
  html += statCard(ck===null?'—':ck+'%','Checklist');
  html += statCard(ga===null?'—':ga+'%','Objetivos');
  html += statCard(state.skills.length,'Habilidades');
  html += '</div>';

  // Evolución de la actividad
  var weeks = A.weeklyActivity(state.activity, analiticaWeeks);
  var totalActs = weeks.reduce(function(a,w){ return a+w.count; },0);
  html += '<div class="card"><h2>Actividad por semana</h2>';
  html += '<p style="margin-top:0;font-size:13px;">Acciones registradas por semana (lunes a domingo). Se calcula agrupando el registro de actividad por la fecha de cada acción.</p>';
  if(totalActs===0){
    html += '<div class="empty">Aún no hay actividad registrada. Empieza a usar las secciones (perfil, habilidades, CV, entrevistas…) y aparecerá aquí.</div>';
  } else {
    html += A.barChart(weeks.map(function(w){ return {label:w.label, value:w.count}; }), {color:'var(--primary)'});
  }
  html += '</div>';

  // Evolución del perfil en el tiempo (snapshots)
  var series = A.metricSeries(state, 'completeness', 12);
  html += '<div class="card"><h2>Evolución del perfil</h2>';
  html += '<p style="margin-top:0;font-size:13px;">Porcentaje de perfil completo a lo largo del tiempo. Se guarda un registro diario automático cuando usas la app.</p>';
  if(series.values.length < 2){
    html += '<div class="empty">Necesitamos al menos dos días de uso para dibujar una tendencia. Vuelve mañana o usa la app en días distintos.</div>';
  } else {
    html += A.lineChart(series.labels, series.values, {color:'var(--accent)'});
  }
  html += '</div>';

  // Perfil de habilidades
  var cats = A.skillsByCategory(state.skills);
  html += '<div class="card"><h2>Perfil de habilidades</h2>';
  html += '<p style="margin-top:0;font-size:13px;">Distribución de tu nivel de confianza (1–5) por categoría.</p>';
  if(cats.length===0){
    html += '<div class="empty">Sin habilidades registradas. Añádelas en la sección <strong>Habilidades</strong> para ver tu perfil.</div>';
  } else {
    html += '<div class="grid-2" style="align-items:center;">';
    if(cats.length>=3){
      html += '<div>'+A.radarChart(cats.slice(0,6).map(function(c){ return {label:c.category, value:c.avgLevel/5}; }))+'</div>';
    } else {
      html += '<div></div>';
    }
    html += '<div>'+A.barChart(cats.map(function(c){ return {label:c.category, value:c.count}; }), {height:220, color:'var(--accent)'})+'</div>';
    html += '</div>';
    html += '<p style="font-size:12.5px;color:var(--ink-faint);margin:8px 0 0;">Nivel medio de confianza global: '+A.averageSkillLevel(state.skills).toFixed(1)+'/5 · Habilidades: '+state.skills.length+'</p>';
  }
  html += '</div>';

  // Dificultad en entrevistas
  html += '<div class="card"><h2>Dificultad de las entrevistas</h2>';
  html += '<p style="margin-top:0;font-size:13px;">Cómo calificaste cada pregunta practicada (fácil / media / difícil). Total: '+totalPractice+' prácticas.</p>';
  if(totalPractice===0){
    html += '<div class="empty">Aún no has practicado entrevistas. Usa el <strong>Simulador</strong> en Entrevistas para empezar.</div>';
  } else {
    var wd = A.weeklyDifficulty(state, analiticaWeeks);
    html += A.barChart(wd.map(function(w){ return {label:w.label, value:w.total}; }), {height:200, color:'var(--danger)'});
    html += '<div class="btn-row" style="margin-top:14px;">'+
      '<span class="badge badge-primary">Fácil: '+diff.facil+'</span>'+
      '<span class="badge badge-accent">Media: '+diff.media+'</span>'+
      '<span class="badge badge-danger">Difícil: '+diff.dificil+'</span></div>';
  }
  html += '</div>';

  // Brecha frente a la vacante
  var vs = state.interview.vacancySkills;
  html += '<div class="card"><h2>Brecha frente a la vacante</h2>';
  html += '<p style="margin-top:0;font-size:13px;">Compara tus habilidades con los requisitos detectados en la última vacante analizada.</p>';
  if(!vs || vs.length===0){
    html += '<div class="empty">Analiza una vacante en <strong>Entrevistas → Entender la vacante</strong> y aquí verás qué requisitos ya cubres y cuáles te faltan.</div>';
  } else {
    var gap = A.skillGap(state.skills, vs);
    html += '<div class="grid-2">';
    html += '<div><h3 style="font-size:13.5px;">Ya cubiertos ('+gap.matched.length+')</h3>'+(gap.matched.length?gap.matched.map(function(s){return '<span class="badge badge-primary" style="margin:0 4px 4px 0;">'+esc(s)+'</span>';}).join(''):'<div class="empty" style="padding:14px;">Ninguno todavía.</div>')+'</div>';
    html += '<div><h3 style="font-size:13.5px;">Por reforzar ('+gap.missing.length+')</h3>'+(gap.missing.length?gap.missing.map(function(s){return '<span class="badge badge-danger" style="margin:0 4px 4px 0;">'+esc(s)+'</span>';}).join(''):'<div class="empty" style="padding:14px;">¡Cubres todo!</div>')+'</div>';
    html += '</div>';
  }
  html += '</div>';

  // Recomendaciones
  var recs = A.recommendations(state);
  html += '<div class="card"><h2>Recomendaciones</h2>';
  if(recs.length===0){
    html += '<div class="empty">Vas muy bien: no hay recomendaciones pendientes.</div>';
  } else {
    html += recs.map(function(r){
      return '<div class="list-row"><div><div style="font-size:13.5px;font-weight:700;">'+esc(r.title)+'</div>'+
        '<div style="font-size:13px;color:var(--ink-soft);margin-top:2px;">'+esc(r.detail)+'</div></div>'+
        '<button class="btn btn-sm" data-go="'+r.go+'" type="button">Ir</button></div>';
    }).join('');
  }
  html += '</div>';

  // Informe exportable
  html += '<div class="card"><div class="section-head" style="margin-bottom:6px;"><h2 style="margin:0;">Informe de progreso</h2>'+
    (downloadsFn?'<button class="btn btn-sm btn-primary" id="exportReportBtn" type="button">📄 Descargar informe</button>':'')+'</div>';
  html += '<p style="margin:0;font-size:13px;">Genera un documento con el resumen de tu perfil, habilidades, objetivos, práctica y recomendaciones. Útil como evidencia de tu evolución.</p>'+(downloadsFn?'':'<p class="ai-unavailable" style="margin:6px 0 0;">La descarga no está disponible en esta vista.</p>')+'</div>';

  return html;
}

/* ================= PERFIL ================= */
function renderPerfil(){
  var p = state.profile;
  var html = '<div class="card"><h2>Datos básicos</h2>';
  html += fieldInput('p_name','Nombre completo',p.name,'text','Ej. Alejandra Ruiz');
  html += '<div class="grid-2">'+fieldInput('p_title','Título profesional',p.title,'text','Ej. Diseñadora UX')+fieldInput('p_location','Ubicación',p.location,'text','Ciudad, país')+'</div>';
  html += '<div class="grid-2">'+fieldInput('p_email','Correo',p.email,'email','tucorreo@ejemplo.com')+fieldInput('p_phone','Teléfono',p.phone,'text','Opcional')+'</div>';
  html += fieldTextarea('p_summary','Resumen profesional',p.summary,'2-4 líneas sobre tu experiencia y lo que buscas.');
  html += '<button class="btn btn-primary" id="saveProfileBtn" type="button">Guardar perfil</button>';
  html += '</div>';

  html += '<div class="card"><div class="section-head"><h2 style="margin:0;">Experiencia laboral</h2><button class="btn btn-sm" id="addExpBtn" type="button">+ Agregar</button></div>';
  if(p.experience.length===0){ html += '<div class="empty">Aún no agregaste experiencia laboral.</div>'; }
  else { html += p.experience.map(function(e){ return expRow(e); }).join(''); }
  html += '</div>';

  html += '<div class="card"><div class="section-head"><h2 style="margin:0;">Educación</h2><button class="btn btn-sm" id="addEduBtn" type="button">+ Agregar</button></div>';
  if(p.education.length===0){ html += '<div class="empty">Aún no agregaste estudios.</div>'; }
  else { html += p.education.map(function(e){ return eduRow(e); }).join(''); }
  html += '</div>';
  return html;
}
function expRow(e){
  return '<div class="list-row"><div style="flex:1;">'+
    '<div style="font-weight:700;font-size:14px;">'+esc(e.role)+' · '+esc(e.company)+'</div>'+
    '<div style="font-size:12.5px;color:var(--ink-faint);margin:2px 0 6px;">'+esc(e.period)+'</div>'+
    '<div style="font-size:13px;color:var(--ink-soft);">'+esc(e.desc)+'</div></div>'+
    '<button class="btn btn-ghost btn-danger btn-sm" data-del-exp="'+e.id+'" type="button">Eliminar</button></div>';
}
function eduRow(e){
  return '<div class="list-row"><div style="flex:1;">'+
    '<div style="font-weight:700;font-size:14px;">'+esc(e.degree)+'</div>'+
    '<div style="font-size:12.5px;color:var(--ink-faint);">'+esc(e.school)+' · '+esc(e.period)+'</div></div>'+
    '<button class="btn btn-ghost btn-danger btn-sm" data-del-edu="'+e.id+'" type="button">Eliminar</button></div>';
}

/* ================= HABILIDADES ================= */
var SKILL_CATS = ['Técnica','Comunicación','Organización','Digital','Idioma','Otra'];
function renderHabilidades(){
  var html = '<div class="card"><h2>Agregar habilidad</h2>';
  html += '<div class="grid-2">'+fieldInput('sk_name','Nombre','','text','Ej. Excel, atención al detalle...')+
    '<div class="field"><label for="sk_cat">Categoría</label><select class="select" id="sk_cat">'+
    SKILL_CATS.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></div></div>';
  html += '<div class="field"><label for="sk_level">Nivel de confianza</label>'+
    '<div class="range-row"><input type="range" id="sk_level" min="1" max="5" value="3"><span id="sk_level_val" style="width:18px;">3</span></div></div>';
  html += '<button class="btn btn-primary" id="addSkillBtn" type="button">Agregar habilidad</button>';
  html += '</div>';

  html += '<div class="card"><h2>Tus habilidades ('+state.skills.length+')</h2>';
  if(state.skills.length===0){
    html += '<div class="empty">Registra tus habilidades para que la IA las use en tu CV y entrevistas.</div>';
  } else {
    html += state.skills.map(function(s){
      return '<div class="list-row" style="align-items:center;"><div style="flex:1;">'+
        '<div class="row"><span style="font-weight:700;font-size:14px;">'+esc(s.name)+'</span><span class="badge badge-primary">'+s.category+'</span></div>'+
        '<div class="bar-track" style="margin-top:7px;"><div class="bar-fill" style="width:'+(s.level*20)+'%"></div></div></div>'+
        '<button class="btn btn-ghost btn-danger btn-sm" data-del-skill="'+s.id+'" type="button">Eliminar</button></div>';
    }).join('');
  }
  html += '</div>';
  return html;
}

/* ================= CV ================= */
var CV_TEMPLATES = [
  {id:'moderno',     label:'Moderno',     desc:'Dos columnas, barra lateral'},
  {id:'ejecutivo',   label:'Ejecutivo',   desc:'Una columna, cabecera azul'},
  {id:'clasico',     label:'Clásico',     desc:'Serif, centrado, elegante'},
  {id:'minimalista', label:'Minimalista', desc:'Limpio, con mucho aire'}
];

function renderCV(){
  var html = '<div class="card ai-panel">';
  html += '<h3>Generar CV con IA</h3>';
  html += '<p style="color:var(--ink-soft);">Usa los datos de tu perfil y habilidades para redactar un borrador claro y profesional.</p>';
  html += fieldInput('cv_role','Puesto objetivo (opcional)',state.cv.role,'text','Ej. Asistente administrativo');
  html += '<div class="btn-row"><button class="btn btn-primary" id="genCvBtn" type="button">Generar borrador</button><span id="cvStatus"></span></div>';
  if(!sampleFn && capsReady){ html += aiUnavailableNote(); }
  html += '</div>';

  html += '<div class="card ai-panel">';
  html += '<h3>Adaptar el CV a una vacante</h3>';
  html += '<p style="color:var(--ink-soft);">Pega una oferta de trabajo. La IA detecta los requisitos, los compara con tus habilidades y propone un CV adaptado. Nunca inventa experiencia ni estudios: solo reordena y resalta lo que ya tienes.</p>';
  html += fieldTextarea('adapt_vac','Texto de la vacante','','Pega aquí la descripción del puesto.');
  html += '<div class="btn-row"><button class="btn btn-primary" id="adaptCvBtn" type="button">Analizar y adaptar</button><span id="adaptStatus"></span></div>';
  html += '<div id="adaptOut"></div></div>';

  html += '<div class="card">';
  html += '<div class="section-head"><h2 style="margin:0;">Tu CV</h2>'+
    '<div class="btn-row">'+
    (downloadsFn?'<button class="btn btn-sm" id="previewCvBtn" type="button">👁 Vista previa</button>':'')+
    (downloadsFn?'<button class="btn btn-sm btn-primary" id="downloadCvBtn" type="button">📄 Descargar con diseño</button>':'')+
    '</div></div>';

  // ---- Selector de plantilla ----
  var tplActual = state.cv.template || 'moderno';
  html += '<div class="field" style="margin-top:6px;"><label>Diseño del CV</label>';
  html += '<div class="btn-row" id="templateSelector">';
  CV_TEMPLATES.forEach(function(t){
    var active = (t.id === tplActual);
    html += '<button type="button" class="btn btn-sm'+(active?' btn-primary':'')+'" data-template="'+t.id+'" '+
      'style="flex-direction:column;align-items:flex-start;padding:10px 16px;text-align:left;">'+
      '<span style="font-weight:700;">'+t.label+'</span>'+
      '<span style="font-size:11px;opacity:.75;font-weight:400;">'+t.desc+'</span>'+
      '</button>';
  });
  html += '</div></div>';
  // ---- fin selector ----

  html += '<textarea class="textarea" id="cvText" style="min-height:340px;margin-top:12px;" placeholder="Aquí aparecerá tu CV. También puedes escribirlo o editarlo directamente.">'+esc(state.cv.text)+'</textarea>';
  html += '<div class="btn-row" style="margin-top:12px;"><button class="btn btn-primary" id="saveCvBtn" type="button">Guardar cambios</button>'+
    (state.cv.updated?'<span style="font-size:12.5px;color:var(--ink-faint);">Última edición: '+fmtDate(state.cv.updated)+'</span>':'')+'</div>';
  html += '</div>';
  return html;
}

/* ================= ENTREVISTAS ================= */
var entrevistaTab = 'vacante';
function renderEntrevistas(){
  var html = '<div class="tabbar">';
  html += '<button data-tab="vacante" class="'+(entrevistaTab==='vacante'?'active':'')+'" type="button">Entender la vacante</button>';
  html += '<button data-tab="simulador" class="'+(entrevistaTab==='simulador'?'active':'')+'" type="button">Simulador</button>';
  html += '<button data-tab="preparacion" class="'+(entrevistaTab==='preparacion'?'active':'')+'" type="button">Preparación</button>';
  html += '<button data-tab="respuestas" class="'+(entrevistaTab==='respuestas'?'active':'')+'" type="button">Preparar respuestas</button>';
  html += '</div>';

  if(entrevistaTab==='vacante'){
    html += '<div class="card ai-panel"><h3>Explicar una oferta de trabajo</h3>';
    html += '<p style="color:var(--ink-soft);">Pega el texto de la vacante y te la explicamos en lenguaje simple: qué piden realmente y cómo prepararte.</p>';
    html += fieldTextarea('vac_text','Texto de la vacante',state.interview.vacancyNotes,'Copia y pega aquí la descripción del puesto.');
    html += '<div class="btn-row"><button class="btn btn-primary" id="explainVacBtn" type="button">Analizar vacante</button><span id="vacStatus"></span></div>';
    if(!sampleFn && capsReady){ html += aiUnavailableNote(); }
    html += '<div id="vacOut"></div></div>';
  } else if(entrevistaTab==='simulador'){
    html += '<div class="card ai-panel"><h3>Simulacro de entrevista</h3>';
    html += '<p style="color:var(--ink-soft);">Un simulacro guiado: la IA genera varias preguntas para el puesto, tú respondes y recibes retroalimentación en cada una. Al terminar verás un resumen y quedará guardado en tu progreso.</p>';
    html += fieldInput('sim_role','Puesto al que aplicas',state.cv.role,'text','Ej. Auxiliar contable');
    html += '<div class="field"><label for="sim_count">Número de preguntas</label><select class="select" id="sim_count"><option value="3">3 preguntas</option><option value="5" selected>5 preguntas</option></select></div>';
    html += '<div class="btn-row"><button class="btn btn-primary" id="startSimBtn" type="button">Iniciar simulacro</button><span id="simStatus"></span></div>';
    if(!sampleFn && capsReady){ html += aiUnavailableNote(); }
    html += '<div class="disclaimer">La retroalimentación la genera una inteligencia artificial con fines de práctica. <strong>No es una decisión de contratación</strong> ni una evaluación real.</div>';
    html += '<div id="simStage"></div></div>';

    html += '<div class="card"><h2>Simulacros completados ('+state.interview.sessions.length+')</h2>';
    if(state.interview.sessions.length===0){
      html += '<div class="empty">Cuando termines un simulacro, aparecerá aquí con su resumen.</div>';
    } else {
      html += state.interview.sessions.slice(0,6).map(function(s){
        var counts = {facil:0,media:0,dificil:0};
        (s.questions||[]).forEach(function(q){ if(counts[q.difficulty]!==undefined) counts[q.difficulty]++; });
        var sum = s.summary || '';
        return '<div class="list-row" style="flex-direction:column;align-items:stretch;">'+
          '<div class="row"><strong style="font-size:13.5px;">'+esc(s.role||'Puesto general')+'</strong>'+
          '<span class="badge badge-primary">'+(s.questions||[]).length+' preguntas</span></div>'+
          '<div style="font-size:12px;color:var(--ink-faint);margin-top:3px;">'+fmtDate(s.date)+' · Fácil '+counts.facil+' / Media '+counts.media+' / Difícil '+counts.dificil+'</div>'+
          (sum?('<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;">'+esc(sum.length>240?sum.slice(0,240)+'…':sum)+'</div>'):'')+
          '</div>';
      }).join('');
    }
    html += '</div>';
  } else if(entrevistaTab==='preparacion'){
    html += renderPrepTab();
  } else {
    html += renderAnswersTab();
  }
  return html;
}

/* ============ PREPARACIÓN DE ENTREVISTAS (guía + IA) ============ */
var COMMON_QUESTIONS = [
  'Cuéntame sobre ti.',
  '¿Por qué quieres trabajar en esta empresa?',
  '¿Cuáles son tus fortalezas y debilidades?',
  'Háblame de una situación difícil y cómo la resolviste.',
  '¿Cómo trabajas en equipo?',
  '¿Cómo manejas el estrés o los plazos ajustados?',
  '¿Dónde te ves dentro de unos años?',
  '¿Por qué dejaste tu trabajo anterior?',
  '¿Qué te interesa de este puesto?'
];

function renderPrepTab(){
  var html = '<div class="card">';
  html += '<h2>Guía de preparación</h2>';
  html += '<p style="color:var(--ink-soft);">Esta guía está siempre disponible, incluso si la IA no responde.</p>';

  html += '<h3 style="font-size:15px;margin-top:14px;">Antes de la entrevista</h3>';
  html += '<ol style="margin:6px 0 0;padding-left:18px;color:var(--ink-soft);font-size:13.5px;">';
  var preTips = [
    'Investiga la empresa y el puesto: qué hacen y qué esperan de ti.',
    'Revisa tu CV y prepara 2 o 3 ejemplos concretos de tu experiencia.',
    'Ten a mano tus datos de contacto y una copia de tu CV.',
    'Prepara 2 o 3 preguntas para hacer tú al final.',
    'Planifica el traslado o la conexión y únete con tiempo.',
    'Solicita con antelación los ajustes razonables que necesites.'
  ];
  preTips.forEach(function(t){ html += '<li style="margin-bottom:4px;">'+esc(t)+'</li>'; });
  html += '</ol>';

  html += '<h3 style="font-size:15px;margin-top:16px;">Responde con el método STAR</h3>';
  var star = [
    ['S — Situación','Describe brevemente el contexto.'],
    ['T — Tarea','Qué se esperaba de ti o qué tenías que lograr.'],
    ['A — Acción','Qué hiciste tú, paso a paso.'],
    ['R — Resultado','Qué conseguiste (un dato o un aprendizaje).']
  ];
  star.forEach(function(s){
    html += '<div class="list-row"><div><strong>'+esc(s[0])+'</strong>'+
      '<p style="margin:2px 0 0;color:var(--ink-soft);font-size:13px;">'+esc(s[1])+'</p></div></div>';
  });

  html += '<details style="margin-top:16px;"><summary style="cursor:pointer;font-weight:700;color:var(--primary);">Preguntas frecuentes para ensayar</summary>';
  html += '<ul style="margin:8px 0 0;padding-left:18px;color:var(--ink-soft);font-size:13.5px;">';
  COMMON_QUESTIONS.forEach(function(q){ html += '<li style="margin-bottom:4px;">'+esc(q)+'</li>'; });
  html += '</ul></details>';
  html += '</div>';

  html += '<div class="card ai-panel"><h3>Plan de preparación personalizado (IA)</h3>';
  html += '<p style="color:var(--ink-soft);">La IA adapta el plan a tu perfil, tu puesto objetivo, tus habilidades y tus preferencias. Si la IA no está disponible, la guía de arriba sigue siendo tu base.</p>';
  html += '<div class="btn-row"><button class="btn btn-primary" id="genPrepBtn" type="button">Generar mi plan</button><span id="prepStatus"></span></div>';
  if(!sampleFn && capsReady){ html += aiUnavailableNote(); }
  var saved = state.interview.prepPlan;
  html += '<div id="prepOut">'+(saved && saved.text ? '<div class="ai-out">'+esc(saved.text)+'</div>' : '')+'</div>';
  html += '</div>';
  return html;
}

/* ============ PREPARAR RESPUESTAS ============ */
var editingAnswerId = null;

function renderAnswersTab(){
  var html = '<div class="card ai-panel"><h3>Construir una respuesta</h3>';
  html += '<p style="color:var(--ink-soft);">Elige o escribe una pregunta y añade tus notas. La IA propone una estructura y un borrador que puedes editar y guardar.</p>';
  html += '<div class="field"><label for="ans_pick">Pregunta frecuente (opcional)</label>'+
    '<select class="select" id="ans_pick"><option value="">— Elegir una pregunta —</option>'+
    COMMON_QUESTIONS.map(function(q){ return '<option value="'+esc(q)+'">'+esc(q)+'</option>'; }).join('')+
    '</select></div>';
  html += fieldInput('ans_q','Pregunta de la entrevista','','text','Ej. ¿Por qué quieres trabajar aquí?');
  html += fieldTextarea('ans_notes','Tus notas o experiencia (opcional)','','Ej. Trabajé en atención al cliente durante 2 años...');
  html += '<div class="btn-row"><button class="btn btn-primary" id="buildAnsBtn" type="button">Construir respuesta</button><span id="ansStatus"></span></div>';
  if(!sampleFn && capsReady){ html += aiUnavailableNote(); }
  html += '<div class="disclaimer">El borrador lo genera una inteligencia artificial con fines de práctica. Revísalo y ajústalo con tus propias palabras.</div>';
  html += '<div id="ansOut"></div></div>';

  html += '<div class="card"><h2>Respuestas guardadas ('+state.interview.preparedAnswers.length+')</h2>';
  if(state.interview.preparedAnswers.length===0){
    html += '<div class="empty">Cuando guardes una respuesta preparada, aparecerá aquí para consultarla o editarla.</div>';
  } else {
    html += state.interview.preparedAnswers.map(function(a){
      var preview = a.answer.length>260 ? a.answer.slice(0,260)+'…' : a.answer;
      return '<div class="list-row" style="flex-direction:column;align-items:stretch;">'+
        '<div class="row"><strong style="font-size:13.5px;">'+esc(a.question)+'</strong>'+
        '<span class="badge">'+fmtDate(a.date)+'</span></div>'+
        '<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;white-space:pre-wrap;">'+esc(preview)+'</div>'+
        '<div class="btn-row" style="margin-top:8px;"><button class="btn btn-sm" data-ans-edit="'+a.id+'" type="button">Editar</button>'+
        '<button class="btn btn-ghost btn-danger btn-sm" data-ans-del="'+a.id+'" type="button">Eliminar</button></div></div>';
    }).join('');
  }
  html += '</div>';
  return html;
}

/* ================= REUNIONES ================= */
function renderReuniones(){
  var html = '<div class="card ai-panel"><h3>Convertir instrucciones en pasos</h3>';
  html += '<p style="color:var(--ink-soft);">Pega instrucciones, un correo o notas de una reunión y te devolvemos una lista de pasos claros y en orden.</p>';
  html += fieldTextarea('meet_raw','Instrucciones o contexto','','Ej. "Antes del viernes hay que mandar el reporte..."');
  html += '<div class="btn-row"><button class="btn btn-primary" id="stepsBtn" type="button">Convertir en pasos</button><span id="stepsStatus"></span></div>';
  if(!sampleFn && capsReady){ html += aiUnavailableNote(); }
  html += '<div id="stepsOut"></div></div>';

  html += '<div class="card ai-panel"><h3>Redacción profesional</h3>';
  html += '<p style="color:var(--ink-soft);">Pega un mensaje o correo en borrador y te ayudamos a darle un tono claro y profesional.</p>';
  html += fieldTextarea('draft_raw','Tu borrador','','Escribe aquí tu mensaje tal como se te ocurra.');
  html += '<div class="btn-row"><button class="btn btn-primary" id="polishBtn" type="button">Redactar profesionalmente</button><span id="polishStatus"></span></div>';
  html += '<div id="polishOut"></div></div>';

  html += '<div class="card"><h2>Reuniones registradas ('+state.meetings.history.length+')</h2>';
  if(state.meetings.history.length===0){
    html += '<div class="empty">Cuando conviertas instrucciones en pasos, quedarán guardadas aquí.</div>';
  } else {
    html += state.meetings.history.slice(0,8).map(function(m){
      return '<div class="list-row" style="flex-direction:column;align-items:stretch;">'+
        '<div style="font-size:12px;color:var(--ink-faint);">'+fmtDate(m.date)+'</div>'+
        '<ol style="margin:6px 0 0;padding-left:18px;font-size:13.5px;color:var(--ink-soft);">'+
        m.steps.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ol></div>';
    }).join('');
  }
  html += '</div>';
  return html;
}

/* ================= CHECKLIST ================= */
function renderChecklist(){
  var rate = checklistRate();
  var html = '<div class="card"><div class="section-head"><h2 style="margin:0;">Nueva tarea</h2></div>';
  html += '<div class="btn-row" style="align-items:stretch;">';
  html += '<input class="input" id="ck_text" placeholder="Ej. Revisar correo, preparar documentos..." style="flex:1;">';
  html += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-soft);white-space:nowrap;"><input type="checkbox" id="ck_recurring"> Diaria</label>';
  html += '<button class="btn btn-primary" id="addCkBtn" type="button">Agregar</button>';
  html += '</div></div>';

  html += '<div class="card"><div class="row" style="margin-bottom:6px;"><h2 style="margin:0;">Tu checklist</h2>'+(rate!==null?('<span class="badge badge-primary">'+rate+'% completo</span>'):'')+'</div>';
  if(state.checklist.length===0){
    html += '<div class="empty">Agrega tareas simples para organizar tu jornada laboral.</div>';
  } else {
    html += state.checklist.map(function(i){
      return '<div class="checkline'+(i.done?' done':'')+'"><input type="checkbox" data-ck-toggle="'+i.id+'" id="ck_'+i.id+'" '+(i.done?'checked':'')+'>'+
        '<label class="ck-text" for="ck_'+i.id+'" style="flex:1;font-size:14px;">'+esc(i.text)+(i.recurring?' <span class="badge">Diaria</span>':'')+'</label>'+
        '<button class="btn btn-ghost btn-danger btn-sm" data-ck-del="'+i.id+'" type="button">Eliminar</button></div>';
    }).join('');
  }
  html += '</div>';
  return html;
}

/* ================= OBJETIVOS ================= */
function renderObjetivos(){
  var html = '<div class="card"><h2>Nuevo objetivo</h2>';
  html += fieldInput('g_text','¿Qué quieres lograr?','','text','Ej. Enviar 5 postulaciones esta semana');
  html += fieldInput('g_deadline','Fecha límite (opcional)','','date','');
  html += '<button class="btn btn-primary" id="addGoalBtn" type="button">Agregar objetivo</button>';
  html += '</div>';

  html += '<div class="card"><h2>Tus objetivos ('+state.goals.length+')</h2>';
  if(state.goals.length===0){
    html += '<div class="empty">Define metas pequeñas y alcanzables.</div>';
  } else {
    html += state.goals.map(function(g){
      return '<div class="list-row" style="flex-direction:column;align-items:stretch;">'+
        '<div class="row"><span style="font-weight:700;font-size:14px;'+(g.progress>=100?'text-decoration:line-through;color:var(--ink-faint);':'')+'">'+esc(g.text)+'</span>'+
        '<button class="btn btn-ghost btn-danger btn-sm" data-goal-del="'+g.id+'" type="button">Eliminar</button></div>'+
        (g.deadline?('<div style="font-size:12px;color:var(--ink-faint);margin:2px 0 8px;">Límite: '+g.deadline+'</div>'):'<div style="margin-top:8px;"></div>')+
        '<div class="range-row"><input type="range" min="0" max="100" step="5" value="'+g.progress+'" data-goal-range="'+g.id+'" aria-label="Avance del objetivo: '+esc(g.text)+'">'+
        '<span style="width:38px;font-size:13px;color:var(--ink-soft);">'+g.progress+'%</span></div>'+
        '<div class="bar-track" style="margin-top:6px;"><div class="bar-fill" style="width:'+g.progress+'%"></div></div></div>';
    }).join('');
  }
  html += '</div>';
  return html;
}

/* ================= PREFERENCIAS ================= */
var MODALITY_OPTS = ['','Remoto','Presencial','Híbrido'];
var PACE_OPTS = ['','Prefiero instrucciones por escrito','Prefiero pocas tareas a la vez','Prefiero rutinas fijas y predecibles','Sin preferencia particular'];
function renderPreferencias(){
  var p = state.preferences;
  var html = '<div class="card">';
  html += '<p>Estas preferencias ayudan a la IA a adaptar el CV, las explicaciones de vacantes y las prácticas de entrevista a tu forma de trabajar.</p>';
  html += '<div class="grid-2">';
  html += '<div class="field"><label for="pref_modality">Modalidad de trabajo preferida</label><select class="select" id="pref_modality">'+
    MODALITY_OPTS.map(function(o){return '<option'+(o===p.modality?' selected':'')+'>'+o+'</option>';}).join('')+'</select></div>';
  html += fieldInput('pref_schedule','Horario preferido',p.schedule,'text','Ej. Turno matutino, horario flexible...');
  html += '</div>';
  html += fieldInput('pref_communication','Estilo de comunicación preferido',p.communication,'text','Ej. Mensajes escritos y claros...');
  html += '<div class="field"><label for="pref_pace">Ritmo y organización de tareas</label><select class="select" id="pref_pace">'+
    PACE_OPTS.map(function(o){return '<option'+(o===p.pace?' selected':'')+'>'+o+'</option>';}).join('')+'</select></div>';
  html += fieldTextarea('pref_accommodations','Ajustes razonables que te gustaría solicitar',p.accommodations,'Ej. Espacio silencioso, pausas programadas...');
  html += fieldTextarea('pref_notes','Notas adicionales',p.notes,'Cualquier otra cosa que quieras que la IA tenga en cuenta.');
  html += '<button class="btn btn-primary" id="savePrefBtn" type="button">Guardar preferencias</button>';
  html += '</div>';
  return html;
}
function preferencesText(){
  var p = state.preferences;
  var parts = [];
  if(p.modality) parts.push('Modalidad preferida: '+p.modality);
  if(p.schedule) parts.push('Horario preferido: '+p.schedule);
  if(p.communication) parts.push('Estilo de comunicación preferido: '+p.communication);
  if(p.pace) parts.push('Ritmo de trabajo: '+p.pace);
  if(p.accommodations) parts.push('Ajustes razonables solicitados: '+p.accommodations);
  if(p.notes) parts.push('Notas: '+p.notes);
  return parts.length ? parts.join('\n') : 'No especificadas.';
}

/* ================= PRIVACIDAD ================= */
function renderPrivacidad(){
  var html = '<div class="card"><h2>Dónde viven tus datos ahora mismo</h2>';
  html += '<p><span class="badge">Local: navegador (localStorage)</span> '+
    (serverSync.available ? '<span class="badge badge-primary">Respaldo: base de datos local del servidor</span>' : '<span class="badge">Base de datos: no disponible sin servidor</span>')+'</p>';
  html += '<p>Tu información se guarda en el almacenamiento local de este navegador (localStorage). Además, si el servidor de NeuroWork está activo, se respalda en una base de datos relacional (SQLite) ubicada en <code>server/data/neurowork.db</code>, en tu propio equipo. No se envía a ningún servidor externo ni se sincroniza entre dispositivos.</p>';
  html += '<div class="list-row"><div><strong>Estado del respaldo</strong><p style="margin:2px 0 0;font-size:13px;color:var(--ink-soft);">'+
    (serverSync.available ? ('Activo. Último respaldo: '+fmtDate(serverSync.lastSaved)+'.') :
      ('No disponible en este momento'+(serverSync.lastError?(' ('+esc(serverSync.lastError)+')'):'')+'. Tus datos siguen a salvo en el navegador.'))+
    '</p></div></div>';
  html += '<p style="font-size:13px;color:var(--ink-soft);">Puedes borrar tanto el almacenamiento del navegador como el respaldo del servidor desde "Reiniciar datos".</p>';
  html += '</div>';

  html += '<div class="card"><h2>Qué información se guarda</h2>';
  html += '<div class="list-row"><div><strong>Perfil y experiencia</strong><p style="margin:2px 0 0;">Nombre, contacto, experiencia y educación que tú escribes.</p></div></div>';
  html += '<div class="list-row"><div><strong>Habilidades y preferencias</strong><p style="margin:2px 0 0;">Incluye preferencias de modalidad, horario y ajustes razonables.</p></div></div>';
  html += '<div class="list-row"><div><strong>Actividad de uso</strong><p style="margin:2px 0 0;">Registro de qué secciones usas y cuándo (para tu propio análisis de progreso).</p></div></div>';
  html += '<div class="list-row"><div><strong>Contenido enviado a la IA</strong><p style="margin:2px 0 0;">Lo que escribes en los flujos de IA se envía al modelo (Google Gemini) para generar la respuesta que pediste. Es el único dato que sale de tu dispositivo.</p></div></div>';
  html += '</div>';

  html += '<div class="card"><h2>Principios que seguimos</h2>';
  html += '<div class="list-row"><div><strong>Minimización</strong><p style="margin:2px 0 0;">Solo se guarda lo que tú escribes; no se recopila nada en segundo plano.</p></div></div>';
  html += '<div class="list-row"><div><strong>Control del usuario</strong><p style="margin:2px 0 0;">Puedes editar o borrar cualquier dato desde cada sección, y reiniciarlo todo desde "Reiniciar datos".</p></div></div>';
  html += '<div class="list-row"><div><strong>Clave de IA protegida</strong><p style="margin:2px 0 0;">La clave de Gemini vive en el servidor (server/.env), nunca en el navegador.</p></div></div>';
  html += '<div class="list-row"><div><strong>Transparencia</strong><p style="margin:2px 0 0;">Esta página existe para que sepas exactamente qué se guarda, dónde y por qué.</p></div></div>';
  html += '</div>';
  return html;
}

/* ================= FIELD HELPERS ================= */
function fieldInput(id,label,val,type,ph){
  return '<div class="field"><label for="'+id+'">'+label+'</label><input class="input" type="'+type+'" id="'+id+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'')+'"></div>';
}
function fieldTextarea(id,label,val,ph){
  return '<div class="field"><label for="'+id+'">'+label+'</label><textarea class="textarea" id="'+id+'" placeholder="'+esc(ph||'')+'">'+esc(val||'')+'</textarea></div>';
}
function esc(s){
  s = (s===undefined||s===null)?'':String(s);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso){
  try{
    var d = new Date(iso);
    return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ return ''; }
}

/* ================= EVENT WIRING ================= */
function wireCurrentSection(){
  var content = document.getElementById('content');

  Array.prototype.forEach.call(content.querySelectorAll('[data-go]'), function(b){
    b.addEventListener('click', function(){ go(b.getAttribute('data-go')); });
  });

  if(current==='perfil'){
    var saveBtn = document.getElementById('saveProfileBtn');
    if(saveBtn) saveBtn.addEventListener('click', function(){
      state.profile.name = val('p_name'); state.profile.title = val('p_title');
      state.profile.location = val('p_location'); state.profile.email = val('p_email');
      state.profile.phone = val('p_phone'); state.profile.summary = val('p_summary');
      logActivity('perfil','Actualizó su perfil profesional'); if(saveState()) toast('Perfil guardado'); render();
    });
    var addExp = document.getElementById('addExpBtn');
    if(addExp) addExp.addEventListener('click', function(){
      var role = prompt('Puesto:'); if(!role) return;
      var company = prompt('Empresa:')||''; var period = prompt('Periodo (ej. 2022 - 2024):')||''; var desc = prompt('Breve descripción:')||'';
      state.profile.experience.unshift({id:uid(),role:role,company:company,period:period,desc:desc});
      logActivity('perfil','Agregó experiencia: '+role); saveState(); render();
    });
    var addEdu = document.getElementById('addEduBtn');
    if(addEdu) addEdu.addEventListener('click', function(){
      var degree = prompt('Título o estudio:'); if(!degree) return;
      var school = prompt('Institución:')||''; var period = prompt('Periodo:')||'';
      state.profile.education.unshift({id:uid(),degree:degree,school:school,period:period});
      logActivity('perfil','Agregó estudios: '+degree); saveState(); render();
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-del-exp]'), function(b){
      b.addEventListener('click', function(){
        state.profile.experience = state.profile.experience.filter(function(e){return e.id!==b.getAttribute('data-del-exp');});
        saveState(); render();
      });
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-del-edu]'), function(b){
      b.addEventListener('click', function(){
        state.profile.education = state.profile.education.filter(function(e){return e.id!==b.getAttribute('data-del-edu');});
        saveState(); render();
      });
    });
  }

  if(current==='habilidades'){
    var lvl = document.getElementById('sk_level');
    if(lvl) lvl.addEventListener('input', function(){ document.getElementById('sk_level_val').textContent = lvl.value; });
    var addSk = document.getElementById('addSkillBtn');
    if(addSk) addSk.addEventListener('click', function(){
      var name = val('sk_name'); if(!name){ toast('Escribe el nombre de la habilidad'); return; }
      state.skills.unshift({id:uid(), name:name, category:val('sk_cat'), level:parseInt(val('sk_level')||'3',10)});
      logActivity('habilidades','Agregó la habilidad: '+name); saveState(); render();
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-del-skill]'), function(b){
      b.addEventListener('click', function(){
        state.skills = state.skills.filter(function(s){return s.id!==b.getAttribute('data-del-skill');});
        saveState(); render();
      });
    });
  }

  if(current==='cv'){
    var genBtn = document.getElementById('genCvBtn');
    if(genBtn) genBtn.addEventListener('click', onGenerateCv);
    var adaptBtn = document.getElementById('adaptCvBtn');
    if(adaptBtn) adaptBtn.addEventListener('click', onAdaptCv);

    var saveCvBtn = document.getElementById('saveCvBtn');
    if(saveCvBtn) saveCvBtn.addEventListener('click', function(){
      state.cv.text = val('cvText'); state.cv.role = val('cv_role'); state.cv.updated = new Date().toISOString();
      logActivity('cv','Guardó cambios en su CV'); if(saveState()) toast('CV guardado'); render();
    });

    // Selector de plantilla
    Array.prototype.forEach.call(content.querySelectorAll('[data-template]'), function(b){
      b.addEventListener('click', function(){
        state.cv.template = b.getAttribute('data-template');
        logActivity('cv','Cambió diseño a: '+state.cv.template);
        saveState();
        render();
      });
    });

    // Vista previa con el diseño aplicado (abre en una pestaña nueva)
    var prevBtn = document.getElementById('previewCvBtn');
    if(prevBtn) prevBtn.addEventListener('click', function(){
      var cvText = val('cvText');
      if(!cvText.trim()){ toast('Primero genera o escribe tu CV'); return; }
      var builder = (window.NW && window.NW.buildCvDoc);
      if(!builder){ toast('Vista previa no disponible'); return; }
      var tpl = state.cv.template || 'moderno';
      var html = builder(cvText, tpl, state.profile);
      var blob = new Blob([html], {type:'text/html;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var w = window.open(url, '_blank');
      if(!w){ toast('Permite ventanas emergentes para ver la vista previa'); }
      setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
    });

    // Descarga con diseño
    var dlBtn = document.getElementById('downloadCvBtn');
    if(dlBtn) dlBtn.addEventListener('click', function(){
      if(!downloadsFn) return;
      var cvText = val('cvText');
      if(!cvText.trim()){ toast('Primero genera o escribe tu CV'); return; }
      var baseName = state.profile.name ? state.profile.name.replace(/\s+/g,'_') : 'CV';
      var tpl = state.cv.template || 'moderno';
      var tplLabel = tpl;
      CV_TEMPLATES.forEach(function(t){ if(t.id===tpl) tplLabel = t.label; });
      if(downloadsFn.saveDoc){
        downloadsFn.saveDoc({filename: baseName + '_CV_' + tpl + '.doc', cvText: cvText, template: tpl, profile: state.profile})
          .then(function(){ toast('CV con diseño ' + tplLabel + ' descargado'); })
          .catch(function(err){ console.error(err); toast('No se pudo descargar'); });
      } else {
        downloadsFn.save({filename: baseName + '.txt', data: cvText})
          .then(function(){ toast('Descarga iniciada'); })
          .catch(function(){ toast('No se pudo descargar'); });
      }
    });
  }

  if(current==='entrevistas'){
    Array.prototype.forEach.call(content.querySelectorAll('[data-tab]'), function(b){
      b.addEventListener('click', function(){
        var t = b.getAttribute('data-tab');
        if(t!==entrevistaTab) editingAnswerId = null;
        entrevistaTab = t; render();
      });
    });
    var expBtn = document.getElementById('explainVacBtn');
    if(expBtn) expBtn.addEventListener('click', onExplainVacancy);
    var simBtn = document.getElementById('startSimBtn');
    if(simBtn) simBtn.addEventListener('click', onStartSim);
    if(entrevistaTab==='simulador' && simSession) renderSimStage();

    if(entrevistaTab==='preparacion'){
      var gpBtn = document.getElementById('genPrepBtn');
      if(gpBtn) gpBtn.addEventListener('click', onGenPrepPlan);
    }
    if(entrevistaTab==='respuestas'){
      var pick = document.getElementById('ans_pick');
      if(pick) pick.addEventListener('change', function(){
        if(pick.value){ var qi = document.getElementById('ans_q'); if(qi) qi.value = pick.value; }
      });
      var buildBtn = document.getElementById('buildAnsBtn');
      if(buildBtn) buildBtn.addEventListener('click', onBuildAnswer);
      Array.prototype.forEach.call(content.querySelectorAll('[data-ans-edit]'), function(b){
        b.addEventListener('click', function(){ onEditAnswer(b.getAttribute('data-ans-edit')); });
      });
      Array.prototype.forEach.call(content.querySelectorAll('[data-ans-del]'), function(b){
        b.addEventListener('click', function(){ onDeleteAnswer(b.getAttribute('data-ans-del')); });
      });
    }
  }

  if(current==='reuniones'){
    var stepsBtn = document.getElementById('stepsBtn');
    if(stepsBtn) stepsBtn.addEventListener('click', onConvertSteps);
    var polishBtn = document.getElementById('polishBtn');
    if(polishBtn) polishBtn.addEventListener('click', onPolishText);
  }

  if(current==='checklist'){
    var addCk = document.getElementById('addCkBtn');
    if(addCk) addCk.addEventListener('click', function(){
      var t = val('ck_text'); if(!t){ toast('Escribe una tarea'); return; }
      state.checklist.unshift({id:uid(), text:t, done:false, recurring:document.getElementById('ck_recurring').checked});
      logActivity('checklist','Agregó tarea: '+t); saveState(); render();
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-ck-toggle]'), function(cb){
      cb.addEventListener('change', function(){
        var item = state.checklist.find(function(i){return i.id===cb.getAttribute('data-ck-toggle');});
        if(item){ item.done = cb.checked; saveState(); render(); }
      });
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-ck-del]'), function(b){
      b.addEventListener('click', function(){
        state.checklist = state.checklist.filter(function(i){return i.id!==b.getAttribute('data-ck-del');});
        saveState(); render();
      });
    });
  }

  if(current==='preferencias'){
    var savePref = document.getElementById('savePrefBtn');
    if(savePref) savePref.addEventListener('click', function(){
      state.preferences = {
        modality: val('pref_modality'), schedule: val('pref_schedule'),
        communication: val('pref_communication'), pace: val('pref_pace'),
        accommodations: val('pref_accommodations'), notes: val('pref_notes')
      };
      logActivity('preferencias','Actualizó sus preferencias'); if(saveState()) toast('Preferencias guardadas'); render();
    });
  }

  if(current==='objetivos'){
    var addGoal = document.getElementById('addGoalBtn');
    if(addGoal) addGoal.addEventListener('click', function(){
      var t = val('g_text'); if(!t){ toast('Escribe tu objetivo'); return; }
      state.goals.unshift({id:uid(), text:t, deadline:val('g_deadline'), progress:0});
      logActivity('objetivos','Definió el objetivo: '+t); saveState(); render();
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-goal-range]'), function(r){
      r.addEventListener('input', function(){
        var g = state.goals.find(function(x){return x.id===r.getAttribute('data-goal-range');});
        if(g){ g.progress = parseInt(r.value,10); saveState();
          var row = r.closest('.list-row');
          row.querySelector('.bar-fill').style.width = g.progress+'%';
          row.querySelectorAll('span')[1] && (row.querySelectorAll('.range-row span')[0].textContent = g.progress+'%');
        }
      });
      r.addEventListener('change', function(){ render(); });
    });
    Array.prototype.forEach.call(content.querySelectorAll('[data-goal-del]'), function(b){
      b.addEventListener('click', function(){
        state.goals = state.goals.filter(function(g){return g.id!==b.getAttribute('data-goal-del');});
        saveState(); render();
      });
    });
  }

  if(current==='analitica'){
    Array.prototype.forEach.call(content.querySelectorAll('[data-weeks]'), function(b){
      b.addEventListener('click', function(){
        analiticaWeeks = parseInt(b.getAttribute('data-weeks'),10) || 6;
        render();
      });
    });
    var expBtn = document.getElementById('exportReportBtn');
    if(expBtn) expBtn.addEventListener('click', function(){
      if(!downloadsFn || !downloadsFn.saveReportDoc){ toast('La descarga no está disponible'); return; }
      var A = window.NWAnalytics;
      var report = A.buildReport(state);
      var base = state.profile.name ? state.profile.name.replace(/\s+/g,'_') : 'NeuroWork';
      downloadsFn.saveReportDoc({filename: base + '_Informe_Progreso.doc', report: report})
        .then(function(){ toast('Informe descargado'); })
        .catch(function(err){ console.error(err); toast('No se pudo descargar'); });
    });
  }
}

function val(id){ var el = document.getElementById(id); return el ? el.value : ''; }

/* ================= AI ACTIONS ================= */
function experienceText(){
  if(state.profile.experience.length===0) return 'No especificada.';
  return state.profile.experience.map(function(e){ return '- '+e.role+' en '+e.company+' ('+e.period+'): '+e.desc; }).join('\n');
}
function educationText(){
  if(state.profile.education.length===0) return 'No especificada.';
  return state.profile.education.map(function(e){ return '- '+e.degree+', '+e.school+' ('+e.period+')'; }).join('\n');
}
function skillsText(){
  if(state.skills.length===0) return 'No especificadas.';
  return state.skills.map(function(s){ return s.name+' ('+s.category+', nivel '+s.level+'/5)'; }).join(', ');
}

function setStatus(id, mode, msg){
  var el = document.getElementById(id); if(!el) return;
  if(mode==='loading'){ el.innerHTML = '<span class="spinner" style="border-top-color:var(--primary);"></span>'; }
  else if(mode==='error'){ el.innerHTML = '<span style="font-size:12.5px;color:var(--danger);">'+esc(msg||'No se pudo generar. Intenta de nuevo.')+'</span>'; }
  else { el.innerHTML=''; }
}

function onGenerateCv(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var role = val('cv_role');
  var btn = document.getElementById('genCvBtn'); btn.disabled = true;
  setStatus('cvStatus','loading');
  var prompt = 'Eres un asistente que ayuda a personas neurodivergentes a preparar su currículum. '+
    'Escribe un CV profesional en español, claro, bien estructurado y fácil de leer, usando SOLO la información proporcionada (no inventes datos ni fechas). '+
    'Usa frases cortas y secciones con títulos claros (PERFIL, EXPERIENCIA, EDUCACIÓN, HABILIDADES). Evita adornos innecesarios.\n\n'+
    'Nombre: '+(state.profile.name||'No especificado')+'\nTítulo profesional: '+(state.profile.title||'No especificado')+
    '\nUbicación: '+(state.profile.location||'No especificada')+'\nContacto: '+(state.profile.email||'')+' '+(state.profile.phone||'')+
    '\nResumen: '+(state.profile.summary||'No especificado')+'\n\nExperiencia:\n'+experienceText()+'\n\nEducación:\n'+educationText()+
    '\n\nHabilidades: '+skillsText()+(role?('\n\nPuesto objetivo: '+role):'')+
    '\n\nPreferencias de la persona:\n'+preferencesText()+
    '\n\nDevuelve SOLO el texto del CV, sin comentarios ni explicaciones adicionales.';
  sampleFn(prompt, {modelTier:'default'}).then(function(res){
    state.cv.text = (res && res.text) ? res.text.trim() : '';
    state.cv.role = role; state.cv.updated = new Date().toISOString();
    logActivity('cv','Generó un borrador de CV con IA'); saveState();
    setStatus('cvStatus',''); btn.disabled=false; render(); toast('Borrador generado');
  }).catch(function(err){
    console.error(err); setStatus('cvStatus','error', err && err.message); btn.disabled=false;
  });
}

function onAdaptCv(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var vac = val('adapt_vac');
  if(!vac.trim()){ toast('Pega la vacante primero'); return; }
  var role = val('cv_role');
  var btn = document.getElementById('adaptCvBtn'); if(btn) btn.disabled = true;
  setStatus('adaptStatus','loading');
  state.interview.vacancyNotes = vac; saveState();

  var p1 = 'Analiza esta oferta de trabajo y devuelve SOLO JSON válido con las habilidades y requisitos clave. '+
    'Formato exacto: {"skills":["habilidad 1","habilidad 2"]}. Máximo 12 elementos, nombres cortos en español.\n\nOferta:\n'+vac;

  sampleFn.json(p1).then(function(reqRes){
    var reqs = [];
    if(reqRes && reqRes.skills){ reqs = reqRes.skills.map(function(s){ return (typeof s==='string')? s : (s && s.name ? s.name : ''); }).filter(Boolean).slice(0,12); }
    state.interview.vacancySkills = reqs; saveState();

    var p2 = 'Eres un asistente que ayuda a personas neurodivergentes a adaptar su currículum a una vacante concreta. '+
      'Adapta el CV SIN inventar experiencia, estudios, fechas ni habilidades que la persona no tenga. '+
      'Puedes reordenar y resaltar lo que coincide con la vacante. Usa secciones con títulos claros (PERFIL, EXPERIENCIA, EDUCACIÓN, HABILIDADES) y frases cortas.\n\n'+
      'Datos de la persona:\nNombre: '+(state.profile.name||'No especificado')+'\nTítulo: '+(state.profile.title||'No especificado')+
      '\nUbicación: '+(state.profile.location||'')+'\nResumen: '+(state.profile.summary||'No especificado')+
      '\nExperiencia:\n'+experienceText()+'\n\nEducación:\n'+educationText()+'\n\nHabilidades: '+skillsText()+
      (role?('\nPuesto objetivo: '+role):'')+
      '\n\nVacante:\n'+vac+
      '\n\nRequisitos detectados: '+(reqs.join(', ')||'no especificados')+
      (state.cv.text?('\n\nCV actual (referencia, no copiar literalmente):\n'+state.cv.text):'')+
      '\n\nDevuelve SOLO el texto del CV adaptado, sin comentarios.';

    return sampleFn(p2).then(function(cvRes){ return {cv:(cvRes.text||'').trim(), reqs:reqs}; });
  }).then(function(r){
    var A = window.NWAnalytics;
    var gap = A ? A.skillGap(state.skills, r.reqs) : {matched:[],missing:[]};
    var out = document.getElementById('adaptOut');
    var badges = function(arr, cls){
      return arr.length ? arr.map(function(s){ return '<span class="badge '+cls+'" style="margin:0 4px 4px 0;">'+esc(s)+'</span>'; }).join('')
        : '<span style="font-size:13px;color:var(--ink-faint);">Ninguno</span>';
    };
    out.innerHTML =
      '<div style="margin-top:14px;"><h3 style="font-size:13.5px;">Comparación con tus habilidades</h3>'+
      '<p style="font-size:13px;color:var(--ink-soft);margin:2px 0 6px;">Ya cubres: '+badges(gap.matched,'badge-primary')+'</p>'+
      '<p style="font-size:13px;color:var(--ink-soft);margin:2px 0 8px;">Por reforzar: '+badges(gap.missing,'badge-danger')+'</p></div>'+
      '<div class="field"><label for="adaptText">Propuesta de CV adaptado (revisa y edita antes de usarlo)</label>'+
      '<textarea class="textarea" id="adaptText" style="min-height:300px;">'+esc(r.cv)+'</textarea></div>'+
      '<div class="btn-row"><button class="btn btn-primary" id="useAdaptBtn" type="button">Usar este CV</button>'+
      '<span style="font-size:12.5px;color:var(--ink-faint);">Se copiará a tu CV; podrás seguir editándolo.</span></div>';
    var useBtn = document.getElementById('useAdaptBtn');
    if(useBtn) useBtn.addEventListener('click', function(){
      state.cv.text = val('adaptText');
      if(role) state.cv.role = role;
      state.cv.updated = new Date().toISOString();
      logActivity('cv','Adaptó su CV a una vacante'); saveState();
      toast('CV adaptado guardado'); render();
    });
    logActivity('entrevistas','Analizó una vacante con IA'); saveState();
    setStatus('adaptStatus',''); if(btn) btn.disabled=false;
  }).catch(function(err){
    console.error(err); setStatus('adaptStatus','error', err && err.message); if(btn) btn.disabled=false;
  });
}

function onExplainVacancy(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var text = val('vac_text'); if(!text.trim()){ toast('Pega el texto de la vacante primero'); return; }
  state.interview.vacancyNotes = text; saveState();
  var btn = document.getElementById('explainVacBtn'); btn.disabled = true;
  setStatus('vacStatus','loading');

  var pExplain = 'Explica esta oferta de trabajo en lenguaje simple y directo, para alguien que se está preparando para postular. '+
    'Evita jerga y frases vagas. Estructura tu respuesta EXACTAMENTE así:\n'+
    'RESUMEN DEL PUESTO:\nREQUISITOS CLAVE:\nLO QUE PROBABLEMENTE EVALUARÁN EN LA ENTREVISTA:\nCONSEJOS DE PREPARACIÓN:\n\n'+
    'Oferta de trabajo:\n'+text;
  var pSkills = 'Devuelve SOLO JSON válido con las habilidades y requisitos clave de esta oferta. '+
    'Formato exacto: {"skills":["habilidad 1","habilidad 2"]}. Máximo 12, nombres cortos en español.\n\nOferta:\n'+text;

  Promise.all([
    sampleFn(pExplain, {modelTier:'default'}),
    sampleFn.json(pSkills).catch(function(){ return {skills:[]}; })
  ]).then(function(res){
    var out = document.getElementById('vacOut');
    var reqs = [];
    if(res[1] && res[1].skills){ reqs = res[1].skills.map(function(s){ return (typeof s==='string')? s : (s&&s.name?s.name:''); }).filter(Boolean).slice(0,12); }
    state.interview.vacancySkills = reqs;
    var extra = reqs.length
      ? ('<div style="margin-top:12px;"><span style="font-size:12.5px;color:var(--ink-faint);">Requisitos guardados para el análisis de progreso: </span>'+
         reqs.map(function(s){ return '<span class="badge" style="margin:0 4px 4px 0;">'+esc(s)+'</span>'; }).join('')+'</div>')
      : '';
    out.innerHTML = '<div class="ai-out">'+esc(res[0].text.trim())+'</div>'+extra;
    logActivity('entrevistas','Analizó una vacante con IA'); saveState();
    setStatus('vacStatus',''); btn.disabled=false;
  }).catch(function(err){
    console.error(err); setStatus('vacStatus','error', err && err.message); btn.disabled=false;
  });
}

/* --------- Motor del simulacro de entrevista (sesión completa) --------- */
var simSession = null;

function onStartSim(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var role = val('sim_role')||'un puesto general';
  var total = parseInt(val('sim_count'),10) || 3;
  var btn = document.getElementById('startSimBtn'); if(btn) btn.disabled = true;
  setStatus('simStatus','loading');
  var prompt = 'Genera '+total+' preguntas de entrevista de trabajo, realistas y variadas, para el puesto: "'+role+'". '+
    'Devuelve SOLO JSON válido con este formato exacto: {"questions":["pregunta 1","pregunta 2"]}. '+
    'Incluye preguntas de distinto tipo (experiencia, situaciones, motivación) y evita repetir.';
  sampleFn.json(prompt).then(function(res){
    var qs = (res && res.questions) ? res.questions.filter(function(q){ return q && String(q).trim(); }) : [];
    if(qs.length===0) throw new Error('No se generaron preguntas. Inténtalo de nuevo.');
    simSession = {
      role: role,
      index: 0,
      questions: qs.map(function(q){ return {text:String(q).trim(), answer:'', feedback:'', difficulty:''}; })
    };
    logActivity('entrevistas','Inició un simulacro de '+qs.length+' preguntas'); saveState();
    setStatus('simStatus',''); if(btn) btn.disabled=false;
    renderSimStage();
  }).catch(function(err){
    console.error(err); setStatus('simStatus','error', err && err.message); if(btn) btn.disabled=false;
  });
}

function renderSimStage(){
  var stage = document.getElementById('simStage');
  if(!stage) return;
  if(!simSession){ stage.innerHTML = ''; return; }
  var s = simSession;
  if(s.index >= s.questions.length){ renderSimSummary(stage); return; }

  var q = s.questions[s.index];
  var pct = Math.round((s.index / s.questions.length) * 100);
  var head = '<div class="row" style="margin-top:16px;"><span style="font-size:12.5px;color:var(--ink-faint);">Pregunta '+(s.index+1)+' de '+s.questions.length+'</span>'+
    '<div class="bar-track" style="max-width:200px;"><div class="bar-fill" style="width:'+pct+'%"></div></div></div>'+
    '<div class="ai-out" style="margin-top:10px;">'+esc(q.text)+'</div>';

  if(!q.feedback){
    stage.innerHTML = head +
      '<div class="field" style="margin-top:12px;"><label for="sim_answer">Tu respuesta</label>'+
      '<textarea class="textarea" id="sim_answer" placeholder="Escribe cómo responderías...">'+esc(q.answer||'')+'</textarea></div>'+
      '<div class="btn-row"><button class="btn btn-primary" id="simSubmitBtn" type="button">Evaluar respuesta</button>'+
      '<button class="btn btn-sm" id="simSkipBtn" type="button">Saltar esta pregunta</button><span id="simStageStatus"></span></div>';
    var sb = document.getElementById('simSubmitBtn'); if(sb) sb.addEventListener('click', onSimSubmit);
    var kb = document.getElementById('simSkipBtn'); if(kb) kb.addEventListener('click', onSimSkip);
  } else {
    var diffLabel = q.difficulty || '';
    var diffBtn = function(v, label){
      return '<button class="btn btn-sm'+(diffLabel===v?' btn-primary':'')+'" data-diff="'+v+'" type="button">'+label+'</button>';
    };
    var isLast = (s.index === s.questions.length - 1);
    stage.innerHTML = head +
      '<div class="field" style="margin-top:12px;"><label>Tu respuesta</label><div class="ai-out" style="background:var(--bg-sunken);">'+esc(q.answer||'(sin responder)')+'</div></div>'+
      '<div class="ai-out" style="margin-top:12px;">'+esc(q.feedback)+'</div>'+
      '<div class="field" style="margin-top:12px;"><label>¿Qué tan difícil sentiste esta pregunta?</label>'+
      '<div class="btn-row">'+diffBtn('facil','Fácil')+diffBtn('media','Media')+diffBtn('dificil','Difícil')+'</div></div>'+
      '<div class="btn-row"><button class="btn btn-primary" id="simNextBtn" type="button">'+(isLast?'Ver resumen del simulacro':'Siguiente pregunta')+'</button></div>';
    Array.prototype.forEach.call(stage.querySelectorAll('[data-diff]'), function(b){
      b.addEventListener('click', function(){
        simSession.questions[simSession.index].difficulty = b.getAttribute('data-diff');
        renderSimStage();
      });
    });
    var nb = document.getElementById('simNextBtn'); if(nb) nb.addEventListener('click', onSimNext);
  }
}

function onSimSubmit(){
  var q = simSession.questions[simSession.index];
  var answer = val('sim_answer');
  if(!answer.trim()){ toast('Escribe tu respuesta primero'); return; }
  q.answer = answer;
  var btn = document.getElementById('simSubmitBtn'); if(btn) btn.disabled = true;
  setStatus('simStageStatus','loading');
  var prompt = 'Eres un asistente que apoya a personas neurodivergentes preparando entrevistas. '+
    'Da retroalimentación clara, concreta y alentadora.\n\n'+
    'Puesto: '+simSession.role+'\nPregunta: '+q.text+'\nRespuesta del candidato: '+answer+'\n\n'+
    'Responde con estos encabezados exactos:\nFORTALEZAS:\nSUGERENCIAS:\nEJEMPLO DE RESPUESTA MEJORADA:';
  sampleFn(prompt).then(function(res){
    q.feedback = (res.text||'').trim();
    renderSimStage();
  }).catch(function(err){
    console.error(err); setStatus('simStageStatus','error', err && err.message); if(btn) btn.disabled=false;
  });
}

function onSimNext(){
  var s = simSession;
  if(!s.questions[s.index].difficulty){ toast('Marca cómo la sentiste (fácil, media o difícil)'); return; }
  s.index++;
  if(s.index >= s.questions.length) finishSim(); else renderSimStage();
}

function onSimSkip(){
  var q = simSession.questions[simSession.index];
  q.answer = q.answer || '(sin responder)';
  q.feedback = q.feedback || 'No evaluada (pregunta saltada).';
  q.difficulty = q.difficulty || 'media';
  simSession.index++;
  if(simSession.index >= simSession.questions.length) finishSim(); else renderSimStage();
}

function finishSim(){
  var s = simSession;
  var stage = document.getElementById('simStage');
  if(stage) stage.innerHTML = '<div class="empty">Generando resumen del simulacro…</div>';
  var transcript = s.questions.map(function(q,i){ return (i+1)+') '+q.text+'\nRespuesta: '+(q.answer||'(sin responder)'); }).join('\n\n');
  var prompt = 'Eres un asistente que apoya a personas neurodivergentes preparando entrevistas. '+
    'Resume el desempeño en este simulacro de forma clara, concreta y alentadora. '+
    'Responde con estos encabezados exactos:\nRESUMEN GENERAL:\nPUNTOS FUERTES:\nÁREAS A PRACTICAR:\nCONSEJO FINAL:\n\n'+
    'Puesto: '+s.role+'\n\n'+transcript;

  var saveSession = function(summary){
    state.interview.sessions.unshift({
      id: uid(), date: new Date().toISOString(), role: s.role,
      questions: s.questions.map(function(q){
        return {text:q.text, answer:q.answer, feedback:q.feedback, difficulty:q.difficulty || 'media'};
      }),
      summary: summary || ''
    });
    state.interview.sessions = state.interview.sessions.slice(0,20);
    logActivity('entrevistas','Completó un simulacro de '+s.questions.length+' preguntas');
    saveState();
    render();
  };

  sampleFn(prompt).then(function(res){
    saveSession((res.text||'').trim());
  }).catch(function(err){
    console.error(err);
    toast('No se pudo generar el resumen, pero guardamos tu simulacro');
    saveSession('');
  });
}

function renderSimSummary(stage){
  var s = simSession;
  var counts = {facil:0,media:0,dificil:0};
  s.questions.forEach(function(q){ if(counts[q.difficulty]!==undefined) counts[q.difficulty]++; });
  var last = state.interview.sessions[0];
  var summary = (last && last.summary) || '';
  stage.innerHTML =
    '<div style="margin-top:16px;"><h3 style="font-size:15px;">Simulacro completado</h3>'+
    '<p style="font-size:13px;color:var(--ink-soft);">'+esc(s.role)+' · '+s.questions.length+' preguntas · Fácil '+counts.facil+' / Media '+counts.media+' / Difícil '+counts.dificil+'</p>'+
    (summary?('<div class="ai-out">'+esc(summary)+'</div>'):'')+
    '<div class="btn-row" style="margin-top:12px;"><button class="btn" id="simResetBtn" type="button">Nuevo simulacro</button>'+
    '<button class="btn" id="simGoAnaliticaBtn" type="button">Ver progreso</button></div></div>';
  var rb = document.getElementById('simResetBtn');
  if(rb) rb.addEventListener('click', function(){ simSession = null; render(); });
  var gb = document.getElementById('simGoAnaliticaBtn');
  if(gb) gb.addEventListener('click', function(){ go('analitica'); });
}

/* --------- Plan de preparación con IA (flujo "Preparación") --------- */
function onGenPrepPlan(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var btn = document.getElementById('genPrepBtn'); if(btn) btn.disabled = true;
  setStatus('prepStatus','loading');
  var skills = state.skills.map(function(s){ return s.name; }).filter(Boolean).join(', ');
  var prompt = 'Actúa como preparador de entrevistas para personas neurodivergentes. '+
    'Crea un plan de preparación breve, claro y accionable, sin inventar datos.\n\n'+
    'Perfil: '+(state.profile.title||'no especificado')+'\n'+
    'Puesto objetivo: '+(state.cv.role||'no especificado')+'\n'+
    'Habilidades: '+(skills||'no registradas')+'\n'+
    preferencesText()+'\n\n'+
    'Responde con estos encabezados exactos:\nPRIORIDADES DE PREPARACIÓN:\nPREGUNTAS A ENSAYAR:\nCÓMO APROVECHAR TUS FORTALEZAS:\nAJUSTES Y LOGÍSTICA:';
  sampleFn(prompt).then(function(res){
    var text = (res.text||'').trim();
    state.interview.prepPlan = { date: new Date().toISOString(), text: text };
    logActivity('entrevistas','Generó un plan de preparación con IA'); saveState();
    var out = document.getElementById('prepOut');
    if(out) out.innerHTML = '<div class="ai-out">'+esc(text)+'</div>';
    setStatus('prepStatus',''); if(btn) btn.disabled = false;
  }).catch(function(err){
    console.error(err); setStatus('prepStatus','error', err && err.message); if(btn) btn.disabled = false;
  });
}

/* --------- Construir y guardar respuestas (flujo "Preparar respuestas") --------- */
function onBuildAnswer(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var q = val('ans_q');
  if(!q.trim()){ toast('Escribe o elige una pregunta primero'); return; }
  var notes = val('ans_notes');
  var btn = document.getElementById('buildAnsBtn'); if(btn) btn.disabled = true;
  setStatus('ansStatus','loading');
  var prompt = 'Actúa como asistente que ayuda a personas neurodivergentes a preparar respuestas de entrevista. '+
    'Sé claro y alentador. Usa SOLO las notas del candidato como base; no inventes experiencia ni datos.\n\n'+
    'Puesto objetivo: '+(state.cv.role||'no especificado')+'\n'+
    'Pregunta: '+q+'\n'+
    'Notas del candidato: '+(notes.trim()||'(sin notas; propone una estructura genérica que el usuario completará)')+'\n\n'+
    'Responde con estos encabezados exactos:\nESTRUCTURA SUGERIDA (STAR):\nBORRADOR DE RESPUESTA:\nCLAVES PARA PERSONALIZAR:';
  sampleFn(prompt).then(function(res){
    renderAnsResult(q, (res.text||'').trim(), editingAnswerId);
    setStatus('ansStatus',''); if(btn) btn.disabled = false;
  }).catch(function(err){
    console.error(err); setStatus('ansStatus','error', err && err.message); if(btn) btn.disabled = false;
  });
}

function renderAnsResult(question, text, editingId){
  var out = document.getElementById('ansOut');
  if(!out) return;
  out.innerHTML =
    '<input type="hidden" id="ans_question_store" value="'+esc(question)+'">'+
    '<div class="field" style="margin-top:12px;"><label for="ans_result">Tu respuesta (puedes editarla)</label>'+
    '<textarea class="textarea" id="ans_result" style="min-height:200px;">'+esc(text)+'</textarea></div>'+
    '<div class="btn-row"><button class="btn btn-primary" id="saveAnsBtn" type="button">'+(editingId?'Actualizar respuesta':'Guardar respuesta')+'</button>'+
    '<button class="btn btn-sm" id="newAnsBtn" type="button">Nueva</button><span id="ansSaveStatus"></span></div>';
  var sb = document.getElementById('saveAnsBtn'); if(sb) sb.addEventListener('click', onSaveAnswer);
  var nb = document.getElementById('newAnsBtn'); if(nb) nb.addEventListener('click', onNewAnswer);
}

function onSaveAnswer(){
  var res = document.getElementById('ans_result');
  var qEl = document.getElementById('ans_question_store');
  if(!res || !qEl) return;
  var answer = res.value.trim();
  var question = qEl.value.trim();
  if(!question){ toast('Falta la pregunta'); return; }
  if(!answer){ toast('La respuesta está vacía'); return; }
  if(editingAnswerId){
    var item = state.interview.preparedAnswers.filter(function(x){ return x.id===editingAnswerId; })[0];
    if(item){ item.question = question; item.answer = answer; item.updated = new Date().toISOString(); }
    toast('Respuesta actualizada');
    logActivity('entrevistas','Actualizó una respuesta preparada');
    editingAnswerId = null;
  } else {
    state.interview.preparedAnswers.unshift({ id: uid(), date: new Date().toISOString(), question: question, answer: answer });
    state.interview.preparedAnswers = state.interview.preparedAnswers.slice(0,50);
    toast('Respuesta guardada');
    logActivity('entrevistas','Guardó una respuesta preparada');
  }
  saveState(); render();
}

function onNewAnswer(){
  editingAnswerId = null;
  render();
}

function onEditAnswer(id){
  var item = state.interview.preparedAnswers.filter(function(x){ return x.id===id; })[0];
  if(!item) return;
  editingAnswerId = id;
  render();
  var qEl = document.getElementById('ans_q'); if(qEl) qEl.value = item.question;
  renderAnsResult(item.question, item.answer, id);
  var res = document.getElementById('ans_result');
  if(res && res.scrollIntoView) res.scrollIntoView({behavior:'smooth', block:'center'});
}

function onDeleteAnswer(id){
  state.interview.preparedAnswers = state.interview.preparedAnswers.filter(function(x){ return x.id!==id; });
  if(editingAnswerId===id) editingAnswerId = null;
  logActivity('entrevistas','Eliminó una respuesta preparada');
  saveState(); render();
}

function onConvertSteps(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var raw = val('meet_raw'); if(!raw.trim()){ toast('Pega las instrucciones primero'); return; }
  var btn = document.getElementById('stepsBtn'); btn.disabled = true;
  setStatus('stepsStatus','loading');
  var prompt = 'Convierte las siguientes instrucciones en una lista de pasos claros y accionables. '+
    'Responde SOLO con JSON válido en este formato: {"steps": ["paso 1", "paso 2"]}\n\n'+raw;
  sampleFn.json(prompt, {modelTier:'default'}).then(function(res){
    var steps = (res && res.steps) ? res.steps : [];
    var out = document.getElementById('stepsOut');
    if(steps.length===0){ out.innerHTML = '<p class="ai-unavailable">No se generaron pasos.</p>'; }
    else {
      out.innerHTML = '<ol style="margin:14px 0 0;padding-left:20px;">'+steps.map(function(s){return '<li style="margin-bottom:6px;font-size:14px;">'+esc(s)+'</li>';}).join('')+
        '</ol><button class="btn btn-sm" id="addToCkBtn" style="margin-top:12px;" type="button">Agregar todo al checklist</button>';
      // Guardar la reunión UNA sola vez, al generar los pasos (antes se duplicaba).
      state.meetings.history.unshift({id:uid(), date:new Date().toISOString(), raw:raw, steps:steps});
      logActivity('reuniones','Convirtió instrucciones en '+steps.length+' pasos'); saveState();
      document.getElementById('addToCkBtn').addEventListener('click', function(){
        steps.forEach(function(s){ state.checklist.unshift({id:uid(), text:s, done:false, recurring:false}); });
        logActivity('reuniones','Agregó '+steps.length+' pasos al checklist'); saveState();
        toast('Pasos agregados al checklist'); render();
      });
    }
    setStatus('stepsStatus',''); btn.disabled=false;
  }).catch(function(err){
    console.error(err); setStatus('stepsStatus','error', err && err.message); btn.disabled=false;
  });
}

function onPolishText(){
  if(!sampleFn){ toast('La IA no está disponible en esta vista'); return; }
  var raw = val('draft_raw'); if(!raw.trim()){ toast('Escribe tu borrador primero'); return; }
  var btn = document.getElementById('polishBtn'); btn.disabled = true;
  setStatus('polishStatus','loading');
  var prompt = 'Reescribe el siguiente mensaje de trabajo en un tono profesional, claro y directo. '+
    'Responde SOLO con el mensaje reescrito.\n\nMensaje original:\n'+raw;
  sampleFn(prompt, {modelTier:'quick'}).then(function(res){
    document.getElementById('polishOut').innerHTML = '<div class="ai-out">'+esc(res.text.trim())+'</div>';
    logActivity('reuniones','Pulió un mensaje con IA'); saveState();
    setStatus('polishStatus',''); btn.disabled=false;
  }).catch(function(err){
    console.error(err); setStatus('polishStatus','error', err && err.message); btn.disabled=false;
  });
}

/* ================= INIT ================= */
document.getElementById('declutterBtn').addEventListener('click', function(){
  document.body.classList.toggle('declutter');
  document.body.classList.toggle('focus');
  var isOn = document.body.classList.contains('declutter');
  toast(isOn ? 'Modo simple activado' : 'Modo simple desactivado');
});
document.getElementById('resetBtn').addEventListener('click', function(){
  if(confirm('Esto borrará todos tus datos guardados en este navegador y el respaldo en la base de datos local. ¿Continuar?')){
    if(syncTimer){ clearTimeout(syncTimer); syncTimer = null; }
    state = defaultState();
    hadLocalData = false;
    saveState();
    deleteServerState();
    go('dashboard');
    toast('Datos reiniciados');
  }
});
document.getElementById('debugToggleBtn').addEventListener('click', function(){
  var panel = document.getElementById('debugPanel');
  panel.classList.toggle('open');
  if(panel.classList.contains('open')){
    debugLog('--- Estado actual ---');
    debugLog('storageMode='+storageMode+' | sampleFn='+(!!sampleFn)+' | downloadsFn='+(!!downloadsFn)+' | localStorageOK='+localStorageOK);
    document.getElementById('debugBody').textContent = debugLines.join('\n');
  }
});
document.getElementById('debugCloseBtn').addEventListener('click', function(){
  document.getElementById('debugPanel').classList.remove('open');
});
document.getElementById('debugClearBtn').addEventListener('click', function(){
  debugLines = []; document.getElementById('debugBody').textContent = '(vacío)';
});
document.getElementById('debugCopyBtn').addEventListener('click', function(){
  var text = debugLines.join('\n');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast('Diagnóstico copiado'); }).catch(function(){ toast('No se pudo copiar'); });
  } else { toast('Copia no disponible en este navegador'); }
});

buildNav();
go('dashboard');
initCapabilities();
initHealthCheck();
restoreFromServer();

})();