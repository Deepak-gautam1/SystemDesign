import type { TheoryTopic } from "./types";

export const SQL_WINDOW_FUNCTIONS_TOPICS: TheoryTopic[] = [
  {
    id: "window-syntax-partition",
    title: "Window Function Syntax & PARTITION BY",
    oneLiner: "OVER(), PARTITION BY, and ORDER BY — the three pieces that turn an aggregate into a window function.",
    content: `## The Core Shape
Every window function follows: **FUNCTION() OVER (PARTITION BY column ORDER BY column)**. The **OVER()** clause is what turns an ordinary-looking function call into a window function — it tells SQL "compute this across a window of rows related to the current row, but don't collapse them into one row the way GROUP BY would."

## PARTITION BY — Which Group Restarts the Calculation
**PARTITION BY** divides rows into independent groups, and the window function's calculation restarts fresh for each group — conceptually identical to GROUP BY, except the rows aren't collapsed; every original row survives in the output, each carrying its own group's calculated value alongside it. Never partition by a column that's unique per row (like a primary key) — that creates a separate one-row "group" for every row and makes the window function meaningless (a running total that never accumulates, a rank that's always 1).

## ORDER BY Inside OVER() Controls Calculation, Not Output
The **ORDER BY** inside **OVER(...)** determines the order rows are processed in for the calculation (which row counts as "first" for a running total, or "previous" for LAG) — it has nothing to do with the order the final result set is displayed in. A separate **ORDER BY** at the very end of the whole query, outside any OVER(), is what controls actual output order. It's entirely possible, and common, to compute a window function ordered one way and then display the final result sorted a completely different way.

## Where the Result Can — and Can't — Be Used
A window function is evaluated after WHERE, GROUP BY, and HAVING, but before the final ORDER BY and LIMIT. That means you cannot reference a window function's result inside a WHERE clause at the same query level — the engine hasn't computed it yet by the time WHERE runs. Attempting to filter directly on it there is a semantic error in every major engine. The fix is always the same: compute the window function in a subquery or CTE, then filter on its alias in an outer query.`,
    codeLabel: "window_syntax.sql",
    code: `-- Every employee's salary, plus their department's average salary,
-- computed WITHOUT collapsing rows the way GROUP BY would.
SELECT
  employee_id,
  department_id,
  salary,
  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg_salary
FROM Employee;
-- Every row survives. Rows in the same department all show the same
-- dept_avg_salary, computed once per partition and repeated on every
-- member row.

-- Window functions can't be filtered directly at the same level:
--
-- SELECT *, RANK() OVER (ORDER BY salary DESC) AS rnk
-- FROM Employee
-- WHERE rnk = 1;                 -- ERROR: rnk doesn't exist yet here

-- Correct: wrap in a subquery, filter the alias outside.
SELECT * FROM (
  SELECT *, RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM Employee
) ranked
WHERE rnk = 1;`,
  },

  {
    id: "row-number-rank-dense-rank",
    title: "ROW_NUMBER vs RANK vs DENSE_RANK",
    oneLiner: "Three ways to number rows — they only disagree on what happens when two rows tie.",
    content: `## The Difference Is Entirely About Ties
All three functions assign an increasing integer to each row based on an ORDER BY. When there are no ties in the ordering column, all three produce identical output. They only diverge the moment two rows share the same value in the ORDER BY.

## ROW_NUMBER — Always Unique, Ties Broken Arbitrarily
**ROW_NUMBER()** hands out 1, 2, 3, 4... with no repeats, even for tied rows — the engine breaks the tie using whatever order it happens to process rows in (unless more columns are added to ORDER BY to make the tiebreak deterministic). Use it when it genuinely doesn't matter which of several tied rows "wins" — for example, picking any one row per group with **ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) = 1**.

## RANK — Ties Share a Rank, Then Skips
**RANK()** gives tied rows the same rank number, but the next distinct value jumps ahead by the number of tied rows — a three-way tie for 1st means the next rank is 4, not 2. This preserves "how many rows are strictly ahead of me" as a meaningful count, which is exactly what a leaderboard position usually means.

## DENSE_RANK — Ties Share a Rank, No Skipping
**DENSE_RANK()** also gives tied rows the same rank, but the next distinct value is always exactly one more — a three-way tie for 1st is immediately followed by rank 2. This is almost always the right choice for "Nth highest distinct value" problems, since RANK's skipped numbers would make "give me rank 2" silently return nothing if 1st place had a tie, and ROW_NUMBER would fail to treat the tied rows as equal at all.

## Picking the Right One
Ask: if two rows tie, should they get the same number? No → **ROW_NUMBER**. Yes, and skipped numbers afterward are fine → **RANK**. Yes, and every rank number must stay reachable → **DENSE_RANK**.`,
    codeLabel: "rank_functions.sql",
    code: `-- Same data, three columns side by side — watch what happens at the tie.
SELECT
  name,
  score,
  ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,
  RANK()       OVER (ORDER BY score DESC) AS rank_val,
  DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank_val
FROM Scores;

-- name   | score | row_num | rank_val | dense_rank_val
-- -------|-------|---------|----------|---------------
-- Alice  | 90    | 1       | 1        | 1
-- Bob    | 90    | 2       | 1        | 1     <- tied with Alice
-- Carol  | 85    | 3       | 3        | 2     <- RANK skips to 3, DENSE_RANK doesn't
-- Dave   | 80    | 4       | 4        | 3`,
  },

  {
    id: "lag-and-lead",
    title: "LAG and LEAD",
    oneLiner: "Reach into the previous or next row's value without writing a self-join.",
    content: `## Syntax
**LAG(column, offset, default) OVER (PARTITION BY ... ORDER BY ...)** reaches backward — offset rows before the current one in the specified order (offset defaults to 1). **LEAD(column, offset, default)** reaches forward the same way. The optional default is returned instead of NULL when there's no such row — for example, the very first row in a partition has no previous row for LAG to find.

## The Most Common Use: Comparing a Row to Its Neighbor
The classic pattern is a period-over-period change: **value - LAG(value) OVER (ORDER BY period)** gives the change since the last period in a single pass, with no self-join required. Computing both LAG and LEAD in the same query lets a row be compared to both of its neighbors at once — useful for detecting a local peak (current value greater than both the previous and next value) or a local trough.

## The Gotcha: LAG Looks at the Previous ROW, Not the Previous "Real" Period
**LAG(x) OVER (ORDER BY date)** returns the previous ROW in the result set ordered by date — not necessarily yesterday, last month, or whatever calendar period is intended, if the dates have gaps. If a table has no row for a given day, LAG silently skips straight to whatever the last row actually was, which is not the same thing as "yesterday." When the requirement is specifically about a fixed calendar offset — exactly one day earlier, exactly one month earlier — a self-join on that exact date arithmetic is the safer, explicit choice. LAG answers "the previous row that exists," not "the previous point in time that should exist."

## Same Filtering Restriction as Any Window Function
Just like RANK or a windowed SUM, a LAG/LEAD result can't be filtered in a WHERE clause at the same query level — compute it in a subquery or CTE first, then filter the alias in an outer query.`,
    codeLabel: "lag_lead.sql",
    code: `-- Month-over-month revenue change, and flag any month that's a local peak
-- (higher than both the month before AND the month after).
SELECT
  month,
  revenue,
  LAG(revenue)  OVER (ORDER BY month) AS prev_month_revenue,
  LEAD(revenue) OVER (ORDER BY month) AS next_month_revenue,
  revenue - LAG(revenue) OVER (ORDER BY month) AS change_from_prev
FROM MonthlyRevenue
ORDER BY month;

-- Local peaks — must go through a subquery; can't reference the LAG/LEAD
-- aliases in a same-level WHERE.
SELECT month, revenue FROM (
  SELECT month, revenue,
         LAG(revenue)  OVER (ORDER BY month) AS prev_rev,
         LEAD(revenue) OVER (ORDER BY month) AS next_rev
  FROM MonthlyRevenue
) t
WHERE revenue > prev_rev AND revenue > next_rev;`,
  },

  {
    id: "running-totals-frames",
    title: "Running Totals, Moving Averages & Frame Clauses",
    oneLiner: "ROWS BETWEEN ... PRECEDING AND ... FOLLOWING controls exactly which nearby rows a window function looks at.",
    content: `## Three Ways to Use an Aggregate Function
- **SUM(amount)** with no OVER() at all — a plain aggregate, collapses every matching row into a single output row.
- **SUM(amount) OVER (PARTITION BY x)** — a window aggregate with no ORDER BY: the same total is computed once per partition and repeated on every row in that partition (e.g. comparing an employee's salary to their department's total).
- **SUM(amount) OVER (PARTITION BY x ORDER BY y)** — adding ORDER BY changes the default frame to "everything from the start of the partition through the current row," which turns the same SUM into a running/cumulative total, one new value per row.

## The Frame Clause, Explicitly
**ROWS BETWEEN start AND end** names exactly which rows, relative to the current row, participate in the calculation. Common frames: **UNBOUNDED PRECEDING AND CURRENT ROW** — a running total from the beginning, and what ORDER BY defaults to automatically when no frame is written at all; **N PRECEDING AND CURRENT ROW** — a trailing moving window of the last N+1 rows, the standard shape for a moving average; **UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING** — the whole partition, every row, equivalent to leaving ORDER BY out entirely.

## ROWS vs RANGE
**ROWS** counts physical rows — exactly N rows back, regardless of their values. **RANGE** counts logical value ranges — e.g. "all rows within the last 6 units of the ORDER BY column's value," which can include more or fewer than N rows if there are ties or gaps in that column. ROWS is what most moving-average and running-total interview questions actually want; reach for RANGE only when the requirement is explicitly about a value range rather than a row count.

## Moving Averages
A trailing N-day moving average is simply a running-total-style frame with a bounded start instead of UNBOUNDED PRECEDING: **AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)** averages the current row and the 6 before it — 7 rows total. Watch the first few rows of any partition: with fewer than N-1 prior rows available, the frame simply uses however many rows actually exist, which can silently produce an average over fewer days than intended unless the query explicitly guards against it with a row-count check.`,
    codeLabel: "running_totals.sql",
    code: `-- Running total of daily sales (this frame is actually the DEFAULT
-- whenever ORDER BY is present — written out here for clarity).
SELECT
  sale_date,
  daily_amount,
  SUM(daily_amount) OVER (
    ORDER BY sale_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM DailySales;

-- 7-day trailing moving average — a BOUNDED frame instead.
SELECT
  sale_date,
  daily_amount,
  AVG(daily_amount) OVER (
    ORDER BY sale_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7d
FROM DailySales;`,
  },

  {
    id: "nth-highest-pattern",
    title: "The Nth-Highest-Value Pattern",
    oneLiner: "Why WHERE rnk = N fails outright, and the two ways to make N a real, flexible value.",
    content: `## The Bare Version Doesn't Work
A raw **WHERE rnk = N** is meaningless in plain SQL unless **rnk** is a real computed column already available at that point in the query, and **N** is a real bound value — not a description of "the Nth row" floating in the abstract. Two separate problems usually get tangled together here: a window function's result can't be filtered in a same-level WHERE at all, and "N" needs an actual mechanism to be supplied as a value.

## Fix Part 1 — Rank First, Filter Outside
Compute **DENSE_RANK()** — almost always DENSE_RANK, not RANK, since ties should count as one rank so "3rd highest" stays well-defined even when 1st place is tied — inside a subquery or CTE, then filter that alias in an outer query.

## Fix Part 2 — Make N an Actual Parameter
If "N" needs to vary at call time rather than being hardcoded, it has to arrive as a real parameter through one of: a formal argument to a stored function (**CREATE FUNCTION getNthHighestSalary(N INT) ...**), a session variable in engines that support one, or an application-layer parameterized query placeholder. The underlying lesson generalizes past this one problem: keep a query's fixed *logic* — how the ranking works — separate from its variable *inputs* — which rank is wanted. Hardcoding a value that should be a parameter is a design smell wherever it shows up, not just here.

## An Alternative for a Fixed, Known N
When N is small and fixed — say, always exactly 2 — **DISTINCT ... ORDER BY salary DESC LIMIT 1 OFFSET (N-1)** wrapped in a scalar subquery is a simpler one-line alternative to a full DENSE_RANK CTE, with the added benefit of naturally returning NULL, rather than an empty result, when fewer than N distinct values exist. DENSE_RANK is the more general, reusable approach when multiple rank levels are needed out of the same query — the OFFSET approach only ever hands back one specific rank at a time.`,
    codeLabel: "nth_highest.sql",
    code: `-- General, reusable: every distinct salary tagged with its rank at once.
WITH ranked AS (
  SELECT DISTINCT salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM Employee
)
SELECT salary FROM ranked WHERE rnk = 3;   -- "3rd highest," ties handled correctly

-- Fixed N, single value, NULL-safe when it doesn't exist:
SELECT (
  SELECT DISTINCT salary
  FROM Employee
  ORDER BY salary DESC
  LIMIT 1 OFFSET 2          -- OFFSET = N - 1, so N = 3 here
) AS third_highest_salary;`,
  },

  {
    id: "gaps-and-islands-and-median",
    title: "Gaps and Islands, and the Median Pattern",
    oneLiner: "One subtraction trick turns a run of consecutive values into a single group — no procedural loop required.",
    content: `**Gaps and islands** is the standard name for a whole family of interview questions that all reduce to the same shape: find the maximal runs — "islands" — of consecutive values in a column, separated by "gaps" where the sequence breaks. Consecutive login days, consecutive order IDs, a stock's consecutive up-days — all the same underlying problem.

**The trick that solves all of them:** rank the rows in order with ROW_NUMBER(), then subtract that row number from the actual value. Within one unbroken run, both the value and the row number increase by exactly 1 each step, so their difference stays **constant** for the entire island — and that difference changes at every gap. Grouping by this constant collapses each island down to a single group, ready for MIN/MAX/COUNT.

**Worked example:** login dates 1, 2, 3, then a gap, then 5, 6, 7. Row numbers are 1 through 6 in order. The date-minus-row-number values come out 0, 0, 0 for the first three dates (island A) and 1, 1, 1 for the last three (island B) — two distinct constants, two islands, found without a single explicit loop.

**Median has no standard aggregate function in most engines**, unlike AVG or SUM, and it needs different handling depending on whether the row count is odd or even — the median of an even count is the *average of the two middle values*, not either one alone. Postgres and several other engines provide **PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value)**, which computes the 50th percentile with linear interpolation between the two middle values automatically, correctly handling the odd/even split without any extra logic. Where PERCENTILE_CONT isn't available, the manual equivalent is two window-ranked passes — one ascending, one descending — keeping only the row(s) where both ranks are within one of each other, then averaging.

**Both patterns share a lineage** with the Nth-highest-value pattern and running-total frames covered elsewhere in this category — all three lean on the same core idea, that ranking rows with a window function turns an otherwise procedural, row-by-row problem into a single declarative pass.`,
    codeLabel: "gaps_and_islands_median.sql",
    code: `-- Gaps and islands: find each streak of consecutive login dates per user.
-- LoginDays(user_id, login_date) -- one row per day a user logged in.
WITH numbered AS (
  SELECT
    user_id,
    login_date,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn
  FROM LoginDays
),
islands AS (
  SELECT
    user_id,
    login_date,
    login_date - (rn * INTERVAL '1 day') AS island_key   -- constant within one streak
  FROM numbered
)
SELECT
  user_id,
  MIN(login_date) AS streak_start,
  MAX(login_date) AS streak_end,
  COUNT(*)        AS streak_length
FROM islands
GROUP BY user_id, island_key
ORDER BY user_id, streak_start;
-- Dates 1,2,3 all share one island_key; dates 5,6,7 (after the gap) share a
-- DIFFERENT island_key -- exactly two groups, found with no explicit loop.

-- Median via PERCENTILE_CONT -- handles the odd/even split automatically.
SELECT
  department_id,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary
FROM Employee
GROUP BY department_id;`,
  },
];
