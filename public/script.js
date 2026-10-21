
const serverStatus = document.getElementById("serverStatus");
const dbStatus = document.getElementById("dbStatus");
const checkButton = document.getElementById("checkButton");

async function checkServer() {
  serverStatus.textContent = "Checking...";

  try {
    const response = await fetch("/api/status");
    if (!response.ok) {
      throw new Error("Server returned an error");
    }

    const data = await response.json();
    serverStatus.textContent = data.message;
  } catch (error) {
    serverStatus.textContent =
      "Server not connected. Deploy the Node.js app first.";
  }
}

checkButton.addEventListener("click", checkServer);
