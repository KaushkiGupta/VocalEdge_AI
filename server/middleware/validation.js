import { z } from "zod";

// Middleware to validate request body with Zod schema
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({ error: "Validation failed", details: formattedErrors });
    }
    next(error);
  }
};

// Centralized error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error("Centralized Error Handler:", err);

  const status = err.status || 500;
  const message = err.message || "An unexpected error occurred.";

  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
