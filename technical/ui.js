let currentResults = [];
let currentIndex = -1;

// Replace newlines in highlighted HTML with <br> so line breaks show in divs.
function formatHighlightedHtml(html) {
  if (html == null) return '';
  // Ensure it's a string
  const s = String(html);
  // Replace CRLF and LF with <br>
  return s.replace(/\r\n|\n/g, '<br>');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderAttachments(quoteRowid) {
  const container = $('#attachmentsList');
  container.innerHTML = '';

  if (!quoteRowid) {
    container.innerHTML = '<div class="no-attachments">Speichern Sie zuerst das Zitat, um Anhänge hinzuzufügen.</div>';
    return;
  }

  const attachments = getAttachments(quoteRowid);
  const isEditing = document.getElementById('editDetailBtn')?.dataset.editing === '1';

  if (attachments.length === 0) {
    container.innerHTML = '<div class="no-attachments">Keine Anhänge</div>';
    return;
  }

  attachments.forEach(att => {
    const item = document.createElement('div');
    item.className = 'attachment-item';

    const nameEl = document.createElement('span');
    nameEl.className = 'attachment-name';
    nameEl.textContent = att.filename;
    nameEl.title = 'Klicken zum Herunterladen';
    nameEl.addEventListener('click', () => downloadAttachment(att.id));

    const sizeEl = document.createElement('span');
    sizeEl.className = 'attachment-size';
    sizeEl.textContent = formatFileSize(att.size);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'attachment-delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Anhang löschen';
    deleteBtn.style.display = isEditing ? 'inline-block' : 'none';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Anhang "${att.filename}" wirklich löschen?`)) {
        await deleteAttachment(att.id);
        renderAttachments(quoteRowid);
      }
    });

    item.appendChild(nameEl);
    item.appendChild(sizeEl);
    item.appendChild(deleteBtn);
    container.appendChild(item);
  });
}

function downloadAttachment(attachmentId) {
  const att = getAttachmentData(attachmentId);
  if (!att) return;
  const blob = new Blob([att.data], { type: att.mime_type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function enterDetailEditMode() {
  document.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'inline-block');
  document.querySelectorAll('.detail-display').forEach(el => el.style.display = 'none');
  const btn = document.getElementById('editDetailBtn');
  if (btn) { btn.textContent = 'Abbrechen'; btn.dataset.editing = '1'; }
  // Show attachment delete buttons
  document.querySelectorAll('.attachment-delete').forEach(el => el.style.display = 'inline-block');
}

function exitDetailEditMode() {
  document.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.detail-display').forEach(el => el.style.display = 'block');
  const btn = document.getElementById('editDetailBtn');
  if (btn) { btn.textContent = 'Bearbeiten'; btn.dataset.editing = '0'; }
  // Show navigation and delete buttons that might have been hidden for new quotes
  document.getElementById('prevQuoteBtn').style.display = '';
  document.getElementById('nextQuoteBtn').style.display = '';
  document.getElementById('deleteDetailBtn').style.display = '';
  // Hide attachment delete buttons
  document.querySelectorAll('.attachment-delete').forEach(el => el.style.display = 'none');
}

function renderResults(rows) {
      currentResults = rows;
      const tbody = $('#resultsTable tbody');
      tbody.innerHTML = '';
      const frag = document.createDocumentFragment();

      rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = String(row.id);
        tr.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            openDetailView(index);
          }
        });

        // Select checkbox
        const tdSel = document.createElement('td');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedIds.has(row.id);
        cb.addEventListener('change', () => {
          if (cb.checked) selectedIds.add(row.id);
          else selectedIds.delete(row.id);
          updateSelectedCounter();
          // update header master
          const allChecked = Array.from(tbody.querySelectorAll('input[type="checkbox"]')).every(x => x.checked);
          $('#selectAllCheckbox').checked = allChecked;
        });
        tdSel.appendChild(cb);
        tr.appendChild(tdSel);

  const tdTitle = document.createElement('td');
  // titel here contains highlighted HTML from FTS5; preserve line breaks
  tdTitle.innerHTML = `<div style="font-weight:700">${formatHighlightedHtml(row.titel)}</div>`;
    tr.appendChild(tdTitle);

    const tdZitat = document.createElement('td');
  // zitat uses snippet() in list; preserve line breaks
  tdZitat.innerHTML = `<div class="truncate">${formatHighlightedHtml(row.snippet_zitat)}</div>`;
    tr.appendChild(tdZitat);

    const tdQuelle = document.createElement('td');
  // quelle may contain highlight markup; preserve line breaks
  tdQuelle.innerHTML = formatHighlightedHtml(row.quelle);
    tr.appendChild(tdQuelle);

    const tdGenutzt = document.createElement('td');
  tdGenutzt.innerHTML = `<div class="truncate muted">${formatHighlightedHtml(row.snippet_genutzt)}</div>`;
    tr.appendChild(tdGenutzt);

        frag.appendChild(tr);
      });

      tbody.appendChild(frag);

      // Header select-all checkbox state
      const rowsIds = rows.map(r => r.id);
      const allSelected = rowsIds.length > 0 && rowsIds.every(id => selectedIds.has(id));
      $('#selectAllCheckbox').checked = allSelected;

      // Update counters
      $('#totalCount').textContent = String(totalResults);
      updateSelectedCounter();

      // Helper buttons bound to current page rows
      /*
      $('#selectPageBtn').onclick = () => {
        for (const id of rowsIds) selectedIds.add(id);
        tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateSelectedCounter();
        $('#selectAllCheckbox').checked = true;
      };*/
      $('#clearPageBtn').onclick = () => {
        for (const id of selectedIds) selectedIds.delete(id);
        tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateSelectedCounter();
        $('#selectAllCheckbox').checked = false;
      };
    }

    function updatePagination() {
      const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;

      $('#currentPage').textContent = String(currentPage);
      $('#totalPages').textContent = String(totalPages);

      $('#prevPageBtn').disabled = currentPage <= 1;
      $('#nextPageBtn').disabled = currentPage >= totalPages;

      const start = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
      const end = Math.min(currentPage * pageSize, totalResults);
      $('#pageInfo').textContent = `${start}–${end} von ${totalResults}`;
    }

    function updateSelectedCounter() {
      $('#selectedCount').textContent = String(selectedIds.size);
    }

    function openDetailView(index) {
      currentIndex = index;
      const quote = currentResults[currentIndex];
      if (!quote) return;

      // Set id
      $('#detailId').value = quote.id;
      $('#detailTitleDisplay').innerHTML = formatHighlightedHtml(quote.titel || '');
      $('#detailSourceDisplay').innerHTML = formatHighlightedHtml(quote.quelle || '');
      $('#detailTextDisplay').innerHTML = formatHighlightedHtml(quote.zitat || '');
      $('#detailUsedDisplay').innerHTML = formatHighlightedHtml(quote.genutzt || '');
      // Populate edit inputs with raw values
      $('#detailTitle').value = quote._raw_titel || '';
      $('#detailSource').value = quote._raw_quelle || '';
      $('#detailText').value = quote._raw_zitat || '';
      $('#detailUsed').value = quote._raw_genutzt || '';

      $('#detailModal').style.display = 'block';
      
      // Show "Für Export markieren" checkbox and navigation buttons for existing quotes
      document.querySelector('.export-check').style.display = 'block';
      $('#prevQuoteBtn').style.display = 'block';
      $('#nextQuoteBtn').style.display = 'block';
      $('#deleteDetailBtn').style.display = 'block';
      
      $('#detailExportCb').checked = selectedIds.has(quote.id);

      // Render attachments
      renderAttachments(quote.id);

      // Ensure we start in display (non-edit) mode
      exitDetailEditMode();

      $('#prevQuoteBtn').disabled = currentIndex === 0;
      $('#nextQuoteBtn').disabled = currentIndex === currentResults.length - 1;
    }

    function openDetailViewForNewQuote() {
      if (!db) { alert("Bitte zuerst eine Datenbank öffnen."); return; }
      // Clear all fields
      $('#detailId').value = '';
      $('#detailTitleDisplay').innerHTML = '';
      $('#detailSourceDisplay').innerHTML = '';
      $('#detailTextDisplay').innerHTML = '';
      $('#detailUsedDisplay').innerHTML = '';
      $('#detailTitle').value = '';
      $('#detailSource').value = '';
      $('#detailText').value = '';
      $('#detailUsed').value = '';
      
      // Open modal in edit mode
      $('#detailModal').style.display = 'block';
      
      // Hide "Für Export markieren" checkbox for new quotes
      document.querySelector('.export-check').style.display = 'none';

      // Render attachments (empty for new quotes)
      renderAttachments(null);
      
      enterDetailEditMode();
      
      // Hide navigation buttons since we don't have results to navigate
      $('#prevQuoteBtn').disabled = true;
      $('#nextQuoteBtn').disabled = true;
      $('#prevQuoteBtn').style.display = 'none';
      $('#nextQuoteBtn').style.display = 'none';
      
      // Update delete button to be hidden (can't delete non-existent quote)
      $('#deleteDetailBtn').style.display = 'none';
      
      // Focus on first field
      $('#detailTitle').focus();
    }

    // ---- Event bindings ----
    window.addEventListener('DOMContentLoaded', () => {
      const modal = $('#detailModal');
      const closeButton = modal.querySelector('.close-button');

      closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
      });

      window.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      });

      $('#prevQuoteBtn').addEventListener('click', () => {
        if (currentIndex > 0) {
          openDetailView(currentIndex - 1);
        }
      });

      $('#nextQuoteBtn').addEventListener('click', () => {
        if (currentIndex < currentResults.length - 1) {
          openDetailView(currentIndex + 1);
        }
      });

      window.addEventListener('keydown', (e) => {
        if ($('#detailModal').style.display === 'block') {
          if (e.key === 'ArrowLeft') {
            $('#prevQuoteBtn').click();
          } else if (e.key === 'ArrowRight') {
            $('#nextQuoteBtn').click();
          } else if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            $('#detailExportCb').click();
          } else if (e.key === 'Escape') {
            // Prüfe ob ein Textfeld (input/textarea) im Modal fokussiert ist
            const modal = $('#detailModal');
            const active = document.activeElement;
            const isTextField = (active && modal.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA'));
            if (isTextField) {
              active.blur();
            } else {
              modal.style.display = 'none';
            }
          }
        }
      });

      $('#saveDetailBtn').addEventListener('click', async () => {
        const detailId = $('#detailId').value;
        
        if (!detailId) {
          // New quote - add it via database
          const titel = $('#detailTitle').value.trim();
          const quelle = $('#detailSource').value.trim();
          const zitat = $('#detailText').value.trim();
          const genutzt = $('#detailUsed').value.trim();
          
          if (!titel || !quelle || !zitat) {
            alert("Titel, Quelle und Zitat sind erforderlich.");
            return;
          }
          
          // Insert new quote
          db.run(
            `INSERT INTO quotes (titel, quelle, zitat, genutzt, DeletedDateTime)
             VALUES (?, ?, ?, ?, NULL)`,
            [titel, quelle, zitat, genutzt]
          );
          runMaintenanceIfNeeded();
          await saveAfterMutation();
        } else {
          // Existing quote - update it
          const id = parseInt(detailId, 10);
          const quoteObj = {
            titel: $('#detailTitle').value,
            quelle: $('#detailSource').value,
            zitat: $('#detailText').value,
            genutzt: $('#detailUsed').value
          };
          await updateQuote(id, quoteObj);
        }
        
        // After saving, refresh and show updated highlighted content
        modal.style.display = 'none';
        currentPage = 1;
        await searchQuotes(true);
      });

      $('#deleteDetailBtn').addEventListener('click', async () => {
        const id = parseInt($('#detailId').value, 10);
        if (confirm('Soll das Zitat wirklich gelöscht werden?')) {
          await deleteQuote(id);
          modal.style.display = 'none';
          searchQuotes(); // Refresh the list
        }
      });

      $('#detailExportCb').addEventListener('change', () => {
        const id = parseInt($('#detailId').value, 10);
        if ($('#detailExportCb').checked) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
        }
        updateSelectedCounter();
        // Also update the checkbox in the main table
        const mainCb = document.querySelector(`#resultsTable tr[data-id='${id}'] input[type='checkbox']`);
        if (mainCb) {
          mainCb.checked = $('#detailExportCb').checked;
        }
      });

      $('#openBtn').addEventListener('click', loadDatabase);
      $('#newQuoteBtn').addEventListener('click', openDetailViewForNewQuote);

      // Attachment handling
      $('#addAttachmentBtn').addEventListener('click', () => {
        $('#attachmentFileInput').click();
      });
      $('#attachmentFileInput').addEventListener('change', async (e) => {
        const detailId = $('#detailId').value;
        if (!detailId) {
          alert('Bitte speichern Sie zuerst das Zitat, um Anhänge hinzuzufügen.');
          return;
        }
        const quoteRowid = parseInt(detailId, 10);
        const files = e.target.files;
        for (const file of files) {
          await addAttachment(quoteRowid, file);
        }
        renderAttachments(quoteRowid);
        e.target.value = ''; // reset input
      });
      $('#saveBtn').addEventListener('click', () => {
        saveDatabase().catch((e) => {
          console.error(e);
          alert("Speichern fehlgeschlagen: " + e.message);
        });
      });
      //$('#dropTableBtn').addEventListener('click', dropTable); // NEW event listener
      //$('#addQuoteBtn').addEventListener('click', addQuote);
      //$('#deleteSelectedBtn').addEventListener('click', deleteSelected);
      $('#exportRtfBtn').addEventListener('click', exportSelectedAsRtf);
      $('#prevPageBtn').addEventListener('click', () => { if (currentPage > 1) { currentPage--; searchQuotes(); } });
      $('#nextPageBtn').addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
        if (currentPage < totalPages) { currentPage++; searchQuotes(); }
      });  
      $('#searchInput').addEventListener('input', debounce(() => searchQuotes(true), 250));

      // Search-all-columns checkbox: re-run search and update placeholder
      const searchAllCb = $('#searchAllColumns');
      if (searchAllCb) {
        searchAllCb.addEventListener('change', () => {
          $('#searchInput').placeholder = searchAllCb.checked
            ? 'Suchbegriff in Titel, Quelle, Zitat oder Genutzt …'
            : 'Suchbegriff im Titel …';
          searchQuotes(true);
        });
      }

      $('#selectAllCheckbox').addEventListener('change', () => {
        const tbody = $('#resultsTable tbody');
        const boxes = tbody.querySelectorAll('input[type="checkbox"]');
        const check = $('#selectAllCheckbox').checked;
        boxes.forEach(box => {
          box.checked = check;
          const tr = box.closest('tr');
          const id = Number(tr.dataset.id);
          if (check) selectedIds.add(id); else selectedIds.delete(id);
        });
        updateSelectedCounter();
      });

      const helpIcon = document.getElementById('helpIcon');
      const helpTooltip = document.getElementById('helpTooltip');

      // Tooltip beim Klick auf das Icon anzeigen/verstecken
      helpIcon.addEventListener('click', (event) => {
        event.stopPropagation(); // Verhindert, dass der Klick das document-Event auslöst
        helpTooltip.classList.toggle('visible');
      });

      // Tooltip verstecken, wenn irgendwo anders hingeklickt wird
      document.addEventListener('click', (event) => {
        if (helpTooltip.classList.contains('visible') && !helpIcon.contains(event.target)) {
          helpTooltip.classList.remove('visible');
        }
      });

      window.addEventListener('beforeunload', (event) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
        event.returnValue = '';
      });

      // Edit mode toggle for detail modal
      $('#editDetailBtn').addEventListener('click', () => {
        const editBtn = $('#editDetailBtn');
        const inEdit = editBtn.dataset.editing === '1';
        if (inEdit) {
          // Cancel edit
          exitDetailEditMode();
        } else {
          enterDetailEditMode();
        }
      });

      // Make table columns resizable by adding small draggable handles to each header.
      // This function uses <colgroup> / <col> to set widths so cells resize consistently.
      function makeColumnsResizable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        table.style.tableLayout = 'fixed';
        let colgroup = table.querySelector('colgroup');
        const thead = table.querySelector('thead');
        const ths = thead ? Array.from(thead.querySelectorAll('th')) : [];

        if (!colgroup) {
          colgroup = document.createElement('colgroup');
          ths.forEach(() => colgroup.appendChild(document.createElement('col')));
          table.insertBefore(colgroup, table.firstChild);
        } else {
          // Ensure colgroup contains as many cols as headers
          while (colgroup.children.length < ths.length) colgroup.appendChild(document.createElement('col'));
        }
        const cols = Array.from(colgroup.querySelectorAll('col'));

        ths.forEach((th, i) => {
          // Avoid adding multiple resizers
          if (th.querySelector('.col-resizer')) return;
          th.style.position = th.style.position || 'sticky';
          th.style.boxSizing = 'border-box';
          const res = document.createElement('div');
          res.className = 'col-resizer';
          res.dataset.col = String(i);
          th.appendChild(res);
          res.addEventListener('mousedown', initDrag);
          res.addEventListener('touchstart', function (ev) { initDrag.call(this, ev.touches[0]); }, { passive: false });
        });

        let startX = 0;
        let startWidth = 0;
        let currentCol = null;

        function initDrag(e) {
          e.preventDefault();
          const idx = Number(this.dataset.col);
          currentCol = cols[idx];
          startX = e.clientX;
          startWidth = currentCol.getBoundingClientRect().width;
          document.addEventListener('mousemove', doDrag);
          document.addEventListener('mouseup', stopDrag);
          document.addEventListener('touchmove', touchMove, { passive: false });
          document.addEventListener('touchend', stopDrag);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        }

        function doDrag(e) {
          if (!currentCol) return;
          const dx = e.clientX - startX;
          const newW = Math.max(30, startWidth + dx);
          currentCol.style.width = newW + 'px';
        }

        function touchMove(e) {
          if (!currentCol) return;
          e.preventDefault();
          const touch = e.touches[0];
          const dx = touch.clientX - startX;
          const newW = Math.max(30, startWidth + dx);
          currentCol.style.width = newW + 'px';
        }

        function stopDrag() {
          document.removeEventListener('mousemove', doDrag);
          document.removeEventListener('mouseup', stopDrag);
          document.removeEventListener('touchmove', touchMove);
          document.removeEventListener('touchend', stopDrag);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          currentCol = null;
        }
      }

      // initialize resizers for the results table
      makeColumnsResizable('resultsTable');
    });