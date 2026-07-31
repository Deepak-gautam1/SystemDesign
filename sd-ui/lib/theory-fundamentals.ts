import type { TheoryTopic } from "./types";

export const FUNDAMENTALS_TOPICS: TheoryTopic[] = [
  {
    id: "classes-and-objects",
    title: "Classes and Objects",
    oneLiner: "The blueprint-and-instance model at the heart of OOP.",
    content: `A **class** is a blueprint: it defines what state an entity holds (fields) and what it can do (methods), but it isn't a real thing sitting in memory. An **object** is a concrete instance of that blueprint — created at runtime, occupying its own memory, with its own copy of the fields the class defines.

**Key ideas:**
- Every object is created through a **constructor**, which sets up initial state. C++ also gives every object a **destructor**, called automatically when the object goes out of scope or is deleted.
- Fields and methods can be **instance members** (one copy per object) or **static/class members** (one copy shared across every object of that class) — useful for things like a running counter of how many objects exist.
- Inside a non-static method, the compiler implicitly passes a **this** pointer, referring to the specific object the method was called on.

In an LLD interview, "classes and objects" is rarely asked about directly — but every design you produce is judged on whether you drew the right classes with the right responsibilities. Getting this foundational model right is what makes every pattern and principle after it make sense.`,
    codeLabel: "classes_and_objects.cpp",
    code: `class BankAccount {
private:
    string ownerName;
    double balance;
    static int totalAccounts;   // shared across ALL objects

public:
    // Constructor — runs once per object, on creation
    BankAccount(string owner, double initial)
        : ownerName(owner), balance(initial) {
        totalAccounts++;
    }

    void deposit(double amount) {
        balance += amount;      // 'this->balance' implicitly
    }

    double getBalance() const { return balance; }

    static int getTotalAccounts() { return totalAccounts; }

    ~BankAccount() { totalAccounts--; }   // destructor
};

int BankAccount::totalAccounts = 0;

int main() {
    BankAccount a("Alice", 500.0);   // object #1
    BankAccount b("Bob", 250.0);     // object #2 — separate state

    a.deposit(100);
    cout << a.getBalance();          // 600 — b is untouched
    cout << BankAccount::getTotalAccounts(); // 2
}`,
  },

  {
    id: "enums",
    title: "Enums",
    oneLiner: "A fixed, type-safe set of named constants.",
    content: `An **enum** lets you define a variable that can only take one value from a small, fixed set of named options — far safer and more readable than scattering raw integers or strings through your code (comparing a seat's type to the literal 2 tells you nothing; comparing it to SeatType::PREMIUM does).

C++ has two flavors:
- **Plain enum** — values leak into the surrounding scope and implicitly convert to int, which can cause name clashes and accidental comparisons between unrelated enums.
- **Scoped enum (enum class)** — values are namespaced under the enum's name and do **not** implicitly convert to int. This is the modern, preferred choice in almost all new C++ code.

**Where enums show up constantly in LLD interviews:** order/booking states (PENDING, CONFIRMED, CANCELLED), piece colors in Chess, seat categories in a booking system, log levels, traffic light phases. Whenever a field can only be one of a small closed set of options, reach for an enum instead of a string or int — it lets the compiler catch invalid values for you, and switch statements over an enum class can even warn you if you forget to handle a case.`,
    codeLabel: "enums.cpp",
    code: `enum class OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED
};

enum class SeatType {
    NORMAL,
    PREMIUM
};

void printStatus(OrderStatus status) {
    switch (status) {
        case OrderStatus::PENDING:   cout << "Waiting"; break;
        case OrderStatus::CONFIRMED: cout << "Confirmed"; break;
        case OrderStatus::SHIPPED:   cout << "On the way"; break;
        case OrderStatus::DELIVERED: cout << "Delivered"; break;
        case OrderStatus::CANCELLED: cout << "Cancelled"; break;
    }
}

// OrderStatus::PENDING == SeatType::NORMAL   // compile error — good!
// This wouldn't compile with plain (unscoped) enums.`,
  },

  {
    id: "interfaces",
    title: "Interfaces",
    oneLiner: "A contract of behavior, with zero implementation of its own.",
    content: `An **interface** declares *what* a set of classes must be able to do, without saying *how*. C++ has no dedicated interface keyword — instead, interfaces are simulated with an **abstract class that contains only pure virtual functions** (no fields, no method bodies, no state).

**Why bother?** Interfaces let calling code depend on a contract rather than a concrete class. A PaymentService that depends on the PaymentMethod interface can process a CreditCard, a UPIWallet, or a GiftCard payment — all without ever knowing those concrete classes exist. This is the mechanism behind the **Dependency Inversion Principle** and behind most of the design patterns you'll study next (Strategy, Observer, Factory — all lean on interfaces).

**Rules of thumb:**
- If a class has *any* implemented (non-pure) method or *any* field, it's an abstract base class, not a pure interface.
- Interfaces should be small and focused — a class implementing an interface should never be forced to implement a method it has no meaningful behavior for (this is the **Interface Segregation Principle**, covered under SOLID).
- Always give a base class with virtual functions a **virtual destructor** — otherwise deleting a derived object through a base pointer causes undefined behavior.`,
    codeLabel: "interfaces.cpp",
    code: `// A pure interface: only pure virtual methods, no state, no bodies.
class PaymentMethod {
public:
    virtual bool pay(double amount) = 0;
    virtual ~PaymentMethod() = default;   // virtual destructor — always!
};

class CreditCard : public PaymentMethod {
public:
    bool pay(double amount) override {
        cout << "Charged $" << amount << " to credit card\\n";
        return true;
    }
};

class UpiWallet : public PaymentMethod {
public:
    bool pay(double amount) override {
        cout << "Paid $" << amount << " via UPI\\n";
        return true;
    }
};

// Calling code depends only on the interface:
void checkout(PaymentMethod* method, double total) {
    method->pay(total);   // works for ANY current or future implementation
}`,
  },

  {
    id: "encapsulation",
    title: "Encapsulation",
    oneLiner: "Bundling data with the methods that operate on it, and guarding access to it.",
    content: `**Encapsulation** means keeping an object's internal state private and only exposing a controlled, deliberate set of public methods to interact with it. Instead of letting outside code reach in and mutate a field directly, the object itself owns the responsibility of keeping that field valid at all times.

This is what access modifiers are for:
- **private** — only visible inside the class itself.
- **protected** — visible inside the class and its subclasses.
- **public** — visible to everyone.

**Why it matters in interviews:** a design that exposes raw public fields (public int seatsAvailable) invites bugs — anyone can set it to -5. A design that exposes bookSeat() and validates inside it can never end up in an invalid state. Interviewers specifically look for this: fields private, behavior public, invariants protected by the class itself. This is sometimes summarized as "tell, don't ask" — tell the object to do something and let it manage its own state, rather than asking for its internals and mutating them yourself.`,
    codeLabel: "encapsulation.cpp",
    code: `class Seat {
private:
    int id;
    bool booked = false;      // internal state — hidden

public:
    Seat(int id) : id(id) {}

    bool isAvailable() const { return !booked; }

    bool book() {
        if (booked) return false;   // invariant enforced HERE, not by the caller
        booked = true;
        return true;
    }
};

// Bad (no encapsulation): caller could do seat.booked = false; from anywhere,
// double-booking a seat with zero validation.
// Good (above): the ONLY way to change 'booked' is through book(), which
// guarantees the seat is never double-booked.`,
  },

  {
    id: "abstraction",
    title: "Abstraction",
    oneLiner: "Exposing what an object does, while hiding how it does it.",
    content: `**Abstraction** is a design-level idea: simplify a complex system down to the essential operations a caller needs, and hide everything else. It's easy to confuse with encapsulation, and they work together, but they solve different problems:

| | Encapsulation | Abstraction |
|---|---|---|
| Level | Implementation | Design |
| Goal | Protect internal state from misuse | Hide complexity behind a simple interface |
| Mechanism | Access modifiers (private/public) | Abstract classes, interfaces |
| Question it answers | "Can outside code touch this field directly?" | "What does the caller actually need to know?" |

A car's driver doesn't need to know how the engine's combustion cycle works — they just need a steering wheel, a pedal, and a brake. In code, a NotificationService interface with a send(message) method abstracts away whether the real implementation sends an SMS, an email, or a push notification. The caller is shielded from that complexity entirely.

**Interview signal:** when you introduce an interface or abstract base class specifically to hide varying implementations behind one simple call, and you can justify why the caller shouldn't know about those variations — that's abstraction done right.`,
    codeLabel: "abstraction.cpp",
    code: `// Abstraction: the caller only ever sees send(). How each channel actually
// delivers the message is completely hidden.
class NotificationService {
public:
    virtual void send(const string& message) = 0;
    virtual ~NotificationService() = default;
};

class EmailNotification : public NotificationService {
public:
    void send(const string& message) override {
        // SMTP handshake, MIME encoding, retries... all hidden from the caller
        cout << "Emailing: " << message << "\\n";
    }
};

class SmsNotification : public NotificationService {
public:
    void send(const string& message) override {
        // Carrier gateway, character-set limits... all hidden from the caller
        cout << "Texting: " << message << "\\n";
    }
};

void notifyUser(NotificationService* service, const string& msg) {
    service->send(msg);   // caller doesn't know or care which channel this is
}`,
  },

  {
    id: "inheritance",
    title: "Inheritance",
    oneLiner: "Reuse and specialize behavior by deriving one class from another.",
    content: `**Inheritance** lets a class (the derived/child class) acquire the fields and methods of another class (the base/parent class), then add new behavior or override existing behavior. It models an **"is-a"** relationship: a Car is a Vehicle, a SavingsAccount is an Account.

**Mechanics in C++:**
- A base class marks methods it expects subclasses to customize as **virtual**. A derived class then uses **override** to redefine them.
- Calling a virtual method through a base class pointer/reference invokes the *derived* class's version — this is what enables polymorphism (next topic).
- C++ supports multiple inheritance (a class can derive from more than one base), which is powerful but can introduce ambiguity (the "diamond problem," where two base classes share a common ancestor). Use it carefully, and prefer virtual inheritance or interfaces to sidestep it.

**A word of caution interviewers listen for:** inheritance creates *tight coupling* between base and derived classes — changing the base class can silently break every subclass. It's often overused where composition (an object *containing* another) would be more flexible. The guiding heuristic taught alongside this topic is **"favor composition over inheritance"**: only inherit when there's a genuine, stable is-a relationship, and the subclass is truly substitutable for the base (see the Liskov Substitution Principle under SOLID).`,
    codeLabel: "inheritance.cpp",
    code: `class Vehicle {
protected:
    string plateNumber;
public:
    Vehicle(string plate) : plateNumber(plate) {}
    virtual double calculateToll() const {
        return 2.00;   // default toll
    }
    virtual ~Vehicle() = default;
};

class Truck : public Vehicle {     // Truck IS-A Vehicle
public:
    Truck(string plate) : Vehicle(plate) {}
    double calculateToll() const override {
        return 8.50;   // trucks pay more — specialized behavior
    }
};

class Motorcycle : public Vehicle {  // Motorcycle IS-A Vehicle
public:
    Motorcycle(string plate) : Vehicle(plate) {}
    double calculateToll() const override {
        return 1.00;
    }
};`,
  },

  {
    id: "polymorphism",
    title: "Polymorphism",
    oneLiner: "One call site, many behaviors — the object decides what actually runs.",
    content: `**Polymorphism** ("many forms") means the same method call can trigger different behavior depending on the actual object it's invoked on. There are two kinds:

- **Compile-time (static) polymorphism** — resolved by the compiler before the program runs. This covers **function overloading** (multiple functions with the same name but different parameter types) and **operator overloading**.
- **Runtime (dynamic) polymorphism** — resolved while the program is running, based on the object's actual type. This is achieved through **virtual functions**: when you call a virtual method through a base class pointer or reference, C++ looks up the correct override at runtime using a mechanism called the **vtable** (virtual method table), and dispatches to it.

Runtime polymorphism is what makes the earlier Vehicle/Truck/Motorcycle example genuinely useful: you can hold a collection of Vehicle* pointers — mixing Trucks and Motorcycles freely — and calling calculateToll() on each one automatically runs the *correct* version, with zero if/else or type-checking anywhere in your code. This is the payoff of the whole OOP fundamentals chain: encapsulation protects state, abstraction defines the contract, inheritance builds the hierarchy, and polymorphism is what lets you actually *use* that hierarchy without caring which concrete type you're holding.`,
    codeLabel: "polymorphism.cpp",
    code: `vector<Vehicle*> vehiclesOnHighway = {
    new Truck("TRK-1"),
    new Motorcycle("MC-9"),
    new Truck("TRK-2"),
};

double totalToll = 0;
for (Vehicle* v : vehiclesOnHighway) {
    // Same call, three different behaviors — resolved at runtime via vtable
    totalToll += v->calculateToll();
}
cout << totalToll;   // 8.50 + 1.00 + 8.50 = 18.00

// No "if (type == TRUCK) ... else if (type == MOTORCYCLE) ..." anywhere.
// That branching logic is exactly what polymorphism replaces.`,
  },
];
