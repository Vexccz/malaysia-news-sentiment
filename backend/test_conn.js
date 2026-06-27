const mongoose = require('mongoose');
const uri = 'mongodb://hmremix123_db_user:Hmremix76@ac-n5qymcj-shard-00-00.0j47hpz.mongodb.net:27017,ac-n5qymcj-shard-00-01.0j47hpz.mongodb.net:27017,ac-n5qymcj-shard-00-02.0j47hpz.mongodb.net:27017/malaysia_news_sentiment?replicaSet=atlas-bsn8ht-shard-0&ssl=true&authSource=admin';
console.log('Connecting...');
mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('OK CONNECTED');
    return mongoose.connection.db.collection('users').countDocuments();
  })
  .then(c => {
    console.log('user count:', c);
    process.exit(0);
  })
  .catch(e => {
    console.log('FAILED:', e.message);
    process.exit(1);
  });
