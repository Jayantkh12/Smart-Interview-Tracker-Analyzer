const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const db = require("./config/db");
const app = express();

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

    await db.query(
      "INSERT INTO Users (name, phoneNo, email, password) VALUES (?, ?, ?, ?)",
      [name, phone, email, password],
    );

    res.json({
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
      return res.json({
        message: "User Not Found",
      });
    }

    const user = users[0];

    if (user.password !== password) {
      return res.json({
        message: "Wrong Password",
      });
    }

    res.json({
      message: "Login Successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
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
