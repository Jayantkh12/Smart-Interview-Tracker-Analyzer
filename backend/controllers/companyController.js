const Company = require("../models/Company");

exports.getTopCompanies = async (req, res) => {
  try {
    const { userId } = req.params;
    const months = parseInt(req.query.months) || 0;
    
    // Date filter clause builder
    let clause = "";
    let params = [];
    if (months > 0) {
      clause = "AND a.application_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)";
      params = [months];
    }

    const rows = await Company.getTopCompanies(userId, clause, params);
    res.json(rows.map(r => ({ company: r.company, count: +r.count })));
  } catch (err) {
    console.error("[analytics/top-companies]", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
