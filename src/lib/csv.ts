/** Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes, and commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // skip; \r\n is handled by the following \n
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "candidate name", "candidate"],
  resumeUrl: ["resume link", "resume url", "resume", "cv link", "cv url", "link", "url"],
  subject: ["subject"],
  programme: ["programme", "program", "programme applied", "program applied"],
  email: ["email", "email id", "email address", "e-mail"],
  phone: ["phone", "phone number", "contact", "contact number", "contact no", "mobile", "mobile number"],
};

export type BulkCsvRow = {
  name: string;
  resumeUrl: string;
  subject: string;
  programme: string;
  email: string;
  phone: string;
};

export function parseCandidateCsv(text: string): {
  rows: BulkCsvRow[];
  missingColumns: string[];
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], missingColumns: ["name", "resumeUrl", "programme"] };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const columnIndex: Partial<Record<keyof BulkCsvRow, number>> = {};

  for (const key of Object.keys(HEADER_ALIASES) as (keyof BulkCsvRow)[]) {
    const idx = header.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (idx !== -1) columnIndex[key] = idx;
  }

  const missingColumns = (["name", "resumeUrl", "programme"] as const).filter(
    (key) => columnIndex[key] === undefined
  );
  if (missingColumns.length > 0) {
    return { rows: [], missingColumns };
  }

  const cell = (cells: string[], key: keyof BulkCsvRow) => {
    const idx = columnIndex[key];
    return idx === undefined ? "" : (cells[idx] ?? "").trim();
  };
  const rows: BulkCsvRow[] = table.slice(1).map((cells) => ({
    name: cell(cells, "name"),
    resumeUrl: cell(cells, "resumeUrl"),
    subject: cell(cells, "subject"),
    programme: cell(cells, "programme"),
    email: cell(cells, "email"),
    phone: cell(cells, "phone"),
  }));

  return { rows, missingColumns: [] };
}
