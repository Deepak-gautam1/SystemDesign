import type { TheoryTopic } from "./types";

export const RELATIONSHIP_TOPICS: TheoryTopic[] = [
  {
    id: "association",
    title: "Association",
    oneLiner: "Two classes know about each other and collaborate — nothing more.",
    content: `**Association** is the loosest structural relationship between two classes: one class uses or refers to another, but neither owns the other, and neither's lifecycle depends on the other's. It can be **one-directional** (a Student references a Teacher, but not vice versa) or **bidirectional** (a Teacher knows their Students and each Student knows their Teacher).

Association is typically modeled as a plain member reference or pointer, without any ownership semantics — the referenced object was created elsewhere and will outlive or be destroyed independently of the class holding the reference.

**Interview signal:** if you draw an arrow between two classes just because one "talks to" the other in some method, that's association. Save "has-a" language for aggregation and composition below — mixing these up is one of the most common LLD interview mistakes.`,
    codeLabel: "association.cpp",
    code: `class Teacher;   // forward declaration

class Student {
public:
    string name;
    Teacher* advisor;   // Student is ASSOCIATED with a Teacher —
                         // doesn't own it, doesn't manage its lifetime
};

class Teacher {
public:
    string name;
};

// Neither object owns the other. Deleting a Student doesn't touch the
// Teacher; deleting a Teacher doesn't invalidate the Student object itself
// (though the advisor pointer would then dangle — a caller's job to manage).`,
  },

  {
    id: "aggregation",
    title: "Aggregation",
    oneLiner: "A \"has-a\" relationship where the part can outlive the whole.",
    content: `**Aggregation** is a special, stronger form of association that models a **whole-part** relationship — but the part's lifecycle is independent of the whole. If the "whole" object is destroyed, the "part" objects are **not** destroyed with it; they can exist on their own, and may even belong to more than one whole at a time.

Classic example: a **Department has Professors** — but if the Department is dissolved, the Professors don't cease to exist. They might transfer to another department. This is typically modeled by storing pointers or references to objects that were constructed (and are owned) elsewhere.

**How to tell it apart from composition:** ask "if I delete the container, should the contained objects also be deleted?" If the answer is no, it's aggregation. In UML diagrams, aggregation is drawn with a **hollow (unfilled) diamond** at the whole's end of the connecting line.`,
    codeLabel: "aggregation.cpp",
    code: `class Professor {
public:
    string name;
    Professor(string n) : name(n) {}
};

class Department {
private:
    vector<Professor*> professors;   // Department HAS professors,
                                      // but does not own their lifetime
public:
    void addProfessor(Professor* p) { professors.push_back(p); }

    ~Department() {
        // Deliberately does NOT delete the Professor objects —
        // they exist independently of this Department.
    }
};

int main() {
    Professor* p1 = new Professor("Dr. Smith");
    {
        Department cs("Computer Science");
        cs.addProfessor(p1);
    } // cs is destroyed here — p1 is completely unaffected
    delete p1;   // caller who created it is responsible for cleaning it up
}`,
  },

  {
    id: "composition",
    title: "Composition",
    oneLiner: "A \"has-a\" relationship where the part cannot outlive the whole.",
    content: `**Composition** is the strongest whole-part relationship: the contained ("part") object's lifecycle is completely bound to the containing ("whole") object. When the whole is destroyed, its parts are destroyed with it — they have no independent existence.

Classic example: a **House has Rooms**. A Room doesn't make sense outside the context of the House it belongs to — when the House is torn down, so are its Rooms. In C++, composition is typically modeled by storing the contained object **by value** as a member (or via a unique_ptr, if it needs to be heap-allocated but still exclusively owned).

**In UML diagrams**, composition is drawn with a **filled (solid) diamond** at the whole's end — visually distinguishing it from aggregation's hollow diamond. This is the relationship interviewers most want to see you reach for when one entity fundamentally can't exist without its container: an Order's LineItems, a Car's Engine, a GameBoard's Cells.`,
    codeLabel: "composition.cpp",
    code: `class Room {
public:
    string name;
    Room(string n) : name(n) {}
};

class House {
private:
    vector<Room> rooms;   // stored BY VALUE — Rooms live and die with House

public:
    House() {
        rooms.emplace_back("Living Room");
        rooms.emplace_back("Bedroom");
        rooms.emplace_back("Kitchen");
    }
    // No custom destructor needed — when House is destroyed, its 'rooms'
    // vector (and every Room inside it) is automatically destroyed too.
};

int main() {
    House h;    // 3 Rooms created along with the House
}               // all 3 Rooms destroyed automatically when h goes out of scope`,
  },

  {
    id: "dependency",
    title: "Dependency",
    oneLiner: "The weakest relationship: one class briefly uses another, without holding onto it.",
    content: `**Dependency** is the lightest-weight relationship of the four: a class uses another class only briefly — typically as a method parameter, a local variable, or a return type — without storing a persistent reference to it as a field. If class A depends on class B, a change to B's interface might force a change in A's code, but A doesn't "have" a B in any lasting sense.

Contrast this with association: association implies a class holds onto a reference over time (a field); dependency is transient, existing only for the duration of a single method call. In UML, dependency is drawn as a **dashed arrow** (versus association's solid line), signaling "uses temporarily" rather than "holds a reference to."

**Why this distinction matters in practice:** dependencies are exactly what dependency injection and the Dependency Inversion Principle (SOLID) are about — a class should depend on abstractions passed in, not concrete types it constructs or stores internally. Recognizing a relationship as "just a dependency" often reveals that it can be injected through a constructor or method parameter rather than hard-coded.`,
    codeLabel: "dependency.cpp",
    code: `class Logger {
public:
    void log(const string& message) {
        cout << "[LOG] " << message << "\\n";
    }
};

class OrderProcessor {
public:
    // OrderProcessor DEPENDS ON Logger only for the duration of this call —
    // it's a parameter, not a stored field. No lasting relationship exists
    // between the two classes once processOrder() returns.
    void processOrder(int orderId, Logger& logger) {
        logger.log("Processing order " + to_string(orderId));
        // ... business logic ...
    }
};

// Compare to Association: if OrderProcessor stored "Logger* logger;" as a
// field and kept it around across multiple calls, that would be association,
// not dependency.`,
  },
];
