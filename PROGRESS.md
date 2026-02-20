# Progress Tracker

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Add File Attachment Functionality to Quotes | COMPLETED |
| 2 | Implement Export to Excel (export.html) | NOT STARTED |
| 3 | Refine Search Functionality | COMPLETED |
| 4 | Improve Responsive Layout | NOT STARTED |
| 5 | Final Code Quality and Structure Review | NOT STARTED |

## Log

- **Task 3 - Refine Search Functionality**: COMPLETED. Search now defaults to "titel" column only. Added "Alle Spalten durchsuchen" checkbox to enable full-column search. Updated search_logic.js to use FTS5 column filter syntax, app.js to pass the checkbox state, ui.js to handle checkbox events and update placeholder text, index.html for checkbox UI, and styles.css for checkbox styling.
- **Task 1 - File Attachments**: COMPLETED. Added attachments table to DB schema, CRUD functions in database.js, attachment UI (upload, download, delete) in the detail modal via ui.js, clipboard.js updated to include attachment names in copied text, and styling in styles.css.