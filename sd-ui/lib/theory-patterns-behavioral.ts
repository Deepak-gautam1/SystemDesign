import type { TheoryTopic } from "./types";

export const BEHAVIORAL_PATTERNS: TheoryTopic[] = [
  {
    id: "iterator",
    title: "Iterator",
    oneLiner: "Traverse a collection's elements without exposing how the collection is stored.",
    content: `**Intent:** provide a way to access the elements of a collection sequentially, without exposing whether that collection is a vector, a linked list, a tree, or something else entirely.

**Problem it solves:** if client code needs to know a collection is specifically a vector (using index-based access) versus a linked list (following next pointers), that code breaks the moment the underlying storage changes. An Iterator gives every collection type the same simple contract — hasNext() and next() — so traversal code is written once and works identically regardless of internal structure.

**Structure:** a collection exposes a createIterator() method returning an Iterator object; the Iterator holds its own traversal position/state, separate from the collection itself — meaning multiple iterators can traverse the same collection independently and simultaneously.

**Why it matters in practice:** this is the pattern behind range-based for loops and standard library containers in every major language — vector<int>::iterator, Java's Iterable, Python's __iter__. In an interview, you rarely hand-roll this from scratch (the standard library already provides it), but recognizing "the client shouldn't need to know how this collection is stored to loop over it" as the Iterator pattern is the useful skill.`,
    codeLabel: "iterator.cpp",
    code: `template <typename T>
class Iterator {
public:
    virtual bool hasNext() = 0;
    virtual T next() = 0;
    virtual ~Iterator() = default;
};

class PlaylistIterator : public Iterator<string> {
private:
    vector<string>& songs;
    int position = 0;
public:
    PlaylistIterator(vector<string>& s) : songs(s) {}
    bool hasNext() override { return position < songs.size(); }
    string next() override { return songs[position++]; }
};

class Playlist {
private:
    vector<string> songs;
public:
    void add(const string& song) { songs.push_back(song); }
    PlaylistIterator createIterator() { return PlaylistIterator(songs); }
};

int main() {
    Playlist p;
    p.add("Song A"); p.add("Song B"); p.add("Song C");

    auto it = p.createIterator();
    while (it.hasNext()) {
        cout << it.next() << "\\n";   // caller never touches the vector directly
    }
}`,
  },

  {
    id: "observer",
    title: "Observer",
    oneLiner: "Notify a dynamic list of dependents automatically whenever one object's state changes.",
    content: `**Intent:** define a one-to-many dependency between objects, so that when one object (the Subject) changes state, all of its registered dependents (Observers) are notified and updated automatically — without the Subject needing to know anything concrete about them.

**Problem it solves:** a StockPrice object might need to update a MobileApp display, trigger an EmailAlert, and log to an AuditService whenever the price changes — and that list of interested parties can grow or shrink at runtime. Hard-coding calls to each one inside StockPrice couples it to every consumer and requires editing it every time a new consumer is added. Observer instead lets any object implement a simple Observer interface (typically one update() method) and subscribe() to the Subject; the Subject just loops over its subscriber list and calls update() on each — completely decoupled from what those subscribers actually do.

**Structure:** Subject maintains a list of Observer pointers, with subscribe()/unsubscribe() methods and a notify() method that calls update() on every registered observer.

**Classic LLD use case:** this is the mechanism behind virtually all event/pub-sub systems — UI frameworks (a button's click listeners), a YouTube channel notifying its subscribers of a new video, a stock ticker, or a chat room broadcasting a new message to every connected client.`,
    codeLabel: "observer.cpp",
    code: `class Observer {
public:
    virtual void update(double newPrice) = 0;
    virtual ~Observer() = default;
};

class StockPrice {   // the Subject
private:
    vector<Observer*> observers;
    double price;
public:
    void subscribe(Observer* o) { observers.push_back(o); }

    void setPrice(double p) {
        price = p;
        for (auto* o : observers) o->update(price);   // notify ALL, generically
    }
};

class MobileAppDisplay : public Observer {
public:
    void update(double newPrice) override {
        cout << "App: price updated to $" << newPrice << "\\n";
    }
};

class EmailAlert : public Observer {
public:
    void update(double newPrice) override {
        if (newPrice > 100) cout << "Email: price alert! $" << newPrice << "\\n";
    }
};

int main() {
    StockPrice stock;
    MobileAppDisplay app;
    EmailAlert alert;
    stock.subscribe(&app);
    stock.subscribe(&alert);

    stock.setPrice(105.50);   // both observers react — StockPrice knows neither concretely
}`,
  },

  {
    id: "strategy",
    title: "Strategy",
    oneLiner: "Make an algorithm swappable at runtime by encapsulating each variant behind a common interface.",
    content: `**Intent:** define a family of interchangeable algorithms, encapsulate each one behind a common interface, and let the algorithm used by a client vary independently — and be swapped at runtime.

**Problem it solves:** a route-planning app might offer "fastest route," "shortest distance," and "avoid tolls" — three different algorithms for the same task. Implementing this with an if/else on a routeType string inside the Navigator class means every new routing algorithm requires editing Navigator directly (violating Open/Closed). Strategy instead extracts each algorithm into its own class implementing a common RouteStrategy interface; Navigator just holds a RouteStrategy reference and calls calculateRoute() on it — swapping strategies is as simple as assigning a different object.

**Structure:** a Context class (Navigator) holds a reference to a Strategy interface and delegates the actual algorithm to it; concrete strategies (FastestRouteStrategy, ShortestRouteStrategy) each implement that interface with their own logic.

**How it differs from State (next topic):** structurally, Strategy and State look nearly identical (a context holding a reference to an interchangeable interface implementation). The difference is *intent*: Strategy is about choosing **which algorithm** to run, typically picked once by the client and rarely changing itself based on internal logic. State is about an object's **behavior changing based on its own internal state**, often transitioning itself between states as a side effect of its own methods.`,
    codeLabel: "strategy.cpp",
    code: `class RouteStrategy {
public:
    virtual void calculateRoute(const string& from, const string& to) = 0;
    virtual ~RouteStrategy() = default;
};

class FastestRouteStrategy : public RouteStrategy {
public:
    void calculateRoute(const string& from, const string& to) override {
        cout << "Fastest route from " << from << " to " << to << " via highway\\n";
    }
};

class ShortestRouteStrategy : public RouteStrategy {
public:
    void calculateRoute(const string& from, const string& to) override {
        cout << "Shortest route from " << from << " to " << to << " via back roads\\n";
    }
};

class Navigator {   // the Context
private:
    RouteStrategy* strategy;
public:
    Navigator(RouteStrategy* s) : strategy(s) {}
    void setStrategy(RouteStrategy* s) { strategy = s; }   // swap at runtime

    void navigate(const string& from, const string& to) {
        strategy->calculateRoute(from, to);   // delegates — doesn't know which algorithm
    }
};

int main() {
    Navigator nav(new FastestRouteStrategy());
    nav.navigate("Home", "Office");

    nav.setStrategy(new ShortestRouteStrategy());   // swapped at runtime
    nav.navigate("Home", "Office");
}`,
  },

  {
    id: "command",
    title: "Command",
    oneLiner: "Turn a request into a standalone object, so it can be queued, logged, or undone.",
    content: `**Intent:** encapsulate a request (an action plus its parameters) as an object, so that requests can be parameterized, queued, logged, and — critically — **undone**, all without the invoker knowing anything about what the action actually does.

**Problem it solves:** a remote control's button shouldn't need to know whether pressing it should turn on a light, open a garage door, or start a fan — and a text editor's "undo" button shouldn't need special-case logic for every possible action a user might have just performed. Command wraps each possible action in an object with a single execute() method (and often an undo() method); the invoker just calls execute() on whatever Command it's holding, without any knowledge of the receiver behind it.

**Structure:** a Command interface declares execute() (and optionally undo()); concrete commands (LightOnCommand, FanStartCommand) each wrap a reference to a "receiver" object and know how to invoke the right operation on it. An Invoker (the remote control button, or a menu item) simply holds and triggers Command objects.

**Classic LLD use case:** undo/redo stacks in text editors and drawing apps (each user action is a Command, pushed onto a history stack); a job queue where each queued task is a Command object; GUI buttons/menu items decoupled from what they trigger; a smart home remote where each button is configurably bound to any Command.`,
    codeLabel: "command.cpp",
    code: `class Command {
public:
    virtual void execute() = 0;
    virtual void undo() = 0;
    virtual ~Command() = default;
};

class Light {   // the Receiver — the object that actually does the work
public:
    void on()  { cout << "Light ON\\n"; }
    void off() { cout << "Light OFF\\n"; }
};

class LightOnCommand : public Command {
private:
    Light* light;
public:
    LightOnCommand(Light* l) : light(l) {}
    void execute() override { light->on(); }
    void undo() override { light->off(); }
};

class RemoteControl {   // the Invoker — knows nothing about Light directly
private:
    Command* slot;
    vector<Command*> history;
public:
    void setCommand(Command* c) { slot = c; }
    void pressButton() { slot->execute(); history.push_back(slot); }
    void pressUndo() {
        if (!history.empty()) {
            history.back()->undo();
            history.pop_back();
        }
    }
};

int main() {
    Light light;
    RemoteControl remote;
    remote.setCommand(new LightOnCommand(&light));
    remote.pressButton();   // Light ON
    remote.pressUndo();     // Light OFF — remote never called light.off() directly
}`,
  },

  {
    id: "state",
    title: "State",
    oneLiner: "Let an object change its behavior when its internal state changes, as if it changed class.",
    content: `**Intent:** allow an object to alter its behavior when its internal state changes, by delegating state-specific behavior to separate state objects — so the object appears to change its class at runtime.

**Problem it solves:** an Order that can be PENDING, PAID, SHIPPED, or DELIVERED behaves differently at each stage — cancel() is valid when PENDING but not when SHIPPED; ship() is only valid after PAID. Modeling this with a status field and if/else checks scattered across every method quickly turns into an unmaintainable web of conditionals, and adding a new state means hunting down every method that checks status. State instead gives each status its own class implementing a common OrderState interface; the Order simply delegates each action to its *current* state object, which itself decides what's valid and can transition the Order to the next state.

**Structure:** a Context (Order) holds a reference to a current State object and delegates behavior to it; each concrete State (PendingState, PaidState) implements the shared interface and can trigger a transition by telling the Context to swap in a different State object.

**Where it shows up:** this is the natural fit for almost any object with a lifecycle drawn as a state machine — Order status, a TrafficLight's phases, a game character's states (Idle/Running/Jumping), a TCP connection's states. If you find yourself asked to design something whose behavior clearly depends on "what phase it's currently in," State is very likely the expected answer.`,
    codeLabel: "state.cpp",
    code: `class Order;   // forward declaration

class OrderState {
public:
    virtual void ship(Order* order) = 0;
    virtual void cancel(Order* order) = 0;
    virtual string name() const = 0;
    virtual ~OrderState() = default;
};

class Order {
private:
    OrderState* state;
public:
    Order(OrderState* initial) : state(initial) {}
    void setState(OrderState* s) { state = s; }
    void ship() { state->ship(this); }
    void cancel() { state->cancel(this); }
    string currentState() const { return state->name(); }
};

class ShippedState : public OrderState {
public:
    void ship(Order* o) override { cout << "Already shipped\\n"; }
    void cancel(Order* o) override { cout << "Can't cancel — already shipped\\n"; }
    string name() const override { return "SHIPPED"; }
};

class PendingState : public OrderState {
public:
    void ship(Order* o) override {
        cout << "Shipping order...\\n";
        o->setState(new ShippedState());   // transitions itself
    }
    void cancel(Order* o) override { cout << "Order cancelled\\n"; }
    string name() const override { return "PENDING"; }
};

int main() {
    Order order(new PendingState());
    order.ship();               // "Shipping order..." — transitions to ShippedState
    order.cancel();              // "Can't cancel — already shipped"
    // Order never had a single if/else on a status enum anywhere.
}`,
  },

  {
    id: "template-method",
    title: "Template Method",
    oneLiner: "Define the skeleton of an algorithm in a base class, letting subclasses fill in specific steps.",
    content: `**Intent:** define the overall structure (skeleton) of an algorithm in a base class method, while deferring some individual steps to subclasses — the algorithm's shape never changes, but specific steps can vary.

**Problem it solves:** many algorithms share the same overall sequence but differ in a few specific steps. Making a hot beverage (boil water → brew → pour into cup → add condiments) is nearly identical for both Tea and Coffee — they differ only in "brew" (steep tea leaves vs. drip through grounds) and "add condiments" (lemon vs. sugar/milk). Template Method puts the fixed sequence in a base class's non-overridable "template" method, and marks only the varying steps as abstract/virtual for subclasses to fill in.

**Structure:** a base class defines a (often non-virtual, or C++'s "final") template method that calls a sequence of steps — some concrete/shared, some virtual (to be overridden by subclasses). Subclasses can't reorder the sequence, only supply the specific behavior for the variable steps. Some steps can be optional "hooks" with a default no-op implementation, letting subclasses opt into extending them only if needed.

**How it compares to Strategy:** both let you vary behavior — but Strategy varies the **entire algorithm** via composition (swap in a whole different object), while Template Method varies only **specific steps** of one fixed algorithm shape via inheritance. If subclasses need to change the overall flow, use Strategy; if they only fill in a few blanks within an otherwise-identical process, use Template Method.`,
    codeLabel: "template_method.cpp",
    code: `class BeverageMaker {
public:
    // The "template method" — the fixed skeleton, same for every beverage
    void prepareBeverage() {
        boilWater();
        brew();              // varies per subclass
        pourInCup();
        addCondiments();     // varies per subclass
    }

    virtual ~BeverageMaker() = default;

protected:
    void boilWater() { cout << "Boiling water\\n"; }
    void pourInCup() { cout << "Pouring into cup\\n"; }

    virtual void brew() = 0;             // subclasses MUST fill this in
    virtual void addCondiments() = 0;    // subclasses MUST fill this in
};

class TeaMaker : public BeverageMaker {
protected:
    void brew() override { cout << "Steeping tea leaves\\n"; }
    void addCondiments() override { cout << "Adding lemon\\n"; }
};

class CoffeeMaker : public BeverageMaker {
protected:
    void brew() override { cout << "Dripping through coffee grounds\\n"; }
    void addCondiments() override { cout << "Adding sugar and milk\\n"; }
};

int main() {
    TeaMaker tea;
    tea.prepareBeverage();   // same 4-step sequence, tea-specific steps 2 and 4
}`,
  },

  {
    id: "visitor",
    title: "Visitor",
    oneLiner: "Add new operations to a class hierarchy without modifying the classes themselves.",
    content: `**Intent:** represent an operation to be performed across the elements of an object structure, letting you define a new operation without changing the classes of the elements it operates on.

**Problem it solves:** imagine a Shape hierarchy (Circle, Square, Triangle) that needs several unrelated operations performed on it over time — computing area, exporting to SVG, exporting to JSON, calculating a bounding box. Adding each new operation as a virtual method on Shape means editing Shape and every subclass each time, and bloats the hierarchy with operations unrelated to what a Shape fundamentally *is*. Visitor inverts this: each Shape gets a single accept(Visitor&) method, and each new operation becomes an entirely separate Visitor class with a visit() method per shape type. Adding "export to SVG" means writing one new Visitor class — zero changes to Circle, Square, or Triangle.

**The mechanism (double dispatch):** accept() calls visitor.visit(*this) — since *this* is the concrete type inside each shape's own accept() override, the compiler picks the correctly-typed visit() overload on the visitor, achieving dispatch based on *both* the element's type and the visitor's type.

**The tradeoff to name in an interview:** Visitor makes adding new *operations* trivial, but makes adding a new *element type* (a new Shape) expensive — every existing Visitor must be updated with a new visit() overload for it. It's the mirror image of a plain virtual method approach, and you should pick whichever direction of extension is more likely to happen in your specific system.`,
    codeLabel: "visitor.cpp",
    code: `class Circle; class Square;   // forward declarations

class ShapeVisitor {
public:
    virtual void visit(Circle& c) = 0;
    virtual void visit(Square& s) = 0;
    virtual ~ShapeVisitor() = default;
};

class Shape {
public:
    virtual void accept(ShapeVisitor& v) = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    float radius = 5;
    void accept(ShapeVisitor& v) override { v.visit(*this); }   // dispatches to visit(Circle&)
};

class Square : public Shape {
public:
    float side = 4;
    void accept(ShapeVisitor& v) override { v.visit(*this); }   // dispatches to visit(Square&)
};

// A brand-new operation — zero changes needed to Shape, Circle, or Square
class AreaVisitor : public ShapeVisitor {
public:
    void visit(Circle& c) override { cout << "Circle area: " << 3.14159f * c.radius * c.radius << "\\n"; }
    void visit(Square& s) override { cout << "Square area: " << s.side * s.side << "\\n"; }
};

int main() {
    vector<Shape*> shapes = { new Circle(), new Square() };
    AreaVisitor areaCalc;
    for (auto* s : shapes) s->accept(areaCalc);   // correct visit() picked per shape
}`,
  },

  {
    id: "mediator",
    title: "Mediator",
    oneLiner: "Centralize how a set of objects communicate, so they don't reference each other directly.",
    content: `**Intent:** define an object that encapsulates how a set of other objects interact, so those objects don't need to reference each other directly — reducing many-to-many object dependencies down to a single hub.

**Problem it solves:** in a chat room, if every User object held a direct reference to every other User to send them messages, adding a new user would mean updating every existing user's reference list, and the coupling between all N users grows as O(N²). A Mediator (ChatRoom) sits in the middle: each User only knows about the ChatRoom, and sends messages *through* it; the ChatRoom is responsible for routing that message to the appropriate other Users. Users are now decoupled from each other entirely — only coupled to the mediator.

**Structure:** a Mediator interface declares communication methods (notify(), sendMessage()); a concrete mediator holds references to all participating "colleague" objects and coordinates between them. Colleagues hold a reference only to the mediator, never to each other.

**Classic LLD use case:** chat rooms/group messaging (the textbook example), air traffic control (planes don't communicate directly with each other — all coordinate through the control tower), UI dialogs where many form fields need to react to each other's changes (a mediator dialog controller, rather than each field holding references to every other field).`,
    codeLabel: "mediator.cpp",
    code: `class User;   // forward declaration

class ChatMediator {
public:
    virtual void sendMessage(const string& msg, User* sender) = 0;
    virtual void addUser(User* user) = 0;
    virtual ~ChatMediator() = default;
};

class User {
protected:
    ChatMediator* mediator;
    string name;
public:
    User(ChatMediator* m, string n) : mediator(m), name(n) {}
    string getName() const { return name; }
    void send(const string& msg) { mediator->sendMessage(msg, this); }
    virtual void receive(const string& msg, const string& from) {
        cout << name << " received from " << from << ": " << msg << "\\n";
    }
};

class ChatRoom : public ChatMediator {
private:
    vector<User*> users;
public:
    void addUser(User* u) override { users.push_back(u); }

    void sendMessage(const string& msg, User* sender) override {
        for (auto* u : users) {
            if (u != sender) u->receive(msg, sender->getName());  // routes, doesn't
        }                                                          // let users talk directly
    }
};

int main() {
    ChatRoom room;
    User alice(&room, "Alice"), bob(&room, "Bob");
    room.addUser(&alice); room.addUser(&bob);

    alice.send("Hey Bob!");   // Alice never holds a reference to Bob directly
}`,
  },

  {
    id: "memento",
    title: "Memento",
    oneLiner: "Capture and restore an object's internal state, without violating its encapsulation.",
    content: `**Intent:** capture an object's internal state at a point in time so it can be restored later — implementing undo/rollback — without exposing that internal state to the outside world in the process.

**Problem it solves:** implementing undo for a text editor requires saving snapshots of the document's state. But if you simply expose all of TextEditor's private fields publicly so an external "history manager" can read and store them, you've broken encapsulation for every other part of the codebase too. Memento solves this with three actors: the **Originator** (TextEditor) creates a **Memento** object holding a private snapshot of its own state — sealed so nothing outside Originator can read or modify its contents — and a **Caretaker** stores a stack of these opaque Mementos without ever looking inside them, only handing one back to the Originator when a restore is requested.

**Structure:** Originator has createMemento() (captures current state into a new Memento) and restore(Memento) (resets its own state from one); Memento exposes no public accessors except perhaps back to its own Originator (often implemented via a private nested class or friend relationship in C++, so only the Originator can actually read the snapshot's contents); Caretaker just holds a stack/list of Mementos, oblivious to what's inside them.

**Classic LLD use case:** undo/redo in text editors and drawing tools, checkpoint/rollback systems in games (saving state before a risky action), transaction rollback in a database-like system.`,
    codeLabel: "memento.cpp",
    code: `// Memento — an opaque snapshot. Only TextEditor (as a friend) can read its contents.
class EditorMemento {
private:
    string content;
    EditorMemento(string c) : content(c) {}
    friend class TextEditor;   // ONLY TextEditor can construct/read this
};

class TextEditor {   // the Originator
private:
    string content;
public:
    void type(const string& text) { content += text; }
    string getContent() const { return content; }

    EditorMemento save() { return EditorMemento(content); }        // capture
    void restore(const EditorMemento& m) { content = m.content; }  // restore
};

class History {   // the Caretaker — stores mementos, never reads them
private:
    vector<EditorMemento> snapshots;
public:
    void push(const EditorMemento& m) { snapshots.push_back(m); }
    EditorMemento pop() {
        EditorMemento last = snapshots.back();
        snapshots.pop_back();
        return last;
    }
};

int main() {
    TextEditor editor;
    History history;

    editor.type("Hello");
    history.push(editor.save());     // checkpoint
    editor.type(", world!");
    cout << editor.getContent();     // "Hello, world!"

    editor.restore(history.pop());   // undo
    cout << editor.getContent();     // back to "Hello"
}`,
  },

  {
    id: "chain-of-responsibility",
    title: "Chain of Responsibility",
    oneLiner: "Pass a request along a chain of handlers until one of them handles it.",
    content: `**Intent:** give more than one object a chance to handle a request by chaining the receiving objects together and passing the request along the chain until one handler processes it (or the chain ends).

**Problem it solves:** a support ticket might need to be handled by a Level-1 agent, escalated to Level-2, then to a Manager if still unresolved — and the code raising the ticket shouldn't need to know or decide up front which level will actually end up handling it. Chain of Responsibility builds a linked sequence of handler objects; each handler either processes the request itself, or passes it to the next handler in the chain, decoupling the sender of a request from the specific object that ultimately handles it.

**Structure:** a Handler interface declares handle(request) and holds a reference to the "next" handler; each concrete handler checks whether it can handle the request — if yes, it does so (and may or may not still pass it along); if no, it forwards to next.setHandler(next)/handle(request).

**Classic LLD use case:** support-ticket escalation (the example above), middleware pipelines in web frameworks (auth check → logging → rate limiting → the actual route handler, each middleware deciding whether to handle/short-circuit or pass along), event-bubbling in UI frameworks (a click event bubbling up from a button to its parent panel to the window, until something handles it), and approval workflows (an expense request routed through Manager → Director → VP based on amount thresholds).`,
    codeLabel: "chain_of_responsibility.cpp",
    code: `class SupportHandler {
protected:
    SupportHandler* next = nullptr;
public:
    void setNext(SupportHandler* handler) { next = handler; }

    virtual void handle(int severityLevel) {
        if (next) next->handle(severityLevel);   // pass along if not handled here
        else cout << "No handler could resolve this ticket\\n";
    }
    virtual ~SupportHandler() = default;
};

class Level1Support : public SupportHandler {
public:
    void handle(int severity) override {
        if (severity <= 1) cout << "Level 1 resolved it\\n";
        else SupportHandler::handle(severity);   // pass to next in chain
    }
};

class Level2Support : public SupportHandler {
public:
    void handle(int severity) override {
        if (severity <= 3) cout << "Level 2 resolved it\\n";
        else SupportHandler::handle(severity);
    }
};

class ManagerSupport : public SupportHandler {
public:
    void handle(int severity) override {
        cout << "Manager resolved it (severity " << severity << ")\\n";
    }
};

int main() {
    Level1Support l1; Level2Support l2; ManagerSupport mgr;
    l1.setNext(&l2);
    l2.setNext(&mgr);

    l1.handle(2);   // "Level 2 resolved it" — l1 passed it along automatically
    l1.handle(10);  // "Manager resolved it (severity 10)"
}`,
  },
];
