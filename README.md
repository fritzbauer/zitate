Zitate
======

A client-side Progressive Web App (PWA) for browsing, searching, and managing a collection of quotes stored in a local SQLite database. Everything runs entirely in the browser — no server-side processing is needed.

Features
--------

- **Full-text search** powered by SQLite FTS5 with Snowball stemming (supports Italian, German, English, and more). Supports AND/OR/NOT operators, phrase queries, prefix searches, and column-specific filters.
- **Title-only or all-column search** — toggle a checkbox to search across all fields or restrict to the title column.
- **Detail view modal** — click any quote to open a detailed view where you can edit fields, navigate between results with arrow keys, and mark quotes for export.
- **File attachments** — attach files (images, PDFs, etc.) to individual quotes. Attachments are stored as blobs inside the SQLite database and can be downloaded or deleted per quote.
- **Clipboard export** — select quotes and copy them as a formatted HTML table to the clipboard, including attachment file names.
- **Soft delete** — deleted quotes receive a timestamp and are hidden from search results but remain in the database.
- **Auto-save** — on browsers that support the File System Access API, the database is saved back to the original file automatically after every change. On other browsers a manual download is offered.
- **Resizable table columns** — drag column borders in the results table to adjust widths.
- **Pagination** — results are paginated for performance.
- **Excel import** (`import.html`) — import quotes from an `.xlsx` / `.xls` / `.csv` file into a new SQLite database, with a configurable Snowball tokenizer language selection.
- **Excel export** (`export.html`) — export the SQLite database to an `.xlsx` file, with options to include or exclude soft-deleted entries and automatic cell-length truncation for Excel limits.
- **Responsive layout** — adapts to smartphone, tablet, and desktop viewports with dedicated breakpoints at 480 px, 768 px, and 1280 px.
- **PWA support** — installable as a Progressive Web App with a service worker and manifest for offline use.

Project structure
-----------------

```
index.html              Main application page
import.html             Excel-to-SQLite import wizard
export.html             SQLite-to-Excel export wizard
technical/
  app.js                Global state, helpers, search orchestration
  database.js           SQLite database operations (open, save, CRUD, attachments)
  search_logic.js       FTS5 WHERE-clause builder
  clipboard.js          HTML/clipboard export of selected quotes
  ui.js                 DOM rendering, event bindings, modal/detail view
  styles.css            All shared styles (main app + wizard pages + responsive)
  sql-wasm.js           Custom sql.js build with FTS5 + Snowball stemming
  icons/                PWA icons
service-worker.js       Service worker for offline PWA caching
manifest.json           PWA manifest
```

Getting started
---------------

1. **Serve the files** locally (e.g. `python3 -m http.server 8000` or `./host.sh`).
2. Open `http://localhost:8000` in a modern browser.
3. Click **Datenbank öffnen** and select a `.sqlite` file.
4. Search, browse, edit, and export quotes.


Custom sql.js build
-------------------

This project uses a custom build of `sql.js` that has been extended with the SQLite FTS5 extension and the `fts5-snowball` stemmer to provide improved
full-text search and language-specific stemming.

The custom build is obtained from: https://github.com/fritzbauer/sql.js

Files from that build used in this repo include `technical/sql-wasm.js` and `technical/sql-wasm.wasm`.

License
-------

See the `LICENSE` file in this repository for licensing details.

The fts5-snowball plugin originates from:
https://github.com/abiliojr/fts5-snowball
Copyright (c) 2016, Abilio Marques

The snowball plugin originates from:
https://github.com/snowballstem/snowball/

Copyright (c) 2001, Dr Martin Porter
Copyright (c) 2004,2005, Richard Boulton
Copyright (c) 2013, Yoshiki Shibukawa
Copyright (c) 2006-2025, Olly Betts
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

  1. Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.
  2. Redistributions in binary form must reproduce the above copyright notice,
     this list of conditions and the following disclaimer in the documentation
     and/or other materials provided with the distribution.
  3. Neither the name of the Snowball project nor the names of its contributors
     may be used to endorse or promote products derived from this software
     without specific prior written permission.
