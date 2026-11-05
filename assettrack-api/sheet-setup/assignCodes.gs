// Google Sheets -> Extensions -> Apps Script. Paste, save, run assignCodes() after adding rows.
// Only fills BLANK cells, so printed QR codes never change. Never use RAND() formulas for codes.
function assignCodes() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Items');
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim().toLowerCase());
  const col = header.indexOf('code') + 1;
  if (!col) throw new Error('No "code" column found in Items');

  const last = sheet.getLastRow();
  if (last < 2) return;
  const range = sheet.getRange(2, col, last - 1, 1);
  const values = range.getValues();
  const seen = new Set(values.flat().filter(String));
  values.forEach((row, i) => {
    if (!row[0]) {
      let code;
      do { code = Utilities.getUuid().replace(/-/g, ''); } while (seen.has(code));
      seen.add(code);
      values[i][0] = code;
    }
  });
  range.setValues(values);
}
