/**
 * Export a list of analyzed articles to a CSV file.
 * (#14) export to CSV
 */

// Sanitise a cell value to prevent CSV formula injection (=, +, -, @, \t, \r)
const sanitizeCell = (val) => {
  const str = String(val || '');
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
  return str;
};

export const exportToCSV = (articles, filename = 'malaysia-news-sentiment-analysis.csv') => {
  if (!articles || articles.length === 0) return;

  // CSV headers
  const headers = ['Date', 'Source', 'Title', 'Sentiment', 'Confidence', 'Reason', 'Link', 'Alert'];
  
  const rows = articles.map(a => [
    new Date(a.publishedAt || a.createdAt).toISOString().split('T')[0],
    `"${sanitizeCell(a.source || 'Unknown').replace(/"/g, '""')}"`,
    `"${sanitizeCell(a.title || '').replace(/"/g, '""')}"`,
    a.sentiment,
    `${Math.round((a.confidence || 0) * 100)}%`,
    `"${sanitizeCell(a.reason || '').replace(/"/g, '""')}"`,
    sanitizeCell(a.url),
    a.isAlert ? 'YES' : 'NO'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  // UTF-8 BOM for proper encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Feature 19 — generic table exporter (any array of objects)
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportTableToCSV = (rows, filename = 'export.csv') => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(sanitizeCell).join(',');
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = sanitizeCell(row[h] ?? '');
        return /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(',')
  );
  const blob = new Blob(['\uFEFF', headerLine, '\n', dataLines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(blob, filename);
};

export const exportToJSON = (data, filename = 'export.json') => {
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  downloadBlob(blob, filename);
};

export const exportArticlesToJSON = (articles, filename = 'articles.json') => {
  if (!articles || articles.length === 0) return;
  const slim = articles.map((a) => ({
    id: a._id || a.id,
    title: a.title,
    source: a.source,
    sentiment: a.sentiment,
    confidence: a.confidence,
    publishedAt: a.publishedAt || a.createdAt,
    topic: a.topic,
    url: a.url,
    reason: a.reason,
    state: a.state,
    isAlert: !!a.isAlert,
  }));
  exportToJSON(
    {
      exportedAt: new Date().toISOString(),
      count: slim.length,
      source: 'MY News Sentiment',
      articles: slim,
    },
    filename
  );
};
