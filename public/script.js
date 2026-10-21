

const serverStatus = document.getElementById("serverStatus");
const dbStatus = document.getElementById("dbStatus");
const checkButton = document.getElementById("checkButton");

async function checkServer() {
  serverStatus.textContent = "Checking server...";

  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("Server error");

    const data = await response.json();
    serverStatus.textContent = data.message;
  } catch (error) {
    serverStatus.textContent = "Server is not deployed yet.";
  }

  dbStatus.textContent = "Checking MySQL...";

  try {
    const response = await fetch("/api/database-status");
    const data = await response.json();

    dbStatus.textContent = data.message;
  } catch (error) {
    dbStatus.textContent = "MySQL is not configured yet.";
  }
}

checkButton.addEventListener("click", checkServer);
checkServer();
