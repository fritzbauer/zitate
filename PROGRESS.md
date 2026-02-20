# Progress Tracker

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Add File Attachment Functionality to Quotes | NOT STARTED |
| 2 | Implement Export to Excel (export.html) | NOT STARTED |
| 3 | Refine Search Functionality | COMPLETED |
| 4 | Improve Responsive Layout | NOT STARTED |
| 5 | Final Code Quality and Structure Review | NOT STARTED |

## Log

- **Task 3 - Refine Search Functionality**: COMPLETED. Search now defaults to "titel" column only. Added "Alle Spalten durchsuchen" checkbox to enable full-column search. Updated search_logic.js to use FTS5 column filter syntax, app.js to pass the checkbox state, ui.js to handle checkbox events and update placeholder text, index.html for checkbox UI, and styles.css for checkbox styling.