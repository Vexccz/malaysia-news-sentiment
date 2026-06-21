const PDFDocument = require('pdfkit');
const Article = require('../models/Article');
const { getClient } = require('../services/openaiService');

/**
 * POST /api/reports/generate
 * Generate a full PDF report for given criteria
 */
const generatePDFReport = async (req, res) => {
  try {
    const { topic, dateFrom, dateTo } = req.body;

    // Build query — search in topic, title, content, and categories
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = {};
    if (topic && topic !== 'all') {
      const topicRegex = new RegExp(escapeRegex(topic), 'i');
      query.$or = [
        { topic: topicRegex },
        { title: topicRegex },
        { categories: topicRegex },
      ];
    }
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(200)
      .lean();

    // Calculate stats
    const total = articles.length;
    const positive = articles.filter(a => a.sentiment === 'Positive').length;
    const negative = articles.filter(a => a.sentiment === 'Negative').length;
    const neutral = articles.filter(a => a.sentiment === 'Neutral').length;

    // Source breakdown
    const sourceMap = {};
    articles.forEach(a => {
      sourceMap[a.source] = (sourceMap[a.source] || 0) + 1;
    });
    const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);

    // Generate executive summary via AI (fallback to static if unavailable)
    let executiveSummary = '';
    try {
      const client = getClient();
      if (client) {
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Write a brief 3-sentence executive summary for a Malaysian news sentiment report. Stats: ${total} articles analyzed, ${positive} positive (${total ? Math.round(positive/total*100) : 0}%), ${negative} negative (${total ? Math.round(negative/total*100) : 0}%), ${neutral} neutral. Topic: ${topic || 'general'}. Date range: ${dateFrom || 'all'} to ${dateTo || 'now'}. Be professional and concise.`
          }],
          max_tokens: 200,
        });
        executiveSummary = completion.choices[0]?.message?.content || '';
      }
    } catch (e) {
      // Fallback
    }
    if (!executiveSummary) {
      executiveSummary = `This report covers ${total} articles${topic ? ` on "${topic}"` : ''} from Malaysian news sources. Sentiment distribution: ${Math.round(positive/Math.max(total,1)*100)}% positive, ${Math.round(negative/Math.max(total,1)*100)}% negative, ${Math.round(neutral/Math.max(total,1)*100)}% neutral.`;
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sentiment-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Title page
    doc.fontSize(28).font('Helvetica-Bold').text('Malaysia News Sentiment', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica').text('Analysis Report', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(`Topic: ${topic || 'All Topics'}`, { align: 'center' });
    doc.text(`Period: ${dateFrom || 'All time'} — ${dateTo || 'Present'}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-MY')}`, { align: 'center' });
    doc.moveDown(1);
    doc.text(`Total Articles: ${total}`, { align: 'center' });

    // Executive Summary
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').text('Executive Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(executiveSummary);

    // Sentiment breakdown
    doc.moveDown(1.5);
    doc.fontSize(18).font('Helvetica-Bold').text('Sentiment Distribution');
    doc.moveDown(0.5);

    const barY = doc.y;
    const barWidth = 300;
    const barHeight = 20;

    // Positive bar
    doc.fontSize(10).text(`Positive: ${positive} (${total ? Math.round(positive/total*100) : 0}%)`);
    const posWidth = total ? (positive / total) * barWidth : 0;
    doc.rect(doc.x, doc.y, posWidth, barHeight).fill('#22c55e');
    doc.rect(doc.x + posWidth, doc.y - barHeight, barWidth - posWidth, barHeight).fill('#e5e7eb');
    doc.moveDown(1.5);

    // Negative bar
    doc.fillColor('#000').fontSize(10).text(`Negative: ${negative} (${total ? Math.round(negative/total*100) : 0}%)`);
    const negWidth = total ? (negative / total) * barWidth : 0;
    doc.rect(doc.x, doc.y, negWidth, barHeight).fill('#ef4444');
    doc.rect(doc.x + negWidth, doc.y - barHeight, barWidth - negWidth, barHeight).fill('#e5e7eb');
    doc.moveDown(1.5);

    // Neutral bar
    doc.fillColor('#000').fontSize(10).text(`Neutral: ${neutral} (${total ? Math.round(neutral/total*100) : 0}%)`);
    const neuWidth = total ? (neutral / total) * barWidth : 0;
    doc.rect(doc.x, doc.y, neuWidth, barHeight).fill('#eab308');
    doc.rect(doc.x + neuWidth, doc.y - barHeight, barWidth - neuWidth, barHeight).fill('#e5e7eb');
    doc.moveDown(2);

    // Source breakdown
    doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text('Source Breakdown');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    sources.slice(0, 15).forEach(([name, count]) => {
      doc.text(`• ${name}: ${count} articles`);
    });

    // Article list
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('Articles');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');

    const displayArticles = articles.slice(0, 50);
    displayArticles.forEach((article, i) => {
      if (doc.y > 700) doc.addPage();
      const sentColor = article.sentiment === 'Positive' ? '#22c55e' : article.sentiment === 'Negative' ? '#ef4444' : '#eab308';
      doc.fillColor(sentColor).text(`[${article.sentiment}]`, { continued: true });
      doc.fillColor('#000').text(` ${article.title}`);
      doc.fillColor('#666').fontSize(8).text(`  ${article.source} — ${new Date(article.publishedAt).toLocaleDateString('en-MY')}`);
      doc.fontSize(9).moveDown(0.3);
    });

    // Methodology
    doc.addPage();
    doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text('Methodology');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      'This report uses a hybrid sentiment analysis approach combining local NLP models (Mesolitica NanoT5) with GPT-4o-mini for enhanced accuracy. Articles are sourced from major Malaysian news outlets including FMT, Astro Awani, and Malaysiakini. Sentiment classification follows a three-tier system: Positive, Negative, and Neutral, with confidence scores ranging from 0 to 1.'
    );

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report' });
    } else {
      // Headers already sent (PDF streaming started), just end the response
      res.end();
    }
  }
};

/**
 * POST /api/reports/topic
 * Generate a topic-specific PDF report
 */
const generateTopicReport = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    // Reuse generatePDFReport logic with topic forced
    req.body.topic = topic;
    return generatePDFReport(req, res);
  } catch (err) {
    console.error('Topic report error:', err);
    res.status(500).json({ error: 'Failed to generate topic report' });
  }
};

module.exports = { generatePDFReport, generateTopicReport };
