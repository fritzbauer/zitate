// ---- DB init ----
async function openDatabaseFromFile(file) {
  const buffer = await file.arrayBuffer();
  const SQL = await initSqlJs({ locateFile: file => `technical/${file}` });
  db = new SQL.Database(new Uint8Array(buffer));

  db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS quotes USING fts5(
    titel,
    quelle,
    zitat,
    genutzt,
    DeletedDateTime UNINDEXED,
    tokenize = 'snowball italian german english'
  )`);

  db.run(`INSERT INTO quotes(quotes, rank) VALUES('rank', 'bm25(10.0, 5.0, 8.0, 2.0)')`);

  // Create attachments table (separate from FTS5, stores blobs)
  db.run(`CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_rowid INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT,
    data BLOB NOT NULL
  )`);
}

async function loadDatabase() {
  try {
    let file;
    const supportsPicker = typeof window.showOpenFilePicker === 'function';

    if (supportsPicker) {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'SQLite DB', accept: { 'application/octet-stream': ['.sqlite'] } }]
      });
      fileHandle = handle;
      file = await fileHandle.getFile();
      requiresManualSave = false;
    } else {
      const input = $('#dbFileInput');
      if (!input) {
        throw new Error('Datei-Auswahl nicht verfügbar.');
      }
      file = await new Promise(resolve => {
        input.value = '';
        input.onchange = () => resolve(input.files && input.files[0]);
        input.click();
      });
      if (!file) {
        throw new Error('Keine Datei ausgewählt.');
      }
      fileHandle = undefined;
      requiresManualSave = true;
    }

    openedFileName = file.name || 'quotes.sqlite';
    manualSaveHintShown = false;
    clearDatabaseChanged();

    await openDatabaseFromFile(file);

    // Do initial search
    await searchQuotes(true);
  } catch (e) {
    console.error(e);
    alert("Öffnen fehlgeschlagen oder abgebrochen.");
  }
}

async function saveDatabase() {
  if (!db) { alert("Keine Datenbank geöffnet."); return; }
  const buffer = db.export();
  if (!requiresManualSave && fileHandle) {
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();
  } else {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = openedFileName || 'quotes.sqlite';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  clearDatabaseChanged();
  //alert("Datenbank gespeichert.");
}

async function saveAfterMutation() {
  markDatabaseChanged();
  maybeShowManualSaveHint();
  if (!requiresManualSave) {
    await saveDatabase();
  }
}

function runMaintenanceIfNeeded() {
  if (!db) return;

  let quoteCount = 0;
  const stmt = db.prepare(
    `SELECT COUNT(*) as c
     FROM quotes
     WHERE titel IS NOT NULL OR quelle IS NOT NULL OR zitat IS NOT NULL OR genutzt IS NOT NULL`
  );

  if (stmt.step()) {
    quoteCount = Number(stmt.getAsObject().c) || 0;
  }
  stmt.free();

  if (quoteCount > 0 && quoteCount % 50 === 0) {
    db.run(`INSERT INTO quotes(quotes) VALUES('rebuild')`);
    db.run(`INSERT INTO quotes(quotes) VALUES('optimize')`);
  }
}

// ---- NEW: Function to drop the table ----
async function dropTable() {
    if (!db) { alert("Bitte zuerst eine Datenbank öffnen."); return; }
    if (!confirm("WARNUNG: Sind Sie sicher, dass Sie alle Zitate permanent löschen wollen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.")) {
        return;
    }
    try {
        db.run('DROP TABLE IF EXISTS quotes');
      await saveAfterMutation();
        alert("Die Tabelle 'quotes' wurde gelöscht.");
        // Refresh the view, which will now be empty
        await searchQuotes(true);
    } catch (e) {
        console.error(e);
        alert("Fehler beim Löschen der Tabelle: " + e.message);
    }
}

// ---- Attachments CRUD ----
function getAttachments(quoteRowid) {
  if (!db) return [];
  const stmt = db.prepare('SELECT id, filename, mime_type, length(data) as size FROM attachments WHERE quote_rowid = ? ORDER BY id ASC');
  stmt.bind([quoteRowid]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getAttachmentData(attachmentId) {
  if (!db) return null;
  const stmt = db.prepare('SELECT filename, mime_type, data FROM attachments WHERE id = ?');
  stmt.bind([attachmentId]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

async function addAttachment(quoteRowid, file) {
  if (!db) return;
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  db.run(
    'INSERT INTO attachments (quote_rowid, filename, mime_type, data) VALUES (?, ?, ?, ?)',
    [quoteRowid, file.name, file.type || 'application/octet-stream', data]
  );
  await saveAfterMutation();
}

async function deleteAttachment(attachmentId) {
  if (!db) return;
  db.run('DELETE FROM attachments WHERE id = ?', [attachmentId]);
  await saveAfterMutation();
}

function getAttachmentNames(quoteRowid) {
  if (!db) return [];
  const stmt = db.prepare('SELECT filename FROM attachments WHERE quote_rowid = ? ORDER BY id ASC');
  stmt.bind([quoteRowid]);
  const names = [];
  while (stmt.step()) {
    names.push(stmt.getAsObject().filename);
  }
  stmt.free();
  return names;
}

// ---- CRUD ----
function addQuote() {
  if (!db) { alert("Bitte zuerst eine Datenbank öffnen."); return; }
  const titel   = $('#quoteTitle').value.trim();
  const quelle  = $('#quoteSource').value.trim();
  const zitat   = $('#quoteText').value.trim();
  const genutzt = $('#quoteUsed').value.trim();

  if (!titel || !quelle || !zitat) {
    alert("Titel, Quelle und Zitat sind erforderlich.");
    return;
  }

  db.run(
    `INSERT INTO quotes (titel, quelle, zitat, genutzt, DeletedDateTime)
     VALUES (?, ?, ?, ?, NULL)`,
    [titel, quelle, zitat, genutzt]
  );

  runMaintenanceIfNeeded();

  // Reset form
  $('#quoteTitle').value = '';
  $('#quoteSource').value = '';
  $('#quoteText').value = '';
  $('#quoteUsed').value = '';

  // Refresh and persist
  currentPage = 1;
  searchQuotes(true);
  saveAfterMutation().catch(()=>{});
}
async function updateQuote(id, quote) {
  if (!db) return;
  db.run(
    `UPDATE quotes
     SET titel = ?, quelle = ?, zitat = ?, genutzt = ?
     WHERE rowid = ?`,
    [quote.titel, quote.quelle, quote.zitat, quote.genutzt, id]
  );
  await saveAfterMutation();
}

// MODIFIED: deleteQuote now performs a soft delete
async function deleteQuote(id) {
  if (!db || !id) return;
  const timestamp = new Date().toISOString();
  db.run(`UPDATE quotes SET DeletedDateTime = ? WHERE rowid = ?`, [timestamp, id]);
  selectedIds.delete(id);
  searchQuotes();
  await saveAfterMutation();
}

// MODIFIED: deleteSelected now performs a soft delete
async function deleteSelected() {
  if (!db) return;
  if (selectedIds.size === 0) { alert("Keine markierten Zitate."); return; }
  if (!confirm(`Wirklich ${selectedIds.size} markierte Zitat(e) löschen?`)) return;

  const ids = Array.from(selectedIds);
  const placeholders = ids.map(() => '?').join(',');
  const timestamp = new Date().toISOString();

  try {
    db.run(`UPDATE quotes SET DeletedDateTime = ? WHERE rowid IN (${placeholders})`, [timestamp, ...ids]);
  } catch (e) {
    alert("Löschen fehlgeschlagen: " + e.message);
    return;
  }

  selectedIds.clear();
  searchQuotes();
  await saveAfterMutation();
}