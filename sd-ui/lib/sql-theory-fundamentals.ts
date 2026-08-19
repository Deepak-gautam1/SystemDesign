import type { TheoryTopic } from "./types";

export const SQL_FUNDAMENTALS_TOPICS: TheoryTopic[] = [
  {
    id: "execution-order",
    title: "Query Execution Order",
    oneLiner: "SQL is written in one order, but the engine executes it in a completely different one.",
    content: `Every SQL query is **written** in one order but **executed** in a completely different one — and almost every "why doesn't this work" confusion traces back to mixing the two up.

You write clauses in this order: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY. But the engine evaluates them in roughly this order: FROM/JOIN, then WHERE, then GROUP BY, then HAVING, then SELECT, then ORDER BY, then LIMIT.

**Why this matters:**
- FROM and JOIN run first, because the engine needs to know which rows exist — and how tables relate to each other — before it can filter anything.
- WHERE runs before SELECT. This is why a WHERE clause cannot reference a column alias defined in SELECT — that alias simply doesn't exist yet at the point WHERE is evaluated. For the same reason, WHERE cannot filter on an aggregate function: nothing has been grouped or aggregated yet at that stage of execution.
- GROUP BY and HAVING both run after WHERE but before SELECT, which is why HAVING — unlike WHERE — is allowed to reference aggregate functions. The grouping has already happened by the time HAVING runs.
- ORDER BY runs dead last, after SELECT has already produced its output columns and aliases. That's exactly why ORDER BY is allowed to reference a SELECT-defined alias, even though WHERE and GROUP BY generally cannot.

Keeping this execution order in your head is the fastest way to debug a query that "should" work but throws a column-not-found or aggregate-not-allowed error — the fix is almost always to move the offending condition to the clause that runs at the right stage.`,
    codeLabel: "execution_order.sql",
    code: `-- WRITTEN order:  SELECT -> FROM -> WHERE -> GROUP BY -> HAVING -> ORDER BY
-- EXECUTED order: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT

SELECT
    customer_id,                               -- step 5: build output columns
    COUNT(*)          AS order_count,          -- step 5: compute aggregates
    SUM(total_amount) AS lifetime_value        -- step 5
FROM orders                                     -- step 1: resolve the base table
WHERE order_status <> 'CANCELLED'               -- step 2: filter individual rows
GROUP BY customer_id                            -- step 3: bucket remaining rows
HAVING COUNT(*) >= 3                            -- step 4: filter the buckets
ORDER BY lifetime_value DESC                    -- step 6: sort the final output
LIMIT 10;                                       -- step 7: trim to the top 10

-- Why this FAILS: order_count doesn't exist until step 5, but WHERE runs at
-- step 2 -- long before SELECT has created that alias.
-- SELECT customer_id, COUNT(*) AS order_count
-- FROM orders
-- WHERE order_count >= 3;   -- ERROR: column "order_count" does not exist

-- Why this WORKS: ORDER BY runs at step 6, after SELECT (step 5) has already
-- produced the alias lifetime_value.
-- ... ORDER BY lifetime_value DESC`,
  },

  {
    id: "where-vs-having",
    title: "WHERE vs HAVING",
    oneLiner: "WHERE filters rows before grouping; HAVING filters groups after.",
    content: `**WHERE** and **HAVING** both filter data, but they operate on entirely different things, at entirely different points in execution:

| | WHERE | HAVING |
|---|---|---|
| Filters | Individual rows | Groups (produced by GROUP BY) |
| Runs | Before GROUP BY | After GROUP BY |
| Aggregate functions | Cannot reference them | Can reference them |
| Typical use | "only orders placed this year" | "only customers with 3+ orders" |

**The classic mistake** is trying to filter on an aggregate inside WHERE. Writing WHERE COUNT(*) >= 3 fails, because at the point WHERE runs, no grouping or aggregation has happened yet — COUNT(*) simply doesn't exist as a value WHERE can inspect. The fix is to move that condition into HAVING, which runs after GROUP BY has already collapsed rows into buckets and computed the aggregate.

**A lesser-known fact:** HAVING doesn't actually require a GROUP BY clause at all. Without one, the entire result set coming out of FROM/WHERE is treated as a single implicit group — so HAVING COUNT(*) > 100 on a query with no GROUP BY simply asks "does this whole table, after WHERE filtering, have more than 100 matching rows?", collapsing the query down to either zero rows or one row.

**Rule of thumb:** if a condition needs an aggregate function, it belongs in HAVING. If it doesn't, put it in WHERE instead — filtering rows out before grouping is also usually cheaper, since the engine is left with fewer rows to group and aggregate in the first place.`,
    codeLabel: "where_vs_having.sql",
    code: `-- BROKEN: WHERE cannot see aggregate functions -- this is rejected outright
-- by Postgres (and every other mainstream SQL engine) before it even runs.
SELECT customer_id, COUNT(*) AS order_count
FROM orders
WHERE COUNT(*) >= 3          -- ERROR: aggregate functions are not allowed in WHERE
GROUP BY customer_id;

-- FIXED: move the aggregate condition into HAVING, which runs after grouping.
SELECT customer_id, COUNT(*) AS order_count
FROM orders
WHERE order_status <> 'CANCELLED'   -- an ordinary row filter still belongs in WHERE
GROUP BY customer_id
HAVING COUNT(*) >= 3;               -- filters the GROUPS, not the raw rows

-- HAVING with no GROUP BY at all: the whole table is treated as one group.
SELECT COUNT(*) AS total_active_customers
FROM customers
WHERE is_active = true
HAVING COUNT(*) > 0;   -- returns one row if any active customers exist, else zero rows`,
  },

  {
    id: "group-by-rules",
    title: "GROUP BY Rules",
    oneLiner: "Every non-aggregated column you SELECT must also appear in GROUP BY.",
    content: `**The core rule:** every column that appears in SELECT alongside a GROUP BY must be either (a) one of the columns listed in GROUP BY, or (b) wrapped in an aggregate function like COUNT(), SUM(), AVG(), MIN(), or MAX(). The database has no way to know which value to show for an ungrouped column once multiple rows collapse into a single group — should it show the first row's value, the last, a random one? SQL refuses to guess, and rejects the query instead.

This is exactly why **SELECT * combined with GROUP BY is almost always a mistake**: * expands to every column in the table, and it's extremely unlikely that every one of those columns is either part of your GROUP BY key or wrapped in an aggregate. At best the query errors out; at worst, on a permissive engine, it silently returns an arbitrary, non-deterministic value per group.

**Engine behavior varies here.** MySQL historically allowed this sloppy pattern by default, but modern MySQL enables **ONLY_FULL_GROUP_BY** mode, which rejects it just like Postgres and SQL Server always have.

**Postgres has one genuine exception**, though — the **functional-dependency rule**: if you GROUP BY a table's primary key, you're allowed to SELECT any other column from that same table without listing it in GROUP BY. Since a primary key uniquely determines every other column in its row, there's no ambiguity about which value to return, and Postgres recognizes that and relaxes the rule accordingly. This exception does not extend to non-key columns, or to columns pulled in from a joined table.`,
    codeLabel: "group_by_rules.sql",
    code: `-- BROKEN: order_date is neither aggregated nor listed in GROUP BY.
-- Rejected by Postgres/SQL Server; historically allowed (dangerously) by MySQL.
SELECT customer_id, order_date, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id;
-- ERROR: column "orders.order_date" must appear in the GROUP BY clause
-- or be used in an aggregate function

-- FIXED, option 1: aggregate the extra column instead of selecting it raw.
SELECT customer_id, MAX(order_date) AS most_recent_order, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id;

-- FIXED, option 2: add it to GROUP BY (this changes the grouping granularity!).
SELECT customer_id, order_date, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id, order_date;

-- Postgres functional-dependency exception: grouping by the PRIMARY KEY lets
-- you select other columns from the SAME table for free, with no aggregate.
SELECT customer_id, first_name, last_name
FROM customers
GROUP BY customer_id;   -- customer_id is customers' primary key -- no error`,
  },

  {
    id: "case-when",
    title: "CASE WHEN — SQL's If/Else",
    oneLiner: "SQL's row-by-row if/else, usable anywhere a value is expected.",
    content: `**CASE WHEN** is SQL's if/else expression. Its full form reads: **CASE WHEN** condition **THEN** result, repeated for as many conditions as you need, with an optional **ELSE** default at the very end, closed by **END**.

It's evaluated **row by row, top to bottom**, and stops at the **first** WHEN whose condition is true — later branches are never even checked once a match is found, exactly like an if/else-if chain in a general-purpose language. If no branch matches and there is no ELSE, the result is NULL.

Because CASE WHEN is an **expression** — it produces a single value — it can be dropped in anywhere SQL expects a value, not just inside SELECT:
- **SELECT** — derive a display label or bucket from raw data, e.g. turning a numeric score into a letter grade.
- **WHERE** — build a more complex conditional filter than a plain comparison allows.
- **ORDER BY** — define a custom sort order that isn't alphabetical or numeric, e.g. always showing "URGENT" rows first regardless of how that string would normally sort.
- **Nested inside an aggregate function** — the pattern known as **conditional aggregation**. Wrapping a CASE WHEN inside SUM() or COUNT() lets you compute several different conditional totals from the same set of rows in a single pass, which is the standard way to "pivot" data into columns without a dedicated PIVOT operator.

Interviewers like CASE WHEN questions because they test whether you can think in per-row expressions instead of procedural loops — SQL has no "for each row, if X then Y"; CASE WHEN *is* that logic, expressed declaratively.`,
    codeLabel: "case_when.sql",
    code: `-- Conditional aggregation: count orders in each status, all in a single pass
-- over the table, instead of running three separate queries.
SELECT
    customer_id,
    SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_count,
    SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
    SUM(CASE WHEN order_status = 'PENDING'   THEN 1 ELSE 0 END) AS pending_count
FROM orders
GROUP BY customer_id;

-- CASE inside ORDER BY: a custom sort order instead of alphabetical/numeric.
-- Without this, 'CANCELLED' would sort before 'PENDING' alphabetically --
-- rarely what you actually want shown first.
SELECT order_id, order_status, order_date
FROM orders
ORDER BY
    CASE order_status
        WHEN 'PENDING'   THEN 1
        WHEN 'CONFIRMED' THEN 2
        WHEN 'SHIPPED'   THEN 3
        WHEN 'DELIVERED' THEN 4
        WHEN 'CANCELLED' THEN 5
        ELSE 6
    END,
    order_date DESC;`,
  },

  {
    id: "null-handling",
    title: "NULL Handling — COALESCE, NULLIF & Three-Valued Logic",
    oneLiner: "NULL means unknown — and three-valued logic makes it behave unlike any ordinary value.",
    content: `SQL doesn't use ordinary two-valued (true/false) boolean logic — it uses **three-valued logic**, where every comparison evaluates to TRUE, FALSE, or **UNKNOWN**. NULL represents a missing or unknown value, and comparing anything to an unknown value is itself unknown — which is why NULL = NULL evaluates to UNKNOWN, not TRUE. Two unknowns are not necessarily equal to each other. This is the single most common source of "why isn't my WHERE clause matching NULL rows" bugs: you cannot test for NULL with = NULL; you must use **IS NULL** or **IS NOT NULL** instead.

**NULL propagates through arithmetic.** NULL plus anything, NULL times anything, and NULL concatenated with a string all produce NULL — the database treats "unknown combined with a known value" as still unknown.

**Aggregates have a special exception worth memorizing:** SUM(), AVG(), MAX(), and MIN() all **ignore** NULL values when computing their result, but if **zero rows** match at all — for example, after a LEFT JOIN with no matches on the right side — SUM() returns NULL, not 0. This trips up a lot of dashboards and reports, which then do arithmetic on that NULL and silently propagate it further downstream.

**Two functions exist specifically to fix this:**
- **COALESCE(a, b, c, ...)** returns the first non-null argument in the list — the standard way to substitute a default value, e.g. COALESCE(SUM(amount), 0).
- **NULLIF(a, b)** returns NULL if a equals b, and otherwise returns a. Its most common use is guarding against divide-by-zero: dividing by NULLIF(denominator, 0) turns a would-be error into a clean NULL result instead.`,
    codeLabel: "null_handling.sql",
    code: `-- Without COALESCE: customers with zero orders show total_spent = NULL,
-- because SUM() over zero matching rows returns NULL, not 0.
SELECT
    c.customer_id,
    c.name,
    COALESCE(SUM(o.total_amount), 0) AS total_spent   -- NULL becomes 0
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name;

-- NULLIF as a divide-by-zero guard: if total_orders is 0, NULLIF converts it
-- to NULL, which makes the whole division return NULL instead of erroring.
SELECT
    product_id,
    total_returns,
    total_orders,
    total_returns::numeric / NULLIF(total_orders, 0) AS return_rate
FROM product_stats;

-- Common trap: this NEVER matches, because NULL = NULL is UNKNOWN, not TRUE.
-- SELECT * FROM orders WHERE shipped_date = NULL;    -- always returns nothing
SELECT * FROM orders WHERE shipped_date IS NULL;       -- correct way`,
  },

  {
    id: "exists-vs-in-vs-join",
    title: "EXISTS vs IN vs JOIN",
    oneLiner: "They often return the same rows for existence checks — until NULLs or duplicate matches expose that they work nothing alike underneath.",
    content: `**EXISTS**, **IN**, and **JOIN** all get reached for when a query needs to check whether related rows exist somewhere else — and for clean data with no NULLs and no duplicate matches, they can produce identical results. The differences only surface at the edges, which is exactly where interview questions like to live.

**How each one actually works:** IN materializes the subquery's result into a list first, then checks whether the outer value appears in that list. EXISTS never materializes a list at all — it's a correlated check that asks, row by row, "does at least one matching row exist," and stops looking the instant it finds one. JOIN is a different kind of operation entirely: it widens the result set by attaching matching columns from the other table, rather than simply asking yes-or-no.

**The NOT IN trap — the single most damaging NULL gotcha in SQL.** WHERE x NOT IN (SELECT y FROM t) silently returns zero rows for the entire query if even one row of t.y is NULL, regardless of what x actually is. The reason: NOT IN expands to an AND-chain of x <> y1 AND x <> y2 AND ... for every value in the list, and x <> NULL evaluates to UNKNOWN rather than TRUE or FALSE. One UNKNOWN anywhere in an AND-chain poisons the entire chain — it can never evaluate to TRUE — so not a single row survives the filter, even the ones that would have obviously qualified.

**NOT EXISTS has no such trap.** Because it checks each outer row independently against a correlated condition instead of building one shared list, a stray NULL in the other table simply never produces a match for that particular comparison — it doesn't poison anything else. The practical rule: default to **NOT EXISTS** over **NOT IN** whenever the subquery's column isn't guaranteed NOT NULL, which in practice means defaulting to it almost always.

**The JOIN trap is the mirror-image mistake.** Using an INNER JOIN purely to check "does a related row exist" silently multiplies the outer row once for every matching row on the other side — a customer with three orders shows up three times instead of once, quietly corrupting a COUNT(*) or SUM() computed afterward. EXISTS and IN can never do this, since they only ever ask a yes/no question. Reach for JOIN specifically when columns from the other table are needed in the output; reach for EXISTS when only the yes/no answer matters.`,
    codeLabel: "exists_vs_in_vs_join.sql",
    code: `-- Setup: Customers who placed at least one CANCELLED order.
-- Orders contains one row with customer_id = NULL (a data-quality gap).

-- THE NOT IN TRAP: this returns ZERO rows, always, because of that one NULL --
-- even customers who clearly never had a cancelled order get excluded.
SELECT * FROM Customers
WHERE customer_id NOT IN (
    SELECT customer_id FROM Orders WHERE order_status = 'CANCELLED'
);
-- If ANY row in that subquery has customer_id = NULL, every comparison
-- "customer_id <> NULL" is UNKNOWN, poisoning the whole AND-chain to
-- never-true. Result: 0 rows, no matter which customers actually qualify.

-- FIXED: NOT EXISTS checks each customer independently -- immune to the
-- NULL in Orders, because there is no shared list to poison.
SELECT * FROM Customers c
WHERE NOT EXISTS (
    SELECT 1 FROM Orders o
    WHERE o.customer_id = c.customer_id AND o.order_status = 'CANCELLED'
);

-- THE JOIN TRAP: a customer with 3 cancelled orders appears 3 TIMES here,
-- silently inflating any COUNT(*) run over this result.
SELECT c.customer_id, c.name
FROM Customers c
JOIN Orders o ON o.customer_id = c.customer_id AND o.order_status = 'CANCELLED';

-- FIXED: EXISTS asks only yes/no, so each customer appears at most once --
-- correct whenever the goal is "which customers," not "which order rows."
SELECT c.customer_id, c.name
FROM Customers c
WHERE EXISTS (
    SELECT 1 FROM Orders o
    WHERE o.customer_id = c.customer_id AND o.order_status = 'CANCELLED'
);`,
  },

  {
    id: "count-star-vs-count-column",
    title: "COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)",
    oneLiner: "All three are spelled COUNT, and all three can return a different number from the exact same rows.",
    content: `**COUNT(*)** counts rows — every row that made it through WHERE/GROUP BY, full stop. It never inspects any particular column's value, so NULLs anywhere in the row are irrelevant to it entirely.

**COUNT(column)** counts only the rows where *that specific column* is **NOT NULL** — a row with a NULL in the counted column is silently skipped. This is the one that trips people up: "how many employees have a manager" is COUNT(manager_id), not COUNT(*), precisely because employees with no manager store NULL there and must not be counted.

**COUNT(DISTINCT column)** layers both effects together: it counts NULL-excluded, then de-duplicated, distinct values of that column. COUNT(DISTINCT department_id) answers "how many different departments are represented," which is a different question from either of the other two.

**Where this bites hardest: after a LEFT JOIN.** An unmatched left row still counts as one row in the result, so COUNT(*) counts it — but every column pulled from the unmatched right-hand table is NULL on that row, so COUNT(right_table.id) correctly excludes it. Writing COUNT(*) when the actual question is "how many customers placed an order" over a LEFT JOIN from customers to orders silently counts customers with zero orders as if they'd placed one. (For how NULLs interact with SUM/AVG/MIN/MAX specifically — a related but distinct set of rules — see the NULL Handling topic.)

**The rule that resolves almost every "which COUNT do I want" question:** decide first whether NULL rows should count as zero occurrences or as one occurrence of "unknown" — that decision alone almost always picks the right form.`,
    codeLabel: "count_variants.sql",
    code: `-- Employee(id, name, manager_id)  -- manager_id is NULL for the CEO and any
-- employee with no manager on record.

SELECT
    COUNT(*)          AS total_employees,      -- every row, NULLs included
    COUNT(manager_id)  AS employees_with_manager -- skips rows where manager_id IS NULL
FROM Employee;

-- The LEFT JOIN trap: how many customers have placed at least one order?
-- Customers(id, name)   Orders(id, customer_id, amount)
SELECT
    COUNT(*)             AS wrong_count,   -- counts EVERY customer row, even zero-order ones
    COUNT(o.id)           AS right_count   -- counts only rows where an order actually matched
FROM Customers c
LEFT JOIN Orders o ON o.customer_id = c.id;
-- wrong_count == total number of customers, regardless of whether they ordered.
-- right_count == only customers with a real, matched order row.

-- COUNT(DISTINCT ...): how many distinct departments actually appear?
SELECT COUNT(DISTINCT department_id) AS distinct_departments
FROM Employee;`,
  },

  {
    id: "date-time-functions",
    title: "Date & Time Functions — Truncation, Extraction & Bucketing",
    oneLiner: "Almost every cohort, retention, or month-over-month question is the same DATE_TRUNC pattern wearing a different business label.",
    content: `Three operations cover the overwhelming majority of date-handling questions asked in interviews: rounding a timestamp *down* to a bucket, pulling out one *component* of it, and doing arithmetic *between or on* dates.

**DATE_TRUNC('month', ts)** rounds a timestamp down to the start of the specified unit — every timestamp in June collapses to June 1st, 00:00:00. This single function is the mechanism behind essentially every "group by month" or "group by week" report: GROUP BY DATE_TRUNC('month', order_date) buckets rows into calendar months without ever storing a separate month column. The same function with 'week', 'day', 'quarter', or 'year' covers every other common granularity.

**EXTRACT(field FROM ts)** pulls out a single numeric component instead of rounding — EXTRACT(dow FROM order_date) gives the day of week, EXTRACT(hour FROM created_at) gives the hour. This is what a question like "which day of the week has the most signups" is actually asking for: GROUP BY EXTRACT(dow FROM signup_date).

**Date arithmetic** — ts + INTERVAL '7 days' shifts a timestamp forward; ts2 - ts1 produces a duration rather than another date. Both are how "orders placed within the last 30 days" and "average time between signup and first purchase" get expressed.

**The cohort-retention pattern, worked concretely:** to measure month-1 retention, truncate each user's signup_date to a month (their cohort), separately truncate every activity row's activity_date to a month, then compare: a user is "retained" in month N if a truncated activity month exists that is exactly N months after their truncated cohort month. The entire pattern is two DATE_TRUNC calls and a difference in truncated months — no special retention function exists, or is needed.

**One sargability warning worth carrying over:** wrapping a date column in DATE_TRUNC (or EXTRACT) inside a **WHERE** clause has the exact same index-defeating problem as wrapping it in YEAR() — the function must run on every row before it can be compared. It's the standard, encouraged tool inside GROUP BY; inside WHERE, a plain range comparison on the raw column is the sargable choice instead.`,
    codeLabel: "date_time_functions.sql",
    code: `-- Month-over-month order totals -- the single most common date-bucketing pattern.
SELECT
    DATE_TRUNC('month', order_date) AS order_month,
    COUNT(*)                        AS order_count,
    SUM(total_amount)               AS revenue
FROM Orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY order_month;

-- Which day of the week gets the most signups?
SELECT
    EXTRACT(DOW FROM signup_date) AS day_of_week,   -- 0 = Sunday ... 6 = Saturday
    COUNT(*)                      AS signups
FROM Users
GROUP BY EXTRACT(DOW FROM signup_date)
ORDER BY signups DESC;

-- Simplified month-1 retention: for each cohort month, what fraction of
-- users who signed up that month were still active exactly one month later?
WITH cohorts AS (
    SELECT id AS user_id, DATE_TRUNC('month', signup_date) AS cohort_month
    FROM Users
),
month1_active AS (
    SELECT DISTINCT a.user_id
    FROM Activity a
    JOIN cohorts c ON c.user_id = a.user_id
    WHERE DATE_TRUNC('month', a.activity_date) = c.cohort_month + INTERVAL '1 month'
)
SELECT
    c.cohort_month,
    COUNT(DISTINCT c.user_id)                                   AS cohort_size,
    COUNT(DISTINCT m.user_id)                                   AS retained_month1,
    COUNT(DISTINCT m.user_id)::numeric / COUNT(DISTINCT c.user_id) AS retention_rate
FROM cohorts c
LEFT JOIN month1_active m ON m.user_id = c.user_id
GROUP BY c.cohort_month;

-- Sargability warning: wrapping a date column in WHERE breaks index use --
-- same issue as YEAR(order_date), just spelled differently.
-- SLOW:  WHERE DATE_TRUNC('month', order_date) = '2024-06-01'
-- FAST:  WHERE order_date >= '2024-06-01' AND order_date < '2024-07-01'`,
  },

  {
    id: "string-functions-pattern-matching",
    title: "String Functions & Pattern Matching",
    oneLiner: "CONCAT, SUBSTRING, TRIM and LIKE handle most text problems — until a NULL or a case mismatch quietly breaks the query.",
    content: `A small set of string functions covers nearly every text-manipulation question: joining pieces together, pulling a piece out, and stripping stray characters.

**Concatenation — CONCAT(a, b) or the || operator** joins strings together. The cross-engine gotcha worth knowing by name: the standard **||** operator propagates NULL, exactly like arithmetic does — 'Hello' || NULL evaluates to NULL, silently wiping out an entire concatenated string because one input piece was missing. Postgres's **CONCAT()** function is the deliberate exception: it treats NULL as an empty string instead, so CONCAT('Hello, ', NULL, '!') produces 'Hello, !' rather than vanishing entirely. The two are not interchangeable, and assuming || behaves like CONCAT() is a common bug.

**SUBSTRING(str FROM start FOR length)** extracts a piece of a string by position — pulling an area code out of a phone number, or the first three letters of a product code.

**TRIM / LTRIM / RTRIM** strip leading and/or trailing whitespace (or another specified character). Real-world data imported from spreadsheets or forms is riddled with stray leading and trailing spaces that silently break equality comparisons — 'Alice' and 'Alice ' are different strings as far as = is concerned, and this is a frequent, invisible cause of a JOIN or WHERE clause matching fewer rows than expected.

**Case sensitivity — UPPER()/LOWER() for comparison** — WHERE UPPER(name) = 'ALICE' works, but it carries the same sargability cost as wrapping a date column in a function: the index on name can't be used, since every row's value has to be transformed before comparing. A case-insensitive collation, or a functional index built specifically on UPPER(name), is the way to get case-insensitive matching without abandoning the index.

**LIKE's two wildcards** — % matches any sequence of characters (including none), and _ matches exactly one character. (Leading-wildcard performance, and the trailing-wildcard alternative, are covered in the Anti-Patterns topic — that finding applies here without repeating it.) For matching beyond what % and _ can express, most engines offer regular expressions directly in SQL — Postgres's ~ operator, MySQL's REGEXP — for patterns like "starts with a letter, followed by exactly four digits."`,
    codeLabel: "string_functions.sql",
    code: `-- Concatenation and the NULL gotcha
SELECT 'Hello, ' || NULL || '!';        -- NULL -- the entire expression vanishes
SELECT CONCAT('Hello, ', NULL, '!');    -- 'Hello, !' -- Postgres's CONCAT treats NULL as ''

-- SUBSTRING: pull the area code out of a phone number stored as '(555) 123-4567'
SELECT SUBSTRING(phone FROM 2 FOR 3) AS area_code FROM Customers;

-- TRIM: whitespace from imported data silently breaking an equality match
SELECT * FROM Customers WHERE name = 'Alice';        -- misses 'Alice ' with a trailing space
SELECT * FROM Customers WHERE TRIM(name) = 'Alice';  -- catches it

-- Case-insensitive match -- correct, but not sargable without a functional index
SELECT * FROM Customers WHERE UPPER(email) = UPPER('Alice@Example.com');
-- Sargable alternative: a functional index specifically on UPPER(email)
CREATE INDEX idx_customers_email_upper ON Customers (UPPER(email));

-- LIKE wildcards: % = any sequence, _ = exactly one character
SELECT * FROM Products WHERE sku LIKE 'A_-2024-%';   -- 'A' + any 1 char + literal + anything

-- Regex, for patterns LIKE can't express (Postgres's ~ operator)
SELECT * FROM Products WHERE sku ~ '^[A-Z][0-9]{4}$';   -- one letter, exactly four digits`,
  },
];
