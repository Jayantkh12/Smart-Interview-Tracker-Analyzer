const db = require("../config/db");

const Feedback = {
  getAverageRating: async () => {
    const [rows] = await db.query("SELECT AVG(rating) AS avgRating FROM Feedback");
    return rows[0] || { avgRating: null };
  }
};

module.exports = Feedback;
