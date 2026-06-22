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
//  SHARED STATS COMPUTATION
// ══════════════════════════════════════════════════════════
function computeStats(articles, topic) {
  var total = articles.length;
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

  var dateRange = 'All time';
  if (dates.length > 0) dateRange = dates[0][0] + ' to ' + dates[dates.length - 1][0];

  return {
    articles: articles,
    topic: topic || null,
    total: total,
    posN: posN, negN: negN, neuN: neuN,
    sources: sources,
    states: states,
    dates: dates,
    avgConf: avgConf,
    hiConf: hiConf, medConf: medConf, loConf: loConf,
    cats: cats,
    alerts: alerts,
    dateRange: dateRange
  };
}

// ══════════════════════════════════════════════════════════
//  AI ABSTRACT GENERATOR
// ══════════════════════════════════════════════════════════
async function generateAbstract(topic, stats) {
  var abstract = '';
  try {
    var client = getClient();
    if (client) {
      var comp = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Write a 150-word academic abstract for a sentiment analysis report on Malaysian news. Topic: ' + (topic || 'general') + '. ' + stats.total + ' articles from ' + stats.sources.length + ' sources across ' + stats.states.length + ' regions. Distribution: ' + stats.posN + ' positive, ' + stats.negN + ' negative, ' + stats.neuN + ' neutral. Avg confidence: ' + (stats.avgConf * 100).toFixed(1) + '%. Write in formal academic tone. No bullet points.' }],
        max_tokens: 250
      });
      abstract = comp.choices[0] && comp.choices[0].message ? comp.choices[0].message.content : '';
    }
  } catch (e) {}
  if (!abstract) {
    abstract = 'This report presents a comprehensive sentiment analysis of ' + stats.total + ' Malaysian news articles' + (topic ? ' related to "' + topic + '"' : '') + '. Utilising a hybrid classification approach combining Mesolitica NanoT5 and GPT-4o-mini, the analysis reveals a sentiment distribution of ' + pct(stats.posN, stats.total) + '% positive, ' + pct(stats.negN, stats.total) + '% negative, and ' + pct(stats.neuN, stats.total) + '% neutral classifications. The dataset encompasses content from ' + stats.sources.length + ' distinct news sources spanning ' + stats.states.length + ' geographic regions, with an average classification confidence of ' + (stats.avgConf * 100).toFixed(1) + '%. These findings provide insights into the prevailing media narrative landscape in Malaysia during the observed period.';
  }
  return abstract;
}

// ══════════════════════════════════════════════════════════
//  MODULAR SECTION DRAWING FUNCTIONS
// ══════════════════════════════════════════════════════════

// ─── Title Page ─────────────────────────────────────────
function drawTitlePage(doc, stats) {
  var topic = stats.topic;
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
  doc.text('Period: ' + stats.dateRange, { align: 'center' });
  doc.moveDown(0.3);
  doc.text('Total Articles Analysed: ' + stats.total, { align: 'center' });
}

// ─── Table of Contents (detailed only) ──────────────────
function drawTableOfContents(doc, tocSections) {
  doc.fillColor(C.black).fontSize(16).font(FONT_BOLD).text('TABLE OF CONTENTS', { align: 'center' });
  doc.moveDown(1.5);

  tocSections.forEach(function(item) {
    if (item.length === 2) {
      doc.fillColor(C.black).fontSize(11).font(FONT).text(item[0], MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W - 40 });
      doc.text(item[1], { align: 'right', continued: false });
    } else {
      var indent = item[0].indexOf('.') > 0 && item[0].length > 3 ? MARGIN_LEFT + 24 : MARGIN_LEFT;
      doc.fillColor(C.black).fontSize(11).font(FONT).text(item[0] + '  ' + item[1], indent, doc.y, { continued: true, width: CONTENT_W - 80 });
      doc.text(item[2], { align: 'right', continued: false });
    }
    doc.moveDown(0.3);
  });
}

// ─── Abstract ───────────────────────────────────────────
function drawAbstract(doc, stats, abstract) {
  doc.fillColor(C.black).fontSize(14).font(FONT_BOLD).text('ABSTRACT', { align: 'center' });
  doc.moveDown(1);
  bodyText(doc, abstract);
  doc.moveDown(0.5);
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Keywords: sentiment analysis, Malaysian news, NLP, natural language processing, media monitoring', MARGIN_LEFT, doc.y, { width: CONTENT_W, align: 'justify' });
}

// ─── Introduction ───────────────────────────────────────
function drawIntroduction(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '1.0', 'Introduction');
  bodyText(doc, 'This report presents a systematic analysis of sentiment patterns within Malaysian news media coverage' + (topic ? ' pertaining to the topic of "' + topic + '"' : '') + '. The analysis encompasses ' + stats.total + ' articles collected from ' + stats.sources.length + ' distinct news sources, spanning a temporal range of ' + stats.dateRange + '.');
  bodyText(doc, 'The Malaysian media landscape is diverse, comprising English-language outlets such as The Star and New Straits Times, Bahasa Melayu publications including Utusan Malaysia and Berita Harian, and multilingual digital platforms. Understanding sentiment trends across this heterogeneous media ecosystem provides valuable insights into public discourse and information dissemination patterns.');
  bodyText(doc, 'The primary objectives of this analysis are threefold: (1) to quantify the overall sentiment distribution across the collected articles, (2) to identify temporal and geographic patterns in sentiment expression, and (3) to assess the reliability of automated sentiment classification through confidence score analysis.');
}

// ─── Executive Summary ──────────────────────────────────
function drawExecutiveSummary(doc, stats, abstract) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '2.0', 'Executive Summary');
  bodyText(doc, abstract);

  doc.moveDown(0.5);
  subsectionTitle(doc, '2.1', 'Key Findings');
  var findings = [
    'A total of ' + stats.total + ' articles were analysed, sourced from ' + stats.sources.length + ' distinct news outlets.',
    'Sentiment distribution: ' + stats.posN + ' positive (' + pct(stats.posN, stats.total) + '%), ' + stats.negN + ' negative (' + pct(stats.negN, stats.total) + '%), and ' + stats.neuN + ' neutral (' + pct(stats.neuN, stats.total) + '%).',
    'Geographic coverage spans ' + stats.states.length + ' states and regions across Malaysia.',
    'The average classification confidence score is ' + (stats.avgConf * 100).toFixed(1) + '%, indicating ' + (stats.avgConf >= 0.7 ? 'reliable' : 'moderate') + ' model performance.',
    stats.alerts.length > 0 ? stats.alerts.length + ' articles were flagged as alerts due to strong sentiment signals.' : 'No articles triggered alert thresholds during the analysis period.'
  ];
  findings.forEach(function(f, i) {
    doc.fillColor(C.dark).fontSize(11).font(FONT).text((i + 1) + '.  ' + f, MARGIN_LEFT + 24, doc.y, { width: CONTENT_W - 24, lineGap: 3 });
    doc.moveDown(0.4);
  });
}

// ─── Methodology ────────────────────────────────────────
function drawMethodology(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '3.0', 'Methodology');

  subsectionTitle(doc, '3.1', 'Data Collection');
  bodyText(doc, 'Articles were collected through automated RSS feed parsing and web scraping from major Malaysian news outlets. The corpus includes content from ' + stats.sources.slice(0, 5).map(function(s) { return s.name; }).join(', ') + ', among ' + (stats.sources.length - 5) + ' other sources. Each article record includes the headline, full text content, publication date, source attribution, and any available metadata such as author information and article categories.');

  subsectionTitle(doc, '3.2', 'Sentiment Classification');
  bodyText(doc, 'The classification pipeline employs a dual-model architecture. The primary classifier is Mesolitica NanoT5, a transformer model specifically fine-tuned for Bahasa Melayu text analysis. This is supplemented by GPT-4o-mini, which provides cross-validation and handles English-language content. Each article receives a three-tier classification (Positive, Negative, or Neutral) along with a confidence score ranging from 0 to 1. Where the two models disagree, the classification with the higher confidence score is adopted.');

  subsectionTitle(doc, '3.3', 'Geographic Classification');
  bodyText(doc, 'Geographic attribution is performed using named entity recognition (NER) to identify Malaysian states, cities, and regions mentioned within article content. Articles are assigned to their primary geographic focus rather than publication location. This approach captures the spatial dimension of news coverage, enabling regional sentiment analysis across Malaysia\u2019s thirteen states and three federal territories.');
}

// ─── Sentiment Breakdown ────────────────────────────────
function drawSentimentBreakdown(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '4.1', 'Sentiment Distribution');
  bodyText(doc, 'Table 1 presents the overall sentiment distribution across all ' + stats.total + ' articles in the dataset. The analysis reveals ' + (stats.posN >= stats.negN && stats.posN >= stats.neuN ? 'a predominantly positive sentiment profile' : stats.negN >= stats.posN && stats.negN >= stats.neuN ? 'a predominantly negative sentiment profile' : 'a balanced sentiment profile') + ' with notable variation across categories.');

  doc.moveDown(0.5);
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 1: Overall Sentiment Distribution', MARGIN_LEFT);
  doc.moveDown(0.3);
  drawTable(doc,
    ['Sentiment', 'Count', 'Percentage'],
    [
      [{ text: 'Positive', color: C.pos }, String(stats.posN), pct(stats.posN, stats.total) + '%'],
      [{ text: 'Negative', color: C.neg }, String(stats.negN), pct(stats.negN, stats.total) + '%'],
      [{ text: 'Neutral', color: C.neu }, String(stats.neuN), pct(stats.neuN, stats.total) + '%'],
      [{ text: 'Total', color: C.black }, String(stats.total), '100%'],
    ],
    [180, 135, 136]
  );

  checkPage(doc, 120);
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Figure 1: Sentiment Distribution', MARGIN_LEFT);
  doc.moveDown(0.5);
  drawBar(doc, 'Positive', stats.posN, stats.total, C.pos, MARGIN_LEFT + 100, 300);
  drawBar(doc, 'Negative', stats.negN, stats.total, C.neg, MARGIN_LEFT + 100, 300);
  drawBar(doc, 'Neutral', stats.neuN, stats.total, C.neu, MARGIN_LEFT + 100, 300);
}

// ─── Source Analysis ────────────────────────────────────
function drawSourceAnalysis(doc, stats) {
  var topic = stats.topic;
  checkPage(doc, 200);
  doc.moveDown(0.5);
  subsectionTitle(doc, '4.2', 'Source Analysis');
  bodyText(doc, 'The dataset encompasses ' + stats.sources.length + ' distinct news sources. Table 2 lists the top contributors by article volume. Source diversity is a critical factor in ensuring representativeness of the sentiment analysis, as concentration from a single outlet may introduce editorial bias.');

  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 2: Top News Sources by Article Volume', MARGIN_LEFT);
  doc.moveDown(0.3);
  var srcRows = stats.sources.slice(0, 12).map(function(s) {
    return [s.name, String(s.n), { text: String(s.p), color: C.pos }, { text: String(s.ng), color: C.neg }, { text: String(s.nt), color: C.neu }];
  });
  drawTable(doc, ['Source', 'Total', 'Positive', 'Negative', 'Neutral'], srcRows, [160, 60, 77, 77, 77]);
}

// ─── Geographic Coverage ────────────────────────────────
function drawGeographicCoverage(doc, stats) {
  checkPage(doc, 180);
  subsectionTitle(doc, '4.3', 'Geographic Coverage');
  bodyText(doc, 'Table 3 presents the geographic distribution of articles. The concentration of coverage in certain states reflects both population density and the occurrence of newsworthy events in those regions.');

  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 3: Geographic Distribution', MARGIN_LEFT);
  doc.moveDown(0.3);
  var stRows = stats.states.slice(0, 14).map(function(e) {
    return [e[0], String(e[1].n), { text: String(e[1].p), color: C.pos }, { text: String(e[1].ng), color: C.neg }, { text: String(e[1].nt), color: C.neu }];
  });
  drawTable(doc, ['State/Region', 'Total', 'Positive', 'Negative', 'Neutral'], stRows, [160, 60, 77, 77, 77]);
}

// ─── Temporal Analysis ──────────────────────────────────
function drawTemporalAnalysis(doc, stats) {
  if (stats.dates.length > 1) {
    checkPage(doc, 180);
    subsectionTitle(doc, '4.4', 'Temporal Analysis');
    bodyText(doc, 'Table 4 shows the daily sentiment distribution across the ' + stats.dates.length + '-day analysis period from ' + stats.dates[0][0] + ' to ' + stats.dates[stats.dates.length - 1][0] + '. Temporal patterns may reflect the lifecycle of news events, with initial negative reporting often followed by neutral or positive follow-up coverage.');

    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 4: Daily Sentiment Trend', MARGIN_LEFT);
    doc.moveDown(0.3);
    var dtRows = stats.dates.map(function(e) {
      return [e[0], String(e[1].n), { text: String(e[1].p), color: C.pos }, { text: String(e[1].ng), color: C.neg }, { text: String(e[1].nt), color: C.neu }];
    });
    drawTable(doc, ['Date', 'Total', 'Positive', 'Negative', 'Neutral'], dtRows, [120, 60, 90, 90, 91]);
  }
}

// ─── Confidence Analysis ────────────────────────────────
function drawConfidenceAnalysis(doc, stats) {
  checkPage(doc, 150);
  subsectionTitle(doc, '4.5', 'Classification Confidence');
  bodyText(doc, 'The classifier assigns a confidence score between 0 and 1 to each classification. Higher scores indicate greater certainty in the assigned sentiment label. Table 5 summarises the confidence distribution across three tiers.');

  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 5: Confidence Score Distribution', MARGIN_LEFT);
  doc.moveDown(0.3);
  drawTable(doc,
    ['Confidence Tier', 'Count', 'Percentage'],
    [
      ['High (0.8 \u2013 1.0)', String(stats.hiConf), pct(stats.hiConf, stats.total) + '%'],
      ['Medium (0.5 \u2013 0.8)', String(stats.medConf), pct(stats.medConf, stats.total) + '%'],
      ['Low (0.0 \u2013 0.5)', String(stats.loConf), pct(stats.loConf, stats.total) + '%'],
    ],
    [200, 125, 126]
  );
}

// ─── Topic Categories ───────────────────────────────────
function drawTopicCategories(doc, stats) {
  if (stats.cats.length > 0) {
    checkPage(doc, 150);
    subsectionTitle(doc, '4.6', 'Topic Categories');
    bodyText(doc, 'Table 6 lists the topic categories identified through content analysis. Categories are assigned based on keyword extraction and contextual analysis of article content.');

    doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 6: Topic Categories', MARGIN_LEFT);
    doc.moveDown(0.3);
    var catRows = stats.cats.slice(0, 10).map(function(e) {
      return [e[0], String(e[1]), pct(e[1], stats.total) + '%'];
    });
    drawTable(doc, ['Category', 'Count', 'Percentage'], catRows, [200, 125, 126]);
  }
}

// ─── Key Findings (standalone section) ──────────────────
function drawKeyFindings(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '5.0', 'Key Findings');

  var findings = [
    'A total of ' + stats.total + ' articles were analysed, sourced from ' + stats.sources.length + ' distinct news outlets.',
    'Sentiment distribution: ' + stats.posN + ' positive (' + pct(stats.posN, stats.total) + '%), ' + stats.negN + ' negative (' + pct(stats.negN, stats.total) + '%), and ' + stats.neuN + ' neutral (' + pct(stats.neuN, stats.total) + '%).',
    'Geographic coverage spans ' + stats.states.length + ' states and regions across Malaysia.',
    'The average classification confidence score is ' + (stats.avgConf * 100).toFixed(1) + '%, indicating ' + (stats.avgConf >= 0.7 ? 'reliable' : 'moderate') + ' model performance.',
    stats.alerts.length > 0 ? stats.alerts.length + ' articles were flagged as alerts due to strong sentiment signals.' : 'No articles triggered alert thresholds during the analysis period.',
    'The dominant sentiment category is ' + (stats.posN >= stats.negN && stats.posN >= stats.neuN ? 'Positive' : stats.negN >= stats.posN && stats.negN >= stats.neuN ? 'Negative' : 'Neutral') + ', accounting for ' + pct(Math.max(stats.posN, stats.negN, stats.neuN), stats.total) + '% of all articles.',
    'Source diversity index: ' + stats.sources.length + ' unique sources across ' + stats.states.length + ' geographic regions, providing a representative cross-section of Malaysian media coverage.'
  ];
  findings.forEach(function(f, i) {
    doc.fillColor(C.dark).fontSize(11).font(FONT).text((i + 1) + '.  ' + f, MARGIN_LEFT + 24, doc.y, { width: CONTENT_W - 24, lineGap: 3 });
    doc.moveDown(0.4);
  });
}

// ─── Top Stories ────────────────────────────────────────
function drawTopStories(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '6.0', 'Top Stories');
  bodyText(doc, 'The following articles represent the highest-impact stories within the analysed corpus, ranked by a composite score of impact and engagement metrics.');

  // Sort by impactScore then viewCount
  var topArticles = stats.articles.slice().sort(function(a, b) {
    var aScore = (a.impactScore || 0) * 10 + (a.viewCount || 0);
    var bScore = (b.impactScore || 0) * 10 + (b.viewCount || 0);
    return bScore - aScore;
  }).slice(0, 10);

  if (topArticles.length > 0) {
    checkPage(doc, 60);
    var topRows = topArticles.map(function(a, i) {
      return [
        String(i + 1),
        { text: truncate(a.title, 55), color: C.dark },
        a.source || '-',
        { text: a.sentiment, color: sentimentColor(a.sentiment) },
        String(a.impactScore || 0)
      ];
    });
    drawTable(doc, ['#', 'Headline', 'Source', 'Sentiment', 'Impact'], topRows, [30, 200, 90, 70, 61]);
  }
}

// ─── Recommendations ────────────────────────────────────
function drawRecommendations(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '7.0', 'Recommendations');

  var recs = [];
  // Data-driven recommendations
  if (stats.total < 50) {
    recs.push('Expand the data collection pipeline to include additional news sources and a broader temporal window to improve the statistical reliability of sentiment trends.');
  }
  if (stats.avgConf < 0.6) {
    recs.push('The average classification confidence of ' + (stats.avgConf * 100).toFixed(1) + '% suggests room for model improvement. Consider retraining the classifier with additional Malaysian news corpora or incorporating human-in-the-loop validation for low-confidence classifications.');
  }
  if (stats.negN > stats.posN) {
    recs.push('The prevalence of negative sentiment (' + pct(stats.negN, stats.total) + '%) warrants further investigation into the underlying causes. Stakeholders should consider whether this reflects genuine negative developments or potential bias in source selection.');
  }
  if (stats.posN > stats.negN * 2) {
    recs.push('The strong positive skew (' + pct(stats.posN, stats.total) + '% positive) should be validated against ground truth. Consider supplementing automated analysis with manual review of a random sample to ensure classifier accuracy.');
  }
  if (stats.states.length < 3) {
    recs.push('Geographic coverage is limited to ' + stats.states.length + ' region(s). Expanding data collection to cover all Malaysian states and federal territories would enable more comprehensive regional analysis.');
  }
  if (stats.loConf > stats.total * 0.3) {
    recs.push('A significant proportion (' + pct(stats.loConf, stats.total) + '%) of classifications fall below the 0.5 confidence threshold. Manual review of these articles is recommended before drawing conclusions from the low-confidence segment.');
  }
  // Always add these
  recs.push('Implement real-time sentiment monitoring dashboards to track sentiment shifts as news events unfold, enabling rapid response to emerging narratives.');
  recs.push('Conduct periodic comparative analysis across different time periods to identify long-term sentiment trends and seasonal patterns in Malaysian media coverage.');
  recs.push('Consider expanding the analysis to include social media platforms alongside traditional news sources to capture a more comprehensive view of public discourse.');

  recs.forEach(function(r, i) {
    doc.fillColor(C.dark).fontSize(11).font(FONT).text((i + 1) + '.  ' + r, MARGIN_LEFT + 24, doc.y, { width: CONTENT_W - 24, lineGap: 3 });
    doc.moveDown(0.4);
  });
}

// ─── Article Listing ────────────────────────────────────
function drawArticleListing(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '8.0', 'Article Listing');
  bodyText(doc, 'The following tables present the complete article corpus organised by sentiment category. Each entry includes the article headline, source, publication date, sentiment classification, and confidence score.');

  // Positive articles
  if (stats.posN > 0) {
    checkPage(doc, 60);
    subsectionTitle(doc, '8.1', 'Positive Articles (' + stats.posN + ')');
    var posRows = stats.articles.filter(function(a) { return a.sentiment === 'Positive'; }).slice(0, 20).map(function(a) {
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
  if (stats.negN > 0) {
    checkPage(doc, 60);
    subsectionTitle(doc, '8.2', 'Negative Articles (' + stats.negN + ')');
    var negRows = stats.articles.filter(function(a) { return a.sentiment === 'Negative'; }).slice(0, 20).map(function(a) {
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
  if (stats.neuN > 0) {
    checkPage(doc, 60);
    subsectionTitle(doc, '8.3', 'Neutral Articles (' + stats.neuN + ')');
    var neuRows = stats.articles.filter(function(a) { return a.sentiment === 'Neutral'; }).slice(0, 20).map(function(a) {
      return [
        { text: truncate(a.title, 65), color: C.dark },
        a.source || '-',
        new Date(a.publishedAt).toLocaleDateString('en-MY'),
        { text: ((a.confidence || 0) * 100).toFixed(0) + '%', color: C.neu }
      ];
    });
    drawTable(doc, ['Headline', 'Source', 'Date', 'Conf.'], neuRows, [230, 90, 70, 61]);
  }
}

// ─── Appendices ─────────────────────────────────────────
function drawAppendices(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '9.0', 'Appendices');

  subsectionTitle(doc, '9.1', 'Technical Details');
  bodyText(doc, 'The sentiment analysis pipeline consists of the following stages: (1) Data ingestion via RSS parsing and web scraping, (2) text preprocessing including language detection and tokenisation, (3) dual-model sentiment classification using Mesolitica NanoT5 (primary) and GPT-4o-mini (secondary), (4) geographic entity extraction via NER, and (5) result aggregation and confidence scoring.');

  subsectionTitle(doc, '9.2', 'Model Specifications');
  bodyText(doc, 'Mesolitica NanoT5 is a T5-based transformer model fine-tuned on Malaysian text corpora, achieving state-of-the-art performance on Bahasa Melayu sentiment benchmarks. GPT-4o-mini serves as a cross-validation layer, providing classifications for English-language content and flagging discrepancies with the primary model.');

  subsectionTitle(doc, '9.3', 'Data Dictionary');
  var ddRows = [
    ['sentiment', 'String', 'Final sentiment classification (Positive/Negative/Neutral)'],
    ['confidence', 'Number (0-1)', 'Classification confidence score'],
    ['source', 'String', 'News outlet name'],
    ['publishedAt', 'Date', 'Article publication timestamp'],
    ['stateLocation', 'String', 'Geographic region of primary focus'],
    ['categories', 'Array[String]', 'Topic category tags'],
    ['impactScore', 'Number (0-100)', 'Composite impact metric'],
    ['viewCount', 'Number', 'Article view/engagement count'],
  ];
  drawTable(doc, ['Field', 'Type', 'Description'], ddRows, [100, 100, 251]);
}

// ─── Conclusion ─────────────────────────────────────────
function drawConclusion(doc, stats) {
  var topic = stats.topic;
  drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
  sectionTitle(doc, '10.0', 'Conclusion');
  bodyText(doc, 'This sentiment analysis of ' + stats.total + ' Malaysian news articles' + (topic ? ' related to "' + topic + '"' : '') + ' reveals ' + (stats.posN >= stats.negN && stats.posN >= stats.neuN ? 'a predominantly positive media narrative' : stats.negN >= stats.posN && stats.negN >= stats.neuN ? 'a predominantly negative media narrative' : 'a balanced media narrative') + ' during the observed period of ' + stats.dateRange + '.');
  bodyText(doc, 'The analysis demonstrates the viability of automated sentiment classification for Malaysian news content, achieving an average confidence score of ' + (stats.avgConf * 100).toFixed(1) + '%. The dual-model approach combining domain-specific (Mesolitica NanoT5) and general-purpose (GPT-4o-mini) classifiers provides robustness against the linguistic diversity characteristic of Malaysian media.');
  bodyText(doc, 'The geographic distribution of coverage reveals ' + (stats.states.length > 5 ? 'broad national coverage with concentration in key states' : 'focused coverage in ' + stats.states.length + ' primary regions') + ', while the temporal analysis across ' + stats.dates.length + ' days captures the dynamic nature of media sentiment. These findings contribute to the growing body of research on automated media monitoring in multilingual Southeast Asian contexts.');
}

// ══════════════════════════════════════════════════════════
//  COMPARISON-SPECIFIC SECTIONS
// ══════════════════════════════════════════════════════════

// ─── Comparison Overview ────────────────────────────────
function drawComparisonOverview(doc, statsA, statsB) {
  var topicA = statsA.topic || 'Topic A';
  var topicB = statsB.topic || 'Topic B';
  drawHeader(doc, 'Comparative Sentiment Analysis \u2014 ' + topicA + ' vs ' + topicB);
  sectionTitle(doc, '1.0', 'Comparison Overview');
  bodyText(doc, 'This report presents a comparative sentiment analysis between two topics of interest in Malaysian news media: "' + topicA + '" and "' + topicB + '". The analysis draws upon ' + statsA.total + ' articles for ' + topicA + ' and ' + statsB.total + ' articles for ' + topicB + ', enabling a systematic comparison of media narratives, sentiment distributions, and coverage patterns.');
  bodyText(doc, 'Comparative analysis is essential for understanding how different topics are framed within the same media ecosystem. Variations in sentiment distribution, source coverage, and geographic focus may reflect underlying differences in public interest, editorial priorities, or the nature of events associated with each topic.');

  // Summary comparison table
  doc.moveDown(0.5);
  subsectionTitle(doc, '1.1', 'Summary Comparison');
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Table 1: Summary Metrics Comparison', MARGIN_LEFT);
  doc.moveDown(0.3);
  var summaryRows = [
    ['Total Articles', String(statsA.total), String(statsB.total)],
    [{ text: 'Positive', color: C.pos }, statsA.posN + ' (' + pct(statsA.posN, statsA.total) + '%)', statsB.posN + ' (' + pct(statsB.posN, statsB.total) + '%)'],
    [{ text: 'Negative', color: C.neg }, statsA.negN + ' (' + pct(statsA.negN, statsA.total) + '%)', statsB.negN + ' (' + pct(statsB.negN, statsB.total) + '%)'],
    [{ text: 'Neutral', color: C.neu }, statsA.neuN + ' (' + pct(statsA.neuN, statsA.total) + '%)', statsB.neuN + ' (' + pct(statsB.neuN, statsB.total) + '%)'],
    ['Sources', String(statsA.sources.length), String(statsB.sources.length)],
    ['Regions', String(statsA.states.length), String(statsB.states.length)],
    ['Avg Confidence', (statsA.avgConf * 100).toFixed(1) + '%', (statsB.avgConf * 100).toFixed(1) + '%'],
    ['Alerts', String(statsA.alerts.length), String(statsB.alerts.length)],
  ];
  drawTable(doc, ['Metric', topicA, topicB], summaryRows, [160, 145, 146]);
}

// ─── Topic Analysis (used for both Topic A and B) ──────
function drawTopicAnalysis(doc, stats, label) {
  var topic = stats.topic || label;
  drawHeader(doc, 'Comparative Sentiment Analysis \u2014 ' + label);
  sectionTitle(doc, label === 'Topic A' ? '2.0' : '3.0', label + ' Analysis: ' + topic);

  bodyText(doc, 'A total of ' + stats.total + ' articles were collected for the topic "' + topic + '" from ' + stats.sources.length + ' sources across ' + stats.states.length + ' geographic regions. The analysis period spans ' + stats.dateRange + '.');

  // Sentiment breakdown
  subsectionTitle(doc, label === 'Topic A' ? '2.1' : '3.1', 'Sentiment Distribution');
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Sentiment Breakdown for ' + topic, MARGIN_LEFT);
  doc.moveDown(0.3);
  drawBar(doc, 'Positive', stats.posN, stats.total, C.pos, MARGIN_LEFT + 100, 300);
  drawBar(doc, 'Negative', stats.negN, stats.total, C.neg, MARGIN_LEFT + 100, 300);
  drawBar(doc, 'Neutral', stats.neuN, stats.total, C.neu, MARGIN_LEFT + 100, 300);

  // Top sources
  subsectionTitle(doc, label === 'Topic A' ? '2.2' : '3.2', 'Top Sources');
  var srcRows = stats.sources.slice(0, 8).map(function(s) {
    return [s.name, String(s.n), { text: String(s.p), color: C.pos }, { text: String(s.ng), color: C.neg }, { text: String(s.nt), color: C.neu }];
  });
  drawTable(doc, ['Source', 'Total', 'Positive', 'Negative', 'Neutral'], srcRows, [160, 60, 77, 77, 77]);

  // Geographic distribution
  subsectionTitle(doc, label === 'Topic A' ? '2.3' : '3.3', 'Geographic Distribution');
  var stRows = stats.states.slice(0, 10).map(function(e) {
    return [e[0], String(e[1].n), { text: String(e[1].p), color: C.pos }, { text: String(e[1].ng), color: C.neg }, { text: String(e[1].nt), color: C.neu }];
  });
  drawTable(doc, ['State/Region', 'Total', 'Positive', 'Negative', 'Neutral'], stRows, [160, 60, 77, 77, 77]);

  // Top articles for this topic
  subsectionTitle(doc, label === 'Topic A' ? '2.4' : '3.4', 'Notable Articles');
  var topArticles = stats.articles.slice().sort(function(a, b) {
    return (b.impactScore || 0) - (a.impactScore || 0);
  }).slice(0, 5);
  if (topArticles.length > 0) {
    var topRows = topArticles.map(function(a) {
      return [
        { text: truncate(a.title, 60), color: C.dark },
        a.source || '-',
        { text: a.sentiment, color: sentimentColor(a.sentiment) }
      ];
    });
    drawTable(doc, ['Headline', 'Source', 'Sentiment'], topRows, [250, 110, 91]);
  }
}

// ─── Side-by-Side Metrics ──────────────────────────────
function drawSideBySideMetrics(doc, statsA, statsB) {
  var topicA = statsA.topic || 'Topic A';
  var topicB = statsB.topic || 'Topic B';
  drawHeader(doc, 'Comparative Sentiment Analysis \u2014 ' + topicA + ' vs ' + topicB);
  sectionTitle(doc, '4.0', 'Side-by-Side Metrics');

  bodyText(doc, 'This section presents a direct visual comparison of key metrics between the two topics, enabling rapid identification of divergences in media coverage patterns.');

  // Sentiment comparison bars
  subsectionTitle(doc, '4.1', 'Sentiment Comparison');
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Positive Sentiment', MARGIN_LEFT);
  doc.moveDown(0.3);
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(topicA + ': ' + pct(statsA.posN, statsA.total) + '%', MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  (' + statsA.posN + ' articles)', { continued: false });
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(topicB + ': ' + pct(statsB.posN, statsB.total) + '%', MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  (' + statsB.posN + ' articles)', { continued: false });
  doc.moveDown(0.5);

  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Negative Sentiment', MARGIN_LEFT);
  doc.moveDown(0.3);
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(topicA + ': ' + pct(statsA.negN, statsA.total) + '%', MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  (' + statsA.negN + ' articles)', { continued: false });
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(topicB + ': ' + pct(statsB.negN, statsB.total) + '%', MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  (' + statsB.negN + ' articles)', { continued: false });
  doc.moveDown(0.5);

  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Neutral Sentiment', MARGIN_LEFT);
  doc.moveDown(0.3);
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(topicA + ': ' + pct(statsA.neuN, statsA.total) + '%', MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  (' + statsA.neuN + ' articles)', { continued: false });
  doc.fillColor(C.dark).fontSize(10).font(FONT_BOLD).text(topicB + ': ' + pct(statsB.neuN, statsB.total) + '%', MARGIN_LEFT, doc.y, { continued: true, width: CONTENT_W });
  doc.fillColor(C.mid).font(FONT).text('  (' + statsB.neuN + ' articles)', { continued: false });
  doc.moveDown(0.8);

  // Source overlap analysis
  subsectionTitle(doc, '4.2', 'Source Coverage Comparison');
  var srcNamesA = {};
  statsA.sources.forEach(function(s) { srcNamesA[s.name] = s.n; });
  var srcNamesB = {};
  statsB.sources.forEach(function(s) { srcNamesB[s.name] = s.n; });
  var allSources = {};
  Object.keys(srcNamesA).forEach(function(k) { allSources[k] = true; });
  Object.keys(srcNamesB).forEach(function(k) { allSources[k] = true; });
  var overlap = Object.keys(allSources).filter(function(k) { return srcNamesA[k] && srcNamesB[k]; });

  bodyText(doc, 'Of the ' + statsA.sources.length + ' sources covering ' + topicA + ' and ' + statsB.sources.length + ' sources covering ' + topicB + ', ' + overlap.length + ' source(s) appear in both datasets. ' + (overlap.length > 0 ? 'Shared sources include: ' + overlap.slice(0, 5).join(', ') + '.' : 'There is no overlap in source coverage between the two topics.'));

  // Geographic overlap
  subsectionTitle(doc, '4.3', 'Geographic Coverage Comparison');
  var stNamesA = {};
  statsA.states.forEach(function(e) { stNamesA[e[0]] = e[1].n; });
  var stNamesB = {};
  statsB.states.forEach(function(e) { stNamesB[e[0]] = e[1].n; });
  var allStates = {};
  Object.keys(stNamesA).forEach(function(k) { allStates[k] = true; });
  Object.keys(stNamesB).forEach(function(k) { allStates[k] = true; });
  var stOverlap = Object.keys(allStates).filter(function(k) { return stNamesA[k] && stNamesB[k]; });

  bodyText(doc, 'Geographic coverage spans ' + statsA.states.length + ' regions for ' + topicA + ' and ' + statsB.states.length + ' regions for ' + topicB + '. ' + stOverlap.length + ' region(s) have coverage for both topics. ' + (stOverlap.length > 0 ? 'Common regions include: ' + stOverlap.slice(0, 5).join(', ') + '.' : ''));

  // Confidence comparison
  subsectionTitle(doc, '4.4', 'Classification Confidence Comparison');
  doc.fillColor(C.mid).fontSize(10).font(FONT_ITALIC).text('Confidence Distribution Comparison', MARGIN_LEFT);
  doc.moveDown(0.3);
  var confRows = [
    ['High (0.8 \u2013 1.0)', statsA.hiConf + ' (' + pct(statsA.hiConf, statsA.total) + '%)', statsB.hiConf + ' (' + pct(statsB.hiConf, statsB.total) + '%)'],
    ['Medium (0.5 \u2013 0.8)', statsA.medConf + ' (' + pct(statsA.medConf, statsA.total) + '%)', statsB.medConf + ' (' + pct(statsB.medConf, statsB.total) + '%)'],
    ['Low (0.0 \u2013 0.5)', statsA.loConf + ' (' + pct(statsA.loConf, statsA.total) + '%)', statsB.loConf + ' (' + pct(statsB.loConf, statsB.total) + '%)'],
    ['Average', (statsA.avgConf * 100).toFixed(1) + '%', (statsB.avgConf * 100).toFixed(1) + '%'],
  ];
  drawTable(doc, ['Confidence Tier', topicA, topicB], confRows, [160, 145, 146]);
}

// ─── Key Differences ────────────────────────────────────
function drawKeyDifferences(doc, statsA, statsB) {
  var topicA = statsA.topic || 'Topic A';
  var topicB = statsB.topic || 'Topic B';
  drawHeader(doc, 'Comparative Sentiment Analysis \u2014 ' + topicA + ' vs ' + topicB);
  sectionTitle(doc, '5.0', 'Key Differences');

  bodyText(doc, 'The following analysis highlights the principal divergences observed between the two topics across multiple dimensions of the sentiment analysis.');

  var diffs = [];
  // Volume difference
  var volDiff = Math.abs(statsA.total - statsB.total);
  if (volDiff > 5) {
    var higher = statsA.total > statsB.total ? topicA : topicB;
    diffs.push('Volume: "' + higher + '" received ' + volDiff + ' more articles (' + Math.max(statsA.total, statsB.total) + ' vs ' + Math.min(statsA.total, statsB.total) + '), indicating greater media attention.');
  }

  // Sentiment ratio differences
  var posRatioA = pct(statsA.posN, statsA.total);
  var posRatioB = pct(statsB.posN, statsB.total);
  if (Math.abs(posRatioA - posRatioB) > 10) {
    var morePos = posRatioA > posRatioB ? topicA : topicB;
    diffs.push('Positive sentiment: "' + morePos + '" has a higher proportion of positive coverage (' + Math.max(posRatioA, posRatioB) + '% vs ' + Math.min(posRatioA, posRatioB) + '%).');
  }

  var negRatioA = pct(statsA.negN, statsA.total);
  var negRatioB = pct(statsB.negN, statsB.total);
  if (Math.abs(negRatioA - negRatioB) > 10) {
    var moreNeg = negRatioA > negRatioB ? topicA : topicB;
    diffs.push('Negative sentiment: "' + moreNeg + '" attracts more negative coverage (' + Math.max(negRatioA, negRatioB) + '% vs ' + Math.min(negRatioA, negRatioB) + '%).');
  }

  // Confidence difference
  var confDiff = Math.abs(statsA.avgConf - statsB.avgConf);
  if (confDiff > 0.05) {
    var moreConf = statsA.avgConf > statsB.avgConf ? topicA : topicB;
    diffs.push('Classification confidence: The classifier achieves higher confidence for "' + moreConf + '" (' + (Math.max(statsA.avgConf, statsB.avgConf) * 100).toFixed(1) + '% vs ' + (Math.min(statsA.avgConf, statsB.avgConf) * 100).toFixed(1) + '%), suggesting clearer linguistic signals.');
  }

  // Source diversity
  if (Math.abs(statsA.sources.length - statsB.sources.length) > 2) {
    var moreSrc = statsA.sources.length > statsB.sources.length ? topicA : topicB;
    diffs.push('Source diversity: "' + moreSrc + '" is covered by more distinct sources (' + Math.max(statsA.sources.length, statsB.sources.length) + ' vs ' + Math.min(statsA.sources.length, statsB.sources.length) + '), indicating broader media interest.');
  }

  // Alert difference
  if (statsA.alerts.length !== statsB.alerts.length) {
    var moreAlerts = statsA.alerts.length > statsB.alerts.length ? topicA : topicB;
    diffs.push('Alert volume: "' + moreAlerts + '" generated more alert-flagged articles (' + Math.max(statsA.alerts.length, statsB.alerts.length) + ' vs ' + Math.min(statsA.alerts.length, statsB.alerts.length) + '), indicating more extreme sentiment events.');
  }

  if (diffs.length === 0) {
    diffs.push('The two topics show broadly similar sentiment profiles and coverage patterns, with no major divergences exceeding threshold criteria.');
  }

  diffs.forEach(function(d, i) {
    doc.fillColor(C.dark).fontSize(11).font(FONT).text((i + 1) + '.  ' + d, MARGIN_LEFT + 24, doc.y, { width: CONTENT_W - 24, lineGap: 3 });
    doc.moveDown(0.4);
  });
}

// ══════════════════════════════════════════════════════════
//  TEMPLATE SECTION DEFINITIONS
// ══════════════════════════════════════════════════════════

var SECTION_MAP = {
  'Title Page': 'titlePage',
  'Executive Summary': 'executiveSummary',
  'Abstract': 'abstract',
  'Introduction': 'introduction',
  'Methodology': 'methodology',
  'Sentiment Breakdown': 'sentimentBreakdown',
  'Source Analysis': 'sourceAnalysis',
  'Geographic Coverage': 'geographicCoverage',
  'Temporal Analysis': 'temporalAnalysis',
  'Confidence Analysis': 'confidenceAnalysis',
  'Topic Categories': 'topicCategories',
  'Key Findings': 'keyFindings',
  'Top Stories': 'topStories',
  'Recommendations': 'recommendations',
  'Article Listing': 'articleListing',
  'Appendices': 'appendices',
  'Conclusions': 'conclusion',
  // Comparison-specific
  'Comparison Overview': 'comparisonOverview',
  'Topic A Analysis': 'topicAAnalysis',
  'Topic B Analysis': 'topicBAnalysis',
  'Side-by-Side Metrics': 'sideBySideMetrics',
  'Key Differences': 'keyDifferences',
};

// ══════════════════════════════════════════════════════════
//  QUERY HELPER
// ══════════════════════════════════════════════════════════
async function fetchArticles(topic, dateFrom, dateTo) {
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
  return articles;
}

// ══════════════════════════════════════════════════════════
//  SECTION DRAWING DISPATCHER
// ══════════════════════════════════════════════════════════
function drawSection(doc, sectionKey, stats, abstract, comparisonData) {
  switch (sectionKey) {
    case 'titlePage':
      drawTitlePage(doc, stats);
      break;
    case 'executiveSummary':
      drawExecutiveSummary(doc, stats, abstract);
      break;
    case 'abstract':
      drawAbstract(doc, stats, abstract);
      break;
    case 'introduction':
      drawIntroduction(doc, stats);
      break;
    case 'methodology':
      drawMethodology(doc, stats);
      break;
    case 'sentimentBreakdown':
      drawSentimentBreakdown(doc, stats);
      break;
    case 'sourceAnalysis':
      drawSourceAnalysis(doc, stats);
      break;
    case 'geographicCoverage':
      drawGeographicCoverage(doc, stats);
      break;
    case 'temporalAnalysis':
      drawTemporalAnalysis(doc, stats);
      break;
    case 'confidenceAnalysis':
      drawConfidenceAnalysis(doc, stats);
      break;
    case 'topicCategories':
      drawTopicCategories(doc, stats);
      break;
    case 'keyFindings':
      drawKeyFindings(doc, stats);
      break;
    case 'topStories':
      drawTopStories(doc, stats);
      break;
    case 'recommendations':
      drawRecommendations(doc, stats);
      break;
    case 'articleListing':
      drawArticleListing(doc, stats);
      break;
    case 'appendices':
      drawAppendices(doc, stats);
      break;
    case 'conclusion':
      drawConclusion(doc, stats);
      break;
    // Comparison-specific sections
    case 'comparisonOverview':
      if (comparisonData) drawComparisonOverview(doc, comparisonData.statsA, comparisonData.statsB);
      break;
    case 'topicAAnalysis':
      if (comparisonData) drawTopicAnalysis(doc, comparisonData.statsA, 'Topic A');
      break;
    case 'topicBAnalysis':
      if (comparisonData) drawTopicAnalysis(doc, comparisonData.statsB, 'Topic B');
      break;
    case 'sideBySideMetrics':
      if (comparisonData) drawSideBySideMetrics(doc, comparisonData.statsA, comparisonData.statsB);
      break;
    case 'keyDifferences':
      if (comparisonData) drawKeyDifferences(doc, comparisonData.statsA, comparisonData.statsB);
      break;
    default:
      // Unknown section, skip
      break;
  }
}

// ══════════════════════════════════════════════════════════
//  MAIN GENERATOR
// ══════════════════════════════════════════════════════════
var generatePDFReport = async function(req, res) {
  try {
    var topic = req.body.topic;
    var dateFrom = req.body.dateFrom;
    var dateTo = req.body.dateTo;
    var template = req.body.template || 'detailed';
    var requestedSections = req.body.sections || [];

    // ── Fetch articles ──────────────────────────────────
    var articles = await fetchArticles(topic, dateFrom, dateTo);

    // ── Compute stats ───────────────────────────────────
    var stats = computeStats(articles, topic);

    // ── AI Abstract (generate once, reuse) ──────────────
    var abstract = await generateAbstract(topic, stats);

    // ── PDF setup ───────────────────────────────────────
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

    // ══════════════════════════════════════════════════════
    //  TEMPLATE ROUTING
    // ══════════════════════════════════════════════════════

    if (template === 'executive') {
      // ── Executive: Title + Key Findings + Sentiment + Top Stories + Recommendations (3-4 pages) ──
      drawSection(doc, 'titlePage', stats, abstract);
      addPage(doc);
      _isRoman = false;
      _pageNum = 1;
      drawSection(doc, 'keyFindings', stats, abstract);
      addPage(doc);
      drawSection(doc, 'sentimentBreakdown', stats, abstract);
      addPage(doc);
      drawSection(doc, 'topStories', stats, abstract);
      addPage(doc);
      drawSection(doc, 'recommendations', stats, abstract);

    } else if (template === 'comparison') {
      // ── Comparison: needs two topics ──────────────────
      var topicB = req.body.topicB;
      if (!topicB) {
        doc.end();
        if (!res.headersSent) {
          return res.status(400).json({ error: 'Comparison report requires a second topic (topicB)' });
        }
        return;
      }

      var articlesB = await fetchArticles(topicB, dateFrom, dateTo);
      var statsB = computeStats(articlesB, topicB);

      var comparisonData = { statsA: stats, statsB: statsB };

      // Comparison template sections
      var compSections = ['comparisonOverview', 'topicAAnalysis', 'topicBAnalysis', 'sideBySideMetrics', 'keyDifferences', 'conclusion'];

      // Draw title page first
      drawTitlePage(doc, { topic: stats.topic + ' vs ' + topicB, dateRange: stats.dateRange, total: stats.total + statsB.total, sources: stats.sources, states: stats.states });
      addPage(doc);
      _isRoman = false;
      _pageNum = 1;

      compSections.forEach(function(key, i) {
        if (i > 0) addPage(doc);
        drawSection(doc, key, stats, abstract, comparisonData);
      });

    } else if (template === 'custom') {
      // ── Custom: only selected sections, always include title page ──
      var sectionKeys = requestedSections.map(function(name) { return SECTION_MAP[name]; }).filter(Boolean);

      // Always include title page first
      drawSection(doc, 'titlePage', stats, abstract);
      addPage(doc);
      _isRoman = false;
      _pageNum = 1;

      sectionKeys.forEach(function(key) {
        if (key === 'titlePage') return; // already drawn
        addPage(doc);
        drawSection(doc, key, stats, abstract);
      });

    } else {
      // ── Detailed: Full thesis-style report (default) ──
      // Title page
      drawTitlePage(doc, stats);

      // Table of Contents
      addPage(doc);
      _isRoman = true;
      drawTableOfContents(doc, [
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
        ['5.0', 'Key Findings', '7'],
        ['6.0', 'Top Stories', '8'],
        ['7.0', 'Recommendations', '9'],
        ['8.0', 'Article Listing', '10'],
        ['9.0', 'Appendices', '12'],
        ['10.0', 'Conclusion', '13'],
      ]);

      // Abstract
      addPage(doc);
      drawAbstract(doc, stats, abstract);

      // Switch to arabic numerals
      _pageNum = 1;
      _isRoman = false;

      // 1.0 Introduction
      addPage(doc);
      drawIntroduction(doc, stats);

      // 2.0 Executive Summary
      addPage(doc);
      drawExecutiveSummary(doc, stats, abstract);

      // 3.0 Methodology
      addPage(doc);
      drawMethodology(doc, stats);

      // 4.0 Results and Analysis
      addPage(doc);
      drawHeader(doc, 'Sentiment Analysis Report \u2014 ' + (topic || 'All Topics'));
      sectionTitle(doc, '4.0', 'Results and Analysis');
      drawSentimentBreakdown(doc, stats);
      drawSourceAnalysis(doc, stats);
      drawGeographicCoverage(doc, stats);
      drawTemporalAnalysis(doc, stats);
      drawConfidenceAnalysis(doc, stats);
      drawTopicCategories(doc, stats);

      // 5.0 Key Findings
      addPage(doc);
      drawKeyFindings(doc, stats);

      // 6.0 Top Stories
      addPage(doc);
      drawTopStories(doc, stats);

      // 7.0 Recommendations
      addPage(doc);
      drawRecommendations(doc, stats);

      // 8.0 Article Listing
      addPage(doc);
      drawArticleListing(doc, stats);

      // 9.0 Appendices
      addPage(doc);
      drawAppendices(doc, stats);

      // 10.0 Conclusion
      addPage(doc);
      drawConclusion(doc, stats);
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
