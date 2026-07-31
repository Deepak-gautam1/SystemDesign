import type { TheoryTopic } from "./types";

export const CREATIONAL_PATTERNS: TheoryTopic[] = [
  {
    id: "singleton",
    title: "Singleton",
    oneLiner: "Ensure a class has exactly one instance, with a single global access point.",
    content: `**Intent:** guarantee that a class is instantiated exactly once for the entire lifetime of the application, and provide one well-known way to access that instance.

**Problem it solves:** some things genuinely should only exist once — a logging service, a configuration manager, a connection pool. Letting any code construct a new one risks inconsistent state (two loggers writing to two different files) or wasted resources (opening a second database connection pool).

**How it works:** make the constructor private, store the one instance as a static member, and expose a static getInstance() method that creates the instance on first call and returns the same one on every subsequent call.

**Watch out for:** Singleton is one of the most **overused** patterns in interviews — reach for it only when "exactly one, globally" is a real requirement, not just convenience. It introduces global state (making unit testing harder, since tests can leak state into each other) and hides a dependency (any class calling Logger::getInstance() has a hidden coupling that isn't visible in its constructor). In a multi-threaded context, the classic lazy-initialization implementation has a race condition — modern C++ sidesteps this using a function-local static, which the standard guarantees is thread-safe to initialize (see the code panel).`,
    codeLabel: "singleton.cpp",
    code: `class Logger {
private:
    Logger() {}                          // private constructor
    Logger(const Logger&) = delete;       // no copying
    Logger& operator=(const Logger&) = delete;

public:
    static Logger& getInstance() {
        // Function-local static — the C++11 standard guarantees this
        // initialization is thread-safe, with no extra locking needed.
        static Logger instance;
        return instance;
    }

    void log(const string& msg) {
        cout << "[LOG] " << msg << "\\n";
    }
};

int main() {
    Logger::getInstance().log("Starting up");
    Logger::getInstance().log("Still the same instance");
    // Logger l;   // ❌ compile error — constructor is private
}`,
  },

  {
    id: "factory-method",
    title: "Factory Method",
    oneLiner: "Let subclasses decide which concrete class to instantiate.",
    content: `**Intent:** define a method for creating an object, but let subclasses override which concrete class actually gets created — the calling code only ever works with the base type.

**Problem it solves:** when object creation involves a decision ("if type == X, make an A; if type == Y, make a B"), scattering that if/else through your codebase means every new type requires hunting down and editing every one of those branches. A Factory Method centralizes that decision in one overridable method, so client code that requests "give me a document" never needs to know or care whether it got a PDFDocument or a WordDocument.

**Structure:** an abstract Creator class declares a factory method returning an abstract Product. Concrete creators (subclasses) override the factory method to return a specific concrete product.

**When to reach for it:** when you have a class hierarchy of products (Notification: EmailNotification, SmsNotification) and want the *creation logic* to vary independently, typically because different subclasses of a Creator need to produce correspondingly different products. If you only need one simple creation decision without a matching Creator hierarchy, a plain factory function or a Simple Factory (a single class with a static create() method and an if/switch inside) is often good enough — Factory Method earns its complexity when creation logic itself needs to be polymorphic.`,
    codeLabel: "factory_method.cpp",
    code: `class Notification {
public:
    virtual void send(const string& msg) = 0;
    virtual ~Notification() = default;
};

class EmailNotification : public Notification {
public:
    void send(const string& msg) override { cout << "Email: " << msg << "\\n"; }
};

class SmsNotification : public Notification {
public:
    void send(const string& msg) override { cout << "SMS: " << msg << "\\n"; }
};

// The Creator declares the factory method...
class NotifierService {
public:
    virtual Notification* createNotification() = 0;   // the "factory method"

    void notify(const string& msg) {
        Notification* n = createNotification();   // doesn't know concrete type
        n->send(msg);
        delete n;
    }
    virtual ~NotifierService() = default;
};

// ...concrete creators override it to decide WHAT gets built.
class EmailNotifierService : public NotifierService {
public:
    Notification* createNotification() override { return new EmailNotification(); }
};

class SmsNotifierService : public NotifierService {
public:
    Notification* createNotification() override { return new SmsNotification(); }
};`,
  },

  {
    id: "abstract-factory",
    title: "Abstract Factory",
    oneLiner: "Produce families of related objects without specifying their concrete classes.",
    content: `**Intent:** provide an interface for creating **families** of related objects, guaranteeing that whatever concrete family you pick, all the objects you get out of it are compatible with each other.

**Problem it solves:** imagine a UI toolkit that must support both a Light theme and a Dark theme, where each theme needs a matching Button, Checkbox, and ScrollBar. If you construct a LightButton but accidentally pair it with a DarkCheckbox, the UI looks broken. An Abstract Factory (LightThemeFactory vs DarkThemeFactory) guarantees that once you pick a factory, every widget it produces belongs to the same consistent family.

**How it differs from Factory Method:** Factory Method produces **one** product through method overriding in a single inheritance hierarchy. Abstract Factory produces an entire **family of related products** (often via composition — the factory holds several factory methods internally, one per product type in the family) — it's frequently implemented *using* multiple Factory Methods under one roof.

**Classic LLD use case:** cross-platform UI kits, database driver families (a factory that produces a matching Connection + Command + Transaction for either MySQL or PostgreSQL, never mixing the two), or game asset families (all the units/buildings for a given civilization in a strategy game).`,
    codeLabel: "abstract_factory.cpp",
    code: `// Product families
class Button { public: virtual void render() = 0; virtual ~Button() = default; };
class Checkbox { public: virtual void render() = 0; virtual ~Checkbox() = default; };

class LightButton : public Button { public: void render() override { cout << "Light Button\\n"; } };
class LightCheckbox : public Checkbox { public: void render() override { cout << "Light Checkbox\\n"; } };

class DarkButton : public Button { public: void render() override { cout << "Dark Button\\n"; } };
class DarkCheckbox : public Checkbox { public: void render() override { cout << "Dark Checkbox\\n"; } };

// Abstract Factory — guarantees matching families
class UIFactory {
public:
    virtual Button* createButton() = 0;
    virtual Checkbox* createCheckbox() = 0;
    virtual ~UIFactory() = default;
};

class LightThemeFactory : public UIFactory {
public:
    Button* createButton() override { return new LightButton(); }
    Checkbox* createCheckbox() override { return new LightCheckbox(); }
};

class DarkThemeFactory : public UIFactory {
public:
    Button* createButton() override { return new DarkButton(); }
    Checkbox* createCheckbox() override { return new DarkCheckbox(); }
};

// Client code never mixes Light + Dark widgets by accident:
void renderUI(UIFactory* factory) {
    Button* b = factory->createButton();
    Checkbox* c = factory->createCheckbox();
    b->render(); c->render();
}`,
  },

  {
    id: "builder",
    title: "Builder",
    oneLiner: "Construct a complex object step by step, separating construction from representation.",
    content: `**Intent:** pull the step-by-step construction of a complex object out of its constructor and into a dedicated Builder object, so the same construction process can produce different representations, and so callers aren't forced through a constructor with a dozen optional parameters.

**Problem it solves:** a class like HttpRequest might have a required URL, plus optional headers, a body, a timeout, retry settings, and auth tokens. A constructor trying to cover every combination either explodes into overloads or forces callers to pass nulls/defaults for everything they don't need ("telescoping constructor" anti-pattern). A Builder instead lets you chain only the pieces you care about, then call build() once at the end.

**Structure:** a Builder class exposes chainable setter-like methods that each return the builder itself (*this or a reference), enabling a fluent call chain, ending in a build() call that assembles and returns the final immutable object.

**Interview signal:** Builder shows up constantly for object with many optional fields — a Pizza with toppings, a SQL Query with optional WHERE/ORDER BY/LIMIT clauses, a Computer being assembled from optional components. If an interviewer's problem involves "many optional configuration options," proposing a Builder is usually the expected answer.`,
    codeLabel: "builder.cpp",
    code: `class HttpRequest {
public:
    string url, body;
    map<string, string> headers;
    int timeoutMs = 5000;

    // Constructor is private — only the Builder can create one
    friend class HttpRequestBuilder;
private:
    HttpRequest() = default;
};

class HttpRequestBuilder {
private:
    HttpRequest request;
public:
    HttpRequestBuilder& setUrl(const string& url) {
        request.url = url; return *this;
    }
    HttpRequestBuilder& addHeader(const string& key, const string& val) {
        request.headers[key] = val; return *this;
    }
    HttpRequestBuilder& setBody(const string& body) {
        request.body = body; return *this;
    }
    HttpRequestBuilder& setTimeout(int ms) {
        request.timeoutMs = ms; return *this;
    }
    HttpRequest build() { return request; }
};

int main() {
    HttpRequest req = HttpRequestBuilder()
        .setUrl("https://api.example.com/orders")
        .addHeader("Authorization", "Bearer token123")
        .setTimeout(3000)
        .build();
    // Only set what you need — no 10-argument constructor call.
}`,
  },

  {
    id: "prototype",
    title: "Prototype",
    oneLiner: "Create new objects by copying an existing instance, instead of building from scratch.",
    content: `**Intent:** produce a new object by cloning an existing "prototype" instance, rather than instantiating a class directly. The new object starts as an exact copy and can then be tweaked.

**Problem it solves:** sometimes constructing an object from scratch is expensive (it loads data from a database, parses a large config, or performs heavy computation) or the exact concrete class isn't known at compile time — only a prototype instance is available. Cloning an already-fully-initialized object sidesteps redoing that expensive setup, and works even when you only have a base-class pointer to an object of an unknown concrete subclass.

**Structure:** the base class declares a virtual clone() method. Each concrete subclass implements clone() to return a copy of *itself* (typically via its own copy constructor), so calling clone() through a base pointer produces a new object of the correct concrete type — without the caller needing to know or name that type.

**Classic LLD use case:** a game's enemy spawner that clones a pre-configured "template" enemy rather than reconstructing stats from scratch each time; a document editor's "duplicate shape" feature, where the exact concrete shape (Circle vs Polygon vs Text) isn't known by the code performing the duplication — only that it supports clone().`,
    codeLabel: "prototype.cpp",
    code: `class Shape {
public:
    virtual Shape* clone() const = 0;   // each subclass returns a copy of itself
    virtual void draw() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
    int radius;
public:
    Circle(int r) : radius(r) {}
    Circle(const Circle& other) : radius(other.radius) {}   // copy constructor

    Shape* clone() const override { return new Circle(*this); }
    void draw() const override { cout << "Circle r=" << radius << "\\n"; }
};

void duplicateAndDraw(Shape* prototype) {
    // No idea if 'prototype' is a Circle, Square, or anything else —
    // clone() still produces a correct, independent copy of the right type.
    Shape* copy = prototype->clone();
    copy->draw();
    delete copy;
}

int main() {
    Circle templateCircle(10);
    duplicateAndDraw(&templateCircle);   // clones without knowing it's a Circle
}`,
  },
];
