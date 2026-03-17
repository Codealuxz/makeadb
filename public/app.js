const DB_TYPES = {
  postgresql: {
    name: 'PostgreSQL',
    desc: 'Relationnel avance',
    color: '#336791',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="#336791" stroke-width="1.5" fill="#336791" fill-opacity="0.15"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="#336791" stroke-width="1.5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#336791" stroke-width="1.5" opacity="0.5"/></svg>'
  },
  mongodb: {
    name: 'MongoDB',
    desc: 'NoSQL document',
    color: '#47A248',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C9 7 7 10 7 14a5 5 0 0010 0c0-4-2-7-5-12z" stroke="#47A248" stroke-width="1.5" fill="#47A248" fill-opacity="0.15"/><path d="M12 10v10" stroke="#47A248" stroke-width="1.5"/></svg>'
  },
  mysql: {
    name: 'MySQL',
    desc: 'Relationnel classique',
    color: '#4479A1',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="#4479A1" stroke-width="1.5" fill="#4479A1" fill-opacity="0.15"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="#4479A1" stroke-width="1.5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#4479A1" stroke-width="1.5" opacity="0.5"/></svg>'
  },
  redis: {
    name: 'Redis',
    desc: 'Cache & cle-valeur',
    color: '#DC382D',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 6-8 6-8-6z" stroke="#DC382D" stroke-width="1.5" fill="#DC382D" fill-opacity="0.15"/><path d="M4 8v8l8 6 8-6V8" stroke="#DC382D" stroke-width="1.5" opacity="0.5"/></svg>'
  },
  mariadb: {
    name: 'MariaDB',
    desc: 'Fork MySQL',
    color: '#c0765a',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="#c0765a" stroke-width="1.5" fill="#c0765a" fill-opacity="0.15"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="#c0765a" stroke-width="1.5"/><path d="M4 10c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#c0765a" stroke-width="1.5" opacity="0.5"/><path d="M4 14c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#c0765a" stroke-width="1.5" opacity="0.3"/></svg>'
  }
};

const COPY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
const CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
const EYE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

let databases = [];
let selectedType = null;

const modal = document.getElementById('modal');
const createForm = document.getElementById('create-form');
const dbNameInput = document.getElementById('db-name');
const submitBtn = document.getElementById('submit-btn');
const typeGrid = document.getElementById('type-grid');
const databasesEl = document.getElementById('databases');
const statsEl = document.getElementById('stats');
const toastEl = document.getElementById('toast');
const dockerWarning = document.getElementById('docker-warning');

document.getElementById('create-btn').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
createForm.addEventListener('submit', handleCreate);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

document.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    const url = copyBtn.dataset.url;
    navigator.clipboard.writeText(url).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = CHECK_ICON;
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = COPY_ICON;
      }, 2000);
    });
    return;
  }

  const toggleUrlBtn = e.target.closest('.toggle-url-btn');
  if (toggleUrlBtn) {
    const codeEl = toggleUrlBtn.parentElement.querySelector('code');
    const fullUrl = codeEl.dataset.fullUrl;
    const isHidden = codeEl.textContent !== fullUrl;
    codeEl.textContent = isHidden ? fullUrl : maskPassword(fullUrl);
    toggleUrlBtn.innerHTML = isHidden ? EYE_OFF_ICON : EYE_ICON;
    return;
  }

  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    const { action, id } = actionBtn.dataset;
    if (action === 'delete') deleteDb(id);
    else if (action === 'start') toggleDb(id, 'start');
    else if (action === 'stop') toggleDb(id, 'stop');
  }
});

renderTypeGrid();
checkDockerHealth();
loadDatabases();

async function checkDockerHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!data.docker) dockerWarning.classList.remove('hidden');
  } catch (e) {}
}

function renderTypeGrid() {
  // Type grid uses only static SVG icons from DB_TYPES constants - safe HTML
  typeGrid.innerHTML = Object.entries(DB_TYPES).map(([key, type]) =>
    '<button type="button" class="type-card" data-type="' + key + '" style="--type-color: ' + type.color + '">'
    + type.icon
    + '<span class="type-name">' + type.name + '</span>'
    + '<span class="type-desc">' + type.desc + '</span>'
    + '</button>'
  ).join('');

  typeGrid.querySelectorAll('.type-card').forEach(card => {
    card.addEventListener('click', () => {
      typeGrid.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedType = card.dataset.type;
    });
  });
}

async function loadDatabases() {
  try {
    const res = await fetch('/api/databases');
    databases = await res.json();
    renderDatabases();
    renderStats();
  } catch (err) {
    showToast('Erreur de connexion au serveur', 'error');
  }
}

function renderStats() {
  if (databases.length === 0) {
    statsEl.textContent = '';
    return;
  }

  const running = databases.filter(d => d.status === 'running').length;
  const types = {};
  databases.forEach(d => { types[d.type] = (types[d.type] || 0) + 1; });

  // Stats use only numeric values and static DB_TYPES names - safe HTML
  let html = '<div class="stat"><span class="stat-value">' + databases.length + '</span><span class="stat-label">Total</span></div>';
  html += '<div class="stat"><span class="stat-value" style="color: var(--success)">' + running + '</span><span class="stat-label">Actives</span></div>';
  Object.entries(types).forEach(([type, count]) => {
    const t = DB_TYPES[type];
    html += '<div class="stat"><span class="stat-value" style="color: ' + (t ? t.color : 'inherit') + '">' + count + '</span><span class="stat-label">' + (t ? t.name : type) + '</span></div>';
  });
  statsEl.innerHTML = html;
}

function renderDatabases() {
  if (databases.length === 0) {
    // Empty state uses only static SVG and text - safe HTML
    databasesEl.innerHTML =
      '<div class="empty-state">'
      + '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">'
      + '<ellipse cx="32" cy="16" rx="20" ry="8"/>'
      + '<path d="M12 16v32c0 4.42 8.95 8 20 8s20-3.58 20-8V16"/>'
      + '<path d="M12 32c0 4.42 8.95 8 20 8s20-3.58 20-8" opacity="0.3"/>'
      + '</svg>'
      + '<h3>Aucune base de donnees</h3>'
      + '<p>Creez votre premiere base de donnees pour commencer</p>'
      + '</div>';
    return;
  }

  // All user-provided values (name, connection_url) are escaped via esc() function
  // which uses textContent assignment for safe encoding
  const statusLabel = { running: 'Active', creating: 'Creation...', stopped: 'Arretee', error: 'Erreur' };

  databasesEl.innerHTML = databases.map(db => {
    const type = DB_TYPES[db.type] || { name: db.type, color: '#71717a', icon: '' };
    const escapedName = esc(db.name);
    const escapedUrl = esc(db.connection_url);
    const maskedUrl = maskPassword(db.connection_url);

    return '<div class="db-card">'
      + '<div class="card-header">'
      + '<div class="card-type" style="--type-color: ' + type.color + '">'
      + type.icon
      + '<span>' + type.name + '</span>'
      + '</div>'
      + '<div class="card-status ' + db.status + '">'
      + '<span class="status-dot"></span>'
      + (statusLabel[db.status] || db.status)
      + '</div>'
      + '</div>'
      + '<h3 class="card-name">' + escapedName + '</h3>'
      + '<div class="card-url">'
      + '<code data-full-url="' + escapedUrl + '">' + esc(maskedUrl) + '</code>'
      + '<button class="url-btn toggle-url-btn" title="Afficher/Masquer">' + EYE_ICON + '</button>'
      + '<button class="url-btn copy-btn" data-url="' + escapedUrl + '" title="Copier">' + COPY_ICON + '</button>'
      + '</div>'
      + '<div class="card-meta">'
      + '<span>Port ' + db.port + '</span>'
      + '<span>' + formatDate(db.created_at) + '</span>'
      + '</div>'
      + '<div class="card-actions">'
      + (db.status === 'running'
        ? '<button data-action="stop" data-id="' + db.id + '">Arreter</button>'
        : db.status === 'stopped'
        ? '<button data-action="start" data-id="' + db.id + '">Demarrer</button>'
        : '')
      + '<button class="btn-delete" data-action="delete" data-id="' + db.id + '">Supprimer</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function openModal() {
  modal.classList.remove('hidden');
  dbNameInput.focus();
  selectedType = null;
  typeGrid.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  dbNameInput.value = '';
  submitBtn.disabled = false;
  submitBtn.textContent = 'Creer';
}

function closeModal() {
  modal.classList.add('hidden');
}

async function handleCreate(e) {
  e.preventDefault();
  if (!selectedType) {
    showToast('Selectionnez un type de base de donnees', 'error');
    return;
  }

  const name = dbNameInput.value.trim();
  if (!name) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Creation...';

  try {
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: selectedType })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur');
    }

    closeModal();
    await loadDatabases();
    showToast('Base de donnees creee', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Creer';
  }
}

async function deleteDb(id) {
  if (!confirm('Supprimer cette base de donnees ? Cette action est irreversible.')) return;

  try {
    const res = await fetch('/api/databases/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    await loadDatabases();
    showToast('Base supprimee', 'success');
  } catch (err) {
    showToast('Erreur lors de la suppression', 'error');
  }
}

async function toggleDb(id, action) {
  try {
    const res = await fetch('/api/databases/' + id + '/' + action, { method: 'POST' });
    if (!res.ok) throw new Error();
    await loadDatabases();
    showToast(action === 'start' ? 'Base demarree' : 'Base arretee', 'success');
  } catch (err) {
    showToast('Erreur', 'error');
  }
}

function maskPassword(url) {
  if (!url) return '';
  return url.replace(/:([^:@\/]+)@/, ':********@');
}

function showToast(msg, type) {
  toastEl.textContent = msg;
  toastEl.className = 'toast ' + (type || '');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'Z');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

setInterval(loadDatabases, 30000);
