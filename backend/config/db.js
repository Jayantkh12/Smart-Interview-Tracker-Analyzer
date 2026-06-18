const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Jayant@2006",
  database: "project",
});

module.exports = pool;
