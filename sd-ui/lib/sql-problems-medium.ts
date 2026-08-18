import type { Difficulty } from "./types";
import type { SQLProblem } from "./sql-problems";

export const SQL_PROBLEMS_MEDIUM: SQLProblem[] = [
  {
    id: "second-highest-salary",
    title: "Second Highest Salary",
    difficulty: "medium",
    tags: ["Subqueries", "Salary", "NULL Handling", "LIMIT/OFFSET"],
    description: `Write a query to find the second highest distinct salary from an \`Employee\` table.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| salary | INTEGER | |

**Task:**
- Return a single value: the second highest DISTINCT salary in the table
- If fewer than two distinct salaries exist, return \`NULL\` instead of an empty result

**Note:**
- A scalar subquery that matches zero rows evaluates to \`NULL\` when selected at the top level — that's why wrapping \`SELECT DISTINCT salary ... LIMIT 1 OFFSET 1\` inside an outer \`SELECT ( ... )\` produces one row containing NULL when there's no second salary
- Without that wrapper, a bare top-level \`SELECT DISTINCT salary ... LIMIT 1 OFFSET 1\` would just return an empty result set — zero rows, not a row containing NULL — which fails the "return NULL" requirement`,
    concepts: ["Scalar subqueries", "DISTINCT", "LIMIT/OFFSET", "NULL-safe aggregation"],
    filename: "second_highest_salary.sql",
    code: `SELECT (
  SELECT DISTINCT salary
  FROM Employee
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS SecondHighestSalary;`,
    practicePrompt: `-- Schema: Employee(id INT, salary INT)
--
-- Write a single query that returns the second highest DISTINCT salary.
-- Return NULL if there is no second highest salary.

-- TODO: write your query below`,
  },
  {
    id: "nth-highest-salary",
    title: "Nth Highest Salary",
    difficulty: "medium",
    tags: ["Window Functions", "Stored Functions", "DENSE_RANK", "Salary"],
    description: `Write a general solution to find the Nth highest salary from the \`Employee\` table — one that works for any N, not just a query hardcoded for a single specific rank.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| salary | INTEGER | |

**Task:**
- Produce the Nth highest DISTINCT salary for an arbitrary N supplied at call time
- The logic must generalize — a query that only ever returns, say, the 3rd highest doesn't satisfy the requirement

**Note:**
- \`WHERE rnk = N\` only works if \`N\` is bound to an actual value — either a parameter passed into a stored function, or a value substituted into a CTE/subquery wrapper — never a bare literal baked into logic that's supposed to be reusable
- The two options below show both approaches: a callable \`getNthHighestSalary(N)\` function for one-N-at-a-time lookups, and a \`DENSE_RANK\` CTE for when you want every Nth-highest row available at once without calling a function per N`,
    concepts: ["Parameterized functions", "DENSE_RANK", "OFFSET"],
    filename: "nth_highest_salary.sql",
    code: `-- Option 1: parameterized function
CREATE FUNCTION getNthHighestSalary(N INT) RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT DISTINCT salary
    FROM Employee
    ORDER BY salary DESC
    LIMIT 1 OFFSET (N - 1)
  );
END;
$$ LANGUAGE plpgsql;

-- Option 2: DENSE_RANK, if you need every Nth-highest row available at once
-- rather than calling a function per N
WITH ranked AS (
  SELECT DISTINCT salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM Employee
)
SELECT salary FROM ranked WHERE rnk = 3;  -- example: N = 3`,
    practicePrompt: `-- Schema: Employee(id INT, salary INT)
--
-- Write a solution to find the Nth highest salary, where N is a parameter
-- (e.g. a function argument), not a hardcoded value.
-- Return NULL if there is no Nth highest salary.

-- TODO: write your query below`,
  },
  {
    id: "department-highest-salary",
    title: "Department Highest Salary",
    difficulty: "medium",
    tags: ["Correlated Subqueries", "JOIN", "Salary", "Ties"],
    description: `A company wants to know, for each department, which employee or employees earn the highest salary.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |
| salary | INTEGER | |
| department_id | INTEGER | Foreign key to Department.id |

**Schema — Department table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |

**Task:**
- For every department, return each employee who earns the maximum salary within that department
- If multiple employees are tied for the max in a department, ALL of them must appear — not just one

**Note:**
- A correlated subquery (\`WHERE e.salary = (SELECT MAX(salary) ... WHERE e2.department_id = e.department_id)\`) naturally includes every tied top earner
- Using \`ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) = 1\` instead would silently keep only one arbitrary employee per department and drop everyone else tied for first — a common mistake`,
    concepts: ["Correlated subqueries", "Per-group MAX", "Tie-inclusive filtering"],
    filename: "department_highest_salary.sql",
    code: `SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary
FROM Employee e
JOIN Department d ON e.department_id = d.id
WHERE e.salary = (
  SELECT MAX(salary) FROM Employee e2 WHERE e2.department_id = e.department_id
);`,
    practicePrompt: `-- Schema: Employee(id INT, name TEXT, salary INT, department_id INT)
--          Department(id INT, name TEXT)
--
-- For each department, return every employee who earns the maximum
-- salary in that department. Include ALL employees tied for the max.

-- TODO: write your query below`,
  },
  {
    id: "department-top-three-salaries",
    title: "Department Top Three Salaries",
    difficulty: "hard",
    tags: ["Window Functions", "DENSE_RANK", "PARTITION BY", "Top-N per Group"],
    description: `For each department, find the employees earning one of the top three unique salary values — not simply the top three rows.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |
| salary | INTEGER | |
| department_id | INTEGER | Foreign key to Department.id |

**Schema — Department table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |

**Task:**
- For each department, return the employees whose salary is among the top 3 DISTINCT salary values in that department
- If several employees are tied at any of the top 3 levels, every one of them must be included, so a department can return more than 3 rows
- The number of distinct salary levels considered per department is capped at 3, regardless of how many rows that produces

**Note:**
- \`DENSE_RANK\` is the right ranking function here: \`RANK\` leaves gaps after a tie (e.g. 1, 2, 2, 4), which can miscount and let a 4th distinct salary tier leak into the "top 3"; \`ROW_NUMBER\` breaks ties arbitrarily and could exclude someone legitimately tied for 3rd
- The ranking is computed in a CTE and filtered afterward with \`WHERE salary_rank <= 3\` in an outer query — a window function's result can't be filtered in a \`WHERE\` clause at the same query level where it's computed`,
    concepts: ["DENSE_RANK", "PARTITION BY", "Top-N per group with ties"],
    filename: "department_top_three_salaries.sql",
    code: `WITH ranked AS (
  SELECT d.name AS department, e.name AS employee, e.salary AS salary,
         DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS salary_rank
  FROM Employee e
  JOIN Department d ON e.department_id = d.id
)
SELECT department, employee, salary
FROM ranked
WHERE salary_rank <= 3
ORDER BY department, salary DESC;`,
    practicePrompt: `-- Schema: Employee(id INT, name TEXT, salary INT, department_id INT)
--          Department(id INT, name TEXT)
--
-- For each department, return employees among the top 3 DISTINCT salary
-- values in that department. Ties at the 3rd level must all be included.

-- TODO: write your query below`,
  },
  {
    id: "rising-temperature",
    title: "Rising Temperature",
    difficulty: "medium",
    tags: ["Self-Join", "Date Arithmetic", "Window Function Pitfalls"],
    description: `Given a \`Weather\` table recording a temperature for various dates, find the ids of all dates whose temperature is higher than the temperature recorded the day before — the previous CALENDAR day, not just the previous row.

**Schema — Weather table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| record_date | DATE | May have gaps between dates |
| temperature | INTEGER | Degrees recorded on that date |

**Task:**
- Return the \`id\` of every row where \`temperature\` is strictly greater than the temperature recorded exactly one calendar day earlier
- Dates are not guaranteed to be contiguous, so "yesterday" must be computed by date arithmetic, not by row position

**Note:**
- \`LAG(temperature) OVER (ORDER BY record_date)\` is NOT safe here if dates can have gaps — \`LAG\` returns the previous ROW in the ordering, which is only "yesterday" when every calendar day is actually present
- The self-join on \`w2.record_date = w1.record_date + INTERVAL '1 day'\` is what correctly enforces "yesterday" regardless of gaps in the data`,
    concepts: ["Self-joins", "Date arithmetic", "LAG() pitfalls"],
    filename: "rising_temperature.sql",
    code: `SELECT w2.id
FROM Weather w1
JOIN Weather w2 ON w2.record_date = w1.record_date + INTERVAL '1 day'
WHERE w2.temperature > w1.temperature;`,
    practicePrompt: `-- Schema: Weather(id INT, record_date DATE, temperature INT)
-- Note: record_date values may have gaps (not every calendar day present).
--
-- Return the ids of all dates whose temperature is higher than the
-- temperature on the immediately preceding CALENDAR day.

-- TODO: write your query below`,
  },
  {
    id: "consecutive-numbers",
    title: "Consecutive Numbers",
    difficulty: "medium",
    tags: ["LAG", "Window Functions", "Derived Tables"],
    description: `Find all numbers that appear at least three times consecutively in the \`Logs\` table.

**Schema — Logs table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key, defines row order |
| num | INTEGER | |

**Task:**
- Return every distinct value of \`num\` that appears at least 3 times in a row, where "in a row" means consecutive by ascending \`id\`
- Each qualifying number should appear only once in the result, no matter how many separate runs of 3+ it has

**Note:**
- Window functions like \`LAG\` can't be filtered in a \`WHERE\` clause at the same query level where they're computed — that's why \`prev_1\`/\`prev_2\` are computed in a derived table first and then filtered by the outer query
- Comparing \`num\` against \`LAG(num, 1)\` and \`LAG(num, 2)\` on the same row is what confirms three consecutive equal values ending at that row`,
    concepts: ["LAG with custom offsets", "Filtering window functions via a derived table"],
    filename: "consecutive_numbers.sql",
    code: `SELECT DISTINCT num AS ConsecutiveNums
FROM (
  SELECT
    num,
    LAG(num, 1) OVER (ORDER BY id) AS prev_1,
    LAG(num, 2) OVER (ORDER BY id) AS prev_2
  FROM Logs
) t
WHERE num = prev_1 AND num = prev_2;`,
    practicePrompt: `-- Schema: Logs(id INT, num INT)
--
-- Find all numbers that appear at least 3 times consecutively,
-- where consecutive means adjacent rows ordered by ascending id.
-- Each qualifying number should appear once in the result.

-- TODO: write your query below`,
  },
  {
    id: "rank-scores",
    title: "Rank Scores",
    difficulty: "easy",
    tags: ["DENSE_RANK", "Window Functions", "Aliasing"],
    description: `Given a \`Scores\` table, rank each score from highest to lowest, with no gaps in the ranking after a tie.

**Schema — Scores table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| score | NUMERIC | |

**Task:**
- Return every score along with its rank, ordered from highest to lowest
- Tied scores receive the same rank, and the next distinct score continues from the next integer with no gap (two rows tied for 1st are both rank 1, and the following score is rank 2, not rank 3)

**Note:**
- \`rank\` is a reserved/ambiguous word in some engines, so it's quoted as \`"rank"\` when used as the output column alias
- This is precisely the \`DENSE_RANK\` vs \`RANK\` distinction: \`RANK\` would produce gaps after ties (e.g. 1, 1, 3), while \`DENSE_RANK\` produces consecutive ranks (1, 1, 2)`,
    concepts: ["DENSE_RANK", "Reserved-word column aliasing"],
    filename: "rank_scores.sql",
    code: `SELECT score, DENSE_RANK() OVER (ORDER BY score DESC) AS "rank"
FROM Scores
ORDER BY score DESC;`,
    practicePrompt: `-- Schema: Scores(id INT, score NUMERIC)
--
-- Rank scores from highest to lowest with NO GAPS after a tie
-- (two scores tied for 1st are both rank 1; the next score is rank 2).

-- TODO: write your query below`,
  },
  {
    id: "exchange-seats",
    title: "Exchange Seats",
    difficulty: "medium",
    tags: ["CASE WHEN", "Modulo Arithmetic", "Row Transformation"],
    description: `A cinema wants to swap adjacent seat assignments so each student ends up next to a different neighbor, without changing the physical seat numbering.

**Schema — Seat table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key, sequential with no gaps |
| student | TEXT | |

**Task:**
- Swap the \`student\` values of every adjacent pair of seats: 1↔2, 3↔4, 5↔6, and so on
- If the total number of seats is odd, the last seat's student stays in place
- Return the result ordered by \`id\`

**Note:**
- Because \`id\` is guaranteed sequential with no gaps, \`id % 2\` cleanly identifies odd/even seats, and comparing against \`(SELECT MAX(id) FROM Seat)\` identifies the unpaired last seat when the count is odd
- The solution swaps the \`id\` values shown in the \`SELECT\` while leaving each row's original \`student\` untouched — that produces the same visible effect as swapping students, without needing a self-join`,
    concepts: ["CASE WHEN for row transformation", "Modulo-based pairing"],
    filename: "exchange_seats.sql",
    code: `SELECT
  CASE
    WHEN id % 2 = 1 AND id = (SELECT MAX(id) FROM Seat) THEN id
    WHEN id % 2 = 1 THEN id + 1
    ELSE id - 1
  END AS id,
  student
FROM Seat
ORDER BY id;`,
    practicePrompt: `-- Schema: Seat(id INT, student TEXT) -- id is sequential with no gaps
--
-- Swap the student assigned to every adjacent pair of seats (1<->2, 3<->4, ...).
-- If there's an odd seat out at the end, it keeps its original student.
-- Return the result ordered by id.

-- TODO: write your query below`,
  },
  {
    id: "managers-with-5-direct-reports",
    title: "Managers with at Least 5 Direct Reports",
    difficulty: "medium",
    tags: ["Self-Referencing FK", "GROUP BY/HAVING", "Subqueries", "HR Hierarchy"],
    description: `Given an \`Employee\` table where each row optionally points to its own manager, find the managers who directly oversee a large team.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |
| department | TEXT | |
| manager_id | INTEGER | Self-referencing FK to Employee.id, nullable |

**Task:**
- Return the \`name\` of every employee who has 5 or more other employees directly reporting to them (\`manager_id\` pointing at them)
- Employees with no reports, or fewer than 5, should not appear

**Note:**
- Filtering \`manager_id IS NOT NULL\` before grouping matters — otherwise employees with no manager would all be grouped together as if NULL were itself a valid manager id
- This counts only DIRECT reports (\`manager_id\` equal to that employee's own id), not the full reporting tree beneath them`,
    concepts: ["GROUP BY / HAVING on a self-referencing FK", "IN subquery"],
    filename: "managers_with_5_direct_reports.sql",
    code: `SELECT name
FROM Employee
WHERE id IN (
  SELECT manager_id
  FROM Employee
  WHERE manager_id IS NOT NULL
  GROUP BY manager_id
  HAVING COUNT(*) >= 5
);`,
    practicePrompt: `-- Schema: Employee(id INT, name TEXT, department TEXT, manager_id INT)
-- manager_id references Employee.id and may be NULL.
--
-- Return the names of managers who have 5 or more direct reports.

-- TODO: write your query below`,
  },
  {
    id: "human-traffic-of-stadium",
    title: "Human Traffic of Stadium",
    difficulty: "hard",
    tags: ["Gaps and Islands", "ROW_NUMBER", "CTE", "Analytics"],
    description: `A stadium logs the number of visitors for each sequential record and wants to find stretches of consistently high attendance to flag for reporting.

**Schema — Stadium table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key, sequential with no gaps |
| visit_date | DATE | |
| people | INTEGER | Visitor count for that record |

**Task:**
- Return every row that is part of a run of 3 or more CONSECUTIVE ids (by ascending \`id\`) where \`people >= 100\` holds for every row in that run
- Rows with \`people < 100\`, or that belong to a run shorter than 3, must be excluded
- Return the result ordered by \`id\`

**Note:**
- This is the classic "gaps and islands" pattern: after filtering to \`people >= 100\`, computing \`id - ROW_NUMBER() OVER (ORDER BY id)\` gives a value that stays CONSTANT across any run of consecutive surviving ids, since both \`id\` and \`ROW_NUMBER()\` increase by exactly 1 per row within the run
- Grouping by that constant isolates each island of consecutive rows, and \`HAVING COUNT(*) >= 3\` keeps only the islands long enough to qualify — this \`id - ROW_NUMBER()\` trick is one of the most reused, worth-memorizing patterns in SQL interviews`,
    concepts: ["Gaps-and-islands pattern", "ROW_NUMBER as a grouping trick"],
    filename: "human_traffic_of_stadium.sql",
    code: `WITH filtered AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS grp
  FROM Stadium
  WHERE people >= 100
)
SELECT id, visit_date, people
FROM filtered
WHERE grp IN (
  SELECT grp FROM filtered GROUP BY grp HAVING COUNT(*) >= 3
)
ORDER BY id;`,
    practicePrompt: `-- Schema: Stadium(id INT, visit_date DATE, people INT)
-- id is sequential with no gaps.
--
-- Return all rows that are part of a run of 3 or more consecutive ids
-- (by id order) where people >= 100 holds for every row in the run.
-- Order the result by id.

-- TODO: write your query below`,
  },
  {
    id: "market-analysis-orders-per-year",
    title: "Market Analysis — Orders Placed Per Buyer in 2019",
    difficulty: "medium",
    tags: ["LEFT JOIN", "Conditional Aggregation", "FILTER Clause", "E-commerce"],
    description: `An online marketplace wants a per-user report of buying activity in 2019, including users who placed no orders at all that year.

**Schema — Users table:**

| Column | Type | Notes |
|---|---|---|
| user_id | INTEGER | Primary key |
| join_date | DATE | |
| favorite_brand | TEXT | |

**Schema — Orders table:**

| Column | Type | Notes |
|---|---|---|
| order_id | INTEGER | Primary key |
| order_date | DATE | |
| item_id | INTEGER | |
| buyer_id | INTEGER | FK to Users.user_id |
| seller_id | INTEGER | FK to Users.user_id |

**Task:**
- For every user, report their \`user_id\`, \`join_date\`, and how many orders they placed as a buyer during 2019
- Users who placed zero orders in 2019 (or ever) must still appear in the output with a count of 0, not be excluded

**Note:**
- A plain \`JOIN\` between \`Users\` and \`Orders\` would silently drop users with no matching 2019 orders; the \`LEFT JOIN\`, keeping \`Users\` as the anchor side, is what preserves every user
- \`FILTER (WHERE ...)\` is Postgres-specific conditional aggregation; the portable, MySQL-compatible equivalent is \`SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = 2019 THEN 1 ELSE 0 END)\``,
    concepts: ["LEFT JOIN to preserve zero-count rows", "FILTER clause", "Conditional aggregation"],
    filename: "market_analysis_orders_per_year.sql",
    code: `SELECT
  u.user_id AS buyer_id,
  u.join_date,
  COUNT(o.order_id) FILTER (
    WHERE EXTRACT(YEAR FROM o.order_date) = 2019
  ) AS orders_in_2019
FROM Users u
LEFT JOIN Orders o ON u.user_id = o.buyer_id
GROUP BY u.user_id, u.join_date;`,
    practicePrompt: `-- Schema: Users(user_id INT, join_date DATE, favorite_brand TEXT)
--          Orders(order_id INT, order_date DATE, item_id INT,
--                 buyer_id INT, seller_id INT)
--
-- For every user, report user_id, join_date, and the count of orders
-- they placed as a buyer during 2019. Users with zero 2019 orders must
-- still appear, with a count of 0.

-- TODO: write your query below`,
  },
  {
    id: "product-sales-running-total",
    title: "Cumulative Sales — Running Total per Product",
    difficulty: "medium",
    tags: ["Window Frame", "Running Total", "PARTITION BY", "Sales Analytics"],
    description: `A retailer tracks yearly quantity sold per product and wants a cumulative view of sales growth over time.

**Schema — Sales table:**

| Column | Type | Notes |
|---|---|---|
| product_id | INTEGER | |
| year | INTEGER | |
| quantity | INTEGER | One row per product per year |

**Task:**
- For each product, return every \`(year, quantity)\` row along with a running total of \`quantity\` accumulated through that year, ordered by \`year\`
- The running total must reset per product — one product's totals should never bleed into another's

**Note:**
- \`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\` is actually the DEFAULT frame whenever \`ORDER BY\` is present inside \`OVER (...)\` without an explicit frame clause — writing it out here is for clarity, not strictly required
- Swapping \`UNBOUNDED PRECEDING\` for a fixed bound (e.g. \`6 PRECEDING\`) turns this into a fixed-size moving-window calculation, like a trailing-N moving average, instead of a running total from the start`,
    concepts: ["Window frame clauses", "ROWS BETWEEN UNBOUNDED PRECEDING", "Running totals"],
    filename: "product_sales_running_total.sql",
    code: `SELECT
  product_id,
  year,
  quantity,
  SUM(quantity) OVER (
    PARTITION BY product_id
    ORDER BY year
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM Sales
ORDER BY product_id, year;`,
    practicePrompt: `-- Schema: Sales(product_id INT, year INT, quantity INT)
-- One row per product per year.
--
-- For each product, return year, quantity, and a running total of
-- quantity ordered by year (resetting per product).

-- TODO: write your query below`,
  },
];
