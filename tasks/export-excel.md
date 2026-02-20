**Title:** Implement Export to Excel (export.html)

- **Problem Statement:**  
  Allow users to export the SQLite database to an Excel-compatible file (xlsx) via a new export.html page. Optionally combine with import functionality.

- **Affected Files:**  
  technical/database.js, technical/ui.js, technical/clipboard.js, import.html, export.html, index.html

- **Instructions:**  
  1. Create export.html for exporting data.
  2. Implement logic to extract data and generate a xlsx file.
  3. Optionally refactor import/export logic for maintainability.
  4. Add navigation to export.html from index.html.
  5. Ensure clear separation of concerns and clean code.

- **Verification:**  
  - Use Playwright to test export functionality with ./data.sqlite.

- **Acceptance Criteria:**  
  - Data can be exported to a valid Excel-compatible file.
  - Export UI is accessible and functional.
  - Layout and functionality verified with Playwright.
