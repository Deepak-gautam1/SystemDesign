import type { TheoryTopic } from "./types";

export const PRINCIPLE_TOPICS: TheoryTopic[] = [
  {
    id: "dry",
    title: "DRY — Don't Repeat Yourself",
    oneLiner: "Every piece of knowledge should exist in exactly one place.",
    content: `**DRY** says that every piece of logic or knowledge in a system should have a single, unambiguous, authoritative representation. If a validation rule, a tax calculation, or a formatting convention is written out in three different places, you now have three places that must be remembered and kept in sync every time the rule changes — and in practice, one of them always gets missed.

**How it shows up in LLD:** when you notice two classes doing the same three-step calculation, or the same eligibility check copy-pasted across a Booking flow and a Refund flow, that's a DRY violation waiting to cause a bug. The fix is usually to extract the shared logic into a single method, helper class, or shared base — not necessarily inheritance; a small utility/service class is often cleaner.

**The trap:** DRY is about duplicated *knowledge*, not duplicated *text*. Two pieces of code can look identical today but represent genuinely different business rules that happen to coincide — merging them prematurely creates a false coupling, and the day the rules diverge, you're forced to un-merge them under pressure. Don't chase superficial similarity; chase the same underlying rule.`,
  },

  {
    id: "yagni",
    title: "YAGNI — You Aren't Gonna Need It",
    oneLiner: "Don't build for a future requirement that doesn't exist yet.",
    content: `**YAGNI** is a guardrail against speculative generality: don't add a configuration option, an abstraction layer, or a plugin system for a requirement you *imagine* you'll need later. Build for the requirements you actually have right now, and let the design evolve when a real new requirement arrives.

In an LLD interview this shows up as scope discipline. If you're asked to design a Parking Lot, and you spend ten minutes building an extensible pricing-strategy plugin architecture "in case they want dynamic pricing later" — but dynamic pricing was never asked for — you've burned time the interviewer wanted spent on the actual requirements (spot allocation, payment, ticketing). A clean, direct design for the stated problem, with obvious extension points (an interface where variation is *likely*, like PricingStrategy if pricing was even hinted at) beats an over-engineered one every time.

**The balance to strike:** YAGNI doesn't mean "never use an interface." It means don't add abstraction *speculatively*. If the problem statement says "the system should support multiple payment methods," that's a real, stated requirement — abstracting PaymentMethod is not over-engineering, it's just correctly modeling what was asked for.`,
  },

  {
    id: "kiss",
    title: "KISS — Keep It Simple, Stupid",
    oneLiner: "Prefer the straightforward solution over the clever one.",
    content: `**KISS** is a bias toward simplicity: given two designs that both satisfy the requirements, pick the one that's easier to read, explain, and maintain — even if the more complex one is more "impressive." Complexity has an ongoing cost (every future engineer has to understand it), while the benefit of cleverness is usually one-time and often imaginary.

**Where it collides with other principles:** KISS is in constant tension with flexibility-oriented principles like the Open/Closed Principle. The skill being tested in an LLD interview is knowing when extra structure (an interface, a pattern) earns its complexity — and when it's gold-plating. A single well-named if/else is often more readable than a Strategy pattern with one implementation; a Strategy pattern earns its keep the moment a *second* implementation shows up.

**A practical filter:** before adding a layer of indirection, ask "would a new engineer understand why this exists in under a minute?" If the honest answer is no, and there isn't a concrete, current requirement justifying it, simplify.`,
  },

  {
    id: "solid",
    title: "SOLID Principles",
    oneLiner: "Five principles for designing classes that are easy to extend without breaking.",
    content: `**SOLID** is five principles that, together, describe how to structure classes so that a codebase can grow without becoming fragile. They are the single most commonly *directly* asked-about theory topic in LLD interviews — expect to be asked to point out at least one SOLID violation, or to name which principle a design decision satisfies.

## S — Single Responsibility Principle
A class should have exactly one reason to change. If a Report class both calculates figures **and** formats them into a PDF **and** emails them, it has three reasons to change (a calculation bug fix, a new export format, a new mail provider) — split it into three classes, each owning one job.

## O — Open/Closed Principle
Classes should be **open for extension, but closed for modification**. Adding a new case (a new shape, a new payment type) should mean *adding a new class*, not editing an existing one's internals with another if/else branch. This is usually achieved via polymorphism: a common interface that new implementations plug into.

## L — Liskov Substitution Principle
A subclass must be usable anywhere its base class is expected, without breaking the caller's assumptions. The canonical violation: a Square class that inherits from Rectangle but overrides setWidth() to also change height — this breaks any code that assumed setting a Rectangle's width leaves its height untouched. If a subclass has to weaken a guarantee the base class made, it shouldn't be a subclass.

## I — Interface Segregation Principle
Prefer several small, focused interfaces over one large, general-purpose one. If a Worker interface has both work() and eat(), a RobotWorker implementing it is forced to provide a meaningless eat() method. Split into Workable and Eatable, and let each class implement only what applies to it.

## D — Dependency Inversion Principle
High-level modules shouldn't depend on low-level modules directly — both should depend on abstractions. An OrderService shouldn't construct a MySQLDatabase directly inside itself; it should depend on a Database interface, with the concrete implementation *injected* from outside. This is what makes a class testable (swap in a fake/mock) and swappable (change databases without touching OrderService).

The code panel shows a single before/after example that violates, then fixes, the Open/Closed Principle — the one most frequently tested by asking "what happens when a new type is added?"`,
    codeLabel: "solid_ocp_example.cpp",
    code: `// ❌ VIOLATES Open/Closed — adding a new shape means editing this function
double areaViolation(const string& type, double a, double b) {
    if (type == "circle")    return 3.14159 * a * a;
    if (type == "rectangle") return a * b;
    // Adding a Triangle means coming back HERE and adding another branch.
    return 0;
}

// ✅ FOLLOWS Open/Closed — Shape is closed for modification,
// but the system is open for extension: add a new shape by adding a
// new class, never by touching Shape, Circle, Rectangle, or the calculator.
class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
    double radius;
public:
    Circle(double r) : radius(r) {}
    double area() const override { return 3.14159 * radius * radius; }
};

class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }
};

// New shape? Add "class Triangle : public Shape { ... }" — done.
// This function never changes, no matter how many shapes are added:
double totalArea(const vector<Shape*>& shapes) {
    double sum = 0;
    for (auto* s : shapes) sum += s->area();
    return sum;
}`,
  },
];
