const db = require("../config/db");

const User = {
  findByEmail: async (email) => {
    const [rows] = await db.query("SELECT * FROM Users WHERE email = ?", [email]);
    return rows;
  },
  findById: async (id) => {
    const [rows] = await db.query("SELECT * FROM Users WHERE id = ?", [id]);
    return rows;
  },
  create: async (name, phone, email, password) => {
    const [result] = await db.query(
      "INSERT INTO Users (name, phoneNo, email, password) VALUES (?, ?, ?, ?)",
      [name, phone, email, password]
    );
    return result;
  },
  updatePassword: async (hashedPassword, email) => {
    const [result] = await db.query(
      "UPDATE Users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );
    return result;
  },
  updatePasswordById: async (hashedPassword, userId) => {
    const [result] = await db.query(
      "UPDATE Users SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );
    return result;
  },
  deleteById: async (userId) => {
    const [result] = await db.query("DELETE FROM Users WHERE id = ?", [userId]);
    return result;
  },
  getProfile: async (userId) => {
    const [rows] = await db.query(
      "SELECT name, email, phoneNo, profile_photo, college, branch, graduation_year, preferred_role, expected_package, preferred_location, work_type FROM Users WHERE id=?",
      [userId]
    );
    return rows;
  },
  updateProfile: async (userId, data) => {
    const { name, phone, college, branch, graduationYear, preferredRole, expectedPackage, preferredLocation, workType } = data;
    const [result] = await db.query(
      `UPDATE Users SET name=?, phoneNo=?, college=?, branch=?, graduation_year=?,
       preferred_role=?, expected_package=?, preferred_location=?, work_type=? WHERE id=?`,
      [name, phone, college, branch, graduationYear || null,
       preferredRole || null, expectedPackage || null, preferredLocation || null, workType || null,
       userId]
    );
    return result;
  },
  updateProfilePhoto: async (userId, filename) => {
    const [result] = await db.query("UPDATE Users SET profile_photo=? WHERE id=?", [filename, userId]);
    return result;
  }
};

module.exports = User;
