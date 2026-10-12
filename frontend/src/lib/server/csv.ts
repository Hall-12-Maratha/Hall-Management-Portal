/**
 * Minimal RFC 4180 CSV writer/reader (matches Python's csv module defaults:
 * comma delimiter, double-quote quoting, CRLF line terminator).
 */

export type CsvCell = string | number | null | undefined;

/**
 * Spreadsheet formula injection: a cell starting with = + - @ or a tab/CR is
 * executed as a formula by Excel/Sheets. User-supplied strings (names, rooms,
 * item names) get a leading apostrophe so they render as text. Numbers are
 * passed as numbers and are never prefixed.
 */
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  const text = typeof cell === "string" ? neutralizeFormula(cell) : String(cell);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serialize rows to CSV text with CRLF line endings. */
export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** Parse CSV text into rows of string cells. Handles quotes, CRLF and LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      // swallow; the following \n (if any) ends the row
      if (text[i + 1] !== "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      }
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
