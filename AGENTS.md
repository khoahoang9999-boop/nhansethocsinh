# Project Instructions & Conventions

## SMAS / Web Data Extraction
- **Grid Data Extraction**: When extracting cell data from systems like SMAS, the scores/values are often not present in the plain text (`innerText` or `textContent`) of the table cell (`<td>`). Instead, they are hidden inside input elements (`<input>`, `<textarea>`, or `<select>`).
- Always use a method akin to `getCellValue(cell)` that checks for these child input elements and extracts their `value` property first, falling back to `innerText`/`textContent` if no inputs are found, to avoid mistaking cells with inputs as empty.
