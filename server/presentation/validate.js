module.exports = (schema, property = 'body') => (req, res, next) => {
  try {
    const result = schema.parse(req[property]);
    req[property] = result;
    next();
  } catch (err) {
    res.status(400).json({ error: err.errors?.[0]?.message || 'Invalid payload' });
  }
};
