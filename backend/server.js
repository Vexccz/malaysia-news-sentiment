const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const connectDB = require('./config/db');

// ── Load env FIRST ────────────────────────────────────────────
dotenv.config();

// ── Environment validation (#19) ──────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const MISSING = REQUIRED_ENV.filter(k => !process.env[k]);
if (MISSING.length) {
  console.error(`❌ Missing required environment variables: ${MISSING.join(', ')}`);
  console.error('   Please check your backend/.env file.');
  process.exit(1);
}

// Warn about optional but recommended vars

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
  console.warn('⚠️  OPENAI_API_KEY not set — falling back to local sentiment analysis.');
}

// ── Connect to MongoDB ────────────────────────────────────────
connectDB();

const app = express();

// Trust proxy for Render deployment (X-Forwarded-For headers)
app.set("trust proxy", 1);

// ── API Metrics Tracking ──────────────────────────────────────
const apiMetrics = {
  totalCalls: 0,
  endpoints: {},
  methods: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 },
  statusCodes: {},
  avgResponseTime: 0,
  responseTimes: [],
  startedAt: new Date(),
  hourly: {},
  errors: 0,
};

app.use((req, res, next) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const route = req.route?.path || req.path;
    const key = `${req.method} ${route}`;
    
    apiMetrics.totalCalls++;
    apiMetrics.methods[req.method] = (apiMetrics.methods[req.method] || 0) + 1;
    apiMetrics.statusCodes[res.statusCode] = (apiMetrics.statusCodes[res.statusCode] || 0) + 1;
    apiMetrics.endpoints[key] = (apiMetrics.endpoints[key] || 0) + 1;
    
    if (res.statusCode >= 400) apiMetrics.errors++;
    
    apiMetrics.responseTimes.push(duration);
    if (apiMetrics.responseTimes.length > 500) apiMetrics.responseTimes.shift();
    apiMetrics.avgResponseTime = Math.round(apiMetrics.responseTimes.reduce((a, b) => a + b, 0) / apiMetrics.responseTimes.length);
    
    const hour = new Date().getHours();
    apiMetrics.hourly[hour] = (apiMetrics.hourly[hour] || 0) + 1;
  });
  
  next();
});

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'http://192.168.188.214:5173',
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'production') {
      // In production, allow all origins for mobile app compatibility
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── HTTP Security Headers (Security #23) ─────────────────────
app.use(helmet());

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ── Rate limiting ─────────────────────────────────────────────
// Skip rate limiting for admin users
const skipIfAdmin = (req) => req.userRole === 'admin';

// DISABLED FOR LOCAL TESTING
const authLimiter = (req, res, next) => next();
/*
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfAdmin,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
});
*/

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfAdmin,
  message: { error: 'Too many requests. Please slow down.' },
});

// ── API Metrics Endpoint (after CORS) ───────────────────
const { protect, authorize } = require('./middleware/auth');
app.get('/api/v1/admin/metrics', protect, authorize('admin'), (req, res) => {
  const topEndpoints = Object.entries(apiMetrics.endpoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([endpoint, count]) => ({ endpoint, count }));
  const uptimeMs = Date.now() - apiMetrics.startedAt.getTime();
  const uptimeHours = Math.floor(uptimeMs / 3600000);
  const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000);
  res.json({
    totalCalls: apiMetrics.totalCalls,
    methods: apiMetrics.methods,
    statusCodes: apiMetrics.statusCodes,
    avgResponseTime: apiMetrics.avgResponseTime,
    topEndpoints,
    errors: apiMetrics.errors,
    errorRate: apiMetrics.totalCalls ? ((apiMetrics.errors / apiMetrics.totalCalls) * 100).toFixed(2) : '0.00',
    uptime: `${uptimeHours}h ${uptimeMins}m`,
    startedAt: apiMetrics.startedAt,
    requestsPerMinute: apiMetrics.totalCalls > 0 ? (apiMetrics.totalCalls / (uptimeMs / 60000)).toFixed(1) : '0.0',
    hourlyDistribution: apiMetrics.hourly,
  });
});

// ── Routes (v1) ───────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/v1/news', analysisLimiter, require('./routes/newsRoutes'));
app.use('/api/v1/history', require('./routes/historyRoutes'));

// ── New feature routes ────────────────────────────────────────
app.use('/api/v1/entities', require('./routes/entityRoutes'));
app.use('/api/v1/sources', require('./routes/sourceRoutes'));
app.use('/api/v1/feed', require('./routes/feedRoutes'));
app.use('/api/v1/alerts', require('./routes/alertRoutes'));
app.use('/api/v1/credibility', require('./routes/credibilityRoutes'));
app.use('/api/v1/digest', require('./routes/digestRoutes'));
app.use('/api/v1/public', require('./routes/publicApiRoutes'));
app.use('/api/v1/reports', analysisLimiter, require('./routes/reportRoutes'));
app.use('/api/v1/forecast', require('./routes/forecastRoutes'));
app.use('/api/v1', require('./routes/shareRoutes'));
app.use('/api/v1/user', require('./routes/userRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/bookmarks', require('./routes/bookmarkRoutes'));

// ── Backward compatibility — old routes redirect to v1 ───────
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/news', analysisLimiter, require('./routes/newsRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/entities', require('./routes/entityRoutes'));
app.use('/api/sources', require('./routes/sourceRoutes'));
app.use('/api/feed', require('./routes/feedRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/credibility', require('./routes/credibilityRoutes'));
app.use('/api/digest', require('./routes/digestRoutes'));
app.use('/api/public', require('./routes/publicApiRoutes'));
app.use('/api/reports', analysisLimiter, require('./routes/reportRoutes'));
app.use('/api/forecast', require('./routes/forecastRoutes'));
app.use('/api', require('./routes/shareRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/bookmarks', require('./routes/bookmarkRoutes'));
// Metrics backward compat
app.get('/api/admin/metrics', protect, authorize('admin'), (req, res) => res.redirect('/api/v1/admin/metrics'));
// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// ── Socket.io Authentication Middleware ────────────────────
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    // Allow unauthenticated connections for public features (analysis progress)
    // but mark them as guest
    socket.userId = null;
    socket.isGuest = true;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role || 'user';
    socket.isGuest = false;
    next();
  } catch (err) {
    socket.userId = null;
    socket.isGuest = true;
    next(); // Allow connection but as guest
  }
});

// Make io accessible to controllers via app.set
app.set('io', io);

io.on('connection', (socket) => {
  const userType = socket.isGuest ? 'Guest' : `User:${socket.userId}`;
  console.log(`🔌 ${userType} connected: ${socket.id}`);
  
  // Join user-specific room for targeted events
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }
  
  socket.on('disconnect', () => {
    console.log(`❌ ${userType} disconnected: ${socket.id}`);
  });
});

// ── Newsletter Scheduler ───────────────────────────────────
const { scheduleNewsletter } = require('./services/newsletterService');

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('   Real-time: Socket.io Enabled');
  scheduleNewsletter();
});

