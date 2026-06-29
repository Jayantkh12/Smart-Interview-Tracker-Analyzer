require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "Project",
  port: process.env.MYSQL_PORT || 3306,
});

module.exports = pool;
