# Example: Cross-Application Data Migration (Web to Excel)

This example demonstrates using the Universal Operator to extract data from a web page and migrate it into a local Excel spreadsheet, utilizing the VLA bridge and real-time voice feedback.

## Scenario
The user has a table of sales data on a website and needs it entered into an open Excel file named `Quarterly_Reports.xlsx`.

## Execution Loop

1. **Phase 1: Extraction**
   - **Agent**: `BrowserService.speakText("Extracting sales data from the browser.")`
   - **Agent**: `os_screenshot` (to locate browser window).
   - **Agent**: `os_get_accessibility_tree` (to find table headers and rows).
   - **Agent**: Perform series of `operator_cursor_click` and `operator_type` (if selection is needed) or simply parse the accessibility tree nodes if they contain the text.

2. **Phase 2: Context Switch**
   - **Agent**: `BrowserService.speakText("Data extracted. Switching to Quarterly Reports in Excel.")`
   - **Agent**: `operator_type("Quarterly_Reports.xlsx", { altTab: true })` or click the Taskbar icon found via grounding.

3. **Phase 3: Injection**
   - **Agent**: `os_get_accessibility_tree` (ground Excel grid coordinates).
   - **Agent**: `BrowserService.speakText("Found cell A1. Initializing data entry.")`
   - **Agent**: `operator_cursor_click(x, y)` on A1.
   - **Agent**: Loop through data: `operator_type(value)` -> `operator_type("{ENTER}")`.

4. **Phase 4: Verification**
   - **Agent**: `os_screenshot`.
   - **Agent**: Compare the new state with the intended data.
   - **Agent**: `BrowserService.speakText("Data migration complete. All rows verified.")`

## Key Patterns Used
- **Multimodal Resonate**: Voice updates prevent the user from thinking the agent is "stuck" during long operations.
- **Semantic Grounding**: Always clicking the *cell* found via the API, not a hardcoded coordinate.
- **VAE Recall**: Remembering where the Excel window was from the previous turn's `LATENT_SNAPSHOT`.
