require('dotenv').config();
const mongoose = require('mongoose');
const Article = require('../models/Article');
const { normalizeState } = require('../services/stateNormalizer');
const { extractEntities } = require('../services/entityExtraction');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const cursor = Article.find({}).select('title description content stateLocation entities analysis_source modelVersion').cursor();
  let updated = 0;
  for await (const article of cursor) {
    const stateLocation = normalizeState(article.stateLocation);
    const entities = article.entities?.length ? article.entities : extractEntities(`${article.title} ${article.description || ''} ${article.content || ''}`);
    const modelVersion = article.modelVersion || article.analysis_source || 'legacy';
    const changed = stateLocation !== article.stateLocation || !article.entities?.length || !article.modelVersion;
    if (changed) {
      await Article.updateOne({ _id: article._id }, { $set: { stateLocation, entities, modelVersion } });
      updated++;
    }
  }
  console.log(JSON.stringify({ updated }));
  await mongoose.disconnect();
})().catch(error => { console.error(error); process.exit(1); });
