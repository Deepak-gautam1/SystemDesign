import type { TheoryTopic } from "./types";

export const SQL_JOINS_TOPICS: TheoryTopic[] = [
  {
    id: "join-types-reference",
    title: "Join Types — Full Reference",
    oneLiner: "Five ways to combine two tables, and one operation people mistake for a join.",
    content: `## The Five Join Types

| Join | Returns | Reach for it when... |
|---|---|---|
| **INNER JOIN** | Only rows with a match on both sides | You only care about records that exist in both tables (e.g. orders that have a valid customer) |
| **LEFT JOIN** | All rows from the left table, matched columns from the right (NULL if no match) | You want to keep every row from your "main" table even when it has no related data (e.g. all customers, even ones with zero orders) |
| **RIGHT JOIN** | All rows from the right table, matched columns from the left (NULL if no match) | The mirror image of LEFT JOIN — rarely used in practice, since you can just swap table order and use LEFT JOIN instead |
| **FULL OUTER JOIN** | Every row from both tables, with NULLs on whichever side has no match | You need to see unmatched rows from *both* sides at once (e.g. reconciling two systems that should mostly, but not always, agree) |
| **CROSS JOIN** | Every row of the left table paired with every row of the right table (the Cartesian product) | You deliberately want every combination — generating a calendar × store grid, or pairing sizes × colors for a product catalog |

## UNION ALL Is Not a Join

It's worth stating plainly, because it's a common point of confusion: **UNION ALL — and UNION — is not a join at all.** A join combines two tables *side by side*, matching rows based on a condition and producing wider rows with columns from both tables. UNION ALL stacks two result sets *on top of each other*, producing taller output with the same columns repeated — no matching condition is involved anywhere. If you ever find yourself trying to write an ON clause for a UNION, that's a sign you actually want a join instead.`,
    codeLabel: "join_types.sql",
    code: `CREATE TEMP TABLE Customers (customer_id int, name text);
INSERT INTO Customers VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Cara');

CREATE TEMP TABLE Orders (order_id int, customer_id int, amount numeric);
INSERT INTO Orders VALUES (101, 1, 50), (102, 1, 30), (103, 4, 20);
-- Bob and Cara have no orders; order 103 references customer 4, who doesn't
-- exist in Customers -- both gaps are deliberate, to show unmatched rows.

-- INNER JOIN: only customers WITH orders, only orders WITH a valid customer.
SELECT c.name, o.amount
FROM Customers c
INNER JOIN Orders o ON o.customer_id = c.customer_id;
-- Alice/50, Alice/30                              (2 rows)

-- LEFT JOIN: every customer kept, even Bob/Cara -- NULL amount where no order.
SELECT c.name, o.amount
FROM Customers c
LEFT JOIN Orders o ON o.customer_id = c.customer_id;
-- Alice/50, Alice/30, Bob/NULL, Cara/NULL         (4 rows)

-- RIGHT JOIN: every order kept, even order 103 -- NULL name where no customer.
SELECT c.name, o.amount
FROM Customers c
RIGHT JOIN Orders o ON o.customer_id = c.customer_id;
-- Alice/50, Alice/30, NULL/20                     (3 rows)

-- FULL OUTER JOIN: everything from both sides, matched where possible.
SELECT c.name, o.amount
FROM Customers c
FULL OUTER JOIN Orders o ON o.customer_id = c.customer_id;
-- Alice/50, Alice/30, Bob/NULL, Cara/NULL, NULL/20 (5 rows)

-- CROSS JOIN: every customer paired with every order -- 3 x 3, no ON condition.
SELECT c.name, o.amount
FROM Customers c
CROSS JOIN Orders o;
-- 9 rows total`,
  },

  {
    id: "join-worked-example",
    title: "Worked Example: Row Counts Under Each Join",
    oneLiner: "The same two tables joined six different ways, with six different row counts.",
    content: `Nothing builds intuition for joins faster than a deliberately extreme example. Suppose:

- **Table A** has 5 rows, and every single row has col = 1.
- **Table B** has 5 rows, and every single row has col = 2.
- We join them ON A.col = B.col.

Since col is 1 on every row of A and 2 on every row of B, **A.col = B.col is never true — not once, for any pairing.** Walking through what each operation returns:

## The Six Results

- **INNER JOIN → 0 rows.** Inner join only keeps pairs where the condition is true. Since it's never true here, nothing survives.
- **LEFT JOIN → 5 rows.** Every row of A is preserved regardless of whether it found a match — that's the entire point of LEFT — so all 5 rows of A come through with B's columns filled in as NULL.
- **RIGHT JOIN → 5 rows.** The mirror image: every row of B is preserved, with A's columns as NULL.
- **FULL OUTER JOIN → 10 rows.** All 5 of A's unmatched rows, plus all 5 of B's unmatched rows — nothing matched, so nothing merges into a single combined row; they simply both show up in full, separately.
- **UNION ALL → 10 rows.** This is not a join, so the matching condition is irrelevant to it entirely — UNION ALL just stacks A's 5 rows directly on top of B's 5 rows. 5 + 5 = 10.

## The Classic Mix-Up: CROSS JOIN vs. UNION ALL

- **CROSS JOIN → 25 rows.** CROSS JOIN pairs *every* row of A with *every* row of B — 5 × 5 = 25 — completely ignoring the col values, since CROSS JOIN has no ON condition at all.

It's easy to mentally blur CROSS JOIN and UNION ALL, because both ignore the join condition, but they do fundamentally different things: UNION ALL **stacks** rows vertically (10 rows, the same column count as either input), while CROSS JOIN **multiplies** rows combinatorially (25 rows, with the combined column count of both inputs). Mixing these two up — expecting a UNION ALL-sized result from a CROSS JOIN, or vice versa — is one of the most common join-related mistakes in interviews.`,
    codeLabel: "join_row_counts.sql",
    code: `-- Table A: 5 rows, every row has col = 1
CREATE TEMP TABLE A (id int, col int);
INSERT INTO A VALUES (1,1), (2,1), (3,1), (4,1), (5,1);

-- Table B: 5 rows, every row has col = 2
CREATE TEMP TABLE B (id int, col int);
INSERT INTO B VALUES (1,2), (2,2), (3,2), (4,2), (5,2);

-- INNER JOIN -> 0 rows. A.col (always 1) never equals B.col (always 2).
SELECT * FROM A INNER JOIN B ON A.col = B.col;

-- LEFT JOIN -> 5 rows. All of A survives; every B-side column comes back NULL.
SELECT * FROM A LEFT JOIN B ON A.col = B.col;

-- RIGHT JOIN -> 5 rows. All of B survives; every A-side column comes back NULL.
SELECT * FROM A RIGHT JOIN B ON A.col = B.col;

-- FULL OUTER JOIN -> 10 rows. A's 5 unmatched + B's 5 unmatched; nothing merges.
SELECT * FROM A FULL OUTER JOIN B ON A.col = B.col;

-- UNION ALL -> 10 rows. Not a join at all: just stacks A's 5 rows on B's 5 rows.
SELECT id, col FROM A
UNION ALL
SELECT id, col FROM B;

-- CROSS JOIN -> 25 rows. Every one of A's 5 rows paired with every one of B's
-- 5 rows (5 x 5), completely ignoring col. Contrast with UNION ALL's 10 above.
SELECT * FROM A CROSS JOIN B;`,
  },

  {
    id: "self-joins",
    title: "Self-Joins",
    oneLiner: "Joining a table to itself to relate one row to another row in the same table.",
    content: `A **self-join** is an ordinary join where a table is joined to itself — useful whenever rows in a table need to be compared against, or related to, *other rows in that same table*. The classic case is an employee table where each row stores its manager as another employee's ID.

Because both sides of the join come from the same table, SQL requires you to give each side a different **alias** so columns can be unambiguously referenced (e1.name vs e2.name). The table itself isn't actually duplicated — you're just querying the same data twice, from two different "roles."

**The one rule that prevents almost every self-join mistake:** before writing the ON clause, say out loud — literally, in a comment if it helps — "column X on side 1 corresponds to column Y on side 2, because ___." If you can't fill in that sentence with a real reason, you don't understand the relationship yet, and the join will produce garbage.

**The single most common self-join bug** is joining id = id — comparing a table's key to itself pairs every row with itself and nothing else, which is almost never what you want (it just reproduces the original table with duplicated columns).

**The second most common bug** is the instinct to compare name = manager_id — these two columns hold fundamentally different kinds of values, a name string versus an ID, so the condition either never matches or matches by pure coincidence. The correct relationship for an employee/manager lookup is manager_id = emp_id: "an employee's manager_id on side 1 corresponds to that manager's own id on side 2, because manager_id *is* the manager's employee ID."`,
    codeLabel: "self_joins.sql",
    code: `-- Employee(id, name, salary, manager_id)
-- manager_id is NULL for employees with no manager (e.g. the CEO).

-- e = the "employee" role: every row in the table, once each.
-- m = the "manager" role: the SAME table, queried again, representing
--     whichever row happens to be that employee's manager.
--
-- Relationship: e.manager_id (an employee ID) corresponds to m.id (that
-- same employee's own id), because manager_id literally stores the id
-- of the row that manages this one.
SELECT
    e.name   AS employee_name,
    e.salary AS employee_salary,
    m.name   AS manager_name
FROM Employee e
LEFT JOIN Employee m ON e.manager_id = m.id;
-- LEFT JOIN (not INNER) so employees with no manager (manager_id IS NULL,
-- e.g. the CEO) still show up, with manager_name coming back as NULL.

-- WRONG (never do this): joining a key to itself pairs every row with
-- itself and only itself -- useless.
-- ... ON e.id = m.id

-- ALSO WRONG: comparing a name to an ID compares two unrelated kinds of
-- values and will not produce the manager relationship.
-- ... ON e.name = m.manager_id`,
  },

  {
    id: "set-operations",
    title: "UNION, UNION ALL, INTERSECT, EXCEPT",
    oneLiner: "Combining two result sets vertically, with different rules on duplicates and overlap.",
    content: `SQL's **set operations** combine two separate result sets **vertically** (stacking rows), as opposed to joins, which combine tables **horizontally** (matching and merging columns). All four operators below require both sides to return the **same number of columns**, with **compatible types** in each corresponding position — column names don't need to match, only their position and type.

- **UNION** — combines both result sets and **removes duplicate rows**. Because de-duplication requires the engine to sort or hash the entire combined result to find and drop repeats, UNION carries a real performance cost proportional to the data size.
- **UNION ALL** — combines both result sets and **keeps every row**, duplicates included. It's cheaper than UNION because there's no de-duplication pass at all. Use UNION ALL by default whenever you already know the two sides can't overlap, or when duplicate rows are acceptable — only pay for UNION's dedup cost when you actually need it.
- **INTERSECT** — returns only the rows that appear in **both** result sets. Rows unique to either side are dropped.
- **EXCEPT** — returns rows that appear in the **first** result set but **not** in the second (Oracle names this same operation **MINUS** instead — same behavior, different keyword). Order matters here: A EXCEPT B is not the same as B EXCEPT A.

Both INTERSECT and EXCEPT, like UNION, remove duplicates from their output by default in standard SQL.`,
    codeLabel: "set_operations.sql",
    code: `-- CurrentEmployees(emp_id, name)        FormerEmployees(emp_id, name)
-- (1, 'Alice'), (2, 'Bob'), (3, 'Cara')  (2, 'Bob'), (4, 'Dan')
-- (Bob appears in both -- e.g. rehired, or an overlap between the two lists.)

-- UNION: every distinct person who is or was an employee -- Bob listed once.
SELECT emp_id, name FROM CurrentEmployees
UNION
SELECT emp_id, name FROM FormerEmployees;
-- Alice, Bob, Cara, Dan          (4 rows -- Bob's duplicate is removed)

-- UNION ALL: same combination, but keeps Bob's row from BOTH tables.
SELECT emp_id, name FROM CurrentEmployees
UNION ALL
SELECT emp_id, name FROM FormerEmployees;
-- Alice, Bob, Cara, Bob, Dan     (5 rows -- no de-duplication)

-- INTERSECT: only people present in BOTH tables.
SELECT emp_id, name FROM CurrentEmployees
INTERSECT
SELECT emp_id, name FROM FormerEmployees;
-- Bob                            (1 row)

-- EXCEPT: current employees who have NEVER appeared in FormerEmployees.
-- (Oracle spells this same operation MINUS instead of EXCEPT.)
SELECT emp_id, name FROM CurrentEmployees
EXCEPT
SELECT emp_id, name FROM FormerEmployees;
-- Alice, Cara                    (2 rows -- Bob is excluded, since he IS in set 2)`,
  },
];
