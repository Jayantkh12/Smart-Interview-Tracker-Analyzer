const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const interviewController = require("../controllers/interviewController");

// Multer disk storage and upload config for user profile images
const profileUploadDir = path.join(__dirname, "..", "uploads", "profile");
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "user_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + ext);
  },
});

const profileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG and PNG images are allowed."));
  }
};

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: profileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Multer disk storage and upload config for resumes
const resumeUploadDir = path.join(__dirname, "..", "uploads", "resumes");
if (!fs.existsSync(resumeUploadDir)) {
  fs.mkdirSync(resumeUploadDir, { recursive: true });
}

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumeUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "resume_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + ext);
  },
});

const resumeFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC and DOCX files are allowed."));
  }
};

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});


const { verifyToken, validateUser } = require("../middleware/authMiddleware");

// Dashboard statistics
router.get("/api/dashboard/stats", interviewController.getPublicStats);
router.get("/api/dashboard/stats/:userId", verifyToken, validateUser, interviewController.getDashboardStats);
router.get("/api/dashboard/resume/:userId", verifyToken, validateUser, interviewController.getDashboardResumeStats);
router.get("/api/dashboard/recent-applications/:userId", verifyToken, validateUser, interviewController.getRecentApplications);
router.get("/api/dashboard/upcoming-interviews/:userId", verifyToken, validateUser, interviewController.getUpcomingInterviews);

// Applications
router.get("/api/applications/stats/:userId", verifyToken, validateUser, interviewController.getApplicationStats);
router.post("/api/applications", verifyToken, validateUser, interviewController.addApplication);
router.get("/api/applications/:userId", verifyToken, validateUser, interviewController.getAllApplications);
router.get("/api/application/:applicationId", verifyToken, interviewController.getApplicationDetails);
router.put("/api/application/:applicationId", verifyToken, interviewController.updateApplication);
router.delete("/api/application/:applicationId", verifyToken, interviewController.deleteApplication);

// Profile photo & resumes upload routes (Authenticated)
router.post("/api/profile/upload", verifyToken, uploadProfile.single("profile"), interviewController.uploadProfilePhoto);
router.post("/api/resume/upload", verifyToken, uploadResume.single("resume"), interviewController.uploadResume);
router.get("/api/resume/:userId", verifyToken, validateUser, interviewController.getLatestResume);

// Analytics
router.get("/api/analytics/stats/:userId", verifyToken, validateUser, interviewController.getAnalyticsStats);
router.get("/api/analytics/monthly/:userId", verifyToken, validateUser, interviewController.getAnalyticsMonthly);
router.get("/api/analytics/rounds/:userId", verifyToken, validateUser, interviewController.getAnalyticsRounds);
router.get("/api/analytics/questions/:userId", verifyToken, validateUser, interviewController.getAnalyticsQuestions);
router.get("/api/analytics/oa-cleared/:userId", verifyToken, validateUser, interviewController.getAnalyticsOACleared);

// Practice questions & rounds log
router.post("/api/questions/add", verifyToken, validateUser, interviewController.addQuestion);
router.post("/api/interview-rounds", verifyToken, interviewController.addInterviewRound);
router.get("/api/questions/user/:userId", verifyToken, validateUser, interviewController.getUserQuestions);
router.get("/api/dashboard/difficulty/:userId", verifyToken, validateUser, interviewController.getUserDifficultyStats);

module.exports = router;
