function renderResults(rows) {
      const tbody = $('#resultsTable tbody');
      tbody.innerHTML = '';
      const frag = document.createDocumentFragment();

      for (const row of rows) {
        const tr = document.createElement('tr');
        tr.dataset.id = String(row.id);
        tr.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            openDetailView(row);
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
        tdTitle.innerHTML = `<div style="font-weight:700">${escapeHTML(row.titel)}</div>`;
        tr.appendChild(tdTitle);

        const tdQuelle = document.createElement('td');
        tdQuelle.textContent = row.quelle;
        tr.appendChild(tdQuelle);

        const tdZitat = document.createElement('td');
        tdZitat.innerHTML = `<div class="truncate">${escapeHTML(row.zitat)}</div>`;
        tr.appendChild(tdZitat);

        const tdGenutzt = document.createElement('td');
        tdGenutzt.innerHTML = `<div class="truncate muted">${escapeHTML(row.genutzt)}</div>`;
        tr.appendChild(tdGenutzt);

        frag.appendChild(tr);
      }

      tbody.appendChild(frag);

      // Header select-all checkbox state
      const rowsIds = rows.map(r => r.id);
      const allSelected = rowsIds.length > 0 && rowsIds.every(id => selectedIds.has(id));
      $('#selectAllCheckbox').checked = allSelected;

      // Update counters
      $('#totalCount').textContent = String(totalResults);
      updateSelectedCounter();

      // Helper buttons bound to current page rows
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

    function openDetailView(quote) {
      $('#detailId').value = quote.id;
      $('#detailTitle').value = quote.titel;
      $('#detailSource').value = quote.quelle;
      $('#detailText').value = quote.zitat;
      $('#detailUsed').value = quote.genutzt;
      $('#detailModal').style.display = 'block';
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

      $('#saveDetailBtn').addEventListener('click', async () => {
        const id = parseInt($('#detailId').value, 10);
        const quote = {
          titel: $('#detailTitle').value,
          quelle: $('#detailSource').value,
          zitat: $('#detailText').value,
          genutzt: $('#detailUsed').value
        };
        await updateQuote(id, quote);
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

      $('#openBtn').addEventListener('click', loadDatabase);
      $('#saveBtn').addEventListener('click', saveDatabase);
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
    });