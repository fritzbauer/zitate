// ---- RTF helpers ----
// Convert JS string to RTF-safe string with unicode support
function rtfEscapeUnicode(str) {
  const specials = /[\\{}]/g;
  const escapeSpecials = s => s.replace(specials, m => '\\' + m);

  // iterate code points safely
  let out = '';
  for (const ch of Array.from(str ?? '')) {
    const cp = ch.codePointAt(0);
    // ASCII range and not special: output as-is
    if (cp <= 0x7f && !/^[\\{}]$/.test(ch)) { out += ch; continue; }
    // newline -> RTF line break
    if (ch === '\n') { out += '\\line '; continue; }
    // tab
    if (ch === '\t') { out += '\\tab '; continue; }
    // For non-BMP, encode surrogate pair as two \u values
    if (cp > 0xFFFF) {
      const u = cp - 0x10000;
      const high = 0xD800 + (u >> 10);
      const low  = 0xDC00 + (u & 0x3FF);
      const sHigh = (high <= 32767 ? high : high - 65536);
      const sLow  = (low  <= 32767 ? low  : low  - 65536);
      out += `\\u${sHigh}?\\u${sLow}?`;
    } else {
      // escape specials as well
      const esc = escapeSpecials(ch);
      if (esc !== ch) { out += esc; continue; }
      const signed = (cp <= 32767 ? cp : cp - 65536);
      out += `\\u${signed}?`;
    }
  }
  return out;
}

function buildRtf(quotes) {
  // Simple, readable RTF: Title bold, Source italic (muted), then Quote text and Used notes as paragraphs.
  const header = '{\\rtf1\\ansi\\deff0\\fs22\\f0 ';
  const body = quotes.map(q => {
    const title = rtfEscapeUnicode(q.titel || '');
    const quelle = rtfEscapeUnicode(q.quelle || '');
    const zitat = rtfEscapeUnicode(q.zitat || '');
    const genutzt = rtfEscapeUnicode(q.genutzt || '');
    const parts = [];
    if (title) parts.push(`\\b ${title}\\b0\\par`);
    if (quelle) parts.push(`\\i ${quelle}\\i0\\par`);
    if (zitat) parts.push(`${zitat}\\par`);
    if (genutzt) parts.push(`\\cf2 ${genutzt}\\cf0\\par`);
    // separator:
    parts.push('\\par');
    return parts.join('\n');
  }).join('\n');
  const footer = '}';
  return header + body + footer;
}

async function copyRtfToClipboard(rtfString, plainTextFallback) {
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const blob = new Blob([rtfString], { type: 'text/rtf' });
      const item = new ClipboardItem({ 'text/rtf': blob, 'text/plain': new Blob([plainTextFallback], { type: 'text/plain' }) });
      await navigator.clipboard.write([item]);
      alert('Markierte Zitate wurden als RTF in die Zwischenablage kopiert.');
      return;
    } catch (err) {
      console.error('RTF failed:', err);
    }
  }
  // Fallback to plain text
  try {
    await navigator.clipboard.writeText(plainTextFallback);
    alert('RTF wird nicht unterstützt. Plain-Text wurde in die Zwischenablage kopiert.');
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
    `SELECT id, COALESCE(titel,'') as titel, COALESCE(quelle,'') as quelle,
           COALESCE(zitat,'') as zitat, COALESCE(genutzt,'') as genutzt
      FROM quotes
     WHERE id IN (${placeholders}) AND DeletedDateTime IS NULL
     ORDER BY id ASC` // Added DeletedDateTime check for safety
  );
  stmt.bind(ids);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  const rtf = buildRtf(rows);
  // Plain text fallback with simple formatting
  const textFallback = rows.map(q => {
    const parts = [];
    if (q.titel) parts.push(`*${q.titel}*`);
    if (q.quelle) parts.push(`_${q.quelle}_`);
    if (q.zitat) parts.push(q.zitat);
    if (q.genutzt) parts.push(`(Genutzt: ${q.genutzt})`);
    return parts.join('\n') + '\n';
  }).join('\n');

  copyRtfToClipboard(rtf, textFallback);
}