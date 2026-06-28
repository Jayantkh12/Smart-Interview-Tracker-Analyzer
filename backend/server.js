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
    user: "jayantkh12@gmail.com",
    pass: "izjm zjgm xcio tkop",
  },
});
//FORM

app.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    await transporter.sendMail({
      from: email,

      to: "YOUR_GMAIL@gmail.com",

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

    res.json({
      success: true,
      message: "Profile picture uploaded successfully.",
      filename: req.file.filename,
      imageUrl: "http://localhost:5500/uploads/profile/" + req.file.filename,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Upload failed.",
    });
  }
});

//Get Profile API
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      "SELECT name,email,profile_photo FROM Users WHERE id=?",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      name: rows[0].name,
      email: rows[0].email,
      profilePic: rows[0].profile_photo,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

app.listen(5500, () => {
  console.log("Server running on port 5500");
});
