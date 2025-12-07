// ---- HTML export helpers ----
// Escape text for safe HTML insertion and preserve newlines as <br>
function htmlEscape(str) {
  if (str == null) return '';
  const s = String(str);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/\'/g, '&#39;');
}

function nlToBr(s) {
  return s.replace(/\r\n|\n/g, '<br>');
}

function buildHtml(quotes) {
  // Build a compact HTML fragment suitable for clipboard 'text/html'.
  const parts = ['<div class="export-quotes">'];
  for (const q of quotes) {
    const title = htmlEscape(q.titel || '');
    const quelle = htmlEscape(q.quelle || '');
    const zitat = htmlEscape(q.zitat || '');
    const genutzt = htmlEscape(q.genutzt || '');

    if (title) parts.push(`<h3 style="margin:0 0 4px 0">${nlToBr(title)}</h3>`);
    if (quelle) parts.push(`<div style="font-style:italic;color:#444;margin-bottom:6px">Quelle: ${nlToBr(quelle)}</div>`);
    if (zitat) parts.push(`<blockquote style="margin:0 0 6px 0;padding-left:10px;border-left:3px solid #ddd">${nlToBr(zitat)}</blockquote>`);
    if (genutzt) parts.push(`<div style="color:#666;font-size:0.9em;margin-bottom:8px">Genutzt: ${nlToBr(genutzt)}</div>`);
    parts.push('<hr style="border:none;border-top:1px solid #eee;margin:8px 0">');
  }
  parts.push('</div>');
  return parts.join('\n');
}

async function copyHtmlToClipboard(htmlString, plainTextFallback) {
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const blob = new Blob([htmlString], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([plainTextFallback], { type: 'text/plain' }) });
      await navigator.clipboard.write([item]);
      //alert('Markierte Zitate wurden in die Zwischenablage kopiert.');
      return;
    } catch (err) {
      console.error('HTML clipboard failed:', err);
    }
  }
  // Fallback to plain text
  try {
    await navigator.clipboard.writeText(plainTextFallback);
    alert('Der Text wurde in die Zwischenablage kopiert.');
  } catch (err) {
    alert('Kopieren in die Zwischenablage nicht möglich (Berechtigungen?).\nFehler: ' + err);
    console.error('Clipboard write failed:', err);
  }
}

// Export selected as RTF
function exportSelectedAsRtf() {
  if (!db) { alert("Bitte zuerst eine Datenbank öffnen."); return; }
  if (selectedIds.size === 0) { alert("Keine markierten Zitate."); return; }

  const ids = Array.from(selectedIds);
  // Load full rows for all selected ids
  const placeholders = ids.map(() => '?').join(',');
  const rows = [];
  const stmt = db.prepare(
   `SELECT rowid as id, COALESCE(titel,'') as titel, COALESCE(quelle,'') as quelle,
        COALESCE(zitat,'') as zitat, COALESCE(genutzt,'') as genutzt
    FROM quotes
    WHERE rowid IN (${placeholders}) AND DeletedDateTime IS NULL
    ORDER BY rowid ASC` // Added DeletedDateTime check for safety
  );
  stmt.bind(ids);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  // Build HTML export (keeps function name for compatibility with UI)
  const html = buildHtml(rows);
  // Plain text fallback with simple formatting
  const textFallback = rows.map(q => {
    const parts = [];
    if (q.titel) parts.push(`*Titel:* ${q.titel}`);
    if (q.quelle) parts.push(`*Quelle:* _${q.quelle}_`);
    if (q.zitat) parts.push(`*Zitat:* ${q.zitat}`);
    if (q.genutzt) parts.push(`*Genutzt:* ${q.genutzt}`);
    return parts.join('\n') + '\n';
  }).join('\n');

  copyHtmlToClipboard(html, textFallback);
}