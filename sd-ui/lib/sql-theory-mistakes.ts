import type { TheoryTopic } from "./types";

export const SQL_MISTAKES_TOPICS: TheoryTopic[] = [
  {
    id: "sql-command-families",
    title: "DDL vs DML vs DQL vs DCL vs TCL",
    oneLiner: "The five statement families every SQL command falls into.",
    content: `SQL statements are grouped into five families based on what they act on.

## The five families
- **DDL (Data Definition Language)** — defines and modifies schema structure: **CREATE**, **ALTER**, **DROP**. Example: CREATE TABLE Employee (id INT PRIMARY KEY, name TEXT).
- **DML (Data Manipulation Language)** — modifies the data inside tables: **INSERT**, **UPDATE**, **DELETE**. Example: UPDATE Employee SET salary = salary * 1.1 WHERE department_id = 3.
- **DQL (Data Query Language)** — reads data: **SELECT**. Some people fold this into DML since it is used alongside it so constantly, but it neither creates, changes, nor removes anything, which is reason enough to give it its own category. Example: SELECT name FROM Employee WHERE department_id = 3.
- **DCL (Data Control Language)** — manages permissions: **GRANT**, **REVOKE**. Example: GRANT SELECT ON Employee TO analyst_role.
- **TCL (Transaction Control Language)** — manages transaction boundaries: **COMMIT**, **ROLLBACK**, **SAVEPOINT**. Example: ROLLBACK TO SAVEPOINT before_update.

## DROP vs TRUNCATE vs DELETE
These three all "remove" something, but at completely different levels:
- **DROP** (DDL) removes the entire table: structure, data, indexes, and constraints. There is no table left to query afterward.
- **TRUNCATE** (DDL-like) removes all rows but keeps the table structure intact. It is fast specifically because it does not log each row's removal individually the way DELETE does, and on many engines it cannot be rolled back once committed.
- **DELETE** (DML) removes rows one at a time with full transaction-log support, which means it can be rolled back, and it accepts a WHERE clause, so it can target a subset of rows — something DROP and TRUNCATE cannot do.

Rule of thumb: removing some rows calls for DELETE, emptying a table fast while keeping it around calls for TRUNCATE, and removing the table entirely calls for DROP.`,
    codeLabel: "command_families.sql",
    code: `-- DDL: Data Definition Language -- schema structure
CREATE TABLE Employee (
    id            INT PRIMARY KEY,
    name          TEXT NOT NULL,
    department_id INT,
    salary        NUMERIC(10, 2)
);
ALTER TABLE Employee ADD COLUMN hire_date DATE;

-- DML: Data Manipulation Language -- row data
INSERT INTO Employee (id, name, department_id, salary) VALUES (1, 'Alice', 3, 95000);
UPDATE Employee SET salary = salary * 1.10 WHERE department_id = 3;
DELETE FROM Employee WHERE id = 1;              -- row-by-row, logged, filterable, rollback-able

-- DQL: Data Query Language -- reading
SELECT name, salary FROM Employee WHERE department_id = 3;

-- DCL: Data Control Language -- permissions
GRANT SELECT, INSERT ON Employee TO analyst_role;
REVOKE INSERT ON Employee FROM analyst_role;

-- TCL: Transaction Control Language -- transaction boundaries
BEGIN;
    UPDATE Employee SET salary = salary * 1.05 WHERE department_id = 3;
    SAVEPOINT before_bonus;
    UPDATE Employee SET salary = salary + 1000 WHERE id = 2;
    ROLLBACK TO SAVEPOINT before_bonus;         -- undoes only the bonus update
COMMIT;

-- DROP vs TRUNCATE vs DELETE, side by side:
DROP TABLE Employee;                            -- structure + data + indexes: all gone
TRUNCATE TABLE Employee;                        -- all rows gone fast, structure stays
DELETE FROM Employee WHERE department_id = 3;   -- only matching rows gone, fully logged`,
  },

  {
    id: "top-mistake-patterns",
    title: "Top SQL Mistake Patterns — Pre-Interview Cheat Sheet",
    oneLiner: "The last-mile checklist to read right before a SQL interview.",
    content: `Read through this once, right before you walk into the interview. Every item here is a mistake that is easy to make under pressure and easy to avoid once you have seen it named.

1. **Missing comma before a window function.** Adding one more column to a long SELECT list and forgetting the comma right before RANK() OVER (...) — the syntax error usually points at the window function itself, not the missing comma above it. Check the line above a reported error first.
2. **Missing the OVER keyword.** Writing DENSE_RANK() (PARTITION BY department_id ORDER BY salary DESC) with nothing between the function and the parenthesis. Without **OVER**, it is not a window function call at all. Fix: DENSE_RANK() OVER (PARTITION BY ...).
3. **Aliasing mismatches.** Naming a computed column rnk in the SELECT list, then referencing r, or some other near-miss, later in the same query. Reuse the exact alias string everywhere it is referenced again.
4. **Under-selecting.** The question asks for the full row of each department's top earner, but the query only selects id. Re-check the column list against the question's exact ask before submitting.
5. **DISTINCT in the wrong place.** COUNT(DISTINCT department_id) counts distinct department ids — correct. DISTINCT COUNT(department_id) applies DISTINCT to a single already-aggregated number and changes nothing. **DISTINCT** belongs inside the aggregate's parentheses, next to the column.
6. **Filtering a window function in WHERE at the same query level.** **WHERE** is evaluated before window functions are computed, so WHERE rnk = 1 against a window-function alias will not work at that query level. Wrap the windowed query in a subquery or CTE, and filter on the alias in the outer query instead.
7. **Forgetting NULL-safety after a LEFT JOIN or an empty-group aggregate.** Unmatched **LEFT JOIN** rows come back NULL on the right-hand side; SUM() or AVG() over zero rows returns NULL, not 0. Wrap the result in COALESCE(value, 0) wherever a NULL would break the next step.
8. **Integer division truncating a ratio.** SUM(x) / COUNT(*) where both operands are integers performs integer division and rounds toward zero — 3/4 becomes 0, not 0.75. Cast at least one side to numeric first: SUM(x)::numeric / COUNT(*).`,
    codeLabel: "top_mistakes_spot_the_bug.sql",
    code: `-- (1) Missing comma + missing OVER keyword
-- WRONG: no comma after 'salary', and DENSE_RANK() is missing OVER
SELECT
    employee_id,
    salary
    DENSE_RANK() (PARTITION BY department_id ORDER BY salary DESC) AS rnk
FROM Employee;

-- RIGHT:
SELECT
    employee_id,
    salary,
    DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
FROM Employee;

-- (2) Filtering a window function in WHERE at the same query level
-- WRONG: 'rnk' doesn't exist yet when WHERE is evaluated
SELECT
    employee_id,
    DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
FROM Employee
WHERE rnk = 1;

-- RIGHT: compute the window function in a CTE, filter the alias outside it
WITH ranked AS (
    SELECT
        employee_id,
        DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
    FROM Employee
)
SELECT employee_id FROM ranked WHERE rnk = 1;

-- (3) DISTINCT placement + integer division
-- WRONG: DISTINCT applied to an already-aggregated number; integer division
SELECT
    department_id,
    DISTINCT COUNT(employee_id)    AS head_count,
    SUM(sales) / COUNT(*)          AS avg_sale
FROM Sales
GROUP BY department_id;

-- RIGHT:
SELECT
    department_id,
    COUNT(DISTINCT employee_id)    AS head_count,
    SUM(sales)::numeric / COUNT(*) AS avg_sale
FROM Sales
GROUP BY department_id;`,
  },
];
