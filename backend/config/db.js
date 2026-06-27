const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set in environment');
    return;
  }

  // Mask password in logs
  const masked = uri.replace(/:([^@/]+)@/, ':****@');
  console.log(`🔌 Connecting to MongoDB: ${masked}`);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        family: 4, // Force IPv4 — Render IPv6 sometimes blocked
      });
      console.log(`✅ MongoDB Connected (attempt ${attempts})`);
      return;
    } catch (error) {
      console.error(`⚠️  MongoDB connect attempt ${attempts}/${maxAttempts} failed:`, error.message);
      if (error.reason) {
        console.error('   Reason:', JSON.stringify(error.reason, null, 2).slice(0, 800));
      }
      if (attempts < maxAttempts) {
        const delay = attempts * 5000;
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error('❌ MongoDB unavailable after all retries — DB features disabled.');
};

module.exports = connectDB;
