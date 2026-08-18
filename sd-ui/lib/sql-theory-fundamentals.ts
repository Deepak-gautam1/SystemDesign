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
];
