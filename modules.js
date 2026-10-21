
const { getPool } = require("./db");

async function testDatabase() {
  const db = getPool();
  const [rows] = await db.query("SELECT 1 AS connected");
  return rows[0].connected === 1;
}

module.exports = { testDatabase };
