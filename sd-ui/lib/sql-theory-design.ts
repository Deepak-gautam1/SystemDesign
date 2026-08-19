import type { TheoryTopic } from "./types";

export const SQL_DESIGN_TOPICS: TheoryTopic[] = [
  {
    id: "normalization",
    title: "Normalization — 1NF Through BCNF",
    oneLiner: "The progression of normal forms, and the specific update anomaly each one eliminates.",
    content: `## First Normal Form (1NF)
A table is in 1NF when every column holds a single, atomic value — no comma-separated lists, arrays, or repeating groups crammed into one field. A customers table with a single phone_numbers column holding "555-1234, 555-5678" violates 1NF: searching for, indexing, or updating a single phone number becomes awkward and error-prone. The usual fix is a separate child table (one row per phone number, linked back by a foreign key).

## Second Normal Form (2NF)
2NF adds: no **partial dependency**. Every non-key column must depend on the *entire* primary key, not just part of it — this only matters for tables with a **composite** (multi-column) primary key. Classic anomaly: an order_items table keyed on (order_id, product_id) that also stores product_name. product_name depends only on product_id — half the key — so the same product's name gets duplicated across every order line that includes it, and updating a product's name means updating it in every order that ever referenced it, with every missed row silently going stale.

## Third Normal Form (3NF)
3NF adds: no **transitive dependency**. A non-key column can't depend on another non-key column — every non-key column must depend on the key, the whole key, and nothing but the key. Classic anomaly: an employees table storing both department_id and department_name. department_name depends on department_id, not directly on the employee's primary key, so it's duplicated across every employee in that department — renaming a department means updating every one of its employees' rows instead of a single row in a separate departments table.

## Boyce-Codd Normal Form (BCNF)
BCNF is a stricter version of 3NF: every **determinant** — any column, or set of columns, that some other column functionally depends on — must itself be a candidate key. 3NF leaves a narrow loophole that BCNF closes: it's possible to satisfy 3NF while a non-key determinant still exists, when a table has multiple overlapping candidate keys. Classic anomaly: a (student, subject, teacher) table where each teacher teaches only one subject, but a subject may be taught by several teachers. teacher determines subject — a determinant — yet teacher alone isn't a candidate key, so subject is duplicated across rows and nothing stops the same teacher being recorded teaching two contradictory subjects by mistake.

## Why the Progression Matters
Each normal form exists to eliminate one specific category of **update anomaly** — the same fact stored in more than one place, drifting out of sync the moment one copy is updated and another is missed. Normalizing isn't a goal in itself; it's a mechanical way of guaranteeing that every fact lives in exactly one place.`,
    codeLabel: "normalization.sql",
    code: `-- VIOLATES 1NF: repeating values crammed into a single column
CREATE TABLE customers_bad (
    id            INT PRIMARY KEY,
    phone_numbers TEXT   -- e.g. '555-1234, 555-5678' -- not atomic!
);
-- Fixed: one row per phone number in its own table, linked by customer_id.

-- VIOLATES 2NF: order_items keyed on (order_id, product_id), but
-- product_name only depends on product_id -- half of the composite key
CREATE TABLE order_items_bad (
    order_id     INT,
    product_id   INT,
    product_name TEXT,      -- duplicated on every order line for this product
    quantity     INT,
    PRIMARY KEY (order_id, product_id)
);
-- Anomaly: renaming a product means updating it in every order_items row
-- that has ever referenced it -- easy to update some rows and miss others.

-- FIXED: move product_name into its own table, keyed on product_id alone
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name TEXT
);
CREATE TABLE order_items (
    order_id   INT,
    product_id INT REFERENCES products(product_id),
    quantity   INT,
    PRIMARY KEY (order_id, product_id)
);
-- product_name now lives in exactly one row, no matter how many orders
-- reference that product.

-- VIOLATES 3NF: department_name is transitively dependent on employee_id,
-- by way of department_id
CREATE TABLE employees_bad (
    employee_id     INT PRIMARY KEY,
    department_id   INT,
    department_name TEXT    -- depends on department_id, not on employee_id
);
-- Fixed the same way: move department_name into its own departments table,
-- referenced by department_id.`,
  },

  {
    id: "denormalization",
    title: "Denormalization Tradeoffs",
    oneLiner: "When deliberately duplicating data beats a fully normalized schema, and what it costs you.",
    content: `## When Denormalization Is the Right Call
Normalization optimizes for write-safety and eliminating redundancy — but every join required at read time has a real performance cost. Deliberately duplicating data is the right tradeoff in a few recurring situations: **read-heavy analytics/reporting workloads**, where the same aggregations run constantly and the underlying data changes far less often than it's read; avoiding **expensive multi-way joins at scale**, where joining five or six normalized tables on every request becomes the dominant cost of a query; and serving a **hot read path with strict latency requirements**, where even a well-indexed join adds more latency than the budget allows.

## The Cost: Update Anomalies Return, On Purpose
Normalization's entire value proposition is making certain update anomalies *structurally impossible*. Denormalizing brings them back — deliberately — which means they now have to be managed by hand instead of being ruled out by the schema. That management takes one of a few forms: **triggers** that propagate a change to every duplicated copy automatically, **application-level dual writes** (the app writes to both the source-of-truth table and the denormalized copy in the same operation), or a **scheduled ETL job** that periodically re-syncs the denormalized copy from the source of truth, accepting some staleness in exchange for simplicity. Whichever mechanism you pick, you're trading a guarantee the database used to enforce for you, for performance you now have to earn back with discipline.

## Materialized Views: A Middle Ground
A **materialized view** is a precomputed, denormalized snapshot of a query's results, physically stored like a table and periodically refreshed — either on a schedule, or manually triggered after a batch of changes. It gives you the fast, join-free reads of a denormalized table without permanently forking your schema into a normalized source of truth plus a separately-maintained denormalized copy that application code has to remember to keep in sync — the refresh is a single, well-defined operation instead of scattered triggers or dual-write code. The tradeoff shifts from "keep two structures in sync on every write" to "accept that reads may be stale by however long it's been since the last refresh," which is a much easier property to reason about.`,
    codeLabel: "materialized_view.sql",
    code: `-- Normalized source of truth: a join is required for even a simple report
SELECT c.name, COUNT(o.id) AS order_count, SUM(o.total) AS lifetime_value
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.name;
-- Fine at small scale; gets expensive once this runs constantly against
-- millions of orders for a dashboard that refreshes every few seconds.

-- Materialized view: precompute it once, read the precomputed result instead
CREATE MATERIALIZED VIEW customer_lifetime_value AS
SELECT c.id, c.name, COUNT(o.id) AS order_count, SUM(o.total) AS lifetime_value
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;

-- Reads are now a simple, index-friendly lookup -- no join at query time:
SELECT * FROM customer_lifetime_value WHERE id = 42;

-- Refresh on a schedule (e.g. via a cron job) to bring it back in sync
-- with the underlying tables:
REFRESH MATERIALIZED VIEW CONCURRENTLY customer_lifetime_value;
-- CONCURRENTLY avoids locking out readers while the refresh runs, at the
-- cost of requiring a unique index on the view.`,
  },

  {
    id: "constraints-keys",
    title: "Keys & Constraints",
    oneLiner: "PRIMARY KEY, FOREIGN KEY, UNIQUE, and CHECK — enforcing correctness in the schema itself.",
    content: `## The Core Constraint Types
- **PRIMARY KEY** — uniquely identifies each row; implicitly both unique and NOT NULL. A table has exactly one.
- **FOREIGN KEY** — enforces that a column's value must exist in another table's referenced column (or be NULL, if the column allows it), tying two tables together and preventing "orphan" references to rows that don't exist.
- **UNIQUE** — guarantees no two rows share the same value in that column, but unlike a primary key, a table can declare several UNIQUE constraints, and NULLs are typically allowed — in most engines, more than one NULL is allowed too, since NULL is never considered equal to another NULL.
- **CHECK** — an arbitrary boolean condition every row must satisfy, e.g. CHECK (salary > 0), evaluated on every insert and update.
- **NOT NULL** — simply forbids a missing value in that column.

## Composite Keys
A **composite key** is a primary or unique key spanning more than one column, where uniqueness is only guaranteed by the *combination* — individual columns in it can repeat freely on their own. This is the natural choice for pure join/junction tables, like an order_items table keyed on (order_id, product_id) together.

## Referential Actions: ON DELETE and ON UPDATE
When a foreign key's parent row is deleted, or its referenced key value is updated, the database needs to know what to do with the dependent rows that reference it:
- **CASCADE** — propagate the operation: delete (or update) the dependent rows too.
- **SET NULL** — null out the referencing column on dependent rows instead of touching them otherwise.
- **RESTRICT / NO ACTION** — block the operation entirely if any dependent rows still exist (the two differ only in subtle timing details in some engines; both refuse the operation by default rather than silently cascading).

## Why Enforce This at the Database Layer
It's tempting to treat all of this as "just validation" and put it in application code instead. The database-level version is strictly stronger: a constraint declared on the table is enforced against *every* write, no matter where it comes from — the application, a one-off migration script, a bulk data load, another service sharing the same database, or a developer poking around directly in a SQL client. Application-only validation only protects the one code path that runs it; anything that touches the database without going through that exact code path can silently violate the rule. Constraints turn "we hope every caller remembers to validate this" into "it is not possible for this to be violated," which is a categorically stronger guarantee.`,
    codeLabel: "constraints_and_keys.sql",
    code: `CREATE TABLE departments (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE employees (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    department_id INT REFERENCES departments(id)
                      ON DELETE SET NULL
                      ON UPDATE CASCADE,
    salary        NUMERIC CHECK (salary > 0)
);

-- Composite primary key: uniqueness is only guaranteed by the pair together
CREATE TABLE order_items (
    order_id   INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    quantity   INT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id)
);

-- ON DELETE CASCADE: deleting an order automatically deletes its line items
DELETE FROM orders WHERE id = 501;    -- order_items rows for order 501 vanish too

-- ON DELETE SET NULL: deleting a department un-assigns its employees
-- instead of deleting them
DELETE FROM departments WHERE id = 7;  -- affected employees.department_id becomes NULL

-- ON UPDATE CASCADE: if a department's id value is ever changed, every
-- employee referencing it is updated automatically to match
UPDATE departments SET id = 70 WHERE id = 7;  -- employees.department_id follows along

-- ON DELETE RESTRICT: deleting a product still referenced by order_items
-- is BLOCKED until those rows are removed or reassigned first
DELETE FROM products WHERE id = 99;   -- ERROR if any order_items still reference it`,
  },

  {
    id: "views-procedures-triggers-tradeoffs",
    title: "Views, Stored Procedures & Triggers — the Trade-Off, Not Just the Syntax",
    oneLiner: "Knowing the syntax earns nothing on its own — the interview is really asking whether business logic belongs inside the database at all.",
    content: `A **view** is a saved, named SELECT query living in the schema — querying it re-runs the underlying query live, every time, against current data. It's useful for hiding a complex multi-table join behind a simple, stable name, restricting which columns or rows a role is allowed to see, and giving callers an interface that doesn't have to change even if the underlying tables' structure does later. A **materialized view** — covered under Denormalization Tradeoffs — trades that always-fresh guarantee for speed, precomputing and storing the result instead of recomputing it on every read.

## Stored Procedures: the Case For, and the Case That Won
A **stored procedure** is a named, precompiled block of procedural logic that lives and runs inside the database itself, invoked with CALL. The case for them: fewer network round-trips, since one CALL can replace several separate statements sent from the application, and centralized behavior that every caller gets identically — including other services, ad-hoc scripts, and analysts querying the same database directly.

The case against is what has actually won out in most modern backend architectures: business logic inside a stored procedure is invisible to the application's version control, code review process, and testing tooling in the way ordinary application code is not. It locks that logic to one database engine's specific procedural dialect — T-SQL, PL/pgSQL, and PL/SQL are three different languages — making a future database migration far harder than it would otherwise be. And it splits "where does this rule actually live" across two separate codebases instead of one. The honest, current answer names this trade-off rather than reciting procedures as unconditionally good or bad practice.

## Triggers: Automatic, and That's the Danger
A **trigger** is a procedure that fires automatically on an INSERT, UPDATE, or DELETE, without being called explicitly by whatever issued the original statement. The specific reputation problem: a trigger's side effects are invisible from the point of view of the code that ran the triggering statement — a simple, innocent-looking UPDATE can silently cascade into arbitrary additional changes elsewhere, with nothing in the calling code hinting that anything beyond the one row it touched actually happened. Debugging a system with hidden trigger side effects means learning to suspect the schema itself, not just the code that appears to run.

## The Answer That Actually Scores
Reserve triggers and procedures for narrow, genuinely database-native concerns — enforcing an invariant that must never be bypassable by any caller, or a bulk operation where the network round-trip savings are the entire point — and keep ordinary business logic in the application layer, where it's version-controlled, testable, and portable across database engines.`,
    codeLabel: "views_procedures_triggers.sql",
    code: `-- Regular VIEW: always live, re-runs the join on every query.
CREATE VIEW customer_order_summary AS
SELECT c.id, c.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total_spent
FROM Customers c
LEFT JOIN Orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;

SELECT * FROM customer_order_summary WHERE id = 42;
-- Every read re-executes the join underneath -- always current, never stale.

-- Stored procedure: centralizes a multi-step operation behind one CALL.
CREATE PROCEDURE transfer_funds(from_id INT, to_id INT, amount NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
END;
$$;

CALL transfer_funds(1, 2, 100);
-- One round trip from the caller -- but this logic now lives in PL/pgSQL,
-- invisible to the application's own version control and test suite.

-- Trigger: fires automatically, with no visible call site anywhere.
CREATE FUNCTION log_salary_change() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.salary <> OLD.salary THEN
        INSERT INTO salary_audit(employee_id, old_salary, new_salary, changed_at)
        VALUES (OLD.id, OLD.salary, NEW.salary, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_salary_audit
AFTER UPDATE ON Employee
FOR EACH ROW EXECUTE FUNCTION log_salary_change();

-- From here on, this update silently writes an extra audit row --
-- nothing in the statement below hints that it happens.
UPDATE Employee SET salary = 95000 WHERE id = 7;`,
  },

  {
    id: "upsert-and-idempotency",
    title: "Upsert (INSERT ... ON CONFLICT) & Idempotency",
    oneLiner: "The syntax is a convenience; the real reason it matters is closing a race condition that a SELECT-then-write can never fully close.",
    content: `**Upsert** means "insert a new row, or update it if it already exists" as a single atomic statement, in place of a separate SELECT-then-decide-INSERT-or-UPDATE round trip written in application code.

## Why the Naive Version Has a Race Condition
The obvious approach — SELECT to check if a row exists, then INSERT if not, else UPDATE — has a gap: between the SELECT and the subsequent write, another concurrent request can insert that same row first. The second request's INSERT then fails on a duplicate key, or two near-simultaneous UPDATEs interleave in a way that loses one of them. A single atomic upsert statement closes that window entirely, because the check-and-write happens as one indivisible operation inside the database, with no gap in between for another transaction to interleave into.

## The Syntax
Postgres: **INSERT INTO t (...) VALUES (...) ON CONFLICT (unique_column) DO UPDATE SET col = EXCLUDED.col** — **EXCLUDED** refers to the row that *would* have been inserted, which is how the UPDATE branch gets access to the new values that were being attempted. **ON CONFLICT (unique_column) DO NOTHING** is the simpler variant for when a duplicate should just be silently skipped rather than merged. (MySQL's equivalent is the differently-spelled INSERT ... ON DUPLICATE KEY UPDATE — same idea, different keyword.)

## The Real Reason This Comes Up in Interviews: Idempotency
An operation is **idempotent** when running it twice produces the same end state as running it once. Upsert makes this natural: processing the identical request a second time — say, after a client retries an API call that timed out but actually succeeded server-side — updates the same row again rather than inserting a duplicate. The interview question underneath the syntax question is almost never "do you know the ON CONFLICT keyword" — it's whether a candidate recognizes *when* an operation needs to be safely repeatable in the first place.

## The Canonical Scenario
A webhook handler is a standard example: most webhook providers guarantee **at-least-once** delivery, meaning the same event can legitimately arrive twice. Upserting on the event's own unique id guarantees that processing it a second time has no additional effect — the row already reflects that event, and the second attempt just overwrites it with identical values.`,
    codeLabel: "upsert_idempotency.sql",
    code: `-- The race condition in the naive SELECT-then-write pattern (pseudocode):
-- 1. SELECT * FROM inventory WHERE product_id = 42;   -- not found
-- 2. -- ANOTHER transaction inserts product_id = 42 here, in the gap --
-- 3. INSERT INTO inventory (product_id, quantity) VALUES (42, 10);
--    -- ERROR: duplicate key -- lost the race that step 1 didn't know about

-- Upsert closes the gap: the check-and-write is one atomic statement.
INSERT INTO inventory (product_id, quantity)
VALUES (42, 10)
ON CONFLICT (product_id)
DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;
-- EXCLUDED.quantity is the value from THIS insert attempt (10) -- available
-- to reference even though the row already existed and took the UPDATE path.

-- ON CONFLICT DO NOTHING: silently skip if it already exists, no merge.
INSERT INTO inventory (product_id, quantity)
VALUES (42, 10)
ON CONFLICT (product_id) DO NOTHING;

-- Idempotent webhook processing: the same event id arriving twice (at-least-
-- once delivery) has no additional effect the second time.
INSERT INTO processed_webhook_events (event_id, payload, processed_at)
VALUES ('evt_9f8a2b', '{"type": "payment.succeeded"}', NOW())
ON CONFLICT (event_id) DO UPDATE
SET payload = EXCLUDED.payload, processed_at = EXCLUDED.processed_at;
-- Whether this event arrives once or five times, the end state is identical.`,
  },
];
