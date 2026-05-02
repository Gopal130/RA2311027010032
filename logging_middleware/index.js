const axios = require("axios");

const BASE_URL = "http://20.207.122.201/evaluation-service";

let authToken = "";

function setToken(token) {
  authToken = token;
}

async function Log(stack, level, packageName, message) {
  const validStacks = ["backend", "frontend"];
  const validLevels = ["debug", "info", "warn", "error", "fatal"];

  const backendPackages = [
    "cache", "controller", "cron_job", "db", "domain",
    "handler", "repository", "route", "service"
  ];
  const frontendPackages = ["api", "component", "hook", "page", "state", "style"];
  const sharedPackages = ["auth", "config", "middleware", "utils"];

  if (!validStacks.includes(stack)) {
    console.error(`[LOG SKIPPED] Invalid stack: ${stack}`);
    return;
  }
  if (!validLevels.includes(level)) {
    console.error(`[LOG SKIPPED] Invalid level: ${level}`);
    return;
  }

  const allowed = [
    ...sharedPackages,
    ...(stack === "backend" ? backendPackages : frontendPackages)
  ];
  if (!allowed.includes(packageName)) {
    console.error(`[LOG SKIPPED] Invalid package: ${packageName} for stack: ${stack}`);
    return;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/logs`,
      {
        stack: stack,
        level: level,
        package: packageName,
        message: message
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`[LOG OK] ${level.toUpperCase()} | ${stack} | ${packageName} | ${message}`);
    return response.data;
  } catch (err) {
    console.error("[LOG FAILED]", err?.response?.data || err.message);
  }
}

module.exports = { Log, setToken };