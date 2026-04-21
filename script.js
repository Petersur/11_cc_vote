const SUPABASE_URL = 'https://woflbynmglazegzafxuo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmxieW5tZ2xhemVnemFmeHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzYzMzYsImV4cCI6MjA5MjI1MjMzNn0.JvTlP8T7XkPpxcRIKUpNeSCq7uT5DIwCIsfFpp7YjXc';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TRANSLATIONS = {
  en: {
    clickToVote: 'Click to vote',
    showResults: 'Show Total Results',
    hideResults: 'Hide Results',
    votedFor:    (name) => `You voted for ${name}`,
    winsOf:      (w, a) => `${w} win${w !== 1 ? 's' : ''} / ${a} match${a !== 1 ? 'es' : ''}`,
    colChoice:   'Choice',
    colWon:      'Won',
    colApp:      'Appearances',
    colPct:      'Win %',
  },
  hu: {
    clickToVote: 'Kattints a szavazáshoz',
    showResults: 'Összes eredmény',
    hideResults: 'Elrejtés',
    votedFor:    (name) => `Szavaztál: ${name}`,
    winsOf:      (w, a) => `${w} győzelem / ${a} mérkőzés`,
    colChoice:   'Választás',
    colWon:      'Nyert',
    colApp:      'Megjelenés',
    colPct:      'Nyerési %',
  }
};

let THEMES  = [];
let OPTIONS = [];

let currentThemeId = null;
let currentA       = null;
let currentB       = null;
let voted          = false;
let tableOpen      = false;
let lastWinnerId   = null;
let currentLang    = 'en';

function tr()     { return TRANSLATIONS[currentLang]; }
function lbl(opt) { return currentLang === 'en' ? opt.name_en : opt.name_hu; }

function renderVoteCount() {
  const total = OPTIONS.reduce((sum, o) => sum + o.wins, 0);
  const label = currentLang === 'en' ? (total === 1 ? 'vote' : 'votes') : 'szavazat';
  document.getElementById('vote-count').innerHTML =
    `<span class="vote-count-num">${total}</span><span class="vote-count-lbl">${label}</span>`;
}

function renderThemeSelect() {
  const sel = document.getElementById('theme-select');
  sel.innerHTML = THEMES.map(t => {
    const name = currentLang === 'en' ? t.label_en : t.label_hu;
    return `<option value="${t.id}"${t.id === currentThemeId ? ' selected' : ''}>${name}</option>`;
  }).join('');
}

function pickTwo() {
  const shuffled = [...OPTIONS].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function loadPair() {
  [currentA, currentB] = pickTwo();
  voted        = false;
  lastWinnerId = null;

  const optA = document.getElementById('opt-a');
  const optB = document.getElementById('opt-b');

  [optA, optB].forEach(el => {
    el.classList.remove('voted', 'lost');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
  });

  document.getElementById('label-a').textContent = lbl(currentA);
  document.getElementById('label-b').textContent = lbl(currentB);
  document.getElementById('sub-a').textContent   = tr().clickToVote;
  document.getElementById('sub-b').textContent   = tr().clickToVote;
  document.getElementById('stat-a').textContent  = '';
  document.getElementById('stat-b').textContent  = '';

  const msg = document.getElementById('result-msg');
  msg.style.animation = 'none';
  msg.offsetHeight;
  msg.style.animation = '';
  msg.innerHTML = '&nbsp;';

  renderVoteCount();
  if (tableOpen) renderTable();
}

function triggerRefresh() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  btn.addEventListener('transitionend', () => {
    btn.classList.remove('spinning');
    btn.style.transition = 'background 0.15s, transform 0s';
    requestAnimationFrame(() => { btn.style.transition = ''; });
  }, { once: true });
  loadPair();
}

function fmtPct(wins, appearances) {
  if (appearances === 0) return '0.0%';
  return (wins / appearances * 100).toFixed(1) + '%';
}

function castVote(side) {
  if (voted) return;
  voted = true;

  const optA  = document.getElementById('opt-a');
  const optB  = document.getElementById('opt-b');
  const msg   = document.getElementById('result-msg');
  const subA  = document.getElementById('sub-a');
  const subB  = document.getElementById('sub-b');
  const statA = document.getElementById('stat-a');
  const statB = document.getElementById('stat-b');

  currentA.appearances++;
  currentB.appearances++;

  const winner = side === 'a' ? currentA : currentB;
  winner.wins++;
  lastWinnerId = winner.id;

  if (side === 'a') {
    optA.classList.add('voted');
    optB.classList.add('lost');
    statA.textContent = fmtPct(currentA.wins, currentA.appearances);
    subA.textContent  = tr().winsOf(currentA.wins, currentA.appearances);
    subB.textContent  = '';
  } else {
    optB.classList.add('voted');
    optA.classList.add('lost');
    statB.textContent = fmtPct(currentB.wins, currentB.appearances);
    subB.textContent  = tr().winsOf(currentB.wins, currentB.appearances);
    subA.textContent  = '';
  }

  msg.style.animation = 'none';
  msg.offsetHeight;
  msg.style.animation = '';
  msg.textContent = tr().votedFor(lbl(winner));

  renderVoteCount();
  if (tableOpen) renderTable();
  saveVotes(currentA, currentB);
}

function toggleTable() {
  tableOpen = !tableOpen;
  const wrap = document.getElementById('results-wrap');
  const btn  = document.getElementById('toggle-btn');

  if (tableOpen) {
    wrap.classList.add('open');
    btn.textContent = tr().hideResults;
    renderTable();
  } else {
    wrap.classList.remove('open');
    btn.textContent = tr().showResults;
  }
}

function renderTable() {
  const t = tr();
  const container = document.getElementById('results-content');
  const sorted = [...OPTIONS].sort((a, b) => {
    const pctA = a.appearances > 0 ? a.wins / a.appearances : 0;
    const pctB = b.appearances > 0 ? b.wins / b.appearances : 0;
    if (pctB !== pctA) return pctB - pctA;
    return b.appearances - a.appearances;
  });

  const rows = sorted.map(o => {
    const isWinner  = lastWinnerId !== null && o.id === lastWinnerId;
    const isLoser   = voted && currentA && !isWinner &&
                      (o.id === currentA.id || o.id === currentB.id);
    const isCurrent = !voted && currentA &&
                      (o.id === currentA.id || o.id === currentB.id);
    const cls = isWinner ? 'row-winner' : isLoser ? 'row-loser' : isCurrent ? 'row-current' : '';

    const barWidth = o.appearances > 0
      ? (o.wins / o.appearances * 100).toFixed(1)
      : '0';

    return `
    <tr${cls ? ` class="${cls}"` : ''}>
      <td>${lbl(o)}</td>
      <td>${o.wins}</td>
      <td>${o.appearances}</td>
      <td class="pct">
        <div class="pct-cell">
          <span>${fmtPct(o.wins, o.appearances)}</span>
          <div class="pct-bar-wrap"><div class="pct-bar" style="width:${barWidth}%"></div></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="results-inner">
      <table class="results-table">
        <thead>
          <tr>
            <th>${t.colChoice}</th>
            <th>${t.colWon}</th>
            <th>${t.colApp}</th>
            <th>${t.colPct}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function setLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;

  document.getElementById('btn-en').classList.toggle('lang-active', lang === 'en');
  document.getElementById('btn-hu').classList.toggle('lang-active', lang === 'hu');

  renderThemeSelect();

  if (currentA) {
    document.getElementById('label-a').textContent = lbl(currentA);
    document.getElementById('label-b').textContent = lbl(currentB);
  }

  if (voted) {
    const isA = lastWinnerId === currentA.id;
    if (isA) {
      document.getElementById('sub-a').textContent = tr().winsOf(currentA.wins, currentA.appearances);
    } else {
      document.getElementById('sub-b').textContent = tr().winsOf(currentB.wins, currentB.appearances);
    }
    const winner = isA ? currentA : currentB;
    document.getElementById('result-msg').textContent = tr().votedFor(lbl(winner));
  } else {
    document.getElementById('sub-a').textContent = tr().clickToVote;
    document.getElementById('sub-b').textContent = tr().clickToVote;
  }

  document.getElementById('toggle-btn').textContent = tableOpen ? tr().hideResults : tr().showResults;
  renderVoteCount();
  if (tableOpen) renderTable();
}

function saveVotes(a, b) {
  Promise.all([
    db.from('options').update({ wins: a.wins, appearances: a.appearances }).eq('id', a.id),
    db.from('options').update({ wins: b.wins, appearances: b.appearances }).eq('id', b.id),
  ]).catch(err => console.error('Save error:', err));
}

async function setTheme(id) {
  if (id === currentThemeId) return;
  currentThemeId = id;
  const { data, error } = await db
    .from('options')
    .select('*')
    .eq('theme_id', currentThemeId)
    .order('id');
  if (error) { console.error('Options load error:', error); return; }
  OPTIONS = data;
  loadPair();
  if (tableOpen) renderTable();
}

async function init() {
  const { data: themes, error: tErr } = await db
    .from('themes')
    .select('*')
    .order('sort_order');
  if (tErr) { console.error('Themes load error:', tErr); return; }
  THEMES = themes;
  currentThemeId = themes[0].id;
  renderThemeSelect();

  const { data: opts, error: oErr } = await db
    .from('options')
    .select('*')
    .eq('theme_id', currentThemeId)
    .order('id');
  if (oErr) { console.error('Options load error:', oErr); return; }
  OPTIONS = opts;
  loadPair();
}

init();
