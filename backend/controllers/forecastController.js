const Article = require('../models/Article');
const { ensembleForecast } = require('../services/forecastService');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sentimentToScore = (sentiment) => {
  if (sentiment === 'Positive') return 1;
  if (sentiment === 'Negative') return -1;
  return 0;
};

/**
 * GET /api/forecast/:topic?days=14
 * Multi-method ensemble forecast with backtest validation
 */
const getForecast = async (req, res) => {
  try {
    const { topic } = req.params;
    const days = Math.min(parseInt(req.query.days) || 14, 30);
    const historyDays = Math.min(parseInt(req.query.history) || 60, 120);

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historyDays);

    const safeTopic = escapeRegex(topic);
    const articles = await Article.find({
      $or: [
        { topic: { $regex: safeTopic, $options: 'i' } },
        { title: { $regex: safeTopic, $options: 'i' } },
        { description: { $regex: safeTopic, $options: 'i' } },
        { categories: { $regex: safeTopic, $options: 'i' } },
      ],
      publishedAt: { $gte: startDate },
    }).select('sentiment confidence publishedAt createdAt').sort({ publishedAt: 1 });

    if (articles.length < 3) {
      return res.status(200).json({
        historical: [],
        predicted: [],
        confidenceIntervals: [],
        trend: 'Insufficient Data',
        method: 'N/A',
        insight: `Not enough data for "${topic}". Need at least 3 articles in the last ${historyDays} days.`,
        totalArticles: articles.length,
      });
    }

    // Group by date
    const dailyMap = {};
    articles.forEach(article => {
      const articleDate = article.publishedAt || article.createdAt;
      if (!articleDate) return;
      const dateKey = articleDate.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { scores: [], count: 0 };
      dailyMap[dateKey].scores.push(sentimentToScore(article.sentiment));
      dailyMap[dateKey].count++;
    });

    // Build historical array
    const historical = [];
    const sortedDates = Object.keys(dailyMap).sort();
    sortedDates.forEach(date => {
      const avg = dailyMap[date].scores.reduce((a, b) => a + b, 0) / dailyMap[date].scores.length;
      historical.push({
        date,
        sentiment: parseFloat(avg.toFixed(3)),
        articleCount: dailyMap[date].count,
      });
    });

    // Run ensemble forecast
    const forecast = ensembleForecast(historical, days);

    // Build predicted array with dates
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    const predicted = [];
    const confidenceIntervals = [];

    if (!forecast.insufficient) {
      for (let i = 0; i < days; i++) {
        const predDate = new Date(lastDate);
        predDate.setDate(predDate.getDate() + i + 1);
        const dateStr = predDate.toISOString().split('T')[0];

        predicted.push({
          date: dateStr,
          predictedSentiment: forecast.predicted[i],
        });

        confidenceIntervals.push({
          date: dateStr,
          lower: forecast.confidenceIntervals[i].lower,
          upper: forecast.confidenceIntervals[i].upper,
          width: forecast.confidenceIntervals[i].width,
        });
      }
    }

    // Data-driven insight (no LLM needed)
    const insight = generateInsight(topic, historical, forecast, articles.length, historyDays);

    res.json({
      historical,
      predicted,
      confidenceIntervals,
      trend: forecast.trend || 'Insufficient Data',
      method: forecast.method || 'N/A',
      weights: forecast.weights || {},
      seasonality: forecast.seasonality || 'none',
      residualStd: forecast.residualStd || 0,
      backtest: forecast.backtest || null,
      models: forecast.models || [],
      insight,
      totalArticles: articles.length,
      daysAnalyzed: historyDays,
      dataPoints: historical.length,
    });
  } catch (err) {
    console.error('[Forecast] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
};

/**
 * GET /api/forecast/backtest/:topic
 * Run walk-forward backtest only (no prediction)
 */
const getBacktest = async (req, res) => {
  try {
    const { topic } = req.params;
    const historyDays = Math.min(parseInt(req.query.history) || 90, 120);

    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historyDays);

    const safeTopic = escapeRegex(topic);
    const articles = await Article.find({
      $or: [
        { topic: { $regex: safeTopic, $options: 'i' } },
        { title: { $regex: safeTopic, $options: 'i' } },
      ],
      publishedAt: { $gte: startDate },
    }).select('sentiment publishedAt createdAt').sort({ publishedAt: 1 });

    const dailyMap = {};
    articles.forEach(article => {
      const d = article.publishedAt || article.createdAt;
      if (!d) return;
      const key = d.toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { scores: [], count: 0 };
      dailyMap[key].scores.push(sentimentToScore(article.sentiment));
      dailyMap[key].count++;
    });

    const historical = Object.keys(dailyMap).sort().map(date => ({
      date,
      sentiment: parseFloat((dailyMap[date].scores.reduce((a, b) => a + b, 0) / dailyMap[date].scores.length).toFixed(3)),
      articleCount: dailyMap[date].count,
    }));

    const forecast = ensembleForecast(historical, 1);

    res.json({
      topic,
      dataPoints: historical.length,
      totalArticles: articles.length,
      backtest: forecast.backtest || null,
      method: forecast.method,
      weights: forecast.weights,
      seasonality: forecast.seasonality,
      residualStd: forecast.residualStd,
    });
  } catch (err) {
    console.error('[Backtest] Error:', err.message);
    res.status(500).json({ error: 'Backtest failed' });
  }
};

function generateInsight(topic, historical, forecast, totalArticles, historyDays) {
  if (forecast.insufficient) {
    return `Insufficient data for "${topic}". Only ${historical.length} days of data available (minimum 7 required).`;
  }

  const current = historical[historical.length - 1].sentiment;
  const predicted7 = forecast.predicted[Math.min(6, forecast.predicted.length - 1)];
  const predicted14 = forecast.predicted[forecast.predicted.length - 1];
  const ci7 = forecast.confidenceIntervals[Math.min(6, forecast.confidenceIntervals.length - 1)];

  const sentimentLabel = current > 0.2 ? 'positive' : current < -0.2 ? 'negative' : 'neutral';
  const direction = forecast.trend === 'Improving' ? 'becoming more favorable'
    : forecast.trend === 'Declining' ? 'shifting negative'
    : 'remaining stable';

  const confWidth = ci7 ? ci7.width.toFixed(2) : 'wide';
  const confidence = parseFloat(confWidth) < 0.3 ? 'high confidence' : parseFloat(confWidth) < 0.6 ? 'moderate confidence' : 'low confidence';

  let seasonalityNote = '';
  if (forecast.seasonality === 'weekly') {
    seasonalityNote = ' Weekly patterns detected in coverage volume, suggesting editorial cycles influence sentiment swings.';
  }

  const methodNote = forecast.method !== 'Ensemble'
    ? ` Best-performing individual method: ${forecast.method}.`
    : ' All methods weighted equally in ensemble.';

  return `Based on ${totalArticles} articles over ${historyDays} days (${historical.length} data points), public sentiment on "${topic}" is currently ${sentimentLabel} (${current.toFixed(2)}) and ${direction}. 7-day forecast: ${predicted7.toFixed(2)} (CI: ${ci7 ? ci7.lower.toFixed(2) + ' to ' + ci7.upper.toFixed(2) : 'N/A'}), 14-day: ${predicted14.toFixed(2)} with ${confidence}.${seasonalityNote}${methodNote} Residual standard deviation: ${forecast.residualStd.toFixed(3)}.`;
}

module.exports = { getForecast, getBacktest };
