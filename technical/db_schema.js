let sqlRuntime = null;

async function getSqlRuntime() {
  if (!sqlRuntime) {
    sqlRuntime = await initSqlJs({ locateFile: file => `technical/${file}` });
  }
  return sqlRuntime;
}

function buildSnowballTokenizer(selectedLanguages) {
  if (Array.isArray(selectedLanguages) && selectedLanguages.length > 0) {
    return `snowball ${selectedLanguages.join(' ')}`;
  }
  return 'snowball italian german english';
}

function ensureQuotesTable(targetDb, tokenize = 'snowball italian german english') {
  targetDb.run(`CREATE VIRTUAL TABLE IF NOT EXISTS quotes USING fts5(
    titel,
    quelle,
    zitat,
    genutzt,
    DeletedDateTime UNINDEXED,
    tokenize = '${tokenize}'
  )`);
}

function ensureAttachmentsTable(targetDb) {
  targetDb.run(`CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_rowid INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT,
    data BLOB NOT NULL
  )`);
}

function ensureLoboscoSchema(targetDb, options = {}) {
  const tokenize = options.tokenize || 'snowball italian german english';
  ensureQuotesTable(targetDb, tokenize);
  ensureAttachmentsTable(targetDb);
}

function applyQuotesRankingAndOptimize(targetDb) {
  targetDb.run(`INSERT INTO quotes(quotes, rank) VALUES('rank', 'bm25(10.0, 5.0, 8.0, 2.0)')`);
  targetDb.run(`INSERT INTO quotes(quotes) VALUES('rebuild')`);
  targetDb.run(`INSERT INTO quotes(quotes) VALUES('optimize')`);
}
