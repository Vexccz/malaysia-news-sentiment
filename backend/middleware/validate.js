// ─────────────────────────────────────────────────────────────
// Zod-backed request body validation middleware.
//
// Tiny + zero-runtime-cost when not used. Use on per-route basis:
//
//   const { validate } = require('../middleware/validate');
//   const { z } = require('zod');
//   const schema = z.object({ email: z.string().email(), ... });
//   router.post('/login', validate(schema), loginHandler);
//
// On parse failure: 400 + structured error list.
// On success: req.body is replaced with the parsed/coerced object.
// ─────────────────────────────────────────────────────────────

const validate = (schema, source = 'body') => (req, res, next) => {
  const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
    return res.status(400).json({
      error: 'Invalid request',
      issues,
    });
  }
  if (source === 'body') req.body = result.data;
  else if (source === 'query') req.query = result.data;
  else req.params = result.data;
  next();
};

module.exports = { validate };
