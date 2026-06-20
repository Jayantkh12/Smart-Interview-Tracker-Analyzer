const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const db = require("./config/db");
const app = express();
const bcrypt = require("bcryptjs");

// JSON data receive karne ke liye
app.use(express.json());

// Frontend ko request allow karne ke liye
app.use(cors());

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
      `SELECT COUNT(*) AS totalRejectionsFROM ApplicationsWHERE user_id = ?AND status = 'Rejected'`,
      [userId],
    );

    res.json({
      applications: applications[0].totalApplications,
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
        lastUpdated: "--",
        totalResumes: 0,
      });
    }

    res.json({
      activeResume: resumes[0].resume_title,
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

app.get("/api/dashboard/recent-applications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [applications] = await db.query(
      `SELECT a.application_id, c.company_name, a.role, a.status, a.application_dat FROM Applications  JOIN Companies  ON a.company_id = c.company_i WHERE a.user_id =  ORDER BY a.application_date DES LIMIT 5`,
      [userId],
    );

    res.json(applications);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.listen(5500, () => {
  console.log("Server running on port 5500");
});
