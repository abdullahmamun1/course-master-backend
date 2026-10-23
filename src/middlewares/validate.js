// middleware to validate request bodies against Zod schemas

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // Zod v4 exposes problems on `issues` (not `errors`)
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return res.status(400).json({
      message: errors[0]?.field ? `${errors[0].field}: ${errors[0].message}` : "Validation error",
      errors,
    });
  }
  req.body = result.data;
  next();
};

module.exports = validate;
