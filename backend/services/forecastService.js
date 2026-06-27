// forecastService.js — Multi-method sentiment forecasting
// Methods: Holt linear, Holt-Winters (weekly seasonality), momentum, naive seasonal
// Walk-forward backtest weights ensemble by historical accuracy
// Confidence intervals from residual standard deviation

const WEEK = 7;

function holtLinear(series, alpha = 0.3, beta = 0.1) {
  if (series.length < 2) return null;
  let level = series[0].value;
  let trend = series[1].value - series[0].value;
  for (let i = 1; i < series.length; i++) {
    const val = series[i].value;
    const prevLevel = level;
    level = alpha * val + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return {
    method: 'Holt Linear',
    forecast: (steps) => Array.from({ length: steps }, (_, i) => level + trend * (i + 1)),
  };
}

function holtWinters(series, period = WEEK, alpha = 0.3, beta = 0.1, gamma = 0.15) {
  if (series.length < period * 2) return null;
  let level = series.slice(0, period).reduce((s, p) => s + p.value, 0) / period;
  let trend = (series.slice(period, period * 2).reduce((s, p) => s + p.value, 0) -
               series.slice(0, period).reduce((s, p) => s + p.value, 0)) / (period * period);
  const seasonals = new Array(period).fill(0);
  for (let i = 0; i < period; i++) seasonals[i] = series[i].value - level;
  for (let i = 0; i < series.length; i++) {
    const val = series[i].value;
    const sIdx = i % period;
    const prevLevel = level;
    level = alpha * (val - seasonals[sIdx]) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonals[sIdx] = gamma * (val - level) + (1 - gamma) * seasonals[sIdx];
  }
  const lastSeasonalIdx = (series.length - 1) % period;
  return {
    method: 'Holt-Winters (weekly)',
    forecast: (steps) => Array.from({ length: steps }, (_, i) => {
      const sIdx = (lastSeasonalIdx + i + 1) % period;
      return level + trend * (i + 1) + seasonals[sIdx];
    }),
  };
}

function momentum(series, window = 7) {
  if (series.length < 2) return null;
  const changes = [];
  for (let i = Math.max(1, series.length - window); i < series.length; i++) {
    changes.push(series[i].value - series[i - 1].value);
  }
  let weightedSum = 0, weightSum = 0;
  changes.forEach((c, i) => { const w = i + 1; weightedSum += c * w; weightSum += w; });
  const avgChange = weightedSum / weightSum;
  const last = series[series.length - 1].value;
  return {
    method: 'Momentum',
    forecast: (steps) => Array.from({ length: steps }, (_, i) => last + avgChange * (i + 1)),
  };
}

function naiveSeasonal(series, period = WEEK) {
  if (series.length < period) return null;
  const lastIdx = series.length - 1;
  return {
    method: 'Naive Seasonal',
    forecast: (steps) => Array.from({ length: steps }, (_, i) => {
      const targetDay = (lastIdx + i + 1) % period;
      for (let j = series.length - 1; j >= 0; j--) {
        if (j % period === targetDay) return series[j].value;
      }
      return series[series.length - 1].value;
    }),
  };
}

function walkForwardBacktest(series, methods, testSize = 14) {
  if (series.length < testSize + 7) return null; // need 7+ train points
  const results = {};
  methods.forEach(m => { results[m.name] = { squaredErrors: [], mape: [] }; });
  const trainStart = Math.max(7, Math.floor(series.length * 0.4));
  for (let t = trainStart; t <= series.length - testSize; t++) {
    const trainSeries = series.slice(0, t);
    const actual = series[t].value;
    methods.forEach(m => {
      const model = m.fn(trainSeries);
      if (!model) return;
      const pred = model.forecast(1)[0];
      const error = pred - actual;
      results[m.name].squaredErrors.push(error * error);
      const ape = Math.abs(error / (Math.abs(actual) + 0.01)) * 100;
      results[m.name].mape.push(Math.min(ape, 200));
    });
  }
  const summary = {};
  methods.forEach(m => {
    const r = results[m.name];
    if (r.squaredErrors.length === 0) { summary[m.name] = null; return; }
    const rmse = Math.sqrt(r.squaredErrors.reduce((s, e) => s + e, 0) / r.squaredErrors.length);
    const mape = r.mape.reduce((s, e) => s + e, 0) / r.mape.length;
    summary[m.name] = { rmse, mape, samples: r.squaredErrors.length };
  });
  return summary;
}

function ensembleForecast(rawSeries, steps = 14) {
  if (rawSeries.length < 7) return { insufficient: true, reason: 'Less than 7 days of data' };

  const series = rawSeries.map(s => ({ ...s, value: s.sentiment }));

  const methods = [
    { name: 'Holt-Winters', fn: holtWinters },
    { name: 'Holt Linear', fn: holtLinear },
    { name: 'Momentum', fn: momentum },
    { name: 'Naive Seasonal', fn: naiveSeasonal },
  ];

  const models = {};
  methods.forEach(m => { const result = m.fn(series); if (result) models[m.name] = result; });

  const backtestResults = walkForwardBacktest(series, methods, Math.min(14, Math.floor(series.length * 0.2)));

  const weights = {};
  let totalWeight = 0;
  Object.entries(models).forEach(([name]) => {
    const bt = backtestResults && backtestResults[name];
    if (bt && bt.rmse > 0) { weights[name] = 1 / bt.rmse; totalWeight += weights[name]; }
    else { weights[name] = 1; totalWeight += 1; }
  });
  Object.keys(weights).forEach(k => { weights[k] /= totalWeight; });

  const ensemblePred = new Array(steps).fill(0);
  Object.entries(models).forEach(([name, model]) => {
    const pred = model.forecast(steps);
    const w = weights[name];
    pred.forEach((v, i) => { ensemblePred[i] += v * w; });
  });

  // Residual std for confidence intervals
  let residualStd = 0.1;
  const residuals = [];
  for (let t = Math.max(7, series.length - 14); t < series.length; t++) {
    const trainS = series.slice(0, t);
    const bestModel = models['Holt-Winters'] || models['Holt Linear'] || models['Momentum'];
    if (bestModel) {
      const pred = bestModel.forecast(1)[0];
      residuals.push(pred - series[t].value);
    }
  }
  if (residuals.length >= 2) {
    const mean = residuals.reduce((s, r) => s + r, 0) / residuals.length;
    const variance = residuals.reduce((s, r) => s + (r - mean) ** 2, 0) / (residuals.length - 1);
    residualStd = Math.max(Math.sqrt(variance), 0.05);
  }

  const confidenceIntervals = ensemblePred.map((_, i) => {
    const widenFactor = 1 + 0.3 * Math.sqrt(i + 1);
    const halfWidth = residualStd * widenFactor;
    return {
      lower: Math.max(-1, Math.min(1, parseFloat((ensemblePred[i] - halfWidth).toFixed(3)))),
      upper: Math.max(-1, Math.min(1, parseFloat((ensemblePred[i] + halfWidth).toFixed(3)))),
      width: parseFloat((halfWidth * 2).toFixed(3)),
    };
  });

  // Trend
  const firstHalf = ensemblePred.slice(0, Math.floor(steps / 2));
  const secondHalf = ensemblePred.slice(Math.floor(steps / 2));
  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const delta = avgSecond - avgFirst;
  let trend;
  if (series.length < 14) trend = 'Insufficient Data';
  else if (Math.abs(delta) < 0.02) trend = 'Stable';
  else if (delta > 0) trend = 'Improving';
  else trend = 'Declining';

  // Best single method
  let bestMethod = 'Ensemble';
  let bestMape = Infinity;
  if (backtestResults) {
    Object.entries(backtestResults).forEach(([name, bt]) => {
      if (bt && bt.mape < bestMape) { bestMape = bt.mape; bestMethod = name; }
    });
  }

  // Seasonality detection
  let seasonality = 'none';
  if (backtestResults && backtestResults['Holt-Winters'] && backtestResults['Holt Linear']) {
    if (backtestResults['Holt-Winters'].mape < backtestResults['Holt Linear'].mape * 0.85) seasonality = 'weekly';
  }

  return {
    insufficient: false,
    predicted: ensemblePred.map(v => parseFloat(v.toFixed(3))),
    confidenceIntervals,
    trend,
    method: bestMethod,
    weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, parseFloat(v.toFixed(3))])),
    seasonality,
    residualStd: parseFloat(residualStd.toFixed(3)),
    backtest: backtestResults ? Object.fromEntries(
      Object.entries(backtestResults)
        .filter(([, v]) => v)
        .map(([k, v]) => [k, { rmse: parseFloat(v.rmse.toFixed(4)), mape: parseFloat(v.mape.toFixed(1)), samples: v.samples }])
    ) : null,
    models: Object.entries(models).map(([name, m]) => ({
      name,
      predicted: m.forecast(steps).map(v => parseFloat(v.toFixed(3))),
      backtest: backtestResults && backtestResults[name]
        ? { rmse: parseFloat(backtestResults[name].rmse.toFixed(4)), mape: parseFloat(backtestResults[name].mape.toFixed(1)) }
        : null,
    })),
  };
}

module.exports = { ensembleForecast, holtLinear, holtWinters, momentum, naiveSeasonal };
