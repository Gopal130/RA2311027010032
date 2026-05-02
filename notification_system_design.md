# Notification System Design

## Stage 1

## Overview
A campus notification platform delivering real-time updates for Placements, Events, and Results to students.

### REST API Endpoints

#### 1. Get All Notifications for a Student
**GET** `/api/v1/notifications`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement | Event | Result",
      "message": "string",
      "isRead": false,
      "timestamp": "2026-04-22T17:51:30Z"
    }
  ]
}
```

#### 2. Mark Notification as Read
**PATCH** `/api/v1/notifications/:id/read`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{ "success": true, "message": "Notification marked as read" }
```

#### 3. Get Unread Count
**GET** `/api/v1/notifications/unread-count`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{ "unreadCount": 5 }
```

#### 4. Mark All as Read
**PATCH** `/api/v1/notifications/read-all`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{ "success": true }
```

### Real-Time Notification Mechanism
Use **WebSockets** via Socket.IO.

- On student login, client opens a WebSocket connection to the server
- Server maintains a room per studentID
- When a new notification is created, server emits to that student's room
- Client receives it instantly without polling

**Event payload:**
```json
{
  "event": "new_notification",
  "data": {
    "id": "uuid",
    "type": "Placement",
    "message": "TCS hiring drive scheduled",
    "timestamp": "2026-04-22T18:00:00Z"
  }
}
```

---

## Stage 2

### Recommended Database: PostgreSQL

**Reason:** Notifications have structured relational data (student → notification).
PostgreSQL supports strong indexing, ACID transactions, and handles high-write
workloads well. It also supports ENUM types natively for notification categories.

### Schema

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Scaling Problems and Solutions

| Problem | Solution |
|---|---|
| Table grows to billions of rows | Partition by created_at monthly |
| Slow reads for unread notifications | Composite index on student_id and is_read |
| High write volume during events | Use a message queue like Redis BullMQ |
| Fetching all columns is slow | Select only needed columns, avoid SELECT * |

### SQL Queries

```sql
-- Fetch unread notifications for a student
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC;

-- Count unread notifications
SELECT COUNT(*)
FROM notifications
WHERE student_id = 1042 AND is_read = false;
```

---

## Stage 3

### Original Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Why is it slow?
- `SELECT *` fetches all columns including large text fields unnecessarily
- No index on `(student_id, is_read)` so the DB does a full table scan
- At 5,000,000 rows a full scan is O(n) which is very slow
- `ORDER BY createdAt DESC` without an index adds an expensive sort step

### Is this query accurate?
The query logic is correct but the column names use camelCase which may not
match the actual schema. Should use snake_case: `student_id`, `is_read`, `created_at`.

### Fix

```sql
-- Add composite index
CREATE INDEX idx_notifications_student_unread
ON notifications(student_id, is_read, created_at DESC);

-- Optimized query
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC;
```

### About indexing every column
This is bad advice. Each index adds overhead on INSERT, UPDATE and DELETE
operations. Storage usage increases significantly. The query planner can also
get confused with too many indexes. Only index columns used in WHERE, ORDER BY
or JOIN clauses.

### Find students who got a Placement notification in last 7 days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### Problem
Notifications are fetched on every page load for every student, overwhelming the DB.

### Solutions and Tradeoffs

#### 1. Redis Cache (Recommended)
- Cache `notifications:{student_id}` with TTL of 60 seconds
- On new notification: invalidate or update the cache entry
- **Pro:** Near-instant reads, DB load drops dramatically
- **Con:** Cache invalidation complexity, slight staleness possible

#### 2. Pagination
- Fetch only 20 notifications per page instead of all at once
- **Pro:** Reduces data transferred per request
- **Con:** Does not reduce DB query frequency on its own

#### 3. HTTP Cache Headers
- Use `Cache-Control: max-age=30` on the GET endpoint
- **Pro:** Zero infrastructure cost
- **Con:** Not suitable for real-time notification updates

### Recommended Approach
Combine Redis caching with pagination:
1. Cache paginated results per student in Redis
2. Invalidate cache on new notification via pub/sub
3. Use WebSocket to push new items to client without any page reload

---

## Stage 5

### Shortcomings of Original Implementation

```
function notify_all(student_ids, message):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

1. **Sequential processing** — 50,000 students processed one by one is extremely slow
2. **No error handling** — email failed at student 200, remaining 49,800 are skipped
3. **Tight coupling** — email, DB and push are in one loop, one failure blocks all
4. **No atomicity** — partial failures leave inconsistent state in DB

### Redesigned Approach

```
function notify_all(student_ids, message):
  // Step 1: Bulk insert all notifications to DB atomically
  bulk_insert_notifications(student_ids, message)

  // Step 2: Push jobs to queues in batches
  for batch of 500 in student_ids:
    email_queue.push({ batch, message })
    push_queue.push({ batch, message })

// Email worker runs independently
email_worker():
  job = email_queue.pop()
  for student_id in job.batch:
    try:
      send_email(student_id, job.message)
    except:
      retry_queue.push(student_id)

// Push worker runs independently
push_worker():
  job = push_queue.pop()
  bulk_push_to_app(job.batch, job.message)
```

### Should DB save and email happen together?
No. They should be fully decoupled:
- DB insert happens immediately and is the source of truth
- Email is a side effect that goes through a queue with retries
- If email fails the notification still exists in DB and student sees it in-app
- Coupling them means a failed email could prevent DB from saving, losing the notification entirely

---

## Stage 6

### Approach: Priority Inbox

Notifications are scored using two factors:
1. **Type weight** — Placement = 3, Result = 2, Event = 1
2. **Recency** — more recent notifications rank higher within the same type

**Score formula:**
```
priorityScore = typeWeight * 10^13 + timestamp_in_milliseconds
```

Multiplying typeWeight by 10^13 ensures type always dominates over recency.
Within the same type, more recent notifications appear first.

### Handling new notifications efficiently
- Maintain a **max-heap** (priority queue) of size n
- When a new notification arrives via WebSocket, insert into heap
- If heap size exceeds n, remove the lowest priority item
- This gives O(log n) insertion and always keeps top n without re-sorting all

### Code
See `notification_app_be/priority_inbox.js`

### Sample Output (Top 10)
```
1. [Placement] "PayPal Holdings Inc. hiring"     | 2026-05-02 05:28:39
2. [Placement] "Microsoft Corporation hiring"    | 2026-05-01 20:58:27
3. [Placement] "AMD hiring"                      | 2026-05-01 20:58:21
4. [Placement] "PayPal Holdings Inc. hiring"     | 2026-05-01 12:58:09
5. [Placement] "TSMC hiring"                     | 2026-05-01 11:58:45
6. [Placement] "Marvell Technology hiring"       | 2026-05-01 10:57:45
7. [Placement] "Booking Holdings hiring"         | 2026-05-01 09:28:51
8. [Result]    "end-sem"                         | 2026-05-01 15:29:15
9. [Result]    "project-review"                  | 2026-05-01 05:57:57
10. [Event]    "traditional-day"                 | 2026-05-02 03:28:57
```