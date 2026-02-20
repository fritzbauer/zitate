**Title:** Add File Attachment Functionality to Quotes

- **Problem Statement:**  
  Enable users to attach files (images, PDFs, etc.) to quotes, store them as blobs in the database, and allow downloading per quote. Attachments should be listed in the copied text but not displayed inline nor on the webapp.

- **Affected Files:**  
  technical/database.js, technical/ui.js, technical/clipboard.js, technical/sql-wasm.js, index.html

- **Instructions:**  
  1. Update the database schema to support file blobs for each quote.
  2. Add UI elements for attaching files to quotes.
  3. Implement logic to store, retrieve, and download files.
  4. Update the copy functionality to include a list of attachments.
  5. Ensure files are not displayed inline.
  6. Migrate existing databases if necessary.
  7. Follow best practices for code structure and separation of concerns.

- **Verification:**  
  - Use Playwright to test attaching, downloading, and copying quotes with attachments.
  - Load ./data.sqlite and verify layout and functionality.
  - Take and review screenshots.

- **Acceptance Criteria:**  
  - Files can be attached, stored, and downloaded per quote.
  - Attachments are listed in copied text.
  - No files are displayed inline.
  - Layout and functionality verified with Playwright.
