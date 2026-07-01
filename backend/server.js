require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const db = require("./config/db");
const app = express();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// JSON data receive karne ke liye
app.use(express.json());

// Frontend ko request allow karne ke liye
app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.get("/api/dashboard/stats", async (req, res) => {
  const [applications] = await db.query(
    "SELECT COUNT(*) AS totalApplications FROM Applications",
  );

  const [interviews] = await db.query(
    "SELECT COUNT(*) AS totalInterviews FROM InterviewRounds",
  );

  const [offers] = await db.query(
    "SELECT COUNT(*) AS totalOffers FROM Applications WHERE status='Selected'",
  );

  const [feedback] = await db.query(
    "SELECT AVG(rating) AS avgRating FROM Feedback",
  );

  const satisfaction = feedback[0].avgRating
    ? Math.round((feedback[0].avgRating / 5) * 100)
    : 0;

  res.json({
    // applications: applications[0].totalApplications,
    // interviews: interviews[0].totalInterviews,
    // offers: offers[0].totalOffers,
    // satisfaction,
    applications: 1250,
    interviews: 850,
    offers: 320,
    satisfaction: 95,
  });
});

// mail auth
const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});
//FORM

app.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    await transporter.sendMail({
      from: email,

      to: process.env.GMAIL_USER,

      subject: subject,

      text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    res.json({
      message: "Message sent successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to send email",
    });
  }
});

//Register

app.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    const [existingUser] = await db.query(
      "SELECT * FROM Users WHERE email = ?",
      [email],
    );

    if (existingUser.length > 0) {
      return res.json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO Users (name, phoneNo, email, password) VALUES (?, ?, ?, ?)",
      [name, phone, email, hashedPassword],
    );

    res.json({
      success: true,
      message: "Account Created Successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

//Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    const match = await bcrypt.compare(password, users[0].password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    res.json({
      success: true,
      message: "Login Successful",
      user: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});
// Change Password
app.put("/api/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    const [users] = await db.query("SELECT * FROM Users WHERE id = ?", [userId]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE Users SET password = ? WHERE id = ?", [hashed, userId]);

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Delete Account
app.delete("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    // Verify password first
    const [users] = await db.query("SELECT * FROM Users WHERE id = ?", [userId]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, users[0].password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Delete in FK order
    await db.query(`DELETE an FROM ApplicationNotes an JOIN Applications a ON an.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    await db.query(`DELETE ir FROM InterviewRounds ir JOIN Applications a ON ir.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    await db.query(`DELETE FROM Applications WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM Resumes WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM UserSkills WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM QuestionPractice WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM Users WHERE id = ?`, [userId]);

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// dashboard

app.get("/api/dashboard/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [applications] = await db.query(
      `SELECT COUNT(*) AS totalApplications FROM Applications WHERE user_id = ?`,
      [userId],
    );

    const [interviews] = await db.query(
      `SELECT COUNT(*) AS totalInterviews FROM InterviewRounds ir JOIN Applications a ON ir.application_id = a.application_id WHERE a.user_id = ?`,
      [userId],
    );

    const [offers] = await db.query(
      `SELECT COUNT(*) AS totalOffers FROM Applications WHERE user_id = ? AND status = 'Selected'`,
      [userId],
    );

    const [rejections] = await db.query(
      `SELECT COUNT(*) AS totalRejections FROM Applications WHERE user_id = ? AND status = 'Rejected'`,
      [userId],
    );

    res.json({
      // applications: applications[0].totalApplications,
      // interviews: interviews[0].totalInterviews,
      // offers: offers[0].totalOffers,
      // rejections: rejections[0].totalRejections,
      applications: 1250,
      interviews: 850,
      offers: 320,
      rejections: 95,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

app.get("/api/dashboard/resume/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [resumes] = await db.query(
      `SELECT * FROM Resumes WHERE user_id = ? ORDER BY upload_date DESC`,
      [userId],
    );

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
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

// recent-applications

app.get("/api/dashboard/recent-applications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [applications] = await db.query(
      `SELECT
        a.application_id,
        c.company_name,
        a.role,
        a.status,
        a.application_date
      FROM Applications a
      JOIN Companies c
        ON a.company_id = c.company_id
      WHERE a.user_id = ?
      ORDER BY a.application_date DESC
      LIMIT 5`,
      [userId],
    );

    res.json(applications);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

//  Upcoming Interviews
app.get("/api/dashboard/upcoming-interviews/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [interviews] = await db.query(
      `
      SELECT
        ir.round_id,
        c.company_name,
        a.role,
        ir.round_type,
        ir.round_date,
        ir.result
      FROM InterviewRounds ir
      JOIN Applications a
        ON ir.application_id = a.application_id
      JOIN Companies c
        ON a.company_id = c.company_id
      WHERE a.user_id = ?
        AND ir.round_date >= CURDATE()
      ORDER BY ir.round_date ASC
      LIMIT 5
      `,
      [userId],
    );

    res.json(interviews);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Get Application Stats
app.get("/api/applications/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [applications] = await db.query(
      `SELECT COUNT(*) AS totalApplications
       FROM Applications
       WHERE user_id = ?`,
      [userId],
    );

    const [applied] = await db.query(
      `SELECT COUNT(*) AS appliedApplications
       FROM Applications
       WHERE user_id = ?
       AND status = 'Applied'`,
      [userId],
    );

    const [interviews] = await db.query(
      `SELECT COUNT(*) AS totalInterviews
       FROM InterviewRounds ir
       JOIN Applications a
       ON ir.application_id = a.application_id
       WHERE a.user_id = ?`,
      [userId],
    );

    const [offers] = await db.query(
      `SELECT COUNT(*) AS totalOffers
       FROM Applications
       WHERE user_id = ?
       AND status = 'Selected'`,
      [userId],
    );

    const [rejections] = await db.query(
      `SELECT COUNT(*) AS totalRejections
       FROM Applications
       WHERE user_id = ?
       AND status = 'Rejected'`,
      [userId],
    );

    res.json({
      applications: applications[0].totalApplications,
      appliedApplications: applied[0].appliedApplications,
      interviews: interviews[0].totalInterviews,
      offers: offers[0].totalOffers,
      rejections: rejections[0].totalRejections,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Add Application
app.post("/api/applications", async (req, res) => {
  try {
    const { userId, companyName, role, packageLpa, notes, status } = req.body;

    let [company] = await db.query(
      "SELECT company_id FROM Companies WHERE company_name = ?",
      [companyName],
    );

    let companyId;

    if (company.length === 0) {
      const [result] = await db.query(
        `INSERT INTO Companies
        (company_name, company_email, company_location, package_lpa)
        VALUES (?, ?, ?, ?)`,
        [
          companyName,
          `${companyName}@example.com`,
          "Not Specified",
          packageLpa,
        ],
      );

      companyId = result.insertId;
    } else {
      companyId = company[0].company_id;
    }

    const [application] = await db.query(
      `INSERT INTO Applications
      (user_id, company_id, role, application_date, status)
      VALUES (?, ?, ?, CURDATE(), ?)`,
      [userId, companyId, role, status || "Applied"],
    );

    if (notes) {
      await db.query(
        `INSERT INTO ApplicationNotes
        (application_id, note_text)
        VALUES (?, ?)`,
        [application.insertId, notes],
      );
    }

    res.json({
      success: true,
      message: "Application Added Successfully",
      applicationId: application.insertId,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Get All Applications
app.get("/api/applications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [applications] = await db.query(
      `SELECT
          a.application_id,
          c.company_name,
          c.package_lpa,
          a.role,
          a.status,
          a.application_date
       FROM Applications a
       JOIN Companies c
       ON a.company_id = c.company_id
       WHERE a.user_id = ?
       ORDER BY a.application_date DESC`,
      [userId],
    );

    res.json(applications);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Get Single Application Details (View Button)
app.get("/api/application/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    const [application] = await db.query(
      `SELECT
          a.application_id,
          c.company_name,
          c.package_lpa,
          a.role,
          a.status,
          a.application_date,
          n.note_text
       FROM Applications a
       JOIN Companies c
       ON a.company_id = c.company_id
       LEFT JOIN ApplicationNotes n
       ON a.application_id = n.application_id
       WHERE a.application_id = ?`,
      [applicationId],
    );

    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application Not Found",
      });
    }

    res.json(application[0]);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Update Application Status
app.put("/api/application/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    await db.query(
      `UPDATE Applications
       SET status = ?
       WHERE application_id = ?`,
      [status, applicationId],
    );

    res.json({
      success: true,
      message: "Application Updated Successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Delete Application
app.delete("/api/application/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    await db.query(
      `DELETE FROM ApplicationNotes
       WHERE application_id = ?`,
      [applicationId],
    );

    await db.query(
      `DELETE FROM Applications
       WHERE application_id = ?`,
      [applicationId],
    );

    res.json({
      success: true,
      message: "Application Deleted Successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

//PROFILE

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uploadDir = path.join(__dirname, "uploads", "profile");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName =
      "user_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + ext;

    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG and PNG images are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

//Upload Profile Image API
app.post("/api/profile/upload", upload.single("profile"), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image selected.",
      });
    }

    // Get previous image
    const [rows] = await db.query(
      "SELECT profile_photo FROM Users WHERE id=?",
      [userId],
    );

    // Delete old image
    if (
      rows.length &&
      rows[0].profile_photo &&
      fs.existsSync(path.join(uploadDir, rows[0].profile_photo))
    ) {
      fs.unlinkSync(path.join(uploadDir, rows[0].profile_photo));
    }

    // Update database
    await db.query("UPDATE Users SET profile_photo=? WHERE id=?", [
      req.file.filename,
      userId,
    ]);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;
    res.json({
      success: true,
      message: "Profile picture uploaded successfully.",
      filename: req.file.filename,
      imageUrl: `${baseUrl}/uploads/profile/${req.file.filename}`,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Upload failed.",
    });
  }
});

// ─── Resume Upload ────────────────────────────────────────────

const resumeUploadDir = path.join(__dirname, "uploads", "resumes");

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

// Upload Resume API
app.post("/api/resume/upload", uploadResume.single("resume"), async (req, res) => {
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

    await db.query(
      `INSERT INTO Resumes (user_id, resume_title, resume_file, upload_date) VALUES (?, ?, ?, ?)`,
      [userId, title, req.file.filename, today],
    );

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;

    res.json({
      success: true,
      message: "Resume uploaded successfully.",
      resumeTitle: title,
      resumeUrl: `${baseUrl}/uploads/resumes/${req.file.filename}`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get Latest Resume API
app.get("/api/resume/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT resume_id, resume_title, resume_file, upload_date
       FROM Resumes WHERE user_id = ?
       ORDER BY upload_date DESC, resume_id DESC LIMIT 1`,
      [userId],
    );

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
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get Profile API — returns all profile fields
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      "SELECT name, email, phoneNo, profile_photo, college, branch, graduation_year, preferred_role, expected_package, preferred_location, work_type FROM Users WHERE id=?",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5500}`;

    res.json({
      success: true,
      name: rows[0].name,
      email: rows[0].email,
      phone: rows[0].phoneNo,
      college: rows[0].college || "",
      branch: rows[0].branch || "",
      graduationYear: rows[0].graduation_year || "",
      preferredRole: rows[0].preferred_role || "",
      expectedPackage: rows[0].expected_package || "",
      preferredLocation: rows[0].preferred_location || "",
      workType: rows[0].work_type || "",
      profilePic: rows[0].profile_photo
        ? `${baseUrl}/uploads/profile/${rows[0].profile_photo}`
        : null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Update Profile API — saves all profile fields including career preferences
app.put("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, college, branch, graduationYear, preferredRole, expectedPackage, preferredLocation, workType } = req.body;

    await db.query(
      `UPDATE Users SET name=?, phoneNo=?, college=?, branch=?, graduation_year=?,
       preferred_role=?, expected_package=?, preferred_location=?, work_type=? WHERE id=?`,
      [name, phone, college, branch, graduationYear || null,
       preferredRole || null, expectedPackage || null, preferredLocation || null, workType || null,
       userId],
    );

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ─── Analytics Routes ─────────────────────────────────────────────────────────

/**
 * Helper: builds a date filter clause if ?months=N is provided.
 * Returns { clause: string, params: Array }
 */
function dateFilter(months, dateCol) {
  if (!months || isNaN(months) || +months <= 0) return { clause: "", params: [] };
  return {
    clause: `AND ${dateCol} >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)`,
    params: [+months],
  };
}

// GET /api/analytics/stats/:userId?months=N
// Returns total, applied, interview, offers, rejected, oaCleared, avgDays
app.get("/api/analytics/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");

    const [totals] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(a.status = 'Applied') AS applied,
         SUM(a.status = 'Interview Scheduled') AS interview,
         SUM(a.status = 'Selected') AS offers,
         SUM(a.status = 'Rejected') AS rejected,
         SUM(a.status = 'OA Cleared') AS oaCleared
       FROM Applications a
       WHERE a.user_id = ? ${clause}`,
      [userId, ...params],
    );

    const [avgRow] = await db.query(
      `SELECT AVG(DATEDIFF(ir.round_date, a.application_date)) AS avgDays
       FROM Applications a
       JOIN InterviewRounds ir ON ir.application_id = a.application_id
       WHERE a.user_id = ?
         AND ir.round_date IS NOT NULL
         AND ir.round_date >= a.application_date
         ${clause}`,
      [userId, ...params],
    );

    const row = totals[0] || {};
    res.json({
      total:     +row.total     || 0,
      applied:   +row.applied   || 0,
      interview: +row.interview || 0,
      offers:    +row.offers    || 0,
      rejected:  +row.rejected  || 0,
      oaCleared: +row.oaCleared || 0,
      avgDays:   avgRow[0]?.avgDays != null ? Math.round(avgRow[0].avgDays) : null,
    });
  } catch (err) {
    console.error("[analytics/stats]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/analytics/monthly/:userId?months=N
// Returns [{month: "2026-05", count: 3}, …] for the last N months
app.get("/api/analytics/monthly/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const months = +req.query.months || 6;

    const [rows] = await db.query(
      `SELECT
         DATE_FORMAT(application_date, '%Y-%m') AS month,
         COUNT(*) AS count
       FROM Applications
       WHERE user_id = ?
         AND application_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY month
       ORDER BY month ASC`,
      [userId, months],
    );

    res.json(rows.map(r => ({ month: r.month, count: +r.count })));
  } catch (err) {
    console.error("[analytics/monthly]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/analytics/top-companies/:userId?months=N
// Returns [{company, count}, …] top 8 companies
app.get("/api/analytics/top-companies/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");

    const [rows] = await db.query(
      `SELECT c.company_name AS company, COUNT(*) AS count
       FROM Applications a
       JOIN Companies c ON a.company_id = c.company_id
       WHERE a.user_id = ? ${clause}
       GROUP BY c.company_name
       ORDER BY count DESC
       LIMIT 8`,
      [userId, ...params],
    );

    res.json(rows.map(r => ({ company: r.company, count: +r.count })));
  } catch (err) {
    console.error("[analytics/top-companies]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/analytics/rounds/:userId?months=N
// Returns [{round_type, count}, …] interview round type breakdown
app.get("/api/analytics/rounds/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");

    const [rows] = await db.query(
      `SELECT ir.round_type, COUNT(*) AS count
       FROM InterviewRounds ir
       JOIN Applications a ON ir.application_id = a.application_id
       WHERE a.user_id = ? ${clause}
       GROUP BY ir.round_type
       ORDER BY count DESC`,
      [userId, ...params],
    );

    res.json(rows.map(r => ({ round_type: r.round_type, count: +r.count })));
  } catch (err) {
    console.error("[analytics/rounds]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/analytics/questions/:userId?months=N
// Returns [{company_name, role, questions_asked, next_round_prep}, …]
app.get("/api/analytics/questions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");

    const [rows] = await db.query(
      `SELECT
         c.company_name,
         a.role,
         n.note_text AS questions_asked,
         '' AS next_round_prep
       FROM Applications a
       JOIN Companies c ON a.company_id = c.company_id
       LEFT JOIN ApplicationNotes n ON a.application_id = n.application_id
       WHERE a.user_id = ?
         AND n.note_text IS NOT NULL
         AND n.note_text != ''
         ${clause}
       ORDER BY a.application_date DESC`,
      [userId, ...params],
    );

    res.json(rows);
  } catch (err) {
    console.error("[analytics/questions]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/analytics/oa-cleared/:userId?months=N
app.get("/api/analytics/oa-cleared/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { clause, params } = dateFilter(req.query.months, "a.application_date");

    const [rows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM Applications a
       WHERE a.user_id = ?
         AND a.status = 'OA Cleared'
         ${clause}`,
      [userId, ...params],
    );

    res.json({ count: +rows[0].count });
  } catch (err) {
    console.error("[analytics/oa-cleared]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// POST /api/questions/add
// Body: { userId, questionText, topic, difficulty, company, notes }
app.post("/api/questions/add", async (req, res) => {
  try {
    const { userId, questionText, topic, difficulty, company, notes } = req.body;

    if (!userId || !questionText || !difficulty) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Build the full question text (embed company + notes if provided)
    let fullText = questionText;
    if (company) fullText += `\n[Company: ${company}]`;
    if (notes)   fullText += `\n[Notes: ${notes}]`;

    // 1. Insert question into Questions table
    const [result] = await db.query(
      `INSERT INTO Questions (question_text, topic, difficulty)
       VALUES (?, ?, ?)`,
      [fullText, topic || "General", difficulty],
    );

    const questionId = result.insertId;

    // 2. Link to user in QuestionPractice (mark as encountered/solved)
    await db.query(
      `INSERT INTO QuestionPractice (user_id, question_id, solved)
       VALUES (?, ?, 1)`,
      [userId, questionId],
    );

    res.json({ success: true, questionId });
  } catch (err) {
    console.error("[questions/add]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/dashboard/difficulty/:userId

// Returns { easy, medium, hard } count of solved questions by difficulty
app.get("/api/dashboard/difficulty/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.query(
      `SELECT q.difficulty, COUNT(*) AS count
       FROM QuestionPractice qp
       JOIN Questions q ON qp.question_id = q.question_id
       WHERE qp.user_id = ? AND qp.solved = 1
       GROUP BY q.difficulty`,
      [userId],
    );
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
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
