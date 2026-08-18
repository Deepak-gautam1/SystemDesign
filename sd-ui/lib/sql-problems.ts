import type { Difficulty } from "./types";
import { SQL_PROBLEMS_MEDIUM } from "./sql-problems-medium";
import { SQL_PROBLEMS_HARD } from "./sql-problems-hard";

export type { Difficulty };

export interface SQLProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  concepts: string[];
  filename: string;
  code: string;
  practicePrompt: string;
}

// ── Easy tier — joins, GROUP BY/HAVING, and NULL-safety fundamentals ────────

export const SQL_PROBLEMS_EASY: SQLProblem[] = [
  {
    id: "combine-two-tables",
    title: "Combine Two Tables",
    difficulty: "easy",
    tags: ["LEFT JOIN", "NULLs", "Fundamentals"],
    description: `Report identifying information for every person on file, along with their address if one exists.

**Schema — Person table:**

| Column | Type | Notes |
|---|---|---|
| person_id | INTEGER | Primary key |
| first_name | TEXT | |
| last_name | TEXT | |

**Schema — Address table:**

| Column | Type | Notes |
|---|---|---|
| address_id | INTEGER | Primary key |
| person_id | INTEGER | Foreign key → Person.person_id |
| city | TEXT | |
| state | TEXT | |

**Task:**
- Return first_name, last_name, city, and state for every person
- A person with no address row should still appear once, with city/state as NULL

**Note:**
- An INNER JOIN here would silently drop every person who has no address at all — the word "every" in the task is the signal that a LEFT JOIN (person as the left/preserved side) is required instead`,
    concepts: ["LEFT JOIN", "NULL-preserving joins"],
    filename: "combine_two_tables.sql",
    code: `SELECT
  p.first_name,
  p.last_name,
  a.city,
  a.state
FROM Person p
LEFT JOIN Address a ON p.person_id = a.person_id;`,
    practicePrompt: `-- Schema: Person(person_id INT, first_name TEXT, last_name TEXT)
--         Address(address_id INT, person_id INT, city TEXT, state TEXT)
--
-- Report first_name, last_name, city, state for EVERY person.
-- city/state should be NULL if that person has no address row.

-- TODO: write your query below
`,
  },

  {
    id: "duplicate-emails",
    title: "Find Duplicate Emails",
    difficulty: "easy",
    tags: ["GROUP BY", "HAVING", "Fundamentals"],
    description: `Find every email address that appears more than once in the table.

**Schema — Person table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| email | TEXT | |

**Task:**
- Return each email that occurs 2 or more times, once each (no duplicates in the output itself)

**Note:**
- This is the canonical WHERE-vs-HAVING trap: \`COUNT(*)\` doesn't exist until after grouping, so the "occurs more than once" filter has to live in HAVING, never WHERE`,
    concepts: ["GROUP BY", "HAVING vs WHERE"],
    filename: "duplicate_emails.sql",
    code: `SELECT email
FROM Person
GROUP BY email
HAVING COUNT(*) > 1;`,
    practicePrompt: `-- Schema: Person(id INT, email TEXT)
--
-- Return every email address that appears 2 or more times.

-- TODO: write your query below
`,
  },

  {
    id: "customers-who-never-order",
    title: "Customers Who Never Order",
    difficulty: "easy",
    tags: ["NOT EXISTS", "Anti-Join", "NULL Trap"],
    description: `Find every customer who has never placed a single order.

**Schema — Customers table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |

**Schema — Orders table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| customerId | INTEGER | Foreign key → Customers.id |

**Task:**
- Return the name of every customer with zero rows in Orders, as a column named Customers

**Note:**
- \`NOT IN (SELECT customerId FROM Orders)\` looks equivalent but is a trap: if even one row in Orders has a NULL customerId, \`NOT IN\` against a list containing NULL returns UNKNOWN for every comparison and silently produces zero rows. \`NOT EXISTS\` (or a \`LEFT JOIN ... WHERE right.id IS NULL\`) doesn't have this failure mode and is the safer default whenever the subquery's column could contain NULLs`,
    concepts: ["NOT EXISTS vs NOT IN", "Anti-joins", "NULL trap in subqueries"],
    filename: "customers_who_never_order.sql",
    code: `SELECT c.name AS "Customers"
FROM Customers c
WHERE NOT EXISTS (
  SELECT 1 FROM Orders o WHERE o.customerId = c.id
);`,
    practicePrompt: `-- Schema: Customers(id INT, name TEXT)
--         Orders(id INT, customerId INT)
--
-- Return the name of every customer who has never placed an order.

-- TODO: write your query below
`,
  },

  {
    id: "employees-earning-more-than-managers",
    title: "Employees Earning More Than Their Managers",
    difficulty: "easy",
    tags: ["Self-Join", "Fundamentals"],
    description: `Find every employee who earns more money than the manager they report to.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |
| salary | INTEGER | |
| managerId | INTEGER | Foreign key → Employee.id (nullable) |

**Task:**
- Return the name of every employee whose salary is greater than their own manager's salary

**Note:**
- Before writing the ON clause, state the relationship out loud: "the managerId on the employee side matches the id on the manager side" — this is a self-join between two roles of the same table, not a join on any shared identity like \`id = id\``,
    concepts: ["Self-joins", "Table aliasing"],
    filename: "employees_earning_more_than_managers.sql",
    code: `SELECT e.name AS "Employee"
FROM Employee e
JOIN Employee m ON e.managerId = m.id
WHERE e.salary > m.salary;`,
    practicePrompt: `-- Schema: Employee(id INT, name TEXT, salary INT, managerId INT)
--
-- Return the name of every employee who earns more than their manager.

-- TODO: write your query below
`,
  },

  {
    id: "employee-bonus",
    title: "Employee Bonus",
    difficulty: "easy",
    tags: ["LEFT JOIN", "NULL Handling"],
    description: `Report the name and bonus of every employee whose bonus is less than 1000, including employees who have no bonus record at all.

**Schema — Employee table:**

| Column | Type | Notes |
|---|---|---|
| empId | INTEGER | Primary key |
| name | TEXT | |
| salary | INTEGER | |

**Schema — Bonus table:**

| Column | Type | Notes |
|---|---|---|
| empId | INTEGER | Foreign key → Employee.empId |
| bonus | INTEGER | |

**Task:**
- Return name and bonus for employees with bonus < 1000 OR no bonus row at all
- Employees with no bonus row should show bonus as NULL, not be excluded

**Note:**
- \`WHERE b.bonus < 1000\` alone, after a LEFT JOIN, silently drops every employee with a NULL bonus — NULL is never "less than" anything in three-valued logic. The condition needs an explicit \`OR b.bonus IS NULL\` to keep the no-bonus rows in the result`,
    concepts: ["LEFT JOIN", "NULL-aware filtering", "Three-valued logic"],
    filename: "employee_bonus.sql",
    code: `SELECT e.name, b.bonus
FROM Employee e
LEFT JOIN Bonus b ON e.empId = b.empId
WHERE b.bonus < 1000 OR b.bonus IS NULL;`,
    practicePrompt: `-- Schema: Employee(empId INT, name TEXT, salary INT)
--         Bonus(empId INT, bonus INT)
--
-- Return name and bonus for employees with bonus < 1000, including
-- employees with no row in Bonus at all (their bonus should show as NULL).

-- TODO: write your query below
`,
  },

  {
    id: "swap-salary-case-when",
    title: "Swap Salary (Update with CASE WHEN)",
    difficulty: "easy",
    tags: ["CASE WHEN", "UPDATE"],
    description: `Swap every 'm' and 'f' value in the sex column, in place, using a single UPDATE statement — no helper column, no reading the value back out first.

**Schema — Salary table:**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | |
| sex | CHAR(1) | 'm' or 'f' |
| salary | INTEGER | |

**Task:**
- Write one UPDATE statement that flips every 'm' to 'f' and every 'f' to 'm'

**Note:**
- CASE WHEN isn't only a SELECT-clause tool — it works anywhere a value is expected, including directly inside a SET clause. The whole row's new value is computed from its own current value in one pass, so there's no risk of a naive \`UPDATE ... SET sex = 'f' WHERE sex = 'm'\` followed by a second statement accidentally re-flipping rows the first statement already touched`,
    concepts: ["CASE WHEN inside UPDATE", "Single-pass row transformation"],
    filename: "swap_salary.sql",
    code: `UPDATE Salary
SET sex = CASE sex
  WHEN 'm' THEN 'f'
  ELSE 'm'
END;`,
    practicePrompt: `-- Schema: Salary(id INT, name TEXT, sex CHAR(1), salary INT)
--         sex is either 'm' or 'f'
--
-- Swap every 'm' to 'f' and every 'f' to 'm' in a single UPDATE statement.

-- TODO: write your query below
`,
  },

  {
    id: "classes-more-than-5-students",
    title: "Classes More Than 5 Students",
    difficulty: "easy",
    tags: ["GROUP BY", "HAVING", "COUNT DISTINCT"],
    description: `Find every class with 5 or more students enrolled.

**Schema — Courses table:**

| Column | Type | Notes |
|---|---|---|
| student | TEXT | |
| class | TEXT | |

**Task:**
- Return every class name with 5 or more distinct students enrolled in it

**Note:**
- Use \`COUNT(DISTINCT student)\`, not \`COUNT(student)\` — if the same student can appear more than once for the same class (duplicate enrollment rows), a plain COUNT would overcount and could report a class as full when it only actually has 4 distinct students`,
    concepts: ["GROUP BY / HAVING", "COUNT(DISTINCT ...)"],
    filename: "classes_more_than_5_students.sql",
    code: `SELECT class
FROM Courses
GROUP BY class
HAVING COUNT(DISTINCT student) >= 5;`,
    practicePrompt: `-- Schema: Courses(student TEXT, class TEXT)
--
-- Return every class with 5 or more distinct students enrolled.

-- TODO: write your query below
`,
  },
];

// Merge easy + medium + hard into one ordered list, easiest first.
export const ALL_SQL_PROBLEMS: SQLProblem[] = [
  ...SQL_PROBLEMS_EASY,
  ...SQL_PROBLEMS_MEDIUM,
  ...SQL_PROBLEMS_HARD,
];
