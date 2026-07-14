const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const interviewController = require("../controllers/interviewController");

// Multer memory storage and upload config for user profile images
const uploadProfile = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG and PNG images are allowed."));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Multer memory storage and upload config for resumes
const uploadResume = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
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
  },
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
router.get("/api/resume/download/:userId", verifyToken, validateUser, interviewController.downloadResume);

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
