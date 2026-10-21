
const serverStatus = document.getElementById("serverStatus");
const dbStatus = document.getElementById("dbStatus");
const checkButton = document.getElementById("checkButton");

async function checkServer() {
  if (serverStatus) {
    serverStatus.textContent = "Checking server...";
  }

  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("Server error");

    const data = await response.json();

    if (serverStatus) {
      serverStatus.textContent = data.message;
    }
  } catch (error) {
    if (serverStatus) {
      serverStatus.textContent = "Server connection failed.";
    }
  }

  if (dbStatus) {
    dbStatus.textContent = "Checking Neon PostgreSQL...";
  }

  try {
    const response = await fetch("/api/database-status");
    const data = await response.json();

    if (dbStatus) {
      dbStatus.textContent = data.message;
    }
  } catch (error) {
    if (dbStatus) {
      dbStatus.textContent = "Neon PostgreSQL connection failed.";
    }
  }
}

if (checkButton) {
  checkButton.addEventListener("click", checkServer);
}

checkServer();
  
