import chalk from "chalk";

export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = Math.max(...rows.map((row) => (row[i] || "").length));
    return Math.max(h.length, maxDataWidth);
  });

  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join("  ");
  const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

  console.log(chalk.bold(headerRow));
  console.log(chalk.dim(separator));

  for (const row of rows) {
    const formattedRow = row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join("  ");
    console.log(formattedRow);
  }
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function printError(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

export function printWarning(message: string): void {
  console.warn(chalk.yellow(`⚠ ${message}`));
}

export function printInfo(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}
