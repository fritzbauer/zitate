**Title:** Refine Search Functionality

- **Problem Statement:**  
  Default search should only target the "titel" column, with a checkbox to enable searching all columns.

- **Affected Files:**  
  technical/app.js, technical/search_logic.js, technical/ui.js, index.html

- **Instructions:**  
  1. Update search logic to default to the "titel" column.
  2. Add a checkbox to enable searching all columns.
  3. Update UI to reflect the current search mode.
  4. Ensure code is clean and well-structured.

- **Verification:**  
  - Use Playwright to test search functionality in both modes.
  - Load ./data.sqlite and verify search results and layout.
  - Take and review screenshots.

- **Acceptance Criteria:**  
  - Search defaults to "titel" column.
  - Checkbox enables all-columns search.
  - Layout and functionality verified with Playwright.
