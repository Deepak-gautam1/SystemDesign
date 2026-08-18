import type { SQLProblem } from "./sql-problems";

// ── Hard tier — multi-table ratios, moving windows, and recursive CTEs ──────

export const SQL_PROBLEMS_HARD: SQLProblem[] = [
  {
    id: "trips-and-users",
    title: "Trips and Users — Cancellation Rate",
    difficulty: "hard",
    tags: ["Multi-Join", "Conditional Aggregation", "Ratio Calculation"],
    description: `Compute the daily cancellation rate for trips requested between 2013-10-01 and 2013-10-03, excluding any trip where either the client or the driver is banned.

**Schema — Trips table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| client_id | INTEGER | Foreign key → Users.users_id |
| driver_id | INTEGER | Foreign key → Users.users_id |
| city_id | INTEGER | |
| status | TEXT | 'completed', 'cancelled_by_driver', 'cancelled_by_client' |
| request_at | DATE | |

**Schema — Users table:**

| Column | Type | Notes |
|---|---|---|
| users_id | INTEGER | Primary key |
| banned | TEXT | 'Yes' or 'No' |
| role | TEXT | 'client', 'driver', or 'partner' |

**Task:**
- For each day in the range, report the cancellation rate rounded to 2 decimal places, as (Day, "Cancellation Rate")
- A trip counts toward the rate's denominator only if neither its client nor its driver is banned

**Note:**
- Filtering "not banned" belongs in the JOIN condition, not a top-level WHERE, when a LEFT JOIN is involved elsewhere in a query — here it's plain INNER JOINs, but the habit matters: putting the exclusion in the join's ON clause keeps the filter tied to exactly the table it's checking
- \`SUM(...) / COUNT(*)\` between two integers truncates to 0 or 1 in most engines — cast at least one side to a decimal/numeric type before dividing, or the "rate" comes out as 0 every time except a perfect 100% cancellation day`,
    concepts: ["Multi-table joins with filters in the join condition", "Conditional aggregation ratios", "Integer-division casting"],
    filename: "trips_and_users.sql",
    code: `SELECT
  t.request_at AS "Day",
  ROUND(
    SUM(CASE WHEN t.status <> 'completed' THEN 1 ELSE 0 END)::numeric
    / COUNT(*),
    2
  ) AS "Cancellation Rate"
FROM Trips t
JOIN Users c ON t.client_id = c.users_id AND c.banned = 'No'
JOIN Users d ON t.driver_id = d.users_id AND d.banned = 'No'
WHERE t.request_at BETWEEN '2013-10-01' AND '2013-10-03'
GROUP BY t.request_at
ORDER BY t.request_at;`,
    practicePrompt: `-- Schema: Trips(id INT, client_id INT, driver_id INT, city_id INT,
--               status TEXT, request_at DATE)
--         Users(users_id INT, banned TEXT, role TEXT)
--
-- For 2013-10-01 through 2013-10-03, report each day's cancellation rate
-- rounded to 2 decimals, excluding trips where the client or driver is banned.

-- TODO: write your query below
`,
  },

  {
    id: "friend-requests-most-friends",
    title: "Friend Requests II — Who Has the Most Friends",
    difficulty: "hard",
    tags: ["UNION ALL", "Symmetric Relationships", "GROUP BY"],
    description: `Find the person with the most friends and how many friends they have, given a table of accepted friend requests where each row could have either person as the requester.

**Schema — RequestAccepted table:**

| Column | Type | Notes |
|---|---|---|
| requester_id | INTEGER | |
| accepter_id | INTEGER | |
| accept_date | DATE | |

**Task:**
- Each accepted row is a mutual friendship — it counts as one friend for the requester AND one friend for the accepter
- Return the id with the highest total friend count, and that count, as (id, num)
- Assume no duplicate friendship rows and no ties to worry about

**Note:**
- A friendship is symmetric but the raw data isn't — id 5 might only ever appear as an accepter_id, never a requester_id. Stacking both columns into one list with **UNION ALL** before grouping is what correctly counts a person's friends regardless of which side of the original row they happened to be on
- It must be UNION ALL, not UNION — plain UNION would de-duplicate the stacked id list itself, which is a different, wrong list to count from (it would silently cap everyone's maximum possible count at the number of distinct people, not the number of actual friendships)`,
    concepts: ["UNION ALL to flatten a symmetric relationship", "GROUP BY + ORDER BY + LIMIT"],
    filename: "friend_requests_most_friends.sql",
    code: `WITH all_friends AS (
  SELECT requester_id AS id FROM RequestAccepted
  UNION ALL
  SELECT accepter_id AS id FROM RequestAccepted
)
SELECT id, COUNT(*) AS num
FROM all_friends
GROUP BY id
ORDER BY num DESC
LIMIT 1;`,
    practicePrompt: `-- Schema: RequestAccepted(requester_id INT, accepter_id INT, accept_date DATE)
--
-- Each row is a mutual friendship. Find the id with the most total
-- friends and report (id, num). No ties to handle.

-- TODO: write your query below
`,
  },

  {
    id: "restaurant-growth",
    title: "Restaurant Growth — 7-Day Moving Average",
    difficulty: "hard",
    tags: ["Window Frames", "Moving Average", "Two-Stage Aggregation"],
    description: `Compute, for every date starting from the 7th day of activity onward, the total and average amount spent over that date's trailing 7-day window.

**Schema — Customer table:**

| Column | Type | Notes |
|---|---|---|
| customer_id | INTEGER | |
| name | TEXT | |
| visited_on | DATE | Multiple customers can share the same visit date |
| amount | INTEGER | |

**Task:**
- Collapse same-day visits into one daily total first — several customers can visit on the same date
- For every date from the 7th distinct visit date onward, report (visited_on, amount, average_amount): amount is the sum of the trailing 7 days ending on that date, average_amount is that sum divided by 7, rounded to 2 decimals
- Dates in the first 6 days (fewer than 7 days of history available) are excluded entirely, not shown with a partial average

**Note:**
- This needs two stages, not one: first GROUP BY visited_on to get one row per day, THEN apply a window frame over that already-collapsed daily series. Applying the window frame directly to the raw per-customer rows would let a single busy day with many customers count as many "days" in the 7-row frame instead of one
- The frame is a fixed size (**ROWS BETWEEN 6 PRECEDING AND CURRENT ROW**, 7 rows total), not UNBOUNDED — this is a moving window, not a running total`,
    concepts: ["Two-stage aggregation (collapse, then window)", "Fixed-size window frames", "Excluding incomplete windows"],
    filename: "restaurant_growth.sql",
    code: `WITH daily AS (
  SELECT visited_on, SUM(amount) AS day_total
  FROM Customer
  GROUP BY visited_on
),
windowed AS (
  SELECT
    visited_on,
    SUM(day_total)   OVER (ORDER BY visited_on
                            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS amount,
    COUNT(*)         OVER (ORDER BY visited_on
                            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS days_seen
  FROM daily
)
SELECT
  visited_on,
  amount,
  ROUND(amount / 7.0, 2) AS average_amount
FROM windowed
WHERE days_seen = 7
ORDER BY visited_on;`,
    practicePrompt: `-- Schema: Customer(customer_id INT, name TEXT, visited_on DATE, amount INT)
--         (multiple customers can share the same visited_on date)
--
-- From the 7th distinct visit date onward, report (visited_on, amount,
-- average_amount) for the trailing 7-day window ending on that date.

-- TODO: write your query below
`,
  },

  {
    id: "game-play-analysis-retention",
    title: "Game Play Analysis IV — Day-1 Retention",
    difficulty: "hard",
    tags: ["Self-Referential Join", "CTE", "Retention Metric"],
    description: `Compute the fraction of players who logged in again on exactly the day after their very first login.

**Schema — Activity table:**

| Column | Type | Notes |
|---|---|---|
| player_id | INTEGER | |
| device_id | INTEGER | |
| event_date | DATE | |
| games_played | INTEGER | |

**Task:**
- For every player, find their first event_date
- Count how many of those players also have an activity row on exactly (first event_date + 1 day)
- Return that count divided by the total number of players, rounded to 2 decimal places, as a single value

**Note:**
- The denominator is the total player count from the first-login CTE, not the row count of the raw Activity table — a player who logged in 20 times still only counts once toward "total players"
- This is the same "exact next calendar day" family of problem as Rising Temperature: a self-referential join on **first_date + INTERVAL '1 day'**, not LAG, since LAG would only look at the next ROW for that player, not specifically the next calendar day`,
    concepts: ["CTE for per-entity first event", "Self-referential join offset by a fixed interval", "Ratio with a scalar-subquery denominator"],
    filename: "game_play_analysis_retention.sql",
    code: `WITH first_login AS (
  SELECT player_id, MIN(event_date) AS first_date
  FROM Activity
  GROUP BY player_id
)
SELECT ROUND(
  COUNT(DISTINCT a.player_id)::numeric / (SELECT COUNT(*) FROM first_login),
  2
) AS fraction
FROM first_login f
JOIN Activity a
  ON a.player_id = f.player_id
 AND a.event_date = f.first_date + INTERVAL '1 day';`,
    practicePrompt: `-- Schema: Activity(player_id INT, device_id INT, event_date DATE, games_played INT)
--
-- Fraction of players who played again exactly one day after their
-- first-ever login. Round to 2 decimal places.

-- TODO: write your query below
`,
  },

  {
    id: "employee-hierarchy-recursive",
    title: "Employee Reporting Hierarchy (Recursive CTE)",
    difficulty: "hard",
    tags: ["Recursive CTE", "Hierarchical Data", "WITH RECURSIVE"],
    description: `Given a manager's id, list every employee in their reporting chain at any depth — direct reports, their reports, and so on — along with how many levels deep each one is.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |
| managerId | INTEGER | Foreign key → Employee.id (nullable) |

**Task:**
- Given a specific manager id, return every employee anywhere below them in the chain of command, with a depth column (1 = direct report, 2 = reports-of-reports, and so on)

**Note:**
- A plain JOIN can express exactly one level of "reports to" — it can't express "reports to, at any depth, however many levels that turns out to be," because the number of levels isn't known ahead of time. A **recursive CTE** is the tool built for exactly this: an anchor query for depth 1, then a recursive term that keeps joining the CTE back to Employee until a round produces zero new rows, at which point the recursion stops on its own
- This is a materially different problem from a fixed self-join like "employees earning more than their manager" — that one only ever needs to look one level up; this one needs an unbounded number of levels down`,
    concepts: ["WITH RECURSIVE anatomy (anchor + UNION ALL + recursive term)", "Hierarchical/graph-shaped data", "Termination when the recursive term returns no new rows"],
    filename: "employee_hierarchy_recursive.sql",
    code: `WITH RECURSIVE org_chart AS (
  -- Anchor member: the target manager's direct reports (depth 1)
  SELECT id, name, managerId, 1 AS depth
  FROM Employee
  WHERE managerId = :target_manager_id

  UNION ALL

  -- Recursive member: reports of everyone already found, one level deeper
  SELECT e.id, e.name, e.managerId, oc.depth + 1
  FROM Employee e
  JOIN org_chart oc ON e.managerId = oc.id
)
SELECT id, name, depth
FROM org_chart
ORDER BY depth, id;`,
    practicePrompt: `-- Schema: Employee(id INT, name TEXT, managerId INT)
--
-- Given a manager id (:target_manager_id), list every employee anywhere
-- in their reporting chain, with a depth column (1 = direct report).

-- TODO: write your query below
`,
  },
];
