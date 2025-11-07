let db;
let fileHandle;
let currentPage = 1;
let pageSize = 20;
let totalResults = 0;
let selectedIds = new Set();
let lastSearchTerm = "";

// Small helpers
const $ = sel => document.querySelector(sel);

function debounce(fn, delay = 250) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function escapeHTML(str) {
      return String(str ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

function searchQuotes(resetPage = false) {
  if (!db) return;
  const term = $('#searchInput').value.trim();
  if (resetPage || term !== lastSearchTerm) {
    currentPage = 1;
  }
  lastSearchTerm = term;

  const { where, params } = buildSearchWhere(term);

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
    `SELECT id, COALESCE(titel,'') as titel, COALESCE(quelle,'') as quelle,
           COALESCE(zitat,'') as zitat, COALESCE(genutzt,'') as genutzt
      FROM quotes
      ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`
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