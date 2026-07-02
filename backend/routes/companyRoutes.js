const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");

const { verifyToken, validateUser } = require("../middleware/authMiddleware");

// Company analytics
router.get("/api/analytics/top-companies/:userId", verifyToken, validateUser, companyController.getTopCompanies);

module.exports = router;
