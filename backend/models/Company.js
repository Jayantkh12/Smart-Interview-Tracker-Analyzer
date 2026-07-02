const db = require("../config/db");

const Company = {
  findByName: async (companyName) => {
    const [rows] = await db.query(
      "SELECT company_id FROM Companies WHERE company_name = ?",
      [companyName]
    );
    return rows;
  },
  create: async (companyName, packageLpa) => {
    const [result] = await db.query(
      `INSERT INTO Companies
      (company_name, company_email, company_location, package_lpa)
      VALUES (?, ?, ?, ?)`,
      [
        companyName,
        `${companyName}@example.com`,
        "Not Specified",
        packageLpa
      ]
    );
    return result;
  },
  getTopCompanies: async (userId, clause, params) => {
    const [rows] = await db.query(
      `SELECT c.company_name AS company, COUNT(*) AS count
       FROM Applications a
       JOIN Companies c ON a.company_id = c.company_id
       WHERE a.user_id = ? ${clause}
       GROUP BY c.company_name
       ORDER BY count DESC
       LIMIT 8`,
      [userId, ...params]
    );
    return rows;
  }
};

module.exports = Company;
