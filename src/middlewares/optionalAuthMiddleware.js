// middleware to identify the user on public routes: sets req.user when a valid token is sent, never blocks

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const optionalAuthMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();

  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role isBanned");
    if (user && !user.isBanned) {
      req.user = { id: String(user._id), role: user.role };
    }
  } catch {
    // invalid token on a public route: continue as a guest
  }
  next();
};

module.exports = optionalAuthMiddleware;
