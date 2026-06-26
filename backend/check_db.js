const db = require("./config/db");

async function check() {
  try {
    const [tables] = await db.query("SHOW TABLES");
    console.log("Tables in DB:", tables);

    for (let tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const [columns] = await db.query(`DESCRIBE ${tableName}`);
      console.log(`\nTable: ${tableName}`);
      console.table(columns);
    }
  } catch (err) {
    console.error("Error connecting/querying db:", err);
  } finally {
    process.exit();
  }
}

check();
