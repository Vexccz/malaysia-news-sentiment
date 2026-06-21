const PDFDocument = require('pdfkit');
const Article = require('../models/Article');
const { getClient } = require('../services/openaiService');

// Colours
const C = {
  black:   '#111111',
  dark:    '#333333',
  mid:     '#666666',
  light:   '#999999',
  border:  '#DDDDDD',
  bg:      '#F5F5F5',
  pos:     '#16a34a',
  neg:     '#dc2626',
  neu:     '#ca8a04',
  posBg:   '#f0fdf4',
  negBg:   '#fef2f2',
  neuBg:   '#fefce8',
  accent:  '#1e3a5f',
};

const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;

function sentimentColor(s) {
  if (s === 'Positive') return C.pos;
  if (s === 'Negative') return C.neg;
  return C.neu;
}

function truncate(str, len = 180) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len).trimEnd() + '...' : str;
}

function drawSectionHeader(doc, title) {
  doc.fillColor(C.black).fontSize(14).font('Helvetica-Bold').text(title);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.moveDown(0.6);
}

function checkPage(doc, needed = 80) {
  if (doc.y + needed > 780) doc.addPage();
}

const generatePDFReport = async (req, res) => {
  try {
    const { topic, dateFrom, dateTo } = req.body;

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const orConditions = [];
    if (topic && topic !== 'all') {
      const re = new RegExp(escapeRegex(topic), 'i');
      orConditions.push({ topic: re }, { title: re }, { categories: re });
    }

    const query = {};
    if (orConditions.length > 0) query.$or = orConditions;
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    const articles = await Article.find(query).sort({ publishedAt: -1 }).limit(200).lean();
    const total = articles.length;

    const positive = articles.filter(a => a.sentiment === 'Positive');
    const negative = articles.filter(a => a.sentiment === 'Negative');
    const neutral  = articles.filter(a => a.sentiment === 'Neutral');
    const posCount = positive.length;
    const negCount = negative.length;
    const neuCount = neutral.length;

    // Source breakdown
    const sourceMap = {};
    articles.forEach(a => {
      const s = a.source || 'Unknown';
      if (!sourceMap[s]) sourceMap[s] = { count: 0, pos: 0, neg: 0, neu: 0, totalConf: 0 };
      sourceMap[s].count++;
      if (a.sentiment === 'Positive') sourceMap[s].pos++;
      else if (a.sentiment === 'Negative') sourceMap[s].neg++;
      else sourceMap[s].neu++;
      sourceMap[s].totalConf += (a.confidence || 0);
    });
    const sources = Object.entries(sourceMap)
      .map(([name, d]) => ({ name, ...d, avgConf: d.totalConf / d.count }))
      .sort((a, b) => b.count - a.count);

    // State breakdown
    const stateMap = {};
    articles.forEach(a => {
      const st = a.stateLocation || 'General';
      if (!stateMap[st]) stateMap[st] = { count: 0, pos: 0, neg: 0, neu: 0 };
      stateMap[st].count++;
      if (a.sentiment === 'Positive') stateMap[st].pos++;
      else if (a.sentiment === 'Negative') stateMap[st].neg++;
      else stateMap[st].neu++;
    });
    const states = Object.entries(stateMap).sort((a, b) => b[1].count - a[1].count);

    // Temporal breakdown
    const dateMap = {};
    articles.forEach(a => {
      const d = new Date(a.publishedAt).toISOString().slice(0, 10);
      if (!dateMap[d]) dateMap[d] = { count: 0, pos: 0, neg: 0, neu: 0 };
      dateMap[d].count++;
      if (a.sentiment === 'Positive') dateMap[d].pos++;
      else if (a.sentiment === 'Negative') dateMap[d].neg++;
      else dateMap[d].neu++;
    });
    const dates = Object.entries(dateMap).sort((a, b) => a[0].localeCompare(b[0]));

    // Confidence stats
    const confidences = articles.map(a => a.confidence || 0).filter(c => c > 0);
    const avgConfidence = confidences.length ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;
    const highConf = confidences.filter(c => c >= 0.8).length;
    const medConf  = confidences.filter(c => c >= 0.5 && c < 0.8).length;
    const lowConf  = confidences.filter(c => c < 0.5).length;

    // Categories
    const catMap = {};
    articles.forEach(a => { (a.categories || []).forEach(c => { catMap[c] = (catMap[c] || 0) + 1; }); });
    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    const alerts = articles.filter(a => a.isAlert);

    // AI Executive Summary
    let executiveSummary = '';
    try {
      const client = getClient();
      if (client) {
        const topSources = sources.slice(0, 5).map(s => s.name + ' (' + s.count + ')').join(', ');
        const topStates = states.slice(0, 5).map(s => s[0] + ' (' + s[1].count + ')').join(', ');
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user',
            content: 'Write a professional 4-5 sentence executive summary for a Malaysian news sentiment analysis report.\n\nData:\n- Topic: ' + (topic || 'All Topics') + '\n- Period: ' + (dateFrom || 'All time') + ' to ' + (dateTo || 'Present') + '\n- Total articles: ' + total + '\n- Sentiment: ' + posCount + ' positive (' + pct(posCount, total) + '%), ' + negCount + ' negative (' + pct(negCount, total) + '%), ' + neuCount + ' neutral (' + pct(neuCount, total) + '%)\n- Average confidence: ' + (avgConfidence * 100).toFixed(1) + '%\n- Top sources: ' + topSources + '\n- Geographic coverage: ' + states.length + ' states (' + topStates + ')\n- Categories: ' + categories.slice(0, 5).map(c => c[0]).join(', ') + '\n- ' + alerts.length + ' articles flagged as alerts\n\nRequirements: 1) State overall sentiment trend, 2) Highlight most notable finding, 3) Mention data quality, 4) Forward-looking observation. Be concise, factual, professional. No bullets.'
          }],
          max_tokens: 350,
        });
        executiveSummary = completion.choices[0]?.message?.content || '';
      }
    } catch (e) { /* fallback */ }

    if (!executiveSummary) {
      const dominant = posCount >= negCount && posCount >= neuCount ? 'positive'
        : negCount >= posCount && negCount >= neuCount ? 'negative' : 'neutral';
      executiveSummary = 'This report analyses ' + total + ' Malaysian news articles' + (topic ? ' related to "' + topic + '"' : '') + ' published between ' + (dateFrom || 'the earliest available date') + ' and ' + (dateTo || 'the present') + '. The overall sentiment leans ' + dominant + ', with ' + pct(posCount, total) + '% positive, ' + pct(negCount, total) + '% negative, and ' + pct(neuCount, total) + '% neutral classifications. Coverage spans ' + sources.length + ' distinct news sources across ' + states.length + ' geographic regions. The average sentiment confidence score is ' + (avgConfidence * 100).toFixed(1) + '%, indicating ' + (avgConfidence >= 0.7 ? 'reliable' : 'moderate') + ' classification quality. ' + (alerts.length > 0 ? alerts.length + ' articles have been flagged as alerts due to unusually strong sentiment signals.' : 'No articles were flagged as requiring immediate attention.');
    }

    // BUILD PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sentiment-report-' + (topic || 'all') + '-' + Date.now() + '.pdf"');
    doc.pipe(res);

    // PAGE 1: COVER
    doc.moveDown(6);
    doc.fillColor(C.accent).fontSize(32).font('Helvetica-Bold').text('Malaysia News', { align: 'center' });
    doc.fillColor(C.accent).fontSize(32).font('Helvetica-Bold').text('Sentiment Analysis', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(C.mid).fontSize(14).font('Helvetica').text('Comprehensive Report', { align: 'center' });
    doc.moveDown(3);
    doc.strokeColor(C.border).lineWidth(1).moveTo(200, doc.y).lineTo(395, doc.y).stroke();
    doc.moveDown(1.5);
    var coverMeta = [['Topic', topic || 'All Topics'], ['Period', (dateFrom || 'All time') + ' to ' + (dateTo || 'Present')], ['Articles Analysed', String(total)], ['Generated', new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })]];
    coverMeta.forEach(function(m) {
      doc.fillColor(C.light).fontSize(10).font('Helvetica').text(m[0], { align: 'center' });
      doc.fillColor(C.black).fontSize(13).font('Helvetica-Bold').text(m[1], { align: 'center' });
      doc.moveDown(0.3);
    });
    doc.moveDown(4);
    doc.fillColor(C.light).fontSize(8).font('Helvetica').text('Generated by Malaysia News Sentiment Analysis Dashboard', { align: 'center' });

    // PAGE 2: EXECUTIVE SUMMARY
    doc.addPage();
    drawSectionHeader(doc, '1. Executive Summary');
    doc.fillColor(C.dark).fontSize(10).font('Helvetica').text(executiveSummary, { lineGap: 4 });
    doc.moveDown(1.5);

    // Key Metrics
    drawSectionHeader(doc, '2. Key Metrics');
    var metrics = [
      { label: 'Total Articles', value: total },
      { label: 'Positive', value: posCount + ' (' + pct(posCount, total) + '%)' },
      { label: 'Negative', value: negCount + ' (' + pct(negCount, total) + '%)' },
      { label: 'Neutral', value: neuCount + ' (' + pct(neuCount, total) + '%)' },
      { label: 'Sources', value: sources.length },
      { label: 'States Covered', value: states.length },
      { label: 'Avg Confidence', value: (avgConfidence * 100).toFixed(1) + '%' },
      { label: 'Alert Articles', value: alerts.length },
    ];
    var colW = 247;
    metrics.forEach(function(m, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var x = 50 + col * colW;
      var y = doc.y + row * 36;
      doc.save();
      doc.roundedRect(x, y - 4, colW - 10, 30, 3).fill(C.bg);
      doc.restore();
      doc.fillColor(C.mid).fontSize(8).font('Helvetica').text(m.label, x + 10, y, { width: colW - 30 });
      doc.fillColor(C.black).fontSize(14).font('Helvetica-Bold').text(String(m.value), x + 10, y + 12, { width: colW - 30 });
    });
    doc.y += Math.ceil(metrics.length / 2) * 36 + 10;

    // Sentiment bars
    checkPage(doc, 120);
    drawSectionHeader(doc, '3. Sentiment Distribution');
    var barX = 70, barMaxW = 400, barH = 18;
    [{ label: 'Positive', count: posCount, color: C.pos }, { label: 'Negative', count: negCount, color: C.neg }, { label: 'Neutral', count: neuCount, color: C.neu }].forEach(function(s) {
      var w = total ? (s.count / total) * barMaxW : 0;
      doc.fillColor(C.dark).fontSize(9).font('Helvetica-Bold').text(s.label, 50, doc.y);
      doc.fillColor(C.light).fontSize(9).font('Helvetica').text(s.count + ' articles (' + pct(s.count, total) + '%)');
      var barY = doc.y + 2;
      doc.roundedRect(barX, barY, barMaxW, barH, 2).fill('#E5E7EB');
      if (w > 0) doc.roundedRect(barX, barY, Math.max(w, 4), barH, 2).fill(s.color);
      doc.y = barY + barH + 10;
    });

    // PAGE 3: SOURCE ANALYSIS
    doc.addPage();
    drawSectionHeader(doc, '4. Source Analysis');
    doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(sources.length + ' unique sources identified. Top sources by article volume:');
    doc.moveDown(0.8);
    var srcCols = [50, 220, 300, 370, 440];
    doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
    ['Source', 'Articles', 'Positive', 'Negative', 'Neutral'].forEach(function(h, i) { doc.text(h, srcCols[i], doc.y, { width: 70 }); });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    sources.slice(0, 15).forEach(function(s, i) {
      checkPage(doc, 20);
      doc.save(); doc.rect(48, doc.y - 2, 497, 16).fill(i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'); doc.restore();
      doc.fillColor(C.black).fontSize(8).font('Helvetica').text(s.name, srcCols[0], doc.y, { width: 165 });
      doc.text(String(s.count), srcCols[1], doc.y, { width: 70 });
      doc.fillColor(C.pos).text(String(s.pos), srcCols[2], doc.y, { width: 60 });
      doc.fillColor(C.neg).text(String(s.neg), srcCols[3], doc.y, { width: 60 });
      doc.fillColor(C.neu).text(String(s.neu), srcCols[4], doc.y, { width: 60 });
      doc.moveDown(0.6);
    });

    // Geographic Coverage
    checkPage(doc, 150);
    doc.moveDown(1);
    drawSectionHeader(doc, '5. Geographic Coverage');
    doc.fillColor(C.mid).fontSize(9).font('Helvetica').text('Articles cover ' + states.length + ' states/regions across Malaysia.');
    doc.moveDown(0.8);
    var stCols = [50, 180, 260, 340, 420];
    doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
    ['State/Region', 'Articles', 'Positive', 'Negative', 'Neutral'].forEach(function(h, i) { doc.text(h, stCols[i], doc.y, { width: 75 }); });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    states.slice(0, 16).forEach(function(entry, i) {
      checkPage(doc, 20);
      var name = entry[0], d = entry[1];
      doc.save(); doc.rect(48, doc.y - 2, 497, 16).fill(i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'); doc.restore();
      doc.fillColor(C.black).fontSize(8).font('Helvetica').text(name, stCols[0], doc.y, { width: 125 });
      doc.text(String(d.count), stCols[1], doc.y, { width: 70 });
      doc.fillColor(C.pos).text(String(d.pos), stCols[2], doc.y, { width: 70 });
      doc.fillColor(C.neg).text(String(d.neg), stCols[3], doc.y, { width: 70 });
      doc.fillColor(C.neu).text(String(d.neu), stCols[4], doc.y, { width: 70 });
      doc.moveDown(0.6);
    });

    // TEMPORAL ANALYSIS
    if (dates.length > 1) {
      doc.addPage();
      drawSectionHeader(doc, '6. Temporal Analysis');
      doc.fillColor(C.mid).fontSize(9).font('Helvetica').text('Sentiment trend over ' + dates.length + ' days from ' + dates[0][0] + ' to ' + dates[dates.length - 1][0] + '.');
      doc.moveDown(0.8);
      var dtCols = [50, 160, 240, 320, 400];
      doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
      ['Date', 'Articles', 'Positive', 'Negative', 'Neutral'].forEach(function(h, i) { doc.text(h, dtCols[i], doc.y, { width: 75 }); });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.3);
      dates.forEach(function(entry, i) {
        checkPage(doc, 20);
        var date = entry[0], d = entry[1];
        doc.save(); doc.rect(48, doc.y - 2, 497, 16).fill(i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'); doc.restore();
        doc.fillColor(C.black).fontSize(8).font('Helvetica').text(date, dtCols[0], doc.y, { width: 105 });
        doc.text(String(d.count), dtCols[1], doc.y, { width: 70 });
        doc.fillColor(C.pos).text(String(d.pos), dtCols[2], doc.y, { width: 70 });
        doc.fillColor(C.neg).text(String(d.neg), dtCols[3], doc.y, { width: 70 });
        doc.fillColor(C.neu).text(String(d.neu), dtCols[4], doc.y, { width: 70 });
        doc.moveDown(0.6);
      });
    }

    // CONFIDENCE ANALYSIS
    checkPage(doc, 150);
    doc.moveDown(1);
    drawSectionHeader(doc, '7. Classification Confidence');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('The sentiment classifier assigns a confidence score (0 to 1) to each article. Higher confidence indicates more decisive sentiment classification.', { lineGap: 3 });
    doc.moveDown(0.8);
    [{ label: 'High confidence (0.8 - 1.0)', count: highConf, color: C.pos }, { label: 'Medium confidence (0.5 - 0.8)', count: medConf, color: C.neu }, { label: 'Low confidence (0.0 - 0.5)', count: lowConf, color: C.neg }].forEach(function(s) {
      var w = total ? (s.count / total) * barMaxW : 0;
      doc.fillColor(C.dark).fontSize(8).font('Helvetica').text(s.label + ': ' + s.count + ' articles (' + pct(s.count, total) + '%)', 50, doc.y);
      var barY = doc.y + 2;
      doc.roundedRect(70, barY, barMaxW, 12, 2).fill('#E5E7EB');
      if (w > 0) doc.roundedRect(70, barY, Math.max(w, 3), 12, 2).fill(s.color);
      doc.y = barY + 18;
    });

    // CATEGORIES
    if (categories.length > 0) {
      checkPage(doc, 120);
      doc.moveDown(1);
      drawSectionHeader(doc, '8. Topic Categories');
      doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(categories.length + ' categories identified from article metadata.');
      doc.moveDown(0.6);
      categories.slice(0, 12).forEach(function(entry) {
        checkPage(doc, 20);
        var cat = entry[0], count = entry[1];
        doc.fillColor(C.black).fontSize(9).font('Helvetica').text(cat, 60, doc.y, { continued: true, width: 350 });
        doc.fillColor(C.mid).fontSize(9).font('Helvetica').text('  ' + count + ' articles', { continued: false });
        var w = total ? (count / total) * 200 : 0;
        var barY = doc.y + 1;
        doc.roundedRect(380, barY, 120, 8, 1).fill('#E5E7EB');
        if (w > 0) doc.roundedRect(380, barY, Math.max(w, 2), 8, 1).fill(C.accent);
        doc.y = barY + 14;
      });
    }

    // ARTICLE LISTING
    doc.addPage();
    drawSectionHeader(doc, '9. Article Listing');
    doc.fillColor(C.mid).fontSize(9).font('Helvetica').text('Showing ' + Math.min(articles.length, 50) + ' of ' + total + ' articles, sorted by recency.');
    doc.moveDown(0.8);
    articles.slice(0, 50).forEach(function(article, i) {
      checkPage(doc, 55);
      var sentCol = sentimentColor(article.sentiment);
      doc.fillColor(C.black).fontSize(9).font('Helvetica-Bold').text(truncate(article.title, 120), { lineGap: 2 });
      var metaY = doc.y + 2;
      doc.fillColor(C.light).fontSize(7).font('Helvetica').text((article.source || 'Unknown'), 50, metaY, { continued: true, width: 495 });
      doc.text('  |  ' + new Date(article.publishedAt).toLocaleDateString('en-MY'), { continued: true });
      doc.text('  |  ', { continued: true });
      doc.fillColor(sentCol).font('Helvetica-Bold').text(article.sentiment, { continued: true });
      doc.fillColor(C.light).font('Helvetica').text(' (' + ((article.confidence || 0) * 100).toFixed(0) + '%)', { continued: true });
      if (article.stateLocation && article.stateLocation !== 'General') {
        doc.text('  |  ' + article.stateLocation, { continued: false });
      } else { doc.text('', { continued: false }); }
      if (article.description) {
        doc.fillColor(C.mid).fontSize(7).font('Helvetica').text(truncate(article.description, 160), { lineGap: 1 });
      }
      doc.moveDown(0.4);
      if (i < Math.min(articles.length, 50) - 1) {
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#EEEEEE').lineWidth(0.3).stroke();
        doc.moveDown(0.3);
      }
    });

    // METHODOLOGY
    doc.addPage();
    drawSectionHeader(doc, '10. Methodology');
    doc.fillColor(C.dark).fontSize(9.5).font('Helvetica').text('This report employs a hybrid sentiment analysis pipeline designed specifically for Malaysian news content. Articles are collected from major Malaysian news outlets through RSS feeds and web scraping, then processed through a multi-stage classification system.', { lineGap: 4 });
    doc.moveDown(0.8);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Data Collection');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Articles are sourced from Malaysian news outlets including FMT, Astro Awani, Malaysiakini, The Star, and Bernama. Content is fetched via RSS feeds and stored with metadata including publication date, source attribution, geographic classification, and topic categorisation.', { lineGap: 3 });
    doc.moveDown(0.6);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Sentiment Classification');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('The system uses a dual-model approach: (1) Mesolitica NanoT5, a locally-hosted transformer model fine-tuned for Bahasa Melayu sentiment analysis, and (2) GPT-4o-mini for cross-validation. Each article receives a three-tier classification (Positive, Negative, or Neutral) along with a confidence score ranging from 0 to 1. Disagreements between models are resolved by confidence weighting.', { lineGap: 3 });
    doc.moveDown(0.6);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Geographic & Topic Classification');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Articles are classified by geographic relevance using named entity recognition (NER) to identify Malaysian states and regions mentioned in the content. Topic categorisation uses keyword extraction and content analysis to assign articles to categories such as Politics, Economy, Crime, Education, and Technology.', { lineGap: 3 });
    doc.moveDown(0.6);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Limitations');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Sentiment analysis accuracy depends on the quality of source text and may be affected by sarcasm, idiomatic expressions, or mixed-language content. Geographic classification is based on content mentions rather than publication location. The confidence score reflects model certainty, not factual accuracy of the article content.', { lineGap: 3 });

    // FOOTER on every page
    var pageRange = doc.bufferedPageRange();
    for (var i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(C.light).fontSize(7).font('Helvetica').text('Malaysia News Sentiment Analysis  |  Page ' + (i + 1) + ' of ' + pageRange.count + '  |  Generated ' + new Date().toLocaleDateString('en-MY'), 50, 800, { align: 'center', width: 495 });
    }

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) { res.status(500).json({ error: 'Failed to generate report' }); }
    else { res.end(); }
  }
};

const generateTopicReport = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    req.body.topic = topic;
    return generatePDFReport(req, res);
  } catch (err) {
    console.error('Topic report error:', err);
    res.status(500).json({ error: 'Failed to generate topic report' });
  }
};

module.exports = { generatePDFReport, generateTopicReport };
