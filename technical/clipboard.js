// ---- HTML export helpers ----
// Convert newlines to <br> for HTML output
function nlToBr(s) {
  return s.replace(/\r\n|\n/g, '<br>');
}

function buildHtml(quotes) {
  // Build an HTML table with specified column widths
  const parts = [
    '<div class="export-quotes">',
    '<table style="border-collapse:collapse;width:100%;border:1px solid #bbb">',
    '<thead>',
    '<tr>',
    '<th style="width:20%;text-align:left;padding:4px 6px;border:1px solid #bbb;background:#f5f6fa">Titel</th>',
    '<th style="width:10%;text-align:left;padding:4px 6px;border:1px solid #bbb;background:#f5f6fa">Quelle</th>',
    '<th style="width:50%;text-align:left;padding:4px 6px;border:1px solid #bbb;background:#f5f6fa">Zitat</th>',
    '<th style="width:10%;text-align:left;padding:4px 6px;border:1px solid #bbb;background:#f5f6fa">Genutzt</th>',
    '<th style="width:10%;text-align:left;padding:4px 6px;border:1px solid #bbb;background:#f5f6fa">Anhänge</th>',
    '</tr>',
    '</thead>',
    '<tbody>'
  ];
  for (const q of quotes) {
    const title = escapeHTML(q.titel || '');
    const quelle = escapeHTML(q.quelle || '');
    const zitat = escapeHTML(q.zitat || '');
    const genutzt = escapeHTML(q.genutzt || '');
    const attachmentNames = getAttachmentNames(q.id);
    parts.push('<tr>');
    parts.push(`<td style="vertical-align:top;padding:4px 6px;border:1px solid #bbb">${nlToBr(title)}</td>`);
    parts.push(`<td style="vertical-align:top;padding:4px 6px;border:1px solid #bbb;font-style:italic;color:#444">${nlToBr(quelle)}</td>`);
    parts.push(`<td style="vertical-align:top;padding:4px 6px;border:1px solid #bbb">${nlToBr(zitat)}</td>`);
    parts.push(`<td style="vertical-align:top;padding:4px 6px;border:1px solid #bbb;color:#666;font-size:0.9em">${nlToBr(genutzt)}</td>`);
    if (attachmentNames.length > 0) {
      parts.push(`<td style="vertical-align:top;padding:4px 6px;border:1px solid #bbb;font-size:0.85em;color:#555">📎 ${attachmentNames.map(n => escapeHTML(n)).join(', ')}</td>`);
    } else {
      parts.push(`<td style="vertical-align:top;padding:4px 6px;border:1px solid #bbb"></td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody>');
  parts.push('</table>');
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
    const attachmentNames = getAttachmentNames(q.id);
    if (attachmentNames.length > 0) {
      parts.push(`*Anhänge:* ${attachmentNames.join(', ')}`);
    }
    return parts.join('\n') + '\n';
  }).join('\n');

  copyHtmlToClipboard(html, textFallback);
}