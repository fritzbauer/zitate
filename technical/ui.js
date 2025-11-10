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

function enterDetailEditMode() {
  document.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'inline-block');
  document.querySelectorAll('.detail-display').forEach(el => el.style.display = 'none');
  const btn = document.getElementById('editDetailBtn');
  if (btn) { btn.textContent = 'Abbrechen'; btn.dataset.editing = '1'; }
}

function exitDetailEditMode() {
  document.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.detail-display').forEach(el => el.style.display = 'block');
  const btn = document.getElementById('editDetailBtn');
  if (btn) { btn.textContent = 'Bearbeiten'; btn.dataset.editing = '0'; }
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

        const tdQuelle = document.createElement('td');
  // quelle may contain highlight markup; preserve line breaks
  tdQuelle.innerHTML = formatHighlightedHtml(row.quelle);
        tr.appendChild(tdQuelle);

        const tdZitat = document.createElement('td');
  tdZitat.innerHTML = `<div class="truncate">${formatHighlightedHtml(row.zitat)}</div>`;
        tr.appendChild(tdZitat);

        const tdGenutzt = document.createElement('td');
  tdGenutzt.innerHTML = `<div class="truncate muted">${formatHighlightedHtml(row.genutzt)}</div>`;
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
      };
      $('#clearPageBtn').onclick = () => {
        for (const id of rowsIds) selectedIds.delete(id);
        tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateSelectedCounter();
        $('#selectAllCheckbox').checked = false;
      };*/
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
      // Try to fetch full highlighted content from the DB (so details show full context,
      // while the list uses FTS5 snippet()). If that fails, fall back to the list row values.
      let full = null;
      try {
        if (db) {
          const s = db.prepare(
            `SELECT COALESCE(titel,'') as _raw_titel, COALESCE(quelle,'') as _raw_quelle,
                    COALESCE(zitat,'') as _raw_zitat, COALESCE(genutzt,'') as _raw_genutzt,
                    highlight(quotes, 0, '<span class="highlight">', '</span>') as full_titel,
                    highlight(quotes, 1, '<span class="highlight">', '</span>') as full_quelle,
                    highlight(quotes, 2, '<span class="highlight">', '</span>') as full_zitat,
                    highlight(quotes, 3, '<span class="highlight">', '</span>') as full_genutzt
               FROM quotes
              WHERE rowid = ? AND DeletedDateTime IS NULL`
          );
          s.bind([quote.id]);
          if (s.step()) full = s.getAsObject();
          s.free();
        }
      } catch (e) {
        console.error('Failed to fetch full highlighted detail:', e);
      }

      const displayTitle = (full && full.full_titel) ? full.full_titel : quote.titel || '';
      const displayQuelle = (full && full.full_quelle) ? full.full_quelle : quote.quelle || '';
      const displayZitat = (full && full.full_zitat) ? full.full_zitat : quote.zitat || '';
      const displayGenutzt = (full && full.full_genutzt) ? full.full_genutzt : quote.genutzt || '';

      // Display highlighted HTML in display divs (preserve line breaks)
      $('#detailTitleDisplay').innerHTML = formatHighlightedHtml(displayTitle);
      $('#detailSourceDisplay').innerHTML = formatHighlightedHtml(displayQuelle);
      $('#detailTextDisplay').innerHTML = formatHighlightedHtml(displayZitat);
      $('#detailUsedDisplay').innerHTML = formatHighlightedHtml(displayGenutzt);

      // Populate edit inputs with raw values (prefer the DB-fetched raw values)
      $('#detailTitle').value = (full && full._raw_titel) ? full._raw_titel : (quote._raw_titel || '');
      $('#detailSource').value = (full && full._raw_quelle) ? full._raw_quelle : (quote._raw_quelle || '');
      $('#detailText').value = (full && full._raw_zitat) ? full._raw_zitat : (quote._raw_zitat || '');
      $('#detailUsed').value = (full && full._raw_genutzt) ? full._raw_genutzt : (quote._raw_genutzt || '');

      $('#detailModal').style.display = 'block';
      $('#detailExportCb').checked = selectedIds.has(quote.id);

      // Ensure we start in display (non-edit) mode
      exitDetailEditMode();

      $('#prevQuoteBtn').disabled = currentIndex === 0;
      $('#nextQuoteBtn').disabled = currentIndex === currentResults.length - 1;
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
        // Save edits from edit-mode inputs
        const id = parseInt($('#detailId').value, 10);
        const quoteObj = {
          titel: $('#detailTitle').value,
          quelle: $('#detailSource').value,
          zitat: $('#detailText').value,
          genutzt: $('#detailUsed').value
        };
        await updateQuote(id, quoteObj);
        // After saving, refresh and show updated highlighted content
        modal.style.display = 'none';
        searchQuotes(); // Refresh the list
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
      //$('#saveBtn').addEventListener('click', saveDatabase);
      $('#dropTableBtn').addEventListener('click', dropTable); // NEW event listener
      $('#addQuoteBtn').addEventListener('click', addQuote);
      //$('#deleteSelectedBtn').addEventListener('click', deleteSelected);
      $('#exportRtfBtn').addEventListener('click', exportSelectedAsRtf);
      $('#prevPageBtn').addEventListener('click', () => { if (currentPage > 1) { currentPage--; searchQuotes(); } });
      $('#nextPageBtn').addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
        if (currentPage < totalPages) { currentPage++; searchQuotes(); }
      });
      $('#pageSize').addEventListener('change', () => {
        pageSize = parseInt($('#pageSize').value, 10) || 20;
        localStorage.setItem('quotes_pageSize', String(pageSize));
        currentPage = 1; searchQuotes();
      });
      $('#searchInput').addEventListener('input', debounce(() => searchQuotes(true), 250));
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
    });