import type { TheoryTopic } from "./types";

export const SQL_TRANSACTIONS_TOPICS: TheoryTopic[] = [
  {
    id: "acid-properties",
    title: "ACID Properties",
    oneLiner: "Atomicity, Consistency, Isolation, and Durability — the four guarantees a transaction makes.",
    content: `## Atomicity
A transaction is **all-or-nothing**: every statement inside a **BEGIN**/**COMMIT** block either takes effect together, or none of them do. Picture a bank transfer that debits $100 from Account A and credits $100 to Account B as two separate UPDATE statements. If the debit succeeds but the server crashes (or a constraint fails) before the credit runs, atomicity guarantees the entire transaction is rolled back — the debit is undone too. Without it, that $100 would simply vanish: deducted from A, never added to B.

## Consistency
A transaction moves the database from one **valid** state to another valid state — it can never leave data violating a declared constraint (foreign keys, CHECK constraints, uniqueness), even if it fails partway through. If accounts have a CHECK constraint requiring balance to stay non-negative, no committed transaction can ever leave a balance negative, no matter what the application code tried to do — the database itself refuses to commit a state that breaks the rule.

## Isolation
Concurrent transactions should not observe each other's **uncommitted, in-progress** changes. In the transfer example, if a third transaction reads Account A's balance in the instant after the debit runs but before the credit runs, isolation prevents it from seeing that transient, half-applied state — it should see the balances either entirely before or entirely after the transfer, never in between. Isolation has enough depth and standard terminology of its own (dirty reads, phantom reads, isolation levels) to deserve its own dedicated topic, covered next.

## Durability
Once a transaction **commits**, its changes must survive any crash, power loss, or restart that happens immediately afterward. This is typically implemented with a **write-ahead log (WAL)**: every change is flushed to a durable, append-only log on disk *before* the commit is acknowledged to the client, so even if the server crashes an instant later, the committed change can be replayed from the log on restart.

## COMMIT, ROLLBACK, and SAVEPOINT
**COMMIT** ends a transaction and makes all of its changes permanent and visible to other transactions. **ROLLBACK** ends a transaction and discards every change it made, as if none of it had ever happened. A **SAVEPOINT** marks a named point inside a longer transaction that you can roll back to without discarding the whole transaction — useful when one step of a multi-step transaction might fail and you'd rather recover than abandon everything done so far. Rolling back to a savepoint undoes only the work done since that point; the transaction stays open afterward, so you can keep going or commit what remains.`,
    codeLabel: "transaction_basics.sql",
    code: `-- A transaction wrapping a two-step transfer: both updates succeed, or neither does.
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 'A';  -- debit
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';  -- credit

COMMIT;   -- only now are both changes durable and visible to other transactions
-- If anything above had failed (constraint violation, crash, explicit ROLLBACK),
-- the database discards BOTH updates -- account A is never left short with
-- account B never having received the funds.


-- SAVEPOINT: undo part of a transaction without abandoning all of it
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 'A';  -- debit A
SAVEPOINT after_debit;

UPDATE accounts SET balance = balance + 100 WHERE id = 'Z';  -- wrong account / fails a check
-- Oops -- undo just the failed credit, keep the debit pending in the transaction:
ROLLBACK TO SAVEPOINT after_debit;

UPDATE accounts SET balance = balance + 100 WHERE id = 'B';  -- credit the correct account instead

COMMIT;  -- final state: A debited, B credited -- the failed attempt on 'Z' never happened`,
  },

  {
    id: "isolation-levels",
    title: "Isolation Levels & Read Phenomena",
    oneLiner: "Dirty reads, non-repeatable reads, and phantom reads — and the four standard isolation levels that guard against them.",
    content: `## The Three Read Phenomena
Isolation levels exist to control how much of one transaction's in-flight work another transaction is allowed to see. Three specific phenomena define the spectrum:
- **Dirty read** — a transaction reads a row that another transaction has modified but not yet committed. If that other transaction then rolls back, the first transaction acted on data that never really existed.
- **Non-repeatable read** — a transaction reads the same row twice and gets two different values, because another transaction committed a change to that row in between the two reads.
- **Phantom read** — a transaction re-runs the same range query (e.g. "all orders over $100") twice and gets a different *set* of rows the second time, because another transaction inserted or deleted rows matching that range in between.

Each phenomenon is progressively harder to prevent: guarding against dirty reads is cheap, guarding against phantom reads is the most expensive.

## The Four Standard Isolation Levels
| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | Prevented | Possible | Possible |
| REPEATABLE READ | Prevented | Prevented | Possible |
| SERIALIZABLE | Prevented | Prevented | Prevented |

Higher isolation levels give stronger guarantees at the cost of more blocking, or more transactions aborted and retried due to serialization conflicts — SERIALIZABLE buys full correctness at the highest contention cost.

**Defaults differ across engines.** PostgreSQL, SQL Server, and Oracle all default to READ COMMITTED. MySQL's InnoDB engine defaults to REPEATABLE READ instead — one of the more commonly-tested "gotcha" facts in SQL interviews. Worth a footnote: PostgreSQL's REPEATABLE READ is built on snapshot isolation and, in practice, also blocks phantom reads — stronger than the SQL standard actually requires at that level, though still short of true SERIALIZABLE.`,
    codeLabel: "isolation_levels.sql",
    code: `-- Set the isolation level for the current transaction
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

BEGIN;
SELECT balance FROM accounts WHERE id = 'A';   -- returns 500

-- Meanwhile, in a SEPARATE session (Session 2):
--   BEGIN;
--   UPDATE accounts SET balance = 400 WHERE id = 'A';
--   COMMIT;

-- Back in Session 1, still inside the SAME transaction:
SELECT balance FROM accounts WHERE id = 'A';   -- returns 400 !
-- Same query, same transaction, different result -- a NON-REPEATABLE READ.
-- This is allowed (by design) at READ COMMITTED.
COMMIT;


-- Re-run the identical scenario at REPEATABLE READ (or SERIALIZABLE) instead:
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
SELECT balance FROM accounts WHERE id = 'A';   -- returns 500
-- ... Session 2 commits the same update in between ...
SELECT balance FROM accounts WHERE id = 'A';   -- STILL returns 500
-- The transaction sees one consistent snapshot for its whole duration,
-- regardless of what Session 2 committed in the meantime.
COMMIT;`,
  },

  {
    id: "locking-deadlocks",
    title: "Locking & Deadlocks",
    oneLiner: "Row vs table locks, shared vs exclusive locks, and how databases detect and resolve deadlocks.",
    content: `## Row-Level vs Table-Level Locks
A **row-level lock** restricts access to a single row, letting other transactions freely read and write unrelated rows in the same table concurrently — this is what PostgreSQL, MySQL/InnoDB, and SQL Server all use by default for ordinary INSERT/UPDATE/DELETE statements. A **table-level lock** restricts access to an entire table at once; it's far coarser and hurts concurrency much more, so it's normally reserved for schema changes (e.g. ALTER TABLE) or an explicit LOCK TABLE statement rather than everyday writes.

## Shared vs Exclusive Locks
A **shared (read) lock** can be held by multiple transactions on the same row simultaneously — many readers don't conflict with each other. An **exclusive (write) lock**, taken for INSERT/UPDATE/DELETE, can only be held by one transaction at a time, and blocks both other exclusive locks and other shared locks on that row until it's released.

## What Is a Deadlock?
A **deadlock** happens when two or more transactions each hold a lock the other one needs, and neither can proceed: Transaction 1 holds a lock on row A and is waiting for a lock on row B, while Transaction 2 holds a lock on row B and is waiting for a lock on row A. Both wait forever unless something intervenes.

## Detection and Resolution
Databases don't just hang forever — the engine continuously tracks a **wait-for graph** of which transactions are blocked on which others, and checks it for cycles. When a cycle is found, it picks one of the involved transactions as the **victim** (typically whichever has done the least work, though the exact heuristic is engine-specific), aborts it, and rolls it back immediately — freeing its locks so the remaining transaction can proceed. The victim's application code sees a "deadlock detected" error and is expected to simply retry the transaction from the start.

## Prevention
The most effective fix is entirely within your control: always acquire locks on multiple resources in the same, consistent order, everywhere in your application. If every transaction that touches both accounts A and B always locks the lower id first, a circular wait can never form — one transaction can always acquire the first lock uncontested and proceed. Keeping transactions short, and never holding a lock across a slow network call or a wait for user input, also shrinks the window in which a deadlock could ever form.`,
    codeLabel: "deadlock_example.sql",
    code: `-- Illustrative deadlock, shown as interleaved commented pseudo-SQL.

-- T1: BEGIN;
-- T1: UPDATE accounts SET balance = balance - 50 WHERE id = 'A';
--     -- T1 now holds an exclusive lock on row A
--
-- T2: BEGIN;
-- T2: UPDATE accounts SET balance = balance - 20 WHERE id = 'B';
--     -- T2 now holds an exclusive lock on row B
--
-- T1: UPDATE accounts SET balance = balance + 50 WHERE id = 'B';
--     -- T1 BLOCKS -- waiting for T2 to release its lock on row B
--
-- T2: UPDATE accounts SET balance = balance + 20 WHERE id = 'A';
--     -- T2 BLOCKS -- waiting for T1 to release its lock on row A
--
-- Neither can proceed: T1 waits on T2, and T2 waits on T1 -- a deadlock.
-- The engine's deadlock detector finds this wait-for cycle and aborts
-- one transaction (the "victim"), e.g.:
--
--   ERROR: deadlock detected
--   DETAIL: Process 1234 waits for ShareLock on transaction 5678; blocked by process 5678.
--           Process 5678 waits for ShareLock on transaction 1234; blocked by process 1234.
--
-- The victim (say T2) is rolled back automatically, releasing row B so
-- T1 can finally acquire it and commit. T2's application code should
-- catch the error and simply retry the whole transaction.

-- PREVENTION: touch rows in the SAME order in every transaction that can
-- ever run concurrently -- e.g. always update the lower account id first.
UPDATE accounts SET balance = balance - 50 WHERE id = 'A';  -- both transactions
UPDATE accounts SET balance = balance + 50 WHERE id = 'B';  -- lock A before B: no cycle possible`,
  },

  {
    id: "optimistic-vs-pessimistic-locking",
    title: "Optimistic vs Pessimistic Locking",
    oneLiner: "One assumes conflicts are common and blocks upfront; the other assumes they're rare and only checks at the last moment.",
    content: `Both approaches solve the same problem — preventing two concurrent transactions from clobbering each other's changes to the same row — but they make opposite bets about how often that conflict actually happens.

## Pessimistic Locking
**Pessimistic locking** acquires a lock *before* touching a row — SELECT ... FOR UPDATE — which blocks every other transaction from reading or writing that row until the lock is released. It bets that conflicts are common enough that paying the blocking cost upfront, on every transaction, is worth it to guarantee no wasted work later. This is the natural choice for high-contention operations like decrementing inventory during a flash sale, where a large fraction of concurrent transactions genuinely are trying to touch the same rows.

## Optimistic Locking
**Optimistic locking** takes no lock at all going in. It reads a row's current value alongside a **version** (or timestamp) column, does its work using that snapshot, and only checks for a conflict at the very end: UPDATE ... SET value = new_value, version = version + 1 WHERE id = X AND version = read_version. If another transaction updated the row in between, that WHERE clause matches zero rows, the application sees rows_affected = 0, and knows to retry — read the new state and try again. It bets that conflicts are rare enough that most attempts will simply succeed on the first try, making the blocking cost of pessimistic locking pure waste in the common case.

## Choosing Between Them
The deciding question is contention: pessimistic locking pays a small, guaranteed cost (blocking) on every transaction; optimistic locking pays nothing on the common, conflict-free path but pays a full retry on the rare path where a conflict actually happened. High contention favors pessimistic, since retries would themselves become common and wasteful. Low contention favors optimistic, since paying to block on every transaction to guard against a rare event wastes far more throughput than the occasional retry costs.

## Where This Connects to Deadlocks
Pessimistic locking is exactly the mechanism — FOR UPDATE — that can deadlock when two transactions acquire locks on the same rows in different orders, as covered in the Locking & Deadlocks topic. Optimistic locking sidesteps that risk entirely, since it never holds a lock across multiple statements in the first place — there is nothing for a second transaction to wait on.`,
    codeLabel: "optimistic_vs_pessimistic.sql",
    code: `-- PESSIMISTIC: lock the row before doing anything else. Any other transaction
-- trying to touch this same row blocks until this one commits or rolls back.
BEGIN;
SELECT quantity FROM inventory WHERE product_id = 42 FOR UPDATE;
-- ... application checks quantity > 0 ...
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 42;
COMMIT;


-- OPTIMISTIC: no lock taken up front. Read the current value AND its version.
-- Table shape: inventory(product_id, quantity, version)
BEGIN;
SELECT quantity, version FROM inventory WHERE product_id = 42;
-- application reads: quantity = 10, version = 7

-- ... application does its work using that snapshot, no lock held meanwhile ...

-- The update only succeeds if the version STILL matches -- proving nobody
-- else changed this row in between the read and this write.
UPDATE inventory
SET quantity = 9, version = version + 1
WHERE product_id = 42 AND version = 7;

-- Application checks how many rows this UPDATE actually affected:
--   1 row  -> success, this transaction won the race, safe to COMMIT
--   0 rows -> someone else updated the row first (version moved on) --
--             ROLLBACK, re-read the current value, and retry from the top
COMMIT;`,
  },
];
