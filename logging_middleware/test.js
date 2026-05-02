const { Log, setToken } = require("./index");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJnYTMwNTRAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwNTA5NiwiaWF0IjoxNzc3NzA0MTk2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiMzc3ZDljZGUtYmFkZi00YTVjLTkwMmUtMWY5NjZiMjk3ZmZlIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZ29wYWwga3Jpc2hhbiBhcm9yYSIsInN1YiI6IjFlZjYwZTg3LWJhYzMtNDQ0OS1iYWU0LTg4OGI4ZmIwNjZmNCJ9LCJlbWFpbCI6ImdhMzA1NEBzcm1pc3QuZWR1LmluIiwibmFtZSI6ImdvcGFsIGtyaXNoYW4gYXJvcmEiLCJyb2xsTm8iOiJyYTIzMTEwMjcwMTAwMzIiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiIxZWY2MGU4Ny1iYWMzLTQ0NDktYmFlNC04ODhiOGZiMDY2ZjQiLCJjbGllbnRTZWNyZXQiOiJSZW5QQmJCYmFzYUFqTlVOIn0.E0ofxPNaZNnb30iqaz3mNgougCu9UsLIGwGd26zFah0"; // paste your latest token

setToken(TOKEN);

async function test() {
  await Log("backend", "info", "service", "Middleware test started");
  await Log("backend", "debug", "controller", "Testing controller log");
  await Log("backend", "warn", "db", "Testing warning log");
  await Log("backend", "error", "handler", "Testing error log");
  await Log("backend", "fatal", "db", "Testing fatal log");
  console.log("All test logs sent!");
}

test();