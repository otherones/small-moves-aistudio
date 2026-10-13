/**
 * Utility to export JavaScript objects to a CSV file and trigger a browser download.
 */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  headers: { key: keyof T | string; label: string }[],
  data: T[]
) {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Generate Header Row
  const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');

  // Generate Data Rows
  const dataRows = data.map((row) => {
    return headers
      .map((h) => {
        const val = row[h.key as keyof T];
        if (val === null || val === undefined) {
          return '""';
        }
        if (typeof val === 'number') {
          return `${val}`;
        }
        if (typeof val === 'boolean') {
          return `"${val ? 'Yes' : 'No'}"`;
        }
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
