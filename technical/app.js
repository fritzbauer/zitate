let db;
let fileHandle;
let currentPage = 1;
let pageSize = 100;
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
        LIMIT ? OFFSET ?
      
    )
    GROUP BY id
    HAVING COALESCE(rank, 0) = MAX(COALESCE(rank, 0))
    ORDER BY rank, id
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