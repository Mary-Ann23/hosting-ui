
const { getPool } = require("./db");

async function testDatabase() {
  const db = getPool();
  const result = await db.query("SELECT 1 AS connected");

  return result.rows[0].connected === 1;
}

module.exports = { testDatabase };

