require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { requestLogger } = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
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
