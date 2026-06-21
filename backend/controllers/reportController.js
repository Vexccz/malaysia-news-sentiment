const PDFDocument = require('pdfkit');
const Article = require('../models/Article');
const { getClient } = require('../services/openaiService');

const C = {
  black: '#111111', dark: '#333333', mid: '#666666', light: '#999999',
  border: '#DDDDDD', bg: '#F5F5F5',
  pos: '#16a34a', neg: '#dc2626', neu: '#ca8a04',
  accent: '#1e3a5f',
};

const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
function sentimentColor(s) { return s === 'Positive' ? C.pos : s === 'Negative' ? C.neg : C.neu; }
function truncate(str, len) { if (!str) return ''; return str.length > len ? str.slice(0, len).trimEnd() + '...' : str; }

function drawSectionHeader(doc, title) {
  doc.fillColor(C.black).fontSize(14).font('Helvetica-Bold').text(title);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
  doc.moveDown(0.6);
}

function checkPage(doc, needed) {
  needed = needed || 80;
  if (doc.y + needed > 760) { doc.addPage(); }
}

// Footer on every page via event
function addFooter(doc, totalPages) {
  doc.on('pageAdded', function() {
    // We'll draw footer at the end, but use this to track pages
  });
}

function drawFooters(doc) {
  var count = doc.bufferedPageRange().count;
  for (var i = 0; i < count; i++) {
    doc.switchToPage(i);
    doc.save();
    doc.fontSize(7).font('Helvetica').fillColor(C.light);
    doc.text('Malaysia News Sentiment Analysis  |  Page ' + (i + 1) + ' of ' + count + '  |  Generated ' + new Date().toLocaleDateString('en-MY'), 50, 790, { align: 'center', width: 495 });
    doc.restore();
  }
}

var generatePDFReport = async function(req, res) {
  try {
    var topic = req.body.topic;
    var dateFrom = req.body.dateFrom;
    var dateTo = req.body.dateTo;

    // Build query matching topic OR title OR categories
    var escapeRegex = function(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var orConditions = [];
    if (topic && topic !== 'all') {
      var re = new RegExp(escapeRegex(topic), 'i');
      orConditions.push({ topic: re }, { title: re }, { categories: re });
    }
    var query = {};
    if (orConditions.length > 0) query.$or = orConditions;
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    var articles = await Article.find(query).sort({ publishedAt: -1 }).limit(200).lean();
    var total = articles.length;

    // Fallback: if date filter returns 0, retry without date
    if (total === 0 && (dateFrom || dateTo)) {
      var fallbackQuery = {};
      if (orConditions.length > 0) fallbackQuery.$or = orConditions;
      articles = await Article.find(fallbackQuery).sort({ publishedAt: -1 }).limit(200).lean();
      total = articles.length;
    }

    // Stats
    var posCount = 0, negCount = 0, neuCount = 0;
    articles.forEach(function(a) {
      if (a.sentiment === 'Positive') posCount++;
      else if (a.sentiment === 'Negative') negCount++;
      else neuCount++;
    });

    // Source breakdown
    var sourceMap = {};
    articles.forEach(function(a) {
      var s = a.source || 'Unknown';
      if (!sourceMap[s]) sourceMap[s] = { count: 0, pos: 0, neg: 0, neu: 0, totalConf: 0 };
      sourceMap[s].count++;
      if (a.sentiment === 'Positive') sourceMap[s].pos++;
      else if (a.sentiment === 'Negative') sourceMap[s].neg++;
      else sourceMap[s].neu++;
      sourceMap[s].totalConf += (a.confidence || 0);
    });
    var sources = Object.keys(sourceMap).map(function(name) {
      var d = sourceMap[name];
      return { name: name, count: d.count, pos: d.pos, neg: d.neg, neu: d.neu, avgConf: d.totalConf / d.count };
    }).sort(function(a, b) { return b.count - a.count; });

    // State breakdown
    var stateMap = {};
    articles.forEach(function(a) {
      var st = a.stateLocation || 'General';
      if (!stateMap[st]) stateMap[st] = { count: 0, pos: 0, neg: 0, neu: 0 };
      stateMap[st].count++;
      if (a.sentiment === 'Positive') stateMap[st].pos++;
      else if (a.sentiment === 'Negative') stateMap[st].neg++;
      else stateMap[st].neu++;
    });
    var states = Object.keys(stateMap).map(function(name) { return [name, stateMap[name]]; }).sort(function(a, b) { return b[1].count - a[1].count; });

    // Temporal breakdown
    var dateMap = {};
    articles.forEach(function(a) {
      var d = new Date(a.publishedAt).toISOString().slice(0, 10);
      if (!dateMap[d]) dateMap[d] = { count: 0, pos: 0, neg: 0, neu: 0 };
      dateMap[d].count++;
      if (a.sentiment === 'Positive') dateMap[d].pos++;
      else if (a.sentiment === 'Negative') dateMap[d].neg++;
      else dateMap[d].neu++;
    });
    var dates = Object.keys(dateMap).sort().map(function(d) { return [d, dateMap[d]]; });

    // Confidence stats
    var confidences = articles.map(function(a) { return a.confidence || 0; }).filter(function(c) { return c > 0; });
    var avgConfidence = confidences.length ? confidences.reduce(function(a, b) { return a + b; }, 0) / confidences.length : 0;
    var highConf = confidences.filter(function(c) { return c >= 0.8; }).length;
    var medConf = confidences.filter(function(c) { return c >= 0.5 && c < 0.8; }).length;
    var lowConf = confidences.filter(function(c) { return c < 0.5; }).length;

    // Categories
    var catMap = {};
    articles.forEach(function(a) { (a.categories || []).forEach(function(c) { catMap[c] = (catMap[c] || 0) + 1; }); });
    var categories = Object.keys(catMap).map(function(k) { return [k, catMap[k]]; }).sort(function(a, b) { return b[1] - a[1]; });

    var alerts = articles.filter(function(a) { return a.isAlert; });

    // AI Summary
    var executiveSummary = '';
    try {
      var client = getClient();
      if (client) {
        var topSources = sources.slice(0, 5).map(function(s) { return s.name + ' (' + s.count + ')'; }).join(', ');
        var completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Write a professional 4-5 sentence executive summary for a Malaysian news sentiment analysis report. Topic: ' + (topic || 'All') + '. Total: ' + total + ' articles. Sentiment: ' + posCount + ' positive (' + pct(posCount, total) + '%), ' + negCount + ' negative (' + pct(negCount, total) + '%), ' + neuCount + ' neutral. Sources: ' + topSources + '. States: ' + states.length + '. Confidence: ' + (avgConfidence * 100).toFixed(1) + '%. Alerts: ' + alerts.length + '. Be concise, factual, professional. No bullets.' }],
          max_tokens: 300,
        });
        executiveSummary = completion.choices[0] && completion.choices[0].message ? completion.choices[0].message.content : '';
      }
    } catch (e) { /* fallback */ }
    if (!executiveSummary) {
      var dominant = posCount >= negCount && posCount >= neuCount ? 'positive' : negCount >= posCount && negCount >= neuCount ? 'negative' : 'neutral';
      executiveSummary = 'This report analyses ' + total + ' Malaysian news articles' + (topic ? ' related to "' + topic + '"' : '') + '. The overall sentiment leans ' + dominant + ', with ' + pct(posCount, total) + '% positive, ' + pct(negCount, total) + '% negative, and ' + pct(neuCount, total) + '% neutral. Coverage spans ' + sources.length + ' sources across ' + states.length + ' regions. Average confidence: ' + (avgConfidence * 100).toFixed(1) + '%. ' + alerts.length + ' articles flagged as alerts.';
    }

    // BUILD PDF
    var doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sentiment-report-' + (topic || 'all') + '-' + Date.now() + '.pdf"');
    doc.pipe(res);

    // COVER
    doc.moveDown(6);
    doc.fillColor(C.accent).fontSize(32).font('Helvetica-Bold').text('Malaysia News', { align: 'center' });
    doc.fillColor(C.accent).fontSize(32).font('Helvetica-Bold').text('Sentiment Analysis', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(C.mid).fontSize(14).font('Helvetica').text('Comprehensive Report', { align: 'center' });
    doc.moveDown(3);
    doc.strokeColor(C.border).lineWidth(1).moveTo(200, doc.y).lineTo(395, doc.y).stroke();
    doc.moveDown(1.5);
    [['Topic', topic || 'All Topics'], ['Period', (dateFrom || 'All time') + ' to ' + (dateTo || 'Present')], ['Articles Analysed', String(total)], ['Generated', new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })]].forEach(function(m) {
      doc.fillColor(C.light).fontSize(10).font('Helvetica').text(m[0], { align: 'center' });
      doc.fillColor(C.black).fontSize(13).font('Helvetica-Bold').text(m[1], { align: 'center' });
      doc.moveDown(0.3);
    });

    // EXECUTIVE SUMMARY
    doc.addPage();
    drawSectionHeader(doc, '1. Executive Summary');
    doc.fillColor(C.dark).fontSize(10).font('Helvetica').text(executiveSummary, { lineGap: 4 });
    doc.moveDown(1.5);

    // KEY METRICS
    drawSectionHeader(doc, '2. Key Metrics');
    var metrics = [
      { label: 'Total Articles', value: total },
      { label: 'Positive', value: posCount + ' (' + pct(posCount, total) + '%)' },
      { label: 'Negative', value: negCount + ' (' + pct(negCount, total) + '%)' },
      { label: 'Neutral', value: neuCount + ' (' + pct(neuCount, total) + '%)' },
      { label: 'Sources', value: sources.length },
      { label: 'States', value: states.length },
      { label: 'Avg Confidence', value: (avgConfidence * 100).toFixed(1) + '%' },
      { label: 'Alerts', value: alerts.length }
    ];
    var colW = 247;
    var startY = doc.y;
    metrics.forEach(function(m, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var x = 50 + col * colW, y = startY + row * 36;
      doc.save(); doc.roundedRect(x, y - 4, colW - 10, 30, 3).fill(C.bg); doc.restore();
      doc.fillColor(C.mid).fontSize(8).font('Helvetica').text(m.label, x + 10, y, { width: colW - 30 });
      doc.fillColor(C.black).fontSize(14).font('Helvetica-Bold').text(String(m.value), x + 10, y + 12, { width: colW - 30 });
    });
    doc.y = startY + Math.ceil(metrics.length / 2) * 36 + 10;

    // SENTIMENT BARS
    checkPage(doc, 100);
    drawSectionHeader(doc, '3. Sentiment Distribution');
    var barMaxW = 400, barH = 18;
    [{ label: 'Positive', count: posCount, color: C.pos }, { label: 'Negative', count: negCount, color: C.neg }, { label: 'Neutral', count: neuCount, color: C.neu }].forEach(function(s) {
      var w = total ? (s.count / total) * barMaxW : 0;
      doc.fillColor(C.dark).fontSize(9).font('Helvetica-Bold').text(s.label, 50, doc.y);
      doc.fillColor(C.light).fontSize(9).font('Helvetica').text(s.count + ' articles (' + pct(s.count, total) + '%)');
      var barY = doc.y + 2;
      doc.roundedRect(70, barY, barMaxW, barH, 2).fill('#E5E7EB');
      if (w > 0) doc.roundedRect(70, barY, Math.max(w, 4), barH, 2).fill(s.color);
      doc.y = barY + barH + 10;
    });

    // SOURCE TABLE
    doc.addPage();
    drawSectionHeader(doc, '4. Source Analysis');
    doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(sources.length + ' unique sources identified.');
    doc.moveDown(0.8);
    if (sources.length > 0) {
      var srcCols = [50, 220, 300, 370, 440];
      doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
      ['Source', 'Articles', 'Positive', 'Negative', 'Neutral'].forEach(function(h, i) { doc.text(h, srcCols[i], doc.y, { width: 70 }); });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.3);
      sources.slice(0, 15).forEach(function(s, i) {
        checkPage(doc, 18);
        doc.save(); doc.rect(48, doc.y - 2, 497, 16).fill(i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'); doc.restore();
        doc.fillColor(C.black).fontSize(8).font('Helvetica').text(s.name, srcCols[0], doc.y, { width: 165 });
        doc.text(String(s.count), srcCols[1], doc.y, { width: 70 });
        doc.fillColor(C.pos).text(String(s.pos), srcCols[2], doc.y, { width: 60 });
        doc.fillColor(C.neg).text(String(s.neg), srcCols[3], doc.y, { width: 60 });
        doc.fillColor(C.neu).text(String(s.neu), srcCols[4], doc.y, { width: 60 });
        doc.moveDown(0.6);
      });
    }

    // GEOGRAPHIC
    checkPage(doc, 120);
    doc.moveDown(1);
    drawSectionHeader(doc, '5. Geographic Coverage');
    doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(states.length + ' states/regions.');
    doc.moveDown(0.8);
    if (states.length > 0) {
      var stCols = [50, 180, 260, 340, 420];
      doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
      ['State', 'Articles', 'Positive', 'Negative', 'Neutral'].forEach(function(h, i) { doc.text(h, stCols[i], doc.y, { width: 75 }); });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.3);
      states.slice(0, 16).forEach(function(entry, i) {
        checkPage(doc, 18);
        var name = entry[0], d = entry[1];
        doc.save(); doc.rect(48, doc.y - 2, 497, 16).fill(i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'); doc.restore();
        doc.fillColor(C.black).fontSize(8).font('Helvetica').text(name, stCols[0], doc.y, { width: 125 });
        doc.text(String(d.count), stCols[1], doc.y, { width: 70 });
        doc.fillColor(C.pos).text(String(d.pos), stCols[2], doc.y, { width: 70 });
        doc.fillColor(C.neg).text(String(d.neg), stCols[3], doc.y, { width: 70 });
        doc.fillColor(C.neu).text(String(d.neu), stCols[4], doc.y, { width: 70 });
        doc.moveDown(0.6);
      });
    }

    // TEMPORAL
    if (dates.length > 1) {
      checkPage(doc, 120);
      doc.moveDown(1);
      drawSectionHeader(doc, '6. Temporal Analysis');
      doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(dates.length + ' days: ' + dates[0][0] + ' to ' + dates[dates.length - 1][0] + '.');
      doc.moveDown(0.8);
      var dtCols = [50, 160, 240, 320, 400];
      doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
      ['Date', 'Articles', 'Positive', 'Negative', 'Neutral'].forEach(function(h, i) { doc.text(h, dtCols[i], doc.y, { width: 75 }); });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.3);
      dates.forEach(function(entry, i) {
        checkPage(doc, 18);
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

    // CONFIDENCE
    checkPage(doc, 100);
    doc.moveDown(1);
    drawSectionHeader(doc, '7. Classification Confidence');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Confidence score (0-1) reflects classifier certainty. Higher = more decisive.', { lineGap: 3 });
    doc.moveDown(0.6);
    [{ label: 'High (0.8-1.0)', count: highConf, color: C.pos }, { label: 'Medium (0.5-0.8)', count: medConf, color: C.neu }, { label: 'Low (0.0-0.5)', count: lowConf, color: C.neg }].forEach(function(s) {
      var w = total ? (s.count / total) * barMaxW : 0;
      doc.fillColor(C.dark).fontSize(8).font('Helvetica').text(s.label + ': ' + s.count + ' (' + pct(s.count, total) + '%)', 50, doc.y);
      var barY = doc.y + 2;
      doc.roundedRect(70, barY, barMaxW, 12, 2).fill('#E5E7EB');
      if (w > 0) doc.roundedRect(70, barY, Math.max(w, 3), 12, 2).fill(s.color);
      doc.y = barY + 18;
    });

    // CATEGORIES
    if (categories.length > 0) {
      checkPage(doc, 100);
      doc.moveDown(1);
      drawSectionHeader(doc, '8. Topic Categories');
      doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(categories.length + ' categories found.');
      doc.moveDown(0.5);
      categories.slice(0, 10).forEach(function(entry) {
        checkPage(doc, 16);
        var cat = entry[0], count = entry[1];
        doc.fillColor(C.black).fontSize(9).font('Helvetica').text(cat + '  (' + count + ' articles)', 60, doc.y, { width: 350 });
        var w = total ? (count / total) * 150 : 0;
        var barY = doc.y + 1;
        doc.roundedRect(420, barY, 120, 8, 1).fill('#E5E7EB');
        if (w > 0) doc.roundedRect(420, barY, Math.max(w, 2), 8, 1).fill(C.accent);
        doc.y = barY + 14;
      });
    }

    // ARTICLES
    doc.addPage();
    drawSectionHeader(doc, '9. Article Listing');
    doc.fillColor(C.mid).fontSize(9).font('Helvetica').text(Math.min(articles.length, 50) + ' of ' + total + ' articles.');
    doc.moveDown(0.8);
    articles.slice(0, 50).forEach(function(article, i) {
      checkPage(doc, 50);
      var sentCol = sentimentColor(article.sentiment);
      doc.fillColor(C.black).fontSize(9).font('Helvetica-Bold').text(truncate(article.title, 110), { lineGap: 2 });
      var metaY = doc.y + 1;
      doc.fillColor(C.light).fontSize(7).font('Helvetica')
        .text((article.source || 'Unknown') + '  |  ' + new Date(article.publishedAt).toLocaleDateString('en-MY') + '  |  ', 50, metaY, { continued: true, width: 495 });
      doc.fillColor(sentCol).font('Helvetica-Bold').text(article.sentiment + ' (' + ((article.confidence || 0) * 100).toFixed(0) + '%)', { continued: false });
      if (article.description) {
        doc.fillColor(C.mid).fontSize(7).font('Helvetica').text(truncate(article.description, 150), { lineGap: 1 });
      }
      doc.moveDown(0.3);
      if (i < Math.min(articles.length, 50) - 1) {
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#EEEEEE').lineWidth(0.3).stroke();
        doc.moveDown(0.2);
      }
    });

    // METHODOLOGY
    doc.addPage();
    drawSectionHeader(doc, '10. Methodology');
    doc.fillColor(C.dark).fontSize(9.5).font('Helvetica').text('This report uses a hybrid sentiment analysis pipeline for Malaysian news. Articles from FMT, Astro Awani, Malaysiakini, The Star, and Bernama are processed through a multi-stage classification system.', { lineGap: 4 });
    doc.moveDown(0.8);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Data Collection');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Articles sourced via RSS feeds with metadata: publication date, source, geographic classification, topic categorisation.', { lineGap: 3 });
    doc.moveDown(0.5);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Sentiment Classification');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Dual-model: Mesolitica NanoT5 (local, Bahasa Melayu) + GPT-4o-mini (cross-validation). Three-tier: Positive, Negative, Neutral. Confidence 0-1. Disagreements resolved by confidence weighting.', { lineGap: 3 });
    doc.moveDown(0.5);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Geographic & Topic Classification');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('NER for Malaysian states. Keyword extraction for topic categories (Politics, Economy, Crime, Education, Technology).', { lineGap: 3 });
    doc.moveDown(0.5);
    doc.fillColor(C.black).fontSize(10).font('Helvetica-Bold').text('Limitations');
    doc.fillColor(C.dark).fontSize(9).font('Helvetica').text('Accuracy affected by sarcasm, idioms, mixed-language content. Geographic based on content mentions, not publication location. Confidence reflects model certainty, not factual accuracy.', { lineGap: 3 });

    // FOOTERS - draw on each existing page
    var pageRange = doc.bufferedPageRange();
    for (var i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.fontSize(7).font('Helvetica').fillColor(C.light);
      doc.text('Malaysia News Sentiment Analysis  |  Page ' + (i + 1) + ' of ' + pageRange.count + '  |  ' + new Date().toLocaleDateString('en-MY'), 50, 790, { align: 'center', width: 495 });
      doc.restore();
    }

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) { res.status(500).json({ error: 'Failed to generate report' }); }
    else { res.end(); }
  }
};

var generateTopicReport = async function(req, res) {
  try {
    var topic = req.body.topic;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    req.body.topic = topic;
    return generatePDFReport(req, res);
  } catch (err) {
    console.error('Topic report error:', err);
    res.status(500).json({ error: 'Failed to generate topic report' });
  }
};

module.exports = { generatePDFReport: generatePDFReport, generateTopicReport: generateTopicReport };
