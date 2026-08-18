import type { TheoryTopic } from "./types";

export const SQL_SUBQUERIES_TOPICS: TheoryTopic[] = [
  {
    id: "correlated-subqueries",
    title: "Correlated Subqueries",
    oneLiner: "A subquery that leans on the outer row, conceptually re-run once per row.",
    content: `A **correlated subquery** is a subquery that references a column from its outer query, which means the database can't just compute it once up front — conceptually, it is re-evaluated once for every row the outer query considers, using that row's own values each time.

Contrast this with an **uncorrelated (independent) subquery**: it has no reference back to the outer query, so it is computed exactly once and its result is reused across every outer row — for example, a subquery that looks up a single department's id by name, which never changes no matter which outer row is being checked.

**Where this earns its keep:** comparing each row to an aggregate computed within its own group, without collapsing the detail rows the way a plain **GROUP BY** would. Take "find every employee who earns the maximum salary within their own department" — you need each employee's full row and a maximum computed separately per department. A correlated subquery recomputes that per-department maximum as it walks the outer rows, so nothing collapses into one row per department the way GROUP BY alone would.

**Performance note:** a naive correlated subquery can conceptually re-run once for every outer row, which gets expensive fast on large tables. Many correlated subqueries can be rewritten as a **JOIN** against a pre-aggregated derived table, or as a **window function**, both of which typically let the engine compute the aggregate once instead of once per row. Whenever you spot a subquery inside a WHERE clause that references the outer table, it is worth asking whether a join or window function would get the same answer faster.`,
    codeLabel: "correlated_subqueries.sql",
    code: `-- Each department's highest-paid employee, via a correlated subquery.
-- The inner query is conceptually re-evaluated once per outer row 'e',
-- scoped to that row's own department_id.
SELECT
    e.id,
    e.name,
    e.department_id,
    e.salary
FROM Employee e
WHERE e.salary = (
    SELECT MAX(e2.salary)
    FROM Employee e2
    WHERE e2.department_id = e.department_id   -- correlation: references outer 'e'
);

-- Contrast: an UNcorrelated subquery. Computed once, independent of outer rows.
SELECT *
FROM Employee
WHERE department_id = (
    SELECT id FROM Department WHERE name = 'Engineering'
);

-- Same result as the correlated query above, rewritten as a JOIN against a
-- derived table -- usually faster, since the aggregate is computed once per
-- department instead of conceptually once per outer row.
SELECT e.id, e.name, e.department_id, e.salary
FROM Employee e
JOIN (
    SELECT department_id, MAX(salary) AS max_salary
    FROM Employee
    GROUP BY department_id
) dept_max
  ON dept_max.department_id = e.department_id
 AND dept_max.max_salary = e.salary;`,
  },

  {
    id: "ctes-basics",
    title: "Common Table Expressions (WITH)",
    oneLiner: "A named, temporary result set that replaces deeply nested subqueries.",
    content: `A **Common Table Expression (CTE)** is a named, temporary result set defined right before the query that uses it: WITH name AS (subquery) SELECT ... FROM name — the outer statement then queries name exactly as if it were a real table.

**Why prefer a CTE over nesting subqueries?**
- **Readability** — a query several subqueries deep, each indented inside the last, is hard to read top to bottom. Naming each stage with a CTE lets a query read as a sequence of steps instead of a block of parentheses.
- **Reuse** — a single CTE can be referenced more than once in the outer query without repeating its logic or copy-pasting the same subquery in two places.

**Chaining multiple CTEs:** you can define several, comma-separated, and each later CTE can reference every CTE defined before it — WITH a AS (...), b AS (SELECT ... FROM a WHERE ...) SELECT ... FROM b. This turns a query into a pipeline: raw rows, then aggregated, then filtered, then shaped for output, with each stage its own named, readable block.

**Scope:** a CTE only exists for the single statement it is attached to — once that statement finishes, it is gone. This is different from a **view**, which is a saved definition that lives permanently in the schema and can be queried by any future statement. Treat a CTE as a scratch variable for one query, not a reusable schema object.`,
    codeLabel: "ctes_basics.sql",
    code: `WITH customer_totals AS (
    -- Stage 1: one row per customer, total spend across all their orders.
    SELECT
        customer_id,
        SUM(amount) AS total_spent,
        COUNT(*)    AS order_count
    FROM Orders
    GROUP BY customer_id
),
big_spenders AS (
    -- Stage 2: filter stage 1's result set down to high-value customers.
    -- References customer_totals, the CTE defined above it.
    SELECT customer_id, total_spent, order_count
    FROM customer_totals
    WHERE total_spent > 10000
)
-- Final stage: join the filtered CTE back to Customer for display columns.
SELECT
    c.name,
    b.total_spent,
    b.order_count
FROM big_spenders b
JOIN Customer c ON c.id = b.customer_id
ORDER BY b.total_spent DESC;`,
  },

  {
    id: "recursive-ctes",
    title: "Recursive CTEs",
    oneLiner: "A CTE that references itself to walk hierarchies, chains, and sequences.",
    content: `A **recursive CTE** is a CTE that references itself, which lets you walk data with an arbitrary, unknown depth — hierarchies, chains, graphs — that a single flat query cannot traverse. The syntax is WITH RECURSIVE name AS (anchor_query UNION ALL recursive_query) SELECT ... FROM name.

**Anatomy:**
- The **anchor member** (the query before UNION ALL) runs first and establishes the starting rows — for example, the top-level manager, or the number 1.
- The **recursive member** (the query after UNION ALL) references the CTE's own name, using the previous iteration's result set as its input to produce the next set of rows.
- The database repeats the recursive member automatically, feeding each round's output back in as the next round's input, until the recursive member returns zero new rows — at which point the recursion terminates on its own.

**Classic use cases:**
- **Organizational hierarchies / manager chains** — find every employee who reports up to a given manager, at any depth.
- **Bill of materials** — a part built from sub-parts, which are themselves built from sub-parts, and so on.
- **Generating sequences** — numbers or dates, or any series you would otherwise need a loop or a numbers table for.

Recursive CTEs are one of the few places plain SQL expresses genuine looping logic — treat the anchor as the loop's initial value and the recursive member as the loop body.`,
    codeLabel: "recursive_ctes.sql",
    code: `-- Minimal recursive CTE: generate the integers 1 through 10.
WITH RECURSIVE counter AS (
    SELECT 1 AS n                              -- anchor: the starting row
    UNION ALL
    SELECT n + 1 FROM counter WHERE n < 10     -- recursive: builds on the last round
)
SELECT n FROM counter;
-- Round 1: n=1 -> Round 2: n=2 -> ... -> Round 10: n=10, then n<10 is false, stop.

-- Org-chart style: every employee reporting (at any depth) to manager id 1.
-- Table shape: Employee(id, name, manager_id)
WITH RECURSIVE reports AS (
    -- Anchor: the manager's direct reports
    SELECT id, name, manager_id, 1 AS depth
    FROM Employee
    WHERE manager_id = 1

    UNION ALL

    -- Recursive: each next level down, joined back to the CTE itself
    SELECT e.id, e.name, e.manager_id, r.depth + 1
    FROM Employee e
    JOIN reports r ON e.manager_id = r.id
)
SELECT * FROM reports ORDER BY depth, id;`,
  },

  {
    id: "conditional-aggregation-pivoting",
    title: "Conditional Aggregation & Pivoting",
    oneLiner: "Turning row values into report columns with CASE-driven aggregates.",
    content: `Most SQL engines, Postgres included, have no native PIVOT keyword, so the standard way to turn row values into result columns is **conditional aggregation**: run one aggregate per target column, each wrapped in a **CASE** expression that only counts rows matching that column's category.

SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END) AS electronics_total, repeated once per category you want as a column, all inside a single **GROUP BY** query, is the pattern behind spreadsheet-style pivot reports: one row per group, one column per category.

**Postgres's FILTER clause** is a cleaner, more readable alternative for this, especially for counting: COUNT(*) FILTER (WHERE condition) says exactly what it means, compared to the more roundabout SUM(CASE WHEN condition THEN 1 ELSE 0 END). **FILTER** works with any aggregate, not only COUNT, and reads closer to plain English than an equivalent CASE expression.

**When to actually reach for this:** when a report needs a small, fixed, known set of categories as separate columns — quarters, a handful of status values, yes/no buckets. This shows up constantly in interviews and BI-style reporting queries. If the set of categories is large or open-ended, do not fight SQL's row-oriented nature by hand-writing a CASE expression per possible value — leave the result as GROUP BY rows, one per category, and let the presentation layer pivot it.`,
    codeLabel: "pivoting.sql",
    code: `-- Assume Sales(id, region, quarter, amount) where quarter is 'Q1'..'Q4'.

-- Conditional aggregation: pivot quarters into columns, one row per region.
SELECT
    region,
    SUM(CASE WHEN quarter = 'Q1' THEN amount ELSE 0 END) AS q1_total,
    SUM(CASE WHEN quarter = 'Q2' THEN amount ELSE 0 END) AS q2_total,
    SUM(CASE WHEN quarter = 'Q3' THEN amount ELSE 0 END) AS q3_total,
    SUM(CASE WHEN quarter = 'Q4' THEN amount ELSE 0 END) AS q4_total
FROM Sales
GROUP BY region;

-- Same result using Postgres's FILTER clause -- reads more directly.
SELECT
    region,
    SUM(amount) FILTER (WHERE quarter = 'Q1') AS q1_total,
    SUM(amount) FILTER (WHERE quarter = 'Q2') AS q2_total,
    SUM(amount) FILTER (WHERE quarter = 'Q3') AS q3_total,
    SUM(amount) FILTER (WHERE quarter = 'Q4') AS q4_total
FROM Sales
GROUP BY region;`,
  },
];
