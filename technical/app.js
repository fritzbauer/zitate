let db;
let fileHandle;
let openedFileName = 'quotes.sqlite';
let requiresManualSave = false;
let hasUnsavedChanges = false;
let manualSaveHintShown = false;
let currentPage = 1;
let pageSize = 100;
let totalResults = 0;
let selectedIds = new Set();
let lastSearchTerm = "";
const basePageTitle = document.title.replace(/^\*\s*/, '');

// Small helpers
const $ = sel => document.querySelector(sel);

function debounce(fn, delay = 250) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function escapeHTML(str) {
      return String(str ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

function markDatabaseChanged() {
  hasUnsavedChanges = true;
  updatePageTitleUnsavedState();
}

function clearDatabaseChanged() {
  hasUnsavedChanges = false;
  updatePageTitleUnsavedState();
}

function updatePageTitleUnsavedState() {
  document.title = hasUnsavedChanges ? `* ${basePageTitle}` : basePageTitle;
}

function maybeShowManualSaveHint() {
  if (!requiresManualSave || manualSaveHintShown) return;
  manualSaveHintShown = true;
  alert("Dieser Browser unterstützt kein direktes Speichern in die geöffnete Datei. Bitte speichern Sie Änderungen manuell über 'Datenbank speichern'.");
}

function supportsFileSystemAccessApi() {
  return typeof window.showOpenFilePicker === 'function';
}

function updateStorageButtons() {
  const openBtn = $('#openBtn');
  const saveBtn = $('#saveBtn');
  if (!openBtn || !saveBtn) return;

  if (supportsFileSystemAccessApi()) {
    openBtn.style.display = '';
    saveBtn.style.display = 'none';
    return;
  }

  if (!db) {
    openBtn.style.display = '';
    saveBtn.style.display = 'none';
    return;
  }

  openBtn.style.display = 'none';
  saveBtn.style.display = '';
}

function searchQuotes(resetPage = false) {
  if (!db) return;
  const term = $('#searchInput').value.trim();
  if (resetPage || term !== lastSearchTerm) {
    currentPage = 1;
  }
  lastSearchTerm = term;

  const searchAllColumns = $('#searchAllColumns') ? $('#searchAllColumns').checked : false;
  const { where, params } = buildSearchWhere(term, searchAllColumns);

  // Count total matching (non-deleted) results
  let count = 0;
  {
    const stmtCount = db.prepare(`SELECT COUNT(*) as c FROM quotes ${where}`);
    stmtCount.bind(params);
    if (stmtCount.step()) {
      count = stmtCount.getAsObject().c | 0;
    }
    stmtCount.free();
  }
  totalResults = count;

  // Fetch current page
  const offset = (currentPage - 1) * pageSize;
  const stmt = db.prepare(
   `
    SELECT *
    FROM (
      SELECT rowid as id,
        COALESCE(titel,'') as _raw_titel,
        highlight(quotes, 0, '<span class="highlight">', '</span>') as titel,
        COALESCE(quelle,'') as _raw_quelle,
        highlight(quotes, 1, '<span class="highlight">', '</span>') as quelle,
        COALESCE(zitat,'') as _raw_zitat,
        snippet(quotes, 2, '<span class="highlight">', '</span>', '…', 64) as snippet_zitat,
        highlight(quotes, 2, '<span class="highlight">', '</span>') as zitat,
        COALESCE(genutzt,'') as _raw_genutzt,
        snippet(quotes, 3, '<span class="highlight">', '</span>', '…', 50) as snippet_genutzt,
        highlight(quotes, 3, '<span class="highlight">', '</span>') as genutzt,
        rank
      FROM quotes
        ${where}
        ORDER BY id DESC
        LIMIT ? OFFSET ?        
    )
    GROUP BY id
    HAVING COALESCE(rank, 0) = MAX(COALESCE(rank, 0))
    ORDER BY rank, id DESC
    `
  );
  stmt.bind([...params, pageSize, offset]);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  renderResults(rows);
  updatePagination();
}