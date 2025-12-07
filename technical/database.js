// ---- DB init ----
async function loadDatabase() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'SQLite DB', accept: { 'application/octet-stream': ['.sqlite'] } }]
    });
    fileHandle = handle;
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    const SQL = await initSqlJs({ locateFile: file => `technical/${file}` });
    db = new SQL.Database(new Uint8Array(buffer));

    // Create FTS5 virtual table if not exists
    db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS quotes USING fts5(
      titel,
      quelle,
      zitat,
      genutzt,
      DeletedDateTime UNINDEXED,
      tokenize = 'snowball italian german english'
    )`);
    
    // Set the ranking weights using BM25
    db.run(`INSERT INTO quotes(quotes, rank) VALUES('rank', 'bm25(10.0, 5.0, 8.0, 2.0)')`);

    // Do initial search
    await searchQuotes(true);
  } catch (e) {
    console.error(e);
    alert("Öffnen fehlgeschlagen oder abgebrochen.");
  }
}

async function saveDatabase() {
  if (!db || !fileHandle) { alert("Keine Datenbank geöffnet."); return; }
  const writable = await fileHandle.createWritable();
  const buffer = db.export();
  await writable.write(buffer);
  await writable.close();
  //alert("Datenbank gespeichert.");
}

// ---- NEW: Function to drop the table ----
async function dropTable() {
    if (!db) { alert("Bitte zuerst eine Datenbank öffnen."); return; }
    if (!confirm("WARNUNG: Sind Sie sicher, dass Sie alle Zitate permanent löschen wollen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.")) {
        return;
    }
    try {
        db.run('DROP TABLE IF EXISTS quotes');
        alert("Die Tabelle 'quotes' wurde gelöscht.");
        // Refresh the view, which will now be empty
        await searchQuotes(true);
        // Save the change to the file
        await saveDatabase();
    } catch (e) {
        console.error(e);
        alert("Fehler beim Löschen der Tabelle: " + e.message);
    }
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

  // Reset form
  $('#quoteTitle').value = '';
  $('#quoteSource').value = '';
  $('#quoteText').value = '';
  $('#quoteUsed').value = '';

  // Refresh and persist
  currentPage = 1;
  searchQuotes(true);
  saveDatabase().catch(()=>{});
}
function updateQuote(id, quote) {
  if (!db) return;
  db.run(
    `UPDATE quotes
     SET titel = ?, quelle = ?, zitat = ?, genutzt = ?
     WHERE rowid = ?`,
    [quote.titel, quote.quelle, quote.zitat, quote.genutzt, id]
  );
  saveDatabase().catch(()=>{});
}

// MODIFIED: deleteQuote now performs a soft delete
function deleteQuote(id) {
  if (!db || !id) return;
  const timestamp = new Date().toISOString();
  db.run(`UPDATE quotes SET DeletedDateTime = ? WHERE rowid = ?`, [timestamp, id]);
  selectedIds.delete(id);
  searchQuotes();
  saveDatabase().catch(()=>{});
}

// MODIFIED: deleteSelected now performs a soft delete
function deleteSelected() {
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
  saveDatabase().catch(()=>{});
}