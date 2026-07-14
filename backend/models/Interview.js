const db = require("../config/db");

const Interview = {
  // Application CRUD
  createApplication: async (userId, companyId, role, status) => {
    const [result] = await db.query(
      `INSERT INTO Applications
      (user_id, company_id, role, application_date, status)
      VALUES (?, ?, ?, CURDATE(), ?)`,
      [userId, companyId, role, status || "Applied"]
    );
    return result;
  },
  createApplicationNote: async (applicationId, notes) => {
    const [result] = await db.query(
      `INSERT INTO ApplicationNotes
      (application_id, note_text)
      VALUES (?, ?)`,
      [applicationId, notes]
    );
    return result;
  },
  getApplications: async (userId) => {
    const [rows] = await db.query(
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
      [userId]
    );
    return rows;
  },
  getApplicationDetails: async (applicationId) => {
    const [rows] = await db.query(
      `SELECT
          a.application_id,
          a.user_id,
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
      [applicationId]
    );
    return rows;
  },
  updateApplication: async (applicationId, status, companyId, role) => {
    const [result] = await db.query(
      `UPDATE Applications
       SET status = ?, company_id = ?, role = ?
       WHERE application_id = ?`,
      [status, companyId, role, applicationId]
    );
    return result;
  },
  getNoteByAppId: async (applicationId) => {
    const [rows] = await db.query("SELECT * FROM ApplicationNotes WHERE application_id = ?", [applicationId]);
    return rows;
  },
  updateNote: async (applicationId, notes) => {
    const [result] = await db.query("UPDATE ApplicationNotes SET note_text = ? WHERE application_id = ?", [notes, applicationId]);
    return result;
  },
  createNote: async (applicationId, notes) => {
    const [result] = await db.query("INSERT INTO ApplicationNotes (application_id, note_text) VALUES (?, ?)", [applicationId, notes]);
    return result;
  },
  deleteApplicationNotes: async (applicationId) => {
    const [result] = await db.query("DELETE FROM ApplicationNotes WHERE application_id = ?", [applicationId]);
    return result;
  },
  deleteApplication: async (applicationId) => {
    const [result] = await db.query("DELETE FROM Applications WHERE application_id = ?", [applicationId]);
    return result;
  },

  // Account Cascade Deletes
  deleteAccountCascade: async (userId) => {
    // Delete child dependencies that do not have ON DELETE CASCADE in SQL schema
    await db.query(`DELETE f FROM Feedback f JOIN InterviewRounds ir ON f.round_id = ir.round_id JOIN Applications a ON ir.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    await db.query(`DELETE ra FROM ResumeAnalysis ra JOIN Resumes r ON ra.resume_id = r.resume_id WHERE r.user_id = ?`, [userId]);

    await db.query(`DELETE an FROM ApplicationNotes an JOIN Applications a ON an.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    await db.query(`DELETE ir FROM InterviewRounds ir JOIN Applications a ON ir.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    await db.query(`DELETE FROM Applications WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM Resumes WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM UserSkills WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM QuestionPractice WHERE user_id = ?`, [userId]);
  },

  // Dashboard Stats
  getDashboardStats: async (userId) => {
    const [applications] = await db.query(`SELECT COUNT(*) AS totalApplications FROM Applications WHERE user_id = ?`, [userId]);
    const [interviews] = await db.query(`SELECT COUNT(*) AS totalInterviews FROM InterviewRounds ir JOIN Applications a ON ir.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    const [offers] = await db.query(`SELECT COUNT(*) AS totalOffers FROM Applications WHERE user_id = ? AND status = 'Selected'`, [userId]);
    const [rejections] = await db.query(`SELECT COUNT(*) AS totalRejections FROM Applications WHERE user_id = ? AND status = 'Rejected'`, [userId]);
    return {
      applications: applications[0].totalApplications,
      interviews: interviews[0].totalInterviews,
      offers: offers[0].totalOffers,
      rejections: rejections[0].totalRejections
    };
  },

  // Resumes
  getResumes: async (userId) => {
    const [rows] = await db.query(`SELECT * FROM Resumes WHERE user_id = ? ORDER BY upload_date DESC`, [userId]);
    return rows;
  },
  createResume: async (userId, resumeTitle, resumeFile, today) => {
    const [result] = await db.query(
      `INSERT INTO Resumes (user_id, resume_title, resume_file, upload_date) VALUES (?, ?, ?, ?)`,
      [userId, resumeTitle, resumeFile, today]
    );
    return result;
  },
  getLatestResume: async (userId) => {
    const [rows] = await db.query(
      `SELECT resume_id, resume_title, resume_file, upload_date
       FROM Resumes WHERE user_id = ?
       ORDER BY upload_date DESC, resume_id DESC LIMIT 1`,
      [userId]
    );
    return rows;
  },

  // Recent apps and upcoming rounds
  getRecentApplications: async (userId) => {
    const [rows] = await db.query(
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
      [userId]
    );
    return rows;
  },
  getUpcomingInterviews: async (userId) => {
    const [rows] = await db.query(
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
      [userId]
    );
    return rows;
  },

  // Application Page stats
  getApplicationStats: async (userId) => {
    const [applications] = await db.query(`SELECT COUNT(*) AS totalApplications FROM Applications WHERE user_id = ?`, [userId]);
    const [applied] = await db.query(`SELECT COUNT(*) AS appliedApplications FROM Applications WHERE user_id = ? AND status = 'Applied'`, [userId]);
    const [interviews] = await db.query(`SELECT COUNT(*) AS totalInterviews FROM InterviewRounds ir JOIN Applications a ON ir.application_id = a.application_id WHERE a.user_id = ?`, [userId]);
    const [offers] = await db.query(`SELECT COUNT(*) AS totalOffers FROM Applications WHERE user_id = ? AND status = 'Selected'`, [userId]);
    const [rejections] = await db.query(`SELECT COUNT(*) AS totalRejections FROM Applications WHERE user_id = ? AND status = 'Rejected'`, [userId]);
    return {
      applications: applications[0].totalApplications,
      appliedApplications: applied[0].appliedApplications,
      interviews: interviews[0].totalInterviews,
      offers: offers[0].totalOffers,
      rejections: rejections[0].totalRejections
    };
  },

  // Analytics Stats
  getAnalyticsStats: async (userId, clause, params) => {
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
      [userId, ...params]
    );
    return totals[0] || {};
  },
  getAnalyticsAvgDays: async (userId, clause, params) => {
    const [rows] = await db.query(
      `SELECT AVG(DATEDIFF(ir.round_date, a.application_date)) AS avgDays
       FROM Applications a
       JOIN InterviewRounds ir ON ir.application_id = a.application_id
       WHERE a.user_id = ?
         AND ir.round_date IS NOT NULL
         AND ir.round_date >= a.application_date
         ${clause}`,
      [userId, ...params]
    );
    return rows[0] || {};
  },
  getAnalyticsMonthly: async (userId, months) => {
    const [rows] = await db.query(
      `SELECT
         DATE_FORMAT(application_date, '%Y-%m') AS month,
         COUNT(*) AS count
       FROM Applications
       WHERE user_id = ?
         AND application_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY month
       ORDER BY month ASC`,
      [userId, months]
    );
    return rows;
  },
  getAnalyticsRounds: async (userId, clause, params) => {
    const [rows] = await db.query(
      `SELECT ir.round_type, COUNT(*) AS count
       FROM InterviewRounds ir
       JOIN Applications a ON ir.application_id = a.application_id
       WHERE a.user_id = ? ${clause}
       GROUP BY ir.round_type
       ORDER BY count DESC`,
      [userId, ...params]
    );
    return rows;
  },
  getAnalyticsQuestions: async (userId, clause, params) => {
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
      [userId, ...params]
    );
    return rows;
  },
  getAnalyticsOACleared: async (userId, clause, params) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM Applications a
       WHERE a.user_id = ?
         AND a.status = 'OA Cleared'
         ${clause}`,
      [userId, ...params]
    );
    return rows[0] || {};
  },

  // Questions practice list
  createQuestion: async (questionText, topic, difficulty) => {
    const [result] = await db.query(
      `INSERT INTO Questions (question_text, topic, difficulty)
       VALUES (?, ?, ?)`,
      [questionText, topic, difficulty]
    );
    return result;
  },
  createUserQuestionPractice: async (userId, questionId) => {
    const [result] = await db.query(
      `INSERT INTO QuestionPractice (user_id, question_id, solved)
       VALUES (?, ?, 1)`,
      [userId, questionId]
    );
    return result;
  },
  createInterviewRound: async (applicationId, roundType, roundDate, result) => {
    const [resultRow] = await db.query(
      `INSERT INTO InterviewRounds (application_id, round_type, round_date, result)
       VALUES (?, ?, ?, ?)`,
      [applicationId, roundType, roundDate || null, result || null]
    );
    return resultRow;
  },
  updateApplicationStatus: async (applicationId, status) => {
    await db.query(
      `UPDATE Applications SET status = ? WHERE application_id = ?`,
      [status, applicationId]
    );
  },
  getUserQuestions: async (userId) => {
    const [rows] = await db.query(
      `SELECT q.question_id, q.question_text, q.topic, q.difficulty, qp.solved
       FROM QuestionPractice qp
       JOIN Questions q ON qp.question_id = q.question_id
       WHERE qp.user_id = ?
       ORDER BY qp.practice_id DESC
       LIMIT 50`,
      [userId]
    );
    return rows;
  },
  getUserDifficultyStats: async (userId) => {
    const [rows] = await db.query(
      `SELECT q.difficulty, COUNT(*) AS count
       FROM QuestionPractice qp
       JOIN Questions q ON qp.question_id = q.question_id
       WHERE qp.user_id = ? AND qp.solved = 1
       GROUP BY q.difficulty`,
      [userId]
    );
    return rows;
  }
};

module.exports = Interview;
