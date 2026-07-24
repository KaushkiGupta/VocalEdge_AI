import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Refusing to start.");
}

export const requireAuth = (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

export const csrfCheck = (req, res, next) => {
  const method = req.method;
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfHeader = req.headers["x-requested-with"];
    if (!csrfHeader) {
      return res.status(403).json({ error: "CSRF validation failed. Missing X-Requested-With header." });
    }
  }
  next();
};
