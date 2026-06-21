var PDFDocument = require('pdfkit');
var Article = require('../models/Article');
var { getClient } = require('../services/openaiService');

// ── Thesis-style constants ──────────────────────────────
var MARGIN_LEFT = 72;   // 1 inch
var MARGIN_RIGHT = 72;
var MARGIN_TOP = 72;
var MARGIN_BOTTOM = 72;
var PAGE_W = 595.28;
var PAGE_H = 841.89;
var CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // 451

var FONT = 'Times-Roman';
var FONT_BOLD = 'Times-Bold';
var FONT_ITALIC = 'Times-Italic';

var C = {
  black: '#000000',
  dark: '#1a1a1a',
  mid: '#444444',
  light: '#777777',
  border: '#999999',
  tableBorder: '#333333',
  tableHeaderBg: '#e8e8e8',
  tableAltBg: '#f5f5f5',
  pos: '#2e7d32',
  neg: '#c62828',
  neu: '#f57f17',
  accent: '#1a237e',
};

var pct = function(n, d) { return d ? Math.round((n / d) * 100) : 0; };

function sentimentColor(s) {
  return s === 'Positive' ? C.pos : s === 'Negative' ? C.neg : C.neu;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len).trimEnd() + '\u2026' : str;
}

// ── Page tracking ───────────────────────────────────────
var _pageNum = 0;
var _isRoman = true; // front matter uses roman numerals
var _romanOffset = 0;

function toRoman(n) {
  var vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  var syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  var result = '';
  for (var i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function addPage(doc) {
  doc.addPage();
  _pageNum++;
}

// ── Drawing helpers ─────────────────────────────────────
function drawHeader(doc, text) {
  doc.save();
  doc.fontSize(8).font(FONT_ITALIC).fillColor(C.light);
  doc.text(text, MARGIN_LEFT, 36, { width: CONTENT_W, align: 'center' });
  doc.moveTo(MARGIN_LEFT, 48).lineTo(PAGE_W - MARGIN_RIGHT, 48).lineWidth(0.3).strokeColor(C.light).stroke();
  doc.restore();
}

function drawPageNumber(doc) {
  doc.save();
  doc.fontSize(9).font(FONT).fillColor(C.black);
  var num = _isRoman ? toRoman(_pageNum) : String(_pageNum);
  doc.text(num, MARGIN_LEFT, PAGE_H - 50, { width: CONTENT_W, align: 'center' });
  doc.restore();
}

function sectionTitle(doc, num, title) {
  doc.fillColor(C.black).fontSize(14).font(FONT_BOLD).text(num + '  ' + title, MARGIN_LEFT);
  doc.moveDown(0.8);
}

function subsectionTitle(doc, num, title) {
  doc.fillColor(C.black).fontSize(12).font(FONT_BOLD).text(num + '  ' + title, MARGIN_LEFT);
  doc.moveDown(0.5);
}

function bodyText(doc, text) {
  doc.fillColor(C.dark).fontSize(11).font(FONT);
  // First line indent 0.5 inch (36pt)
  doc.text('    ' + text, MARGIN_LEFT + 36, doc.y, {
    width: CONTENT_W - 36,
    align: 'justify',
    lineGap: 4
  });
  doc.moveDown(0.6);
}

function bodyNoIndent(doc, text) {
  doc.fillColor(C.dark).fontSize(11).font(FONT).text(text, MARGIN_LEFT, doc.y, {
    width: CONTENT_W,
    align: 'justify',
    lineGap: 4
  });
  doc.moveDown(0.6);
}

function checkPage(doc, needed) {
  needed = needed || 100;
  if (doc.y + needed > PAGE_H - MARGIN_BOTTOM - 30) {
    addPage(doc);
  }
}

// ── Table helper ────────────────────────────────────────
function drawTable(doc, headers, rows, colWidths) {
  var x = MARGIN_LEFT;
  var rowH = 22;
  var headerH = 26;

  // Header row
  doc.save();
  doc.rect(x, doc.y - 4, CONTENT_W, headerH).fill(C.tableHeaderBg);
  doc.restore();

  var curX = x;
  headers.forEach(function(h, i) {
    doc.fillColor(C.black).fontSize(9).font(FONT_BOLD).text(h, curX + 6, doc.y, { width: colWidths[i] - 12, lineBreak: false });
    curX += colWidths[i];
  });
  doc.y += headerH - 4;

  // Border under header
  doc.moveTo(x, doc.y).lineTo(x + CONTENT_W, doc.y).lineWidth(0.8).strokeColor(C.tableBorder).stroke();
  doc.moveDown(0.2);

  // Data rows
  rows.forEach(function(row, ri) {
    checkPage(doc, rowH + 5);
    if (ri % 2 === 1) {
      doc.save();
      doc.rect(x, doc.y - 3, CONTENT_W, rowH).fill(C.tableAltBg);
      doc.restore();
    }
    curX = x;
    row.forEach(function(cell, ci) {
      var col = typeof cell === 'object' ? cell : { text: String(cell), color: C.dark };
      doc.fillColor(col.color || C.dark).fontSize(9).font(FONT).text(col.text || '', curX + 6, doc.y, { width: colWidths[ci] - 12, lineBreak: false });
      curX += colWidths[ci];
    });
    doc.y += rowH - 4;
    // Row border
    doc.moveTo(x, doc.y).lineTo(x + CONTENT_W, doc.y).lineWidth(0.3).strokeColor('#cccccc').stroke();
    doc.moveDown(0.15);
  });

  doc.moveDown(0.8);
}

// ── Bar chart helper ────────────────────────────────────
function drawBar(doc, label, value, total, color, barX, barMaxW) {
  var w = total ? (value / total) * barMaxW : 0;
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(label, MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  ' + value + ' (' + pct(value, total) + '%)', { continued: false });
  var barY = doc.y + 3;
  doc.rect(barX, barY, barMaxW, 14).fill('#e0e0e0');
  if (w > 0) doc.rect(barX, barY, Math.max(w, 3), 14).fill(color);
  doc.y = barY + 20;
}

// ══════════════════════════════════════════════════════════
//  MAIN GENERATOR
// ══════════════════════════════════════════════════════════
var generatePDFReport = async function(req, res) {
  try {
    var topic = req.body.topic;
    var dateFrom = req.body.dateFrom;
    var dateTo = req.body.dateTo;

    // ── Query ───────────────────────────────────────────
    var escapeRegex = function(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var orConds = [];
    if (topic && topic !== 'all') {
      var re = new RegExp(escapeRegex(topic), 'i');
      orConds.push({ topic: re }, { title: re }, { categories: re });
    }
    var query = {};
    if (orConds.length) query.$or = orConds;
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    var articles = await Article.find(query).sort({ publishedAt: -1 }).limit(200).lean();
    if (articles.length === 0 && (dateFrom || dateTo)) {
      var fq = orConds.length ? { $or: orConds } : {};
      articles = await Article.find(fq).sort({ publishedAt: -1 }).limit(200).lean();
    }
    var total = articles.length;

    // ── Stats ───────────────────────────────────────────
    var posN = 0, negN = 0, neuN = 0;
    articles.forEach(function(a) {
      if (a.sentiment === 'Positive') posN++;
      else if (a.sentiment === 'Negative') negN++;
      else neuN++;
    });

    var srcMap = {};
    articles.forEach(function(a) {
      var s = a.source || 'Unknown';
      if (!srcMap[s]) srcMap[s] = { n: 0, p: 0, ng: 0, nt: 0 };
      srcMap[s].n++;
      if (a.sentiment === 'Positive') srcMap[s].p++;
      else if (a.sentiment === 'Negative') srcMap[s].ng++;
      else srcMap[s].nt++;
    });
    var sources = Object.keys(srcMap).map(function(k) {
      return { name: k, n: srcMap[k].n, p: srcMap[k].p, ng: srcMap[k].ng, nt: srcMap[k].nt };
    }).sort(function(a, b) { return b.n - a.n; });

    var stMap = {};
    articles.forEach(function(a) {
      var st = a.stateLocation || 'General';
      if (!stMap[st]) stMap[st] = { n: 0, p: 0, ng: 0, nt: 0 };
      stMap[st].n++;
      if (a.sentiment === 'Positive') stMap[st].p++;
      else if (a.sentiment === 'Negative') stMap[st].ng++;
      else stMap[st].nt++;
    });
    var states = Object.keys(stMap).map(function(k) {
      return [k, stMap[k]];
    }).sort(function(a, b) { return b[1].n - a[1].n; });

    var dtMap = {};
    articles.forEach(function(a) {
      var d = new Date(a.publishedAt).toISOString().slice(0, 10);
      if (!dtMap[d]) dtMap[d] = { n: 0, p: 0, ng: 0, nt: 0 };
      dtMap[d].n++;
      if (a.sentiment === 'Positive') dtMap[d].p++;
      else if (a.sentiment === 'Negative') dtMap[d].ng++;
      else dtMap[d].nt++;
    });
    var dates = Object.keys(dtMap).sort().map(function(d) { return [d, dtMap[d]]; });

    var confs = articles.map(function(a) { return a.confidence || 0; }).filter(function(c) { return c > 0; });
    var avgConf = confs.length ? confs.reduce(function(a, b) { return a + b; }, 0) / confs.length : 0;
    var hiConf = confs.filter(function(c) { return c >= 0.8; }).length;
    var medConf = confs.filter(function(c) { return c >= 0.5 && c < 0.8; }).length;
    var loConf = confs.filter(function(c) { return c < 0.5; }).length;

    var catMap = {};
    articles.forEach(function(a) { (a.categories || []).forEach(function(c) { catMap[c] = (catMap[c] || 0) + 1; }); });
    var cats = Object.keys(catMap).map(function(k) { return [k, catMap[k]]; }).sort(function(a, b) { return b[1] - a[1]; });
    var alerts = articles.filter(function(a) { return a.isAlert; });

    // ── AI Abstract ─────────────────────────────────────
    var abstract = '';
    try {
      var client = getClient();
      if (client) {
        var comp = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Write a 150-word academic abstract for a sentiment analysis report on Malaysian news. Topic: ' + (topic || 'general') + '. ' + total + ' articles from ' + sources.length + ' sources across ' + states.length + ' regions. Distribution: ' + posN + ' positive, ' + negN + ' negative, ' + neuN + ' neutral. Avg confidence: ' + (avgConf * 100).toFixed(1) + '%. Write in formal academic tone. No bullet points.' }],
          max_tokens: 250
        });
        abstract = comp.choices[0] && comp.choices[0].message ? comp.choices[0].message.content : '';
      }
    } catch (e) {}
    if (!abstract) {
      abstract = 'This report presents a comprehensive sentiment analysis of ' + total + ' Malaysian news articles' + (topic ? ' related to "' + topic + '"' : '') + '. Utilising a hybrid classification approach combining Mesolitica NanoT5 and GPT-4o-mini, the analysis reveals a sentiment distribution of ' + pct(posN, total) + '% positive, ' + pct(negN, total) + '% negative, and ' + pct(neuN, total) + '% neutral classifications. The dataset encompasses content from ' + sources.length + ' distinct news sources spanning ' + states.length + ' geographic regions, with an average classification confidence of ' + (avgConf * 100).toFixed(1) + '%. These findings provide insights into the prevailing media narrative landscape in Malaysia during the observed period.';
    }

    // Date range string
    var dateRange = 'All time';
    if (dates.length > 0) dateRange = dates[0][0] + ' to ' + dates[dates.length - 1][0];

    // ══════════════════════════════════════════════════════
    //  BUILD PDF
    // ══════════════════════════════════════════════════════
    _pageNum = 1;
    _isRoman = true;
    var doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
      info: {
        Title: 'Sentiment Analysis Report - ' + (topic || 'All Topics'),
        Author: 'Malaysia News Sentiment Analysis Dashboard',
        Subject: 'News Sentiment Analysis',
        Creator: 'PDFKit'
      }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sentiment-report-' + (topic || 'all') + '-' + Date.now() + '.pdf"');
    doc.pipe(res);

    // ─── TITLE PAGE ─────────────────────────────────────
    doc.moveDown(8);
    doc.fillColor(C.black).fontSize(24).font(FONT_BOLD).text('SENTIMENT ANALYSIS REPORT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(C.accent).fontSize(18).font(FONT_BOLD).text((topic || 'All Topics').toUpperCase(), { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(180, doc.y).lineTo(415, doc.y).lineWidth(1).strokeColor(C.black).stroke();
    doc.moveDown(2);
    doc.fillColor(C.dark).fontSize(12).font(FONT).text('Malaysia News Sentiment Analysis Dashboard', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(C.mid).fontSize(11).font(FONT).text('Generated: ' + new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }), { align: 'center' });
    doc.moveDown(0.3);
    doc.text('Period: ' + dateRange, { align: 'center' });
    doc.moveDown(0.3);
    doc.text('Total Articles Analysed: ' + total, { align: 'center' });

    // ─── TABLE OF CONTENTS ──────────────────────────────
    addPage(doc);
    _isRoman = true;
    doc.fillColor(C.black).fontSize(16).font(FONT_BOLD).text('TABLE OF CONTENTS', { align: 'center' });
    doc.moveDown(1.5);

    var tocItems = [
      ['Abstract', 'ii'],
      ['1.0', 'Introduction', '1'],
      ['2.0', 'Executive Summary', '2'],
      ['3.0', 'Methodology', '3'],
      ['3.1', 'Data Collection', '3'],
      ['3.2', 'Sentiment Classification', '3'],
      ['3.3', 'Geographic Classification', '3'],
      ['4.0', 'Results and Analysis', '4'],
      ['4.1', 'Sentiment Distribution', '4'],
      ['4.2', 'Source Analysis', '5'],
      ['4.3', 'Geographic Coverage', '5'],
      ['4.4', 'Temporal Analysis', '6'],
      ['4.5', 'Classification Confidence', '6'],
      ['4.6', 'Topic Categories', '6'],
      ['5.0', 'Article Listing', '7'],
      ['6.0', 'Conclusion', '9'],
    ];
    tocItems.forEach(function(item) {
      if (item.length === 2) {
        // Simple item (Abstract, page)
        doc.fillColor(C.black).fontSize(11).font(FONT).text(item[0], MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W - 40 });
        doc.text(item[1], { align: 'right', continued: false });
      } else {
        var indent = item[0].indexOf('.') > 0 && item[0].length > 3 ? MARGIN_LEFT + 24 : MARGIN_LEFT;
        doc.fillColor(C.black).fontSize(11).font(FONT).text(item[0] + '  ' + item[1], indent, doc.y, { continued: true, width: CONTENT_W - 80 });
        doc.text(item[2], { align: 'right', continued: false });
      }
      doc.moveDown(0.3);
    });

    // ─── ABSTRACT ───────────────────────────────────────
    addPage(doc);
    doc.fillColor(C.black).fontSize(14).font(FONT_BOLD).text('ABSTRACT', { align: 'center' });
    doc.moveDown(1);
    bodyText(doc, abstract);
    doc.moveDown(0.5);
    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Keywords: sentiment analysis, Malaysian news, NLP, natural language processing, media monitoring', MARGIN_LEFT, doc.y, { width: CONTENT_W, align: 'justify' });

    // ─── Switch to arabic numerals ──────────────────────
    _pageNum = 1;
    _isRoman = false;

    // ─── 1.0 INTRODUCTION ──────────────────────────────
    addPage(doc);
    drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
    sectionTitle(doc, '1.0', 'Introduction');
    bodyText(doc, 'This report presents a systematic analysis of sentiment patterns within Malaysian news media coverage' + (topic ? ' pertaining to the topic of "' + topic + '"' : '') + '. The analysis encompasses ' + total + ' articles collected from ' + sources.length + ' distinct news sources, spanning a temporal range of ' + dateRange + '.');
    bodyText(doc, 'The Malaysian media landscape is diverse, comprising English-language outlets such as The Star and New Straits Times, Bahasa Melayu publications including Utusan Malaysia and Berita Harian, and multilingual digital platforms. Understanding sentiment trends across this heterogeneous media ecosystem provides valuable insights into public discourse and information dissemination patterns.');
    bodyText(doc, 'The primary objectives of this analysis are threefold: (1) to quantify the overall sentiment distribution across the collected articles, (2) to identify temporal and geographic patterns in sentiment expression, and (3) to assess the reliability of automated sentiment classification through confidence score analysis.');

    // ─── 2.0 EXECUTIVE SUMMARY ─────────────────────────
    addPage(doc);
    drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
    sectionTitle(doc, '2.0', 'Executive Summary');
    bodyText(doc, abstract);

    // Key findings as numbered list
    doc.moveDown(0.5);
    subsectionTitle(doc, '2.1', 'Key Findings');
    var findings = [
      'A total of ' + total + ' articles were analysed, sourced from ' + sources.length + ' distinct news outlets.',
      'Sentiment distribution: ' + posN + ' positive (' + pct(posN, total) + '%), ' + negN + ' negative (' + pct(negN, total) + '%), and ' + neuN + ' neutral (' + pct(neuN, total) + '%).',
      'Geographic coverage spans ' + states.length + ' states and regions across Malaysia.',
      'The average classification confidence score is ' + (avgConf * 100).toFixed(1) + '%, indicating ' + (avgConf >= 0.7 ? 'reliable' : 'moderate') + ' model performance.',
      alerts.length > 0 ? alerts.length + ' articles were flagged as alerts due to strong sentiment signals.' : 'No articles triggered alert thresholds during the analysis period.'
    ];
    findings.forEach(function(f, i) {
      doc.fillColor(C.dark).fontSize(11).font(FONT).text((i + 1) + '.  ' + f, MARGIN_LEFT + 24, doc.y, { width: CONTENT_W - 24, lineGap: 3 });
      doc.moveDown(0.4);
    });

    // ─── 3.0 METHODOLOGY ───────────────────────────────
    addPage(doc);
    drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
    sectionTitle(doc, '3.0', 'Methodology');

    subsectionTitle(doc, '3.1', 'Data Collection');
    bodyText(doc, 'Articles were collected through automated RSS feed parsing and web scraping from major Malaysian news outlets. The corpus includes content from ' + sources.slice(0, 5).map(function(s) { return s.name; }).join(', ') + ', among ' + (sources.length - 5) + ' other sources. Each article record includes the headline, full text content, publication date, source attribution, and any available metadata such as author information and article categories.');

    subsectionTitle(doc, '3.2', 'Sentiment Classification');
    bodyText(doc, 'The classification pipeline employs a dual-model architecture. The primary classifier is Mesolitica NanoT5, a transformer model specifically fine-tuned for Bahasa Melayu text analysis. This is supplemented by GPT-4o-mini, which provides cross-validation and handles English-language content. Each article receives a three-tier classification (Positive, Negative, or Neutral) along with a confidence score ranging from 0 to 1. Where the two models disagree, the classification with the higher confidence score is adopted.');

    subsectionTitle(doc, '3.3', 'Geographic Classification');
    bodyText(doc, 'Geographic attribution is performed using named entity recognition (NER) to identify Malaysian states, cities, and regions mentioned within article content. Articles are assigned to their primary geographic focus rather than publication location. This approach captures the spatial dimension of news coverage, enabling regional sentiment analysis across Malaysia\u2019s thirteen states and three federal territories.');

    // ─── 4.0 RESULTS ───────────────────────────────────
    addPage(doc);
    drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
    sectionTitle(doc, '4.0', 'Results and Analysis');

    // 4.1 Sentiment Distribution
    subsectionTitle(doc, '4.1', 'Sentiment Distribution');
    bodyText(doc, 'Table 1 presents the overall sentiment distribution across all ' + total + ' articles in the dataset. The analysis reveals ' + (posN >= negN && posN >= neuN ? 'a predominantly positive sentiment profile' : negN >= posN && negN >= neuN ? 'a predominantly negative sentiment profile' : 'a balanced sentiment profile') + ' with notable variation across categories.');

    // Table 1: Sentiment Distribution
    doc.moveDown(0.5);
    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 1: Overall Sentiment Distribution', MARGIN_LEFT);
    doc.moveDown(0.3);
    drawTable(doc,
      ['Sentiment', 'Count', 'Percentage'],
      [
        [{ text: 'Positive', color: C.pos }, String(posN), pct(posN, total) + '%'],
        [{ text: 'Negative', color: C.neg }, String(negN), pct(negN, total) + '%'],
        [{ text: 'Neutral', color: C.neu }, String(neuN), pct(neuN, total) + '%'],
        [{ text: 'Total', color: C.black }, String(total), '100%'],
      ],
      [180, 135, 136]
    );

    // Visual bars
    checkPage(doc, 120);
    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Figure 1: Sentiment Distribution', MARGIN_LEFT);
    doc.moveDown(0.5);
    drawBar(doc, 'Positive', posN, total, C.pos, MARGIN_LEFT + 100, 300);
    drawBar(doc, 'Negative', negN, total, C.neg, MARGIN_LEFT + 100, 300);
    drawBar(doc, 'Neutral', neuN, total, C.neu, MARGIN_LEFT + 100, 300);

    // 4.2 Source Analysis
    checkPage(doc, 200);
    doc.moveDown(0.5);
    subsectionTitle(doc, '4.2', 'Source Analysis');
    bodyText(doc, 'The dataset encompasses ' + sources.length + ' distinct news sources. Table 2 lists the top contributors by article volume. Source diversity is a critical factor in ensuring representativeness of the sentiment analysis, as concentration from a single outlet may introduce editorial bias.');

    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 2: Top News Sources by Article Volume', MARGIN_LEFT);
    doc.moveDown(0.3);
    var srcRows = sources.slice(0, 12).map(function(s) {
      return [s.name, String(s.n), { text: String(s.p), color: C.pos }, { text: String(s.ng), color: C.neg }, { text: String(s.nt), color: C.neu }];
    });
    drawTable(doc, ['Source', 'Total', 'Positive', 'Negative', 'Neutral'], srcRows, [160, 60, 77, 77, 77]);

    // 4.3 Geographic Coverage
    checkPage(doc, 180);
    subsectionTitle(doc, '4.3', 'Geographic Coverage');
    bodyText(doc, 'Table 3 presents the geographic distribution of articles. The concentration of coverage in certain states reflects both population density and the occurrence of newsworthy events in those regions.');

    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 3: Geographic Distribution', MARGIN_LEFT);
    doc.moveDown(0.3);
    var stRows = states.slice(0, 14).map(function(e) {
      return [e[0], String(e[1].n), { text: String(e[1].p), color: C.pos }, { text: String(e[1].ng), color: C.neg }, { text: String(e[1].nt), color: C.neu }];
    });
    drawTable(doc, ['State/Region', 'Total', 'Positive', 'Negative', 'Neutral'], stRows, [160, 60, 77, 77, 77]);

    // 4.4 Temporal Analysis
    if (dates.length > 1) {
      checkPage(doc, 180);
      subsectionTitle(doc, '4.4', 'Temporal Analysis');
      bodyText(doc, 'Table 4 shows the daily sentiment distribution across the ' + dates.length + '-day analysis period from ' + dates[0][0] + ' to ' + dates[dates.length - 1][0] + '. Temporal patterns may reflect the lifecycle of news events, with initial negative reporting often followed by neutral or positive follow-up coverage.');

      doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 4: Daily Sentiment Trend', MARGIN_LEFT);
      doc.moveDown(0.3);
      var dtRows = dates.map(function(e) {
        return [e[0], String(e[1].n), { text: String(e[1].p), color: C.pos }, { text: String(e[1].ng), color: C.neg }, { text: String(e[1].nt), color: C.neu }];
      });
      drawTable(doc, ['Date', 'Total', 'Positive', 'Negative', 'Neutral'], dtRows, [120, 60, 90, 90, 91]);
    }

    // 4.5 Confidence
    checkPage(doc, 150);
    subsectionTitle(doc, '4.5', 'Classification Confidence');
    bodyText(doc, 'The classifier assigns a confidence score between 0 and 1 to each classification. Higher scores indicate greater certainty in the assigned sentiment label. Table 5 summarises the confidence distribution across three tiers.');

    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 5: Confidence Score Distribution', MARGIN_LEFT);
    doc.moveDown(0.3);
    drawTable(doc,
      ['Confidence Tier', 'Count', 'Percentage'],
      [
        ['High (0.8 \u2013 1.0)', String(hiConf), pct(hiConf, total) + '%'],
        ['Medium (0.5 \u2013 0.8)', String(medConf), pct(medConf, total) + '%'],
        ['Low (0.0 \u2013 0.5)', String(loConf), pct(loConf, total) + '%'],
      ],
      [200, 125, 126]
    );

    // 4.6 Categories
    if (cats.length > 0) {
      checkPage(doc, 150);
      subsectionTitle(doc, '4.6', 'Topic Categories');
      bodyText(doc, 'Table 6 lists the topic categories identified through content analysis. Categories are assigned based on keyword extraction and contextual analysis of article content.');

      doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 6: Topic Categories', MARGIN_LEFT);
      doc.moveDown(0.3);
      var catRows = cats.slice(0, 10).map(function(e) {
        return [e[0], String(e[1]), pct(e[1], total) + '%'];
      });
      drawTable(doc, ['Category', 'Count', 'Percentage'], catRows, [200, 125, 126]);
    }

    // ─── 5.0 ARTICLE LISTING ───────────────────────────
    addPage(doc);
    drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
    sectionTitle(doc, '5.0', 'Article Listing');
    bodyText(doc, 'The following tables present the complete article corpus organised by sentiment category. Each entry includes the article headline, source, publication date, sentiment classification, and confidence score.');

    // Positive articles
    if (posN > 0) {
      checkPage(doc, 60);
      subsectionTitle(doc, '5.1', 'Positive Articles (' + posN + ')');
      var posRows = articles.filter(function(a) { return a.sentiment === 'Positive'; }).slice(0, 20).map(function(a) {
        return [
          { text: truncate(a.title, 65), color: C.dark },
          a.source || '-',
          new Date(a.publishedAt).toLocaleDateString('en-MY'),
          { text: ((a.confidence || 0) * 100).toFixed(0) + '%', color: C.pos }
        ];
      });
      drawTable(doc, ['Headline', 'Source', 'Date', 'Conf.'], posRows, [230, 90, 70, 61]);
    }

    // Negative articles
    if (negN > 0) {
      checkPage(doc, 60);
      subsectionTitle(doc, '5.2', 'Negative Articles (' + negN + ')');
      var negRows = articles.filter(function(a) { return a.sentiment === 'Negative'; }).slice(0, 20).map(function(a) {
        return [
          { text: truncate(a.title, 65), color: C.dark },
          a.source || '-',
          new Date(a.publishedAt).toLocaleDateString('en-MY'),
          { text: ((a.confidence || 0) * 100).toFixed(0) + '%', color: C.neg }
        ];
      });
      drawTable(doc, ['Headline', 'Source', 'Date', 'Conf.'], negRows, [230, 90, 70, 61]);
    }

    // Neutral articles
    if (neuN > 0) {
      checkPage(doc, 60);
      subsectionTitle(doc, '5.3', 'Neutral Articles (' + neuN + ')');
      var neuRows = articles.filter(function(a) { return a.sentiment === 'Neutral'; }).slice(0, 20).map(function(a) {
        return [
          { text: truncate(a.title, 65), color: C.dark },
          a.source || '-',
          new Date(a.publishedAt).toLocaleDateString('en-MY'),
          { text: ((a.confidence || 0) * 100).toFixed(0) + '%', color: C.neu }
        ];
      });
      drawTable(doc, ['Headline', 'Source', 'Date', 'Conf.'], neuRows, [230, 90, 70, 61]);
    }

    // ─── 6.0 CONCLUSION ────────────────────────────────
    addPage(doc);
    drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
    sectionTitle(doc, '6.0', 'Conclusion');
    bodyText(doc, 'This sentiment analysis of ' + total + ' Malaysian news articles' + (topic ? ' related to "' + topic + '"' : '') + ' reveals ' + (posN >= negN && posN >= neuN ? 'a predominantly positive media narrative' : negN >= posN && negN >= neuN ? 'a predominantly negative media narrative' : 'a balanced media narrative') + ' during the observed period of ' + dateRange + '.');
    bodyText(doc, 'The analysis demonstrates the viability of automated sentiment classification for Malaysian news content, achieving an average confidence score of ' + (avgConf * 100).toFixed(1) + '%. The dual-model approach combining domain-specific (Mesolitica NanoT5) and general-purpose (GPT-4o-mini) classifiers provides robustness against the linguistic diversity characteristic of Malaysian media.');
    bodyText(doc, 'The geographic distribution of coverage reveals ' + (states.length > 5 ? 'broad national coverage with concentration in key states' : 'focused coverage in ' + states.length + ' primary regions') + ', while the temporal analysis across ' + dates.length + ' days captures the dynamic nature of media sentiment. These findings contribute to the growing body of research on automated media monitoring in multilingual Southeast Asian contexts.');

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
