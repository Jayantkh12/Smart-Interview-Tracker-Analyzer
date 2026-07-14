const Interview = require("../models/Interview");
const Company = require("../models/Company");
const path = require("path");
const fs = require("fs");

// Date filter helper
function dateFilter(months, dateCol) {
  if (!months || isNaN(months) || +months <= 0) return { clause: "", params: [] };
  return {
    clause: `AND ${dateCol} >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)`,
    params: [+months],
  };
}

exports.getPublicStats = async (req, res) => {
  try {
    const db = require("../config/db");
    const [applications] = await db.query(
      "SELECT COUNT(*) AS totalApplications FROM Applications",
    );
    const [interviews] = await db.query(
      "SELECT COUNT(*) AS totalInterviews FROM InterviewRounds",
    );
    const [offers] = await db.query(
      "SELECT COUNT(*) AS totalOffers FROM Applications WHERE status='Selected'",
    );
    const Feedback = require("../models/Feedback");
    const feedback = await Feedback.getAverageRating();
    
    const satisfaction = feedback.avgRating
      ? Math.round((feedback.avgRating / 5) * 100)
      : 95;
      
    res.json({
      applications: applications[0].totalApplications || 1250,
      interviews: interviews[0].totalInterviews || 850,
      offers: offers[0].totalOffers || 320,
      satisfaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await Interview.getDashboardStats(userId);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getDashboardResumeStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const resumes = await Interview.getResumes(userId);

    if (resumes.length === 0) {
      return res.json({
        activeResume: "No Resume Uploaded",
        atsScore: 0,
        lastUpdated: "--",
        totalResumes: 0,
      });
    }

    res.json({
      activeResume: resumes[0].resume_title,
      atsScore: resumes[0].atsScore,
      lastUpdated: resumes[0].upload_date,
      totalResumes: resumes.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getRecentApplications = async (req, res) => {
  try {
    const { userId } = req.params;
    const apps = await Interview.getRecentApplications(userId);
    res.json(apps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getUpcomingInterviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const interviews = await Interview.getUpcomingInterviews(userId);
    res.json(interviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getApplicationStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await Interview.getApplicationStats(userId);
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.addApplication = async (req, res) => {
  try {
    const { userId, companyName, role, packageLpa, notes, status } = req.body;
    let company = await Company.findByName(companyName);
    let companyId;

    if (company.length === 0) {
      const result = await Company.create(companyName, packageLpa);
      companyId = result.insertId;
    } else {
      companyId = company[0].company_id;
    }

    const application = await Interview.createApplication(userId, companyId, role, status);

    if (notes) {
      await Interview.createApplicationNote(application.insertId, notes);
    }

    res.json({
      success: true,
      message: "Application Added Successfully",
      applicationId: application.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAllApplications = async (req, res) => {
  try {
    const { userId } = req.params;
    const apps = await Interview.getApplications(userId);
    res.json(apps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const app = await Interview.getApplicationDetails(applicationId);

    if (app.length === 0) {
      return res.status(404).json({ success: false, message: "Application Not Found" });
    }

    if (req.user && String(app[0].user_id) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Access denied. Unauthorized access to resource." });
    }

    res.json(app[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
exports.updateApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, companyName, role, packageLpa, notes } = req.body;

    const app = await Interview.getApplicationDetails(applicationId);
    if (app.length === 0) {
      return res.status(404).json({ success: false, message: "Application Not Found" });
    }

    if (req.user && String(app[0].user_id) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Access denied. Unauthorized access to resource." });
    }

    let company = await Company.findByName(companyName);
    let companyId;
    if (company.length === 0) {
      const result = await Company.create(companyName, packageLpa);
      companyId = result.insertId;
    } else {
      companyId = company[0].company_id;
      const db = require("../config/db");
      await db.query("UPDATE Companies SET package_lpa = ? WHERE company_id = ?", [packageLpa || null, companyId]);
    }

    await Interview.updateApplication(applicationId, status, companyId, role);

    if (notes !== undefined) {
      const existingNote = await Interview.getNoteByAppId(applicationId);
      if (existingNote.length > 0) {
        await Interview.updateNote(applicationId, notes);
      } else {
        await Interview.createNote(applicationId, notes);
      }
    }

    res.json({ success: true, message: "Application Updated Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const app = await Interview.getApplicationDetails(applicationId);
    if (app.length === 0) {
      return res.status(404).json({ success: false, message: "Application Not Found" });
    }

    if (req.user && String(app[0].user_id) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Access denied. Unauthorized access to resource." });
    }

    await Interview.deleteApplicationNotes(applicationId);
    await Interview.deleteApplication(applicationId);
    res.json({ success: true, message: "Application Deleted Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image selected." });
    }

    const User = require("../models/User");
    const uploadDir = path.join(__dirname, "..", "uploads", "profile");
    
    // Get previous image
    const rows = await User.getProfile(userId);
    if (
      rows.length &&
      rows[0].profile_photo &&
      fs.existsSync(path.join(uploadDir, rows[0].profile_photo))
    ) {
      fs.unlinkSync(path.join(uploadDir, rows[0].profile_photo));
    }

    await User.updateProfilePhoto(userId, req.file.filename);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
    res.json({
      success: true,
      message: "Profile picture uploaded successfully.",
      filename: req.file.filename,
      imageUrl: `${baseUrl}/uploads/profile/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed." });
  }
};

exports.uploadResume = async (req, res) => {
  try {
    const { userId, resumeTitle } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file selected." });
    }

    const title = resumeTitle || req.file.originalname;
    const today = new Date().toISOString().slice(0, 10);

    await Interview.createResume(userId, title, req.file.filename, today);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
    res.json({
      success: true,
      message: "Resume uploaded successfully.",
      resumeTitle: title,
      resumeUrl: `${baseUrl}/uploads/resumes/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getLatestResume = async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await Interview.getLatestResume(userId);

    if (rows.length === 0) {
      return res.json({ success: false, message: "No resume found." });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
    res.json({
      success: true,
      resumeTitle: rows[0].resume_title,
      resumeUrl: `${baseUrl}/uploads/resumes/${rows[0].resume_file}`,
      uploadDate: rows[0].upload_date,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Analytics
exports.getAnalyticsStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");

    const row = await Interview.getAnalyticsStats(userId, clause, params);
    const avgRow = await Interview.getAnalyticsAvgDays(userId, clause, params);

    res.json({
      total:     +row.total     || 0,
      applied:   +row.applied   || 0,
      interview: +row.interview || 0,
      offers:    +row.offers    || 0,
      rejected:  +row.rejected  || 0,
      oaCleared: +row.oaCleared || 0,
      avgDays:   avgRow.avgDays != null ? Math.round(avgRow.avgDays) : null,
    });
  } catch (err) {
    console.error("[analytics/stats]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAnalyticsMonthly = async (req, res) => {
  try {
    const { userId } = req.params;
    const months = +req.query.months || 6;
    const rows = await Interview.getAnalyticsMonthly(userId, months);
    res.json(rows.map(r => ({ month: r.month, count: +r.count })));
  } catch (err) {
    console.error("[analytics/monthly]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAnalyticsRounds = async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");
    const rows = await Interview.getAnalyticsRounds(userId, clause, params);
    res.json(rows.map(r => ({ round_type: r.round_type, count: +r.count })));
  } catch (err) {
    console.error("[analytics/rounds]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAnalyticsQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");
    const rows = await Interview.getAnalyticsQuestions(userId, clause, params);
    res.json(rows);
  } catch (err) {
    console.error("[analytics/questions]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAnalyticsOACleared = async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");
    const result = await Interview.getAnalyticsOACleared(userId, clause, params);
    res.json({ count: +result.count || 0 });
  } catch (err) {
    console.error("[analytics/oa-cleared]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Question Log & rounds addition
exports.addQuestion = async (req, res) => {
  try {
    const { userId, questionText, topic, difficulty, company, notes } = req.body;
    if (!userId || !questionText || !difficulty) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let fullText = questionText;
    if (company) fullText += `\n[Company: ${company}]`;
    if (notes)   fullText += `\n[Notes: ${notes}]`;

    const result = await Interview.createQuestion(fullText, topic || "General", difficulty);
    const questionId = result.insertId;

    await Interview.createUserQuestionPractice(userId, questionId);
    res.json({ success: true, questionId });
  } catch (err) {
    console.error("[questions/add]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.addInterviewRound = async (req, res) => {
  try {
    const { applicationId, roundType, roundDate, result, updateStatus } = req.body;
    if (!applicationId || !roundType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const app = await Interview.getApplicationDetails(applicationId);
    if (app.length === 0) {
      return res.status(404).json({ success: false, message: "Application Not Found" });
    }

    if (req.user && String(app[0].user_id) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Access denied. Unauthorized access to resource." });
    }

    const insertResult = await Interview.createInterviewRound(applicationId, roundType, roundDate, result);

    if (updateStatus) {
      await Interview.updateApplicationStatus(applicationId, updateStatus);
    }

    res.json({
      success: true,
      message: "Interview round added successfully.",
      roundId: insertResult.insertId,
    });
  } catch (err) {
    console.error("[interview-rounds/add]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getUserQuestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await Interview.getUserQuestions(userId);
    res.json(rows);
  } catch (err) {
    console.error("[questions/user]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getUserDifficultyStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await Interview.getUserDifficultyStats(userId);
    const result = { easy: 0, medium: 0, hard: 0 };
    rows.forEach(r => {
      const key = (r.difficulty || "").toLowerCase();
      if (key === "easy")   result.easy   = +r.count;
      if (key === "medium") result.medium = +r.count;
      if (key === "hard")   result.hard   = +r.count;
    });
    res.json(result);
  } catch (err) {
    console.error("[dashboard/difficulty]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
