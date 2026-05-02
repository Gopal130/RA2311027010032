# RA2311027010032

Backend submission for Campus Hiring Evaluation.

## Project Structure
RA2311027010032/
├── logging_middleware/       # Reusable logging package
├── vehicle_scheduling/       # Vehicle Maintenance Scheduler Microservice
├── notification_app_be/      # Campus Notifications Microservice
└── notification_system_design.md  # System design for all 6 stages


## Logging Middleware

A reusable Node.js package that sends structured logs to the evaluation server.

- Supports stack: `backend`, `frontend`
- Supports levels: `debug`, `info`, `warn`, `error`, `fatal`
- Validates all inputs before sending
- Used extensively across all services

## Vehicle Maintenance Scheduler

Fetches depot and vehicle data from the evaluation API and determines the optimal
set of vehicles to service per depot using a 0/1 Knapsack algorithm to maximise
total operational impact within the available mechanic-hour budget.

- Fetches live depot and vehicle data from API
- Runs knapsack DP for each depot independently
- Logs all operations via logging middleware

## Campus Notifications Microservice

A backend system design and implementation for a campus notification platform
delivering real-time updates for Placements, Events, and Results.

- Stage 1: REST API design with WebSocket real-time mechanism
- Stage 2: PostgreSQL schema design with scaling strategies
- Stage 3: Query analysis and optimization with indexing
- Stage 4: Caching strategy using Redis
- Stage 5: Bulk notification redesign with queues
- Stage 6: Priority inbox implementation (Placement > Result > Event)

## Tech Stack

- Node.js
- JavaScript
- axios
