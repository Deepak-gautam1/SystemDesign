import type { TheoryTopic } from "./types";

export const UML_TOPICS: TheoryTopic[] = [
  {
    id: "class-diagram",
    title: "Class Diagram",
    oneLiner: "The static blueprint — classes, their members, and how they relate.",
    content: `A **Class Diagram** is the most common UML diagram in LLD interviews — it's usually the deliverable itself. It shows the classes in a system, their attributes and methods, and the relationships between them.

**Reading a class box** (three compartments, top to bottom): class name, attributes, methods. Visibility is marked with a prefix: **+** public, **–** private, **#** protected. Static members are underlined.

**Relationship lines**, from loosest to strongest:
- Plain line — **association**
- Line with a hollow diamond — **aggregation** (whole-part, part can outlive the whole)
- Line with a filled diamond — **composition** (whole-part, part dies with the whole)
- Hollow triangle arrow — **inheritance** ("is-a")
- Dashed arrow — **dependency** or interface **realization**

**Multiplicity** labels (like 1, 0..1, 1..*, *) near each end of a line specify how many instances of one class relate to how many of the other — e.g. one Order to many OrderItems is written as "1" near Order and "1..*" near OrderItem.

In interviews, a clean class diagram — with the right relationship type used deliberately, not just plain lines everywhere — is often the strongest signal you actually understand the four class-relationship types covered earlier, not just the syntax.`,
    codeLabel: "class_diagram.txt",
    code: `┌────────────────────────┐        1        1..*  ┌───────────────────┐
│        Order           │◇───────────────────────│    OrderItem      │
├────────────────────────┤   (composition:         ├───────────────────┤
│ - id: int              │    items die with       │ - productId: int  │
│ - status: OrderStatus   │    the Order)           │ - quantity: int   │
├────────────────────────┤                         ├───────────────────┤
│ + placeOrder(): void   │                         │ + getSubtotal()   │
│ + cancel(): void       │                         └───────────────────┘
└───────────┬────────────┘
            │
            │ association (1 Order → 1 Customer)
            ▼
┌────────────────────────┐        ┌ ─ ─ ─ ─ ─ ─ ─ ┐
│       Customer         │        ┆ PaymentMethod ┆  <<interface>>
├────────────────────────┤        └ ─ ─ ─ ─ ─ ─ ─ ┘
│ - name: string          │                △
└────────────────────────┘                ┊ (dependency / realization,
                                           ┊  dashed = "implements")
                              ┌────────────┴─────────┐
                              │      CreditCard      │
                              └───────────────────────┘

△  hollow triangle = inheritance ("is-a")
◇  hollow diamond  = aggregation (part can outlive whole)
◆  filled diamond  = composition (part dies with whole)
── plain line      = association
┈┈ dashed arrow    = dependency / interface realization`,
  },

  {
    id: "use-case-diagram",
    title: "Use Case Diagram",
    oneLiner: "Capture what a system does, from the perspective of its users.",
    content: `A **Use Case Diagram** captures a system's functional requirements from an outside-in, user-facing perspective — deliberately excluding any internal class structure. It's most useful very early in a design, before you've decided on any classes at all, to nail down *what* the system needs to do.

**Core elements:**
- **Actor** — a user or external system interacting with your system (a Customer, an Admin, or even another system like a PaymentGateway), drawn as a stick figure.
- **Use Case** — a discrete piece of functionality the system provides (Place Order, Cancel Booking), drawn as an oval.
- **System boundary** — a box containing all the use cases, representing the system itself.
- **Include** relationship — one use case always triggers another (Place Order *always* includes Process Payment).
- **Extend** relationship — one use case *optionally* extends another under certain conditions (Place Order can optionally extend to Apply Discount Code, only if the user has one).

**When it's worth drawing in an interview:** rarely, in the time-constrained setting of a live LLD interview — most interviewers care more about your class diagram and code. But mentally walking through "who are the actors, and what are the 4-5 core use cases" before you start naming classes is a genuinely useful five-second gut check to make sure you're solving the right problem.`,
    codeLabel: "use_case_diagram.txt",
    code: `                 ┌─────────────── Parking Lot System ───────────────┐
                 │                                                     │
                 │      ╭──────────────╮                              │
   ┌───┐         │      │  Park Vehicle │                             │
   │ o │─────────┼──────╰──────────────╯                              │
   │/|\\│Driver   │              ┆ <<include>>                        │
   │/ \\│         │              ▼                                    │
   └───┘         │      ╭──────────────╮                              │
                 │      │ Issue Ticket  │                              │
                 │      ╰──────────────╯                               │
                 │                                                     │
                 │      ╭──────────────╮      ╭───────────────────╮   │
   ┌───┐         │      │  Pay & Exit   │╌╌╌╌╌▶│ Apply Discount    │   │
   │ o │─────────┼──────╰──────────────╯       │ Code (<<extend>>) │   │
   │/|\\│Driver   │                             ╰───────────────────╯   │
   │/ \\│         │                                                     │
   └───┘         │      ╭──────────────╮                               │
                 │      │ View Occupancy│                              │
   ┌───┐         │      ╰──────────────╯                               │
   │ o │─────────┼──────────────┘                                      │
   │/|\\│ Admin   │                                                     │
   │/ \\│         └─────────────────────────────────────────────────────┘
   └───┘`,
  },

  {
    id: "sequence-diagram",
    title: "Sequence Diagram",
    oneLiner: "Show the exact order of messages exchanged between objects, over time.",
    content: `A **Sequence Diagram** shows how objects interact by illustrating the exact order in which messages (method calls) are exchanged between them — time flows top to bottom, and each participating object gets its own vertical **lifeline**.

**Reading one:**
- Each box at the top is a participant (an object or actor); a dashed vertical line drops down from it — its lifeline, representing its existence over time.
- A **solid arrow** is a synchronous call (the caller waits for a response) — a **dashed arrow** pointing back is the return value.
- An **open/unfilled arrowhead** typically denotes an asynchronous call (fire-and-forget, caller doesn't wait).
- A thin vertical rectangle on a lifeline is an **activation bar**, showing exactly when that object is actively executing.
- Alt/loop frames (boxed regions) show conditional or repeated interactions.

**Why it's genuinely useful in an interview** (more so than a Use Case diagram): once you have your classes, a quick sequence diagram for the *primary* flow (e.g. "place an order") is an excellent way to verify your classes actually collaborate correctly — it exposes missing methods, wrong call directions, or objects that should be talking to each other but currently can't, before you write a line of code.`,
    codeLabel: "sequence_diagram.txt",
    code: `Customer      OrderService      InventoryService     PaymentGateway
   │                │                    │                   │
   │  placeOrder()  │                    │                   │
   │───────────────▶│                    │                   │
   │                │  reserveItems()    │                   │
   │                │───────────────────▶│                   │
   │                │                    │                   │
   │                │◀─ ─ ─ true ─ ─ ─ ─ ┤                   │
   │                │                    │                   │
   │                │        charge(amount)                  │
   │                │───────────────────────────────────────▶│
   │                │                                         │
   │                │◀─ ─ ─ ─ ─ ─ payment confirmed ─ ─ ─ ─ ─┤
   │                │                    │                   │
   │◀─ ─ order confirmed ─ ─ ┤            │                   │
   │                │                    │                   │

──▶  synchronous call (caller waits)
◀ ─ ┤  dashed = return value going back
Vertical bars beneath each name = activation (object actively executing)`,
  },

  {
    id: "activity-diagram",
    title: "Activity Diagram",
    oneLiner: "A flowchart for modeling a workflow's logic — branches, loops, and parallel steps.",
    content: `An **Activity Diagram** models the flow of control through a process or algorithm — much like a classic flowchart, but with standardized UML notation for branching and parallelism. Where a Sequence Diagram shows *which objects* talk to each other in what order, an Activity Diagram shows the *logic* of a single workflow, independent of which class does each step.

**Core elements:**
- **Initial node** — a filled circle marking the start.
- **Activity/Action** — a rounded rectangle representing a single step.
- **Decision node** — a diamond, with labeled outgoing paths for each branch (e.g. "seat available?" → yes/no).
- **Fork/Join bars** — a thick horizontal (or vertical) bar splitting flow into parallel branches (fork) and later merging them back (join) — used when steps can happen concurrently.
- **Final node** — a filled circle inside a ring, marking the end.

**When to reach for it in an interview:** when a *single* operation has meaningfully complex internal logic worth visualizing on its own — a checkout flow with several validation branches, or a matching algorithm with a loop and a decision point. For most LLD problems, a class diagram plus a couple of Prev/Next sentences of prose covers this; an Activity Diagram earns its place specifically when the branching logic itself is the hard part of the problem (e.g. an elevator's scheduling algorithm).`,
    codeLabel: "activity_diagram.txt",
    code: `                    ●  (start)
                    │
                    ▼
          ┌───────────────────┐
          │ Check seat status │
          └─────────┬─────────┘
                     ▼
                 ◇ available? ◇
                ╱               ╲
             yes                 no
              │                   │
              ▼                   ▼
     ┌─────────────────┐  ┌────────────────────┐
     │  Reserve seat    │  │ Show "sold out"     │
     └────────┬─────────┘  └──────────┬──────────┘
              ▼                        │
     ┌─────────────────┐               │
     │  Process payment │               │
     └────────┬─────────┘               │
              ▼                        │
     ┌─────────────────┐               │
     │  Issue ticket     │               │
     └────────┬─────────┘               │
              └───────────┬─────────────┘
                          ▼
                       ◉  (end)`,
  },

  {
    id: "state-machine-diagram",
    title: "State Machine Diagram",
    oneLiner: "Model every state an object can be in, and exactly what triggers a transition.",
    content: `A **State Machine Diagram** models the distinct states an individual object can be in over its lifetime, and the events (with optional guard conditions) that trigger transitions between them. It's the direct visual counterpart of the State design pattern covered earlier — in fact, drawing this diagram is usually the fastest way to discover you need the State pattern in your implementation.

**Core elements:**
- **State** — a rounded rectangle (Pending, Paid, Shipped).
- **Transition** — an arrow labeled with the triggering event, and optionally a guard condition in square brackets (e.g. cancel() [no items shipped yet]).
- **Initial state** — a filled circle with an arrow into the first real state.
- **Final state** — a filled circle inside a ring.

**Why this diagram specifically earns its place in an LLD interview:** almost every "design a booking/order/game" problem has an entity with a real lifecycle (an Order, a ParkingTicket, a Chess game's turn state). Sketching its states and legal transitions *before* writing any code surfaces edge cases immediately — can a SHIPPED order be cancelled? Can a DELIVERED order go back to PENDING? — questions that are much cheaper to answer on a whiteboard than to discover mid-implementation.`,
    codeLabel: "state_machine_diagram.txt",
    code: `        ●
        │ create()
        ▼
   ┌───────────┐   pay()    ┌───────────┐   ship()   ┌───────────┐
   │  PENDING   │──────────▶│    PAID    │───────────▶│  SHIPPED   │
   └─────┬──────┘            └─────┬──────┘            └─────┬──────┘
         │ cancel()                │ cancel()                 │ deliver()
         │ [always allowed]         │ [refund issued]           ▼
         ▼                          ▼                    ┌───────────┐
   ┌───────────┐            ┌───────────┐                │ DELIVERED  │
   │ CANCELLED  │◀───────────│ CANCELLED  │                └─────┬──────┘
   └─────┬──────┘            └───────────┘                       │
         │                                                       ▼
         ▼                                                     ◉ (end)
        ◉ (end)

Note: no transition arrow exists from SHIPPED or DELIVERED back to CANCELLED —
the diagram itself enforces that a shipped order can no longer be cancelled.`,
  },
];
