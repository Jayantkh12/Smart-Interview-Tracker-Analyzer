const jwt = require("jsonwebtoken");

module.exports = {
  requestLogger: (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  },
  verifyToken: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_interview_tracker_key_2026");
      req.user = decoded; // { userId }
      next();
    } catch (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token." });
    }
  },
  validateUser: (req, res, next) => {
    const requestedUserId = req.params.userId || req.body.userId || req.query.userId;
    if (requestedUserId && String(req.user.userId) !== String(requestedUserId)) {
      return res.status(403).json({ success: false, message: "Access denied. Unauthorized access to resource." });
    }
    next();
  }
};
