const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const { verifyToken, validateUser } = require("../middleware/authMiddleware");

// General contact form
router.post("/contact", authController.contactForm);

// Auth endpoints
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// User profile endpoints (Authenticated + Protected against IDOR)
router.put("/api/change-password", verifyToken, validateUser, authController.changePassword);
router.delete("/api/user/:userId", verifyToken, validateUser, authController.deleteAccount);
router.get("/api/profile/:userId", verifyToken, validateUser, authController.getProfile);
router.put("/api/profile/:userId", verifyToken, validateUser, authController.updateProfile);

module.exports = router;
