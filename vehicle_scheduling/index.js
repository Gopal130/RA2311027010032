const axios = require("axios");
const { Log, setToken } = require("../logging_middleware/index");

const BASE_URL = "http://20.207.122.201/evaluation-service";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJnYTMwNTRAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMzI2MywiaWF0IjoxNzc3NzAyMzYzLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYmY5Mjg0ZjAtNTc2Yy00NTQ2LTkxMWUtNWE2MDgzNzUwZjUwIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZ29wYWwga3Jpc2hhbiBhcm9yYSIsInN1YiI6IjFlZjYwZTg3LWJhYzMtNDQ0OS1iYWU0LTg4OGI4ZmIwNjZmNCJ9LCJlbWFpbCI6ImdhMzA1NEBzcm1pc3QuZWR1LmluIiwibmFtZSI6ImdvcGFsIGtyaXNoYW4gYXJvcmEiLCJyb2xsTm8iOiJyYTIzMTEwMjcwMTAwMzIiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiIxZWY2MGU4Ny1iYWMzLTQ0NDktYmFlNC04ODhiOGZiMDY2ZjQiLCJjbGllbnRTZWNyZXQiOiJSZW5QQmJCYmFzYUFqTlVOIn0.Hqtn8K5vs5lIuSiiwzHAjJ56UmP_Q8BM37B0FSc93Yg";
setToken(TOKEN);

const headers = {
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
  }
};

// 0/1 Knapsack Algorithm
function knapsack(vehicles, capacity) {
  const n = vehicles.length;
  const dp = Array.from({ length: n + 1 }, () =>
    new Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const { Duration, Impact } = vehicles[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (Duration <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - Duration] + Impact);
      }
    }
  }

  // Backtrack to find selected vehicles
  let w = capacity;
  const selected = [];
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  return { maxImpact: dp[n][capacity], selected };
}

async function main() {
  await Log("backend", "info", "service", "Vehicle Scheduling Microservice started");

  // Fetch Depots
  let depots;
  try {
    await Log("backend", "info", "route", "Fetching depots from evaluation service");
    const res = await axios.get(`${BASE_URL}/depots`, headers);
    depots = res.data.depots;
    await Log("backend", "info", "service", `Fetched ${depots.length} depots`);
  } catch (err) {
    await Log("backend", "error", "service", `Failed to fetch depots: ${err.message}`);
    return;
  }

  // Fetch Vehicles
  let vehicles;
  try {
    await Log("backend", "info", "route", "Fetching vehicles from evaluation service");
    const res = await axios.get(`${BASE_URL}/vehicles`, headers);
    vehicles = res.data.vehicles;
    await Log("backend", "info", "service", `Fetched ${vehicles.length} vehicles`);
  } catch (err) {
    await Log("backend", "error", "service", `Failed to fetch vehicles: ${err.message}`);
    return;
  }

  // Process each depot
  for (const depot of depots) {
    const { ID, MechanicHours } = depot;

    await Log("backend", "info", "service",
      `Running knapsack for depot ${ID} with budget ${MechanicHours} hours`);

    const { maxImpact, selected } = knapsack(vehicles, MechanicHours);
    const totalDuration = selected.reduce((sum, v) => sum + v.Duration, 0);

    console.log(`\n========== Depot ID: ${ID} | Budget: ${MechanicHours}h ==========`);
    console.log(`Max Impact Score : ${maxImpact}`);
    console.log(`Total Hours Used : ${totalDuration}h`);
    console.log(`Tasks Selected   : ${selected.length}`);
    console.log("Selected Tasks:");
    selected.forEach((v, i) => {
      console.log(`  ${i + 1}. TaskID: ${v.TaskID} | Duration: ${v.Duration}h | Impact: ${v.Impact}`);
    });

    await Log("backend", "info", "service", `Depot ${ID} maxImpact:${maxImpact} tasks:${selected.length}`);
  }

  await Log("backend", "info", "service", "Vehicle Scheduling Microservice completed");
}

main();