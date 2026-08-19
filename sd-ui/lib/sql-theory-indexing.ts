import type { TheoryTopic } from "./types";

export const SQL_INDEXING_TOPICS: TheoryTopic[] = [
  {
    id: "index-types",
    title: "Clustered vs Non-Clustered Indexes",
    oneLiner: "What each index type actually stores, when it helps, and when it's dead weight.",
    content: `## Clustered Indexes
A **clustered index** determines the actual physical order in which a table's rows are stored on disk — the table data itself effectively *is* the index's leaf level. Because rows can only be physically sorted one way, a table can have **at most one** clustered index, usually built automatically on the primary key. Range scans and ORDER BY queries on the clustering key become essentially free, since the rows are already sitting in exactly that order — no separate lookup step is required.

## Non-Clustered Indexes
A **non-clustered index** is a separate structure — almost always a **B-tree** — that stores indexed column values in sorted order alongside a pointer back to the full row. A table can have **many** non-clustered indexes. Reading through one means: search the B-tree for the key, then follow the pointer to fetch the rest of the row (unless the index already contains every column the query needs — a **covering index** — which skips that extra fetch entirely).

**A genuine engine difference worth knowing:** SQL Server and MySQL/InnoDB maintain a clustered index as a continuous, enforced property of the table — InnoDB, in particular, always clusters on the primary key (or an internal hidden row id if no primary key exists). PostgreSQL has no continuously-maintained clustered index at all: tables are stored as an unordered heap by default, and every index — including one on the primary key — is a separate non-clustered structure pointing back into that heap. Postgres does offer a CLUSTER command that physically sorts the heap according to a chosen index, but it's a one-off maintenance operation, not something the engine keeps enforcing as rows are inserted afterward.

## When Indexes Help
Beyond the clustering benefits above, a well-chosen non-clustered index dramatically speeds up point lookups and filtered queries on any column it covers — turning a full scan into a tree search — at the cost of extra storage and slightly slower writes, since every INSERT, UPDATE, and DELETE now has to keep every index on the table up to date, not just the underlying rows.

## When Indexes Don't Help
- **Low-cardinality columns** — a boolean flag or a status column with only a handful of possible values gives the optimizer little to narrow down; a large fraction of rows match any given value, so it often scans the table anyway.
- **Small tables** — if a table fits in a handful of disk pages, a full sequential scan can be faster than the overhead of traversing a B-tree and then jumping back to fetch each row.
- **Queries that need most of the table anyway** — if a WHERE clause matches, say, 60% of rows, looking each one up individually through an index (with all the extra random-access page fetches that implies) is usually slower than just scanning the table sequentially from the start.`,
    codeLabel: "index_types.sql",
    code: `-- Simple single-column index -- speeds up lookups/filters on customer_id
CREATE INDEX idx_orders_customer_id ON orders (customer_id);

-- Composite (multi-column) index -- column ORDER matters!
-- Sorted first by status, then by order_date within each status.
CREATE INDEX idx_orders_status_date ON orders (status, order_date);

-- Usable for queries filtering on status alone...
SELECT * FROM orders WHERE status = 'SHIPPED';

-- ...and fully usable for status + order_date together, since order_date
-- is the second column of the SAME index:
SELECT * FROM orders
WHERE status = 'SHIPPED' AND order_date > '2024-01-01';

-- NOT efficiently usable for a query filtering on order_date alone --
-- order_date isn't the leading (leftmost) column, and the engine can't
-- binary-search into the middle of a composite index:
SELECT * FROM orders WHERE order_date > '2024-01-01';

-- Rule of thumb: put the column used for equality filters (or whichever
-- column is most selective) first; range-filtered columns after it.`,
  },

  {
    id: "query-optimization-explain",
    title: "Reading EXPLAIN / EXPLAIN ANALYZE",
    oneLiner: "How to read a query plan, and the red flags that point straight at the fix.",
    content: `## What EXPLAIN Shows
Running **EXPLAIN** in front of a query does not execute it — it asks the query planner to choose an execution plan and print it out as a tree, without touching any actual data. The plan shows which **scan type** it picked for each table (sequential scan, index scan, index-only scan, bitmap heap scan...), which **join algorithm** it picked for each join (nested loop, hash join, merge join), and the planner's *estimated* cost and row count at each step — all derived from statistics the engine keeps about the table (row counts, value distributions), not from actually running anything.

## What EXPLAIN ANALYZE Adds
**EXPLAIN ANALYZE** actually executes the query — including any side effects, for a data-modifying statement, so use it carefully against production — and reports real, measured elapsed time and real row counts at each step of the plan, alongside the original estimates. Comparing estimated vs. actual at each node is one of the single most useful diagnostic habits in query tuning: a plan that looks reasonable in the abstract can still be badly wrong in practice if the planner's estimates were off.

## Red Flags to Look For
- A **sequential scan** on a large table where the query's filter is highly selective (matches a small fraction of rows) — this usually means a useful index is missing, so the engine had no better option than reading every row.
- A **large gap between estimated and actual row counts** at some node — this points to stale or missing table statistics (fixable by re-running the engine's statistics-gathering command), which can mislead the planner into choosing a bad plan elsewhere in the tree too.
- A **nested loop join** over two large, largely unfiltered inputs — fine when at least one side is small, but disastrous at scale, since it re-scans the inner side once per row of the outer side. Usually signals a missing index on the join column, which would let the planner switch to a far cheaper index-based join instead.`,
    codeLabel: "explain_analyze.sql",
    code: `EXPLAIN ANALYZE
SELECT customer_id, SUM(total)
FROM orders
WHERE order_date >= '2024-01-01'
GROUP BY customer_id;

-- Mock plan output (illustrative, not from a real run):
--
-- HashAggregate  (cost=15230.00..15240.00 rows=800 width=12)
--                (actual time=812.442..812.901 rows=793 loops=1)
--   Group Key: customer_id
--   ->  Seq Scan on orders  (cost=0.00..14500.00 rows=290000 width=12)
--                           (actual time=0.021..650.117 rows=288114 loops=1)
--         Filter: (order_date >= '2024-01-01')
--         Rows Removed by Filter: 11886
--
-- RED FLAG: "Seq Scan on orders" here matched most of the table, which is
-- fine -- but if that same Filter usually matched only 1% of rows, a Seq
-- Scan would be a strong signal that order_date has no usable index.
-- The fix, if this pattern shows up on a highly selective filter:
--
-- CREATE INDEX idx_orders_order_date ON orders (order_date);`,
  },

  {
    id: "common-antipatterns",
    title: "Common Query Anti-Patterns",
    oneLiner: "Six query patterns that quietly disable indexes and tank performance.",
    content: `Certain query patterns show up again and again in slow-query logs, and in SQL interviews — each one silently disables an optimization the engine would otherwise use automatically.

- **Function-wrapped columns in WHERE** — wrapping an indexed column in a function, e.g. filtering with YEAR(order_date) = 2024, forces the engine to evaluate that function against every row, since it can no longer use the index's sorted raw values directly. The fix is a **sargable** (Search ARGument ABLE) range comparison on the raw column instead: order_date >= '2024-01-01' AND order_date < '2025-01-01', which a plain index on order_date can satisfy directly.
- **Leading wildcards in LIKE** — a pattern like '%term' can't use a standard B-tree index at all, since the index is sorted left-to-right and a leading wildcard gives it no prefix to search from; it falls back to scanning every row. A trailing wildcard, 'term%', is just a prefix range and uses the index perfectly well.
- **Selecting every column instead of only what's needed** — wastes bandwidth and I/O on data the application never uses, and can also stop the optimizer from using a covering index (one that already holds every column the query needs) by forcing a trip back to the full row anyway.
- **Implicit type conversion** — comparing a text column to a numeric literal, or any other cross-type comparison, forces the engine to convert every stored value before comparing, silently breaking index usage in the same way a function-wrapped column does.
- **N+1 query patterns from application code** — looping over a result set and firing one additional query per row (say, 100 orders followed by 100 separate per-customer lookups) turns what should be one or two round trips into 101. A single JOIN, or one batched query with an IN (...) list, replaces all of them.
- **Missing indexes on foreign keys** — a foreign-key column that's constantly used in JOIN conditions but has no index of its own forces every join through it into a sequential scan of the referencing table. Unlike the referenced primary-key side, most databases do not add this index automatically — it's worth checking for explicitly.`,
    codeLabel: "query_antipatterns.sql",
    code: `-- 1. Function-wrapped column vs. a sargable range
-- Wrong: the index on order_date can't be used -- YEAR() must run on every row
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- Right: sargable range comparison -- a plain index on order_date works
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';


-- 2. Leading wildcard vs. trailing wildcard
-- Wrong: leading '%' -- can't use a standard B-tree index, forces a full scan
SELECT * FROM customers WHERE last_name LIKE '%sen';

-- Right: trailing '%' only -- usable as a prefix search on the index
SELECT * FROM customers WHERE last_name LIKE 'Han%';


-- 3. SELECT * vs. naming only the needed columns
-- Wrong: pulls every column, which can prevent use of a covering index
SELECT * FROM orders WHERE customer_id = 42;

-- Right: only the columns actually needed -- servable entirely from a
-- covering index on (customer_id, order_date, total), no trip back to
-- the full row required
SELECT order_date, total FROM orders WHERE customer_id = 42;`,
  },

  {
    id: "pagination-limit-offset-vs-keyset",
    title: "Pagination — LIMIT/OFFSET vs Keyset (Seek) Pagination",
    oneLiner: "OFFSET pagination gets slower on every deeper page, at the exact same rate the product wants people scrolling further.",
    content: `**LIMIT/OFFSET** is the obvious way to paginate: LIMIT 20 OFFSET 100000 asks for 20 rows starting after the first 100,000. The problem is what OFFSET actually costs the engine: it still has to walk through and discard all 100,000 skipped rows before it can return anything, every single time. Page 1 is fast; page 5,000 of the same query is dramatically slower, even though both requests return the exact same 20 rows' worth of work at the point of output.

## The Second Problem: Correctness Under Concurrent Writes
OFFSET pagination doesn't just get slow — it can get *wrong*. If a row is inserted or deleted between two page requests, "row number 100,020" shifts to a different actual row than it meant a moment earlier, which can cause a user paging through results to see the same row twice, or skip one entirely, purely because the underlying data moved while they were scrolling.

## Keyset (Seek) Pagination
**Keyset pagination** fixes both problems by anchoring to an actual value instead of a row count. Rather than "skip 100,000 rows," it remembers the last row's sort-key value from the previous page and asks: give me the next 20 rows **WHERE sort_key > last_seen_value ORDER BY sort_key LIMIT 20**. With an index on sort_key, this is a direct index seek straight to that value — constant-time, regardless of how deep into the result set the request is, and immune to the shifting-window problem, since it's anchored to a real value rather than a position that can move.

**Concrete cost comparison:** OFFSET 100000 LIMIT 20 scans and discards 100,000 rows before returning 20. WHERE id > 100000 ORDER BY id LIMIT 20, with an index on id, seeks directly to id = 100000 and reads the next 20 rows forward — no discarded work at all, whether that anchor value is row 20 or row 20 million.

## The One Real Tradeoff
Keyset pagination can only move relative to a known position — "give me the next page from here" — it has no way to jump directly to an arbitrary page number, since it never counts rows at all. That makes it the right fit for infinite-scroll and next/previous interfaces, but a poor fit for numbered page links ("jump to page 47"), where OFFSET's ability to compute any page directly — despite being slower at depth — remains the simpler tool.`,
    codeLabel: "pagination.sql",
    code: `-- OFFSET pagination: correct, but the cost grows with how deep the page is.
-- This has to walk past and discard 100,000 rows before returning anything.
SELECT id, title, created_at
FROM Posts
ORDER BY id
LIMIT 20 OFFSET 100000;

-- Keyset (seek) pagination: anchor to the last row seen on the previous page.
-- With an index on id, this seeks DIRECTLY to id = 100000 -- no rows discarded,
-- regardless of how far into the table 100000 actually is.
SELECT id, title, created_at
FROM Posts
WHERE id > 100000          -- 100000 was the last id shown on the previous page
ORDER BY id
LIMIT 20;

-- Keyset pagination on a non-unique sort column needs a tiebreaker to stay
-- deterministic -- compare the pair, not just the first column, or rows
-- with an identical created_at can be skipped or repeated.
SELECT id, title, created_at
FROM Posts
WHERE (created_at, id) > ('2024-06-01 10:00:00', 4521)
ORDER BY created_at, id
LIMIT 20;`,
  },

  {
    id: "table-partitioning",
    title: "Table Partitioning",
    oneLiner: "Splitting one table into physical slices the planner can skip entirely — often for a reason that has nothing to do with query speed.",
    content: `**Table partitioning** splits one logical table into multiple physical sub-tables — partitions — each holding a subset of rows based on a partition key, while application code still queries it as a single table.

## The Three Common Strategies
- **RANGE** — each partition holds a contiguous range of the key's values, most commonly a month or year of a date column. This is the default choice for time-series and event data.
- **LIST** — each partition holds an explicit, named set of values, such as one partition per region or per status.
- **HASH** — rows are assigned to a partition by hashing the key, which spreads data roughly evenly when there's no natural range or category to split on.

## Partition Pruning Is the Query-Speed Payoff
If a query's WHERE clause can be matched against the partition key — WHERE order_date >= '2024-06-01' against a table partitioned by month — the planner can skip every partition that couldn't possibly contain a matching row without even opening them, called **partition pruning**. A query that would otherwise scan the entire table instead scans only the relevant slice, shrinking the effective table size to whatever fits the filter.

## The Other Reason: Fast Bulk Deletes
The operational reason many time-series-heavy systems partition in the first place has nothing to do with SELECT speed at all: dropping an entire old partition — deleting all of 2019's data by dropping that one partition — is a fast, near-instant metadata operation, instead of a row-by-row DELETE that has to be logged and can bloat the table with dead rows needing cleanup afterward. For systems that regularly purge old data on a retention policy, this is often the dominant motivation.

## Partitioning Is Not Sharding
Partitioning splits data into multiple physical segments **within one database instance**; **sharding** splits data across **multiple separate database servers** entirely, and is a system-design/scaling concern rather than a single-database SQL one. It's worth stating that distinction plainly in an interview, since the two get used loosely in casual conversation.

## Partitioning and Indexing Are Complementary, Not Substitutes
An index helps the engine find rows quickly *within* wherever they're stored; partitioning changes how the table is physically organized in the first place. A partitioned table still benefits from indexes built on each individual partition — the two techniques solve different problems and are normally used together.`,
    codeLabel: "table_partitioning.sql",
    code: `-- RANGE partitioning by month -- the standard shape for time-series data.
CREATE TABLE orders (
    id         SERIAL,
    order_date DATE NOT NULL,
    amount     NUMERIC
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Partition pruning: this filter matches only January, so the planner
-- never even opens orders_2024_02 (or any other month's partition).
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01';

-- Fast bulk delete: dropping a whole partition is near-instant metadata
-- work, not a logged, row-by-row DELETE.
DROP TABLE orders_2024_01;   -- all of January's rows, gone in one metadata op

-- Contrast: the row-by-row equivalent, slow and heavily logged.
-- DELETE FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01';`,
  },
];
