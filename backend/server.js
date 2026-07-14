require("dotenv").config();

// Critical Environment Check
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is not defined in production!");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { requestLogger } = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(express.json());
// CORS – allow both local dev and the deployed Vercel frontend
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Static upload paths
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, "uploads", "profile");
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}
const resumeUploadDir = path.join(__dirname, "uploads", "resumes");
if (!fs.existsSync(resumeUploadDir)) {
  fs.mkdirSync(resumeUploadDir, { recursive: true });
}

// Decoupled Routes
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const interviewRoutes = require("./routes/interviewRoutes");

app.use(authRoutes);
app.use(companyRoutes);
app.use(interviewRoutes);

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
