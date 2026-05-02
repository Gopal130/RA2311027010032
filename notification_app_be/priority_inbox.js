const axios = require("axios");
const { Log, setToken } = require("../logging_middleware/index");

const BASE_URL = "http://20.207.122.201/evaluation-service";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJnYTMwNTRAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMzI2MywiaWF0IjoxNzc3NzAyMzYzLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYmY5Mjg0ZjAtNTc2Yy00NTQ2LTkxMWUtNWE2MDgzNzUwZjUwIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZ29wYWwga3Jpc2hhbiBhcm9yYSIsInN1YiI6IjFlZjYwZTg3LWJhYzMtNDQ0OS1iYWU0LTg4OGI4ZmIwNjZmNCJ9LCJlbWFpbCI6ImdhMzA1NEBzcm1pc3QuZWR1LmluIiwibmFtZSI6ImdvcGFsIGtyaXNoYW4gYXJvcmEiLCJyb2xsTm8iOiJyYTIzMTEwMjcwMTAwMzIiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiIxZWY2MGU4Ny1iYWMzLTQ0NDktYmFlNC04ODhiOGZiMDY2ZjQiLCJjbGllbnRTZWNyZXQiOiJSZW5QQmJCYmFzYUFqTlVOIn0.Hqtn8K5vs5lIuSiiwzHAjJ56UmP_Q8BM37B0FSc93Yg";

setToken(TOKEN);

const PRIORITY_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1
};

function priorityScore(notification) {
  const typeWeight = PRIORITY_WEIGHT[notification.Type] || 0;
  const recency = new Date(notification.Timestamp).getTime();
  return typeWeight * 1e13 + recency;
}

async function getTopNNotifications(n = 10) {
  await Log("backend", "info", "service", `Priority Inbox: top ${n}`);

  try {
    await Log("backend", "info", "route", "Fetching notifications");

    const res = await axios.get(`${BASE_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const notifications = res.data.notifications;
    await Log("backend", "info", "service", `Fetched ${notifications.length} notifications`);

    notifications.sort((a, b) => priorityScore(b) - priorityScore(a));

    const topN = notifications.slice(0, n);

    console.log(`\n========== TOP ${n} PRIORITY NOTIFICATIONS ==========`);
    topN.forEach((item, i) => {
      console.log(`${i + 1}. [${item.Type}] "${item.Message}" | ${item.Timestamp}`);
    });

    await Log("backend", "info", "service", `Returned top ${n} notifications`);
    return topN;

  } catch (err) {
    await Log("backend", "error", "service", `Fetch failed: ${err.message}`);
    throw err;
  }
}

getTopNNotifications(10);