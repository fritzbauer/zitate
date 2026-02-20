## Plan: Application Improvement Roadmap

This document outlines the sequential steps required to implement the requested improvements for the application. Each major task is described in a dedicated file within the ./tasks/ folder, containing detailed, actionable instructions. **All tasks must be completed one after another, in the order listed below.**  
**Verification is mandatory:** After each task, use Playwright to open the browser, load ./data.sqlite, check the layout, and take/view screenshots to confirm the UI is as expected. The app is already hosted on http://localhost:8000
Do a git commit after each task in the current SER1 branch.

---

### Steps

1. **Add File Attachment Functionality to Quotes**
   - Enable attaching files (images, PDFs, etc.) to quotes, storing them as blobs in the database.
   - Files should be downloadable per quote and listed in the copied text (not displayed inline).
   - See tasks/attach-files.md for detailed instructions.

2. **Implement Export to Excel (export.html)**
   - Create export.html to export SQLite data to an Excel-compatible file (xlsx).
   - Optionally combine import/export logic for maintainability.
   - See tasks/export-excel.md for detailed instructions.

3. **Refine Search Functionality**
   - Default search to the "titel" column, with a checkbox to enable searching all columns.
   - See tasks/search-default.md for detailed instructions.

4. **Improve Responsive Layout**
   - Refactor styles and markup for a responsive design supporting smartphones, tablets, and desktops.
   - Use Playwright to verify layout and take screenshots for all device sizes.
   - See tasks/responsive-layout.md for detailed instructions.

5. **Final Code Quality and Structure Review**
   - Review and refactor code for separation of concerns, code duplication, and best practices.
   - Document findings and improvements.
   - See tasks/code-review.md for detailed instructions.

---

### Verification

- After each task, use Playwright to:
  - Open the application with ./data.sqlite loaded.
  - Test the relevant functionality.
  - Take screenshots of the UI.
  - Manually review screenshots to ensure the layout and features work as expected.
- Confirm that all acceptance criteria in each task file are met before proceeding to the next task.

---

### Decisions

- All tasks are to be completed sequentially.
- Playwright is mandatory for verification, including screenshots.
- Maintain strict separation of concerns and code clarity throughout.
