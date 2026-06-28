/**
 * Export article analysis to Markdown format
 * Compatible with Obsidian, Notion, and other markdown editors
 */

export function articleToMarkdown(article) {
  const date = new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-MY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const time = new Date(article.publishedAt || article.createdAt).toLocaleTimeString('en-MY', {
    hour: '2-digit', minute: '2-digit',
  });

  const sentimentEmoji = {
    Positive: '🟢',
    Negative: '🔴',
    Neutral: '🟡',
  };

  const sentimentIcon = sentimentEmoji[article.sentiment] || '⚪';
  const confidence = article.confidence ? `${Math.round(article.confidence * 100)}%` : 'N/A';

  let md = `# ${article.title}\n\n`;
  md += `---\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| **Source** | ${article.source || 'Unknown'} |\n`;
  md += `| **Date** | ${date} at ${time} |\n`;
  md += `| **Sentiment** | ${sentimentIcon} ${article.sentiment || 'Neutral'} (${confidence} confidence) |\n`;
  md += `| **Category** | ${article.category || 'General'} |\n`;
  if (article.url) md += `| **URL** | [Read Original](${article.url}) |\n`;
  md += `\n`;

  // Description / Summary
  if (article.description) {
    md += `## Summary\n\n`;
    md += `${article.description}\n\n`;
  }

  if (article.summary && article.summary !== article.description) {
    md += `## AI Analysis\n\n`;
    md += `${article.summary}\n\n`;
  }

  // Entities
  if (article.entities && article.entities.length > 0) {
    md += `## Entities Mentioned\n\n`;
    article.entities.forEach(entity => {
      md += `- ${entity}\n`;
    });
    md += `\n`;
  }

  // Sentiment breakdown
  if (article.sentimentBreakdown) {
    md += `## Sentiment Breakdown\n\n`;
    md += `| Sentiment | Score |\n`;
    md += `|-----------|-------|\n`;
    for (const [key, value] of Object.entries(article.sentimentBreakdown)) {
      md += `| ${key} | ${value} |\n`;
    }
    md += `\n`;
  }

  // Reader votes
  if (article.feedback) {
    const { Positive, Negative, Neutral } = article.feedback;
    const total = (Positive || 0) + (Negative || 0) + (Neutral || 0);
    if (total > 0) {
      md += `## Reader Sentiment\n\n`;
      md += `${total} reader(s) voted:\n`;
      md += `- 🟢 Positive: ${Positive || 0}\n`;
      md += `- 🔴 Negative: ${Negative || 0}\n`;
      md += `- 🟡 Neutral: ${Neutral || 0}\n\n`;
    }
  }

  // Tags for Obsidian
  const tags = [];
  if (article.source) tags.push(`source/${article.source.toLowerCase().replace(/\s+/g, '-')}`);
  if (article.sentiment) tags.push(`sentiment/${article.sentiment.toLowerCase()}`);
  if (article.category) tags.push(`category/${article.category.toLowerCase().replace(/\s+/g, '-')}`);
  tags.push('malaysia-news');

  md += `---\n\n`;
  md += tags.map(t => `#${t}`).join(' ') + `\n`;

  md += `\n*Exported from MY News Sentiment on ${new Date().toLocaleDateString('en-MY')}*\n`;

  return md;
}

/**
 * Export multiple articles as a combined markdown document
 */
export function articlesToMarkdown(articles, title = 'News Analysis Export') {
  let md = `# ${title}\n\n`;
  md += `*Exported ${articles.length} articles on ${new Date().toLocaleDateString('en-MY')}*\n\n`;
  md += `---\n\n`;

  articles.forEach((article, i) => {
    if (i > 0) md += `\n---\n\n`;
    md += articleToMarkdown(article);
  });

  return md;
}

/**
 * Download markdown as a .md file
 */
export function downloadMarkdown(content, filename = 'article-export.md') {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
