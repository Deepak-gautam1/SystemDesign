import type { TheoryTopic } from "./types";

export const STRUCTURAL_PATTERNS: TheoryTopic[] = [
  {
    id: "adapter",
    title: "Adapter",
    oneLiner: "Let two incompatible interfaces work together, without changing either one.",
    content: `**Intent:** convert the interface of an existing class into another interface that client code expects, so classes that couldn't otherwise work together, can.

**Problem it solves:** you have working, tested code that expects a MediaPlayer interface with a play() method — but you need to integrate a third-party AdvancedAudioLibrary whose method is called playAudioFile() and expects arguments in a different order. You can't (or shouldn't) rewrite the third-party library, and you don't want to change your existing MediaPlayer-based code either. An Adapter sits between them: it implements MediaPlayer, and internally translates each call into the equivalent call on AdvancedAudioLibrary.

**Structure:** the Adapter implements the interface the client already expects (the "target"), while holding a reference to the incompatible object (the "adaptee") and translating calls to it.

**Where it shows up:** wrapping a legacy or third-party API to fit your system's expected interface; adapting a new payment gateway SDK to your existing PaymentProcessor interface without touching any of the code that already calls PaymentProcessor. Adapter is purely about **compatibility** — unlike Decorator (next topic), it doesn't add new behavior, it just translates an existing interface into a different shape.`,
    codeLabel: "adapter.cpp",
    code: `// The interface client code already depends on:
class MediaPlayer {
public:
    virtual void play(const string& fileName) = 0;
    virtual ~MediaPlayer() = default;
};

// A third-party class with an incompatible interface we can't change:
class AdvancedAudioLibrary {
public:
    void playAudioFile(const string& file, int volumeLevel) {
        cout << "Playing " << file << " at volume " << volumeLevel << "\\n";
    }
};

// The Adapter: implements what the client expects, delegates to the adaptee
class AudioLibraryAdapter : public MediaPlayer {
private:
    AdvancedAudioLibrary library;
public:
    void play(const string& fileName) override {
        library.playAudioFile(fileName, 75);   // translates the call
    }
};

void playSong(MediaPlayer* player, const string& file) {
    player->play(file);   // works with the adapter exactly like any MediaPlayer
}`,
  },

  {
    id: "bridge",
    title: "Bridge",
    oneLiner: "Split an abstraction from its implementation so both can vary independently.",
    content: `**Intent:** decouple an abstraction (what something does, from the caller's view) from its implementation (how it actually does it), so you can change or extend either side without touching the other.

**Problem it solves:** imagine a Shape hierarchy (Circle, Square) that also needs to render through different rendering APIs (a VectorRenderer vs a RasterRenderer). Without Bridge, you'd need CircleVector, CircleRaster, SquareVector, SquareRaster — a combinatorial explosion where every new shape needs a version for every renderer, and vice versa. Bridge fixes this by giving Shape a reference to a Renderer *interface* rather than inheriting a specific rendering implementation — shapes and renderers can now be mixed and matched freely, and each hierarchy grows independently.

**How it differs from Adapter:** Adapter is retrofitted after the fact to make two existing, otherwise-unrelated interfaces compatible. Bridge is a deliberate **up-front design decision**, splitting one thing into two hierarchies (abstraction and implementation) from the start, specifically to avoid a combinatorial class explosion as both dimensions grow.

**Classic LLD use case:** cross-platform GUI toolkits (a Window abstraction bridged to a platform-specific WindowImpl for Windows/macOS/Linux), or a remote control (abstraction) that can operate any brand of TV (implementation) through a common Device interface.`,
    codeLabel: "bridge.cpp",
    code: `// Implementation hierarchy
class Renderer {
public:
    virtual void renderCircle(float radius) = 0;
    virtual ~Renderer() = default;
};

class VectorRenderer : public Renderer {
public:
    void renderCircle(float radius) override {
        cout << "Drawing circle of radius " << radius << " as vector paths\\n";
    }
};

class RasterRenderer : public Renderer {
public:
    void renderCircle(float radius) override {
        cout << "Drawing circle of radius " << radius << " as pixels\\n";
    }
};

// Abstraction hierarchy — holds a Renderer, doesn't inherit one
class Shape {
protected:
    Renderer* renderer;   // the "bridge" to the implementation side
public:
    Shape(Renderer* r) : renderer(r) {}
    virtual void draw() = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
    float radius;
public:
    Circle(Renderer* r, float radius) : Shape(r), radius(radius) {}
    void draw() override { renderer->renderCircle(radius); }
};

// Any Shape + any Renderer combination, with no new classes needed:
int main() {
    VectorRenderer vr;
    RasterRenderer rr;
    Circle(&vr, 5).draw();
    Circle(&rr, 5).draw();
}`,
  },

  {
    id: "composite",
    title: "Composite",
    oneLiner: "Treat individual objects and groups of objects through the exact same interface.",
    content: `**Intent:** compose objects into tree structures representing part-whole hierarchies, so client code can treat a single leaf object and an entire branch of the tree identically, through one uniform interface.

**Problem it solves:** a file system has both Files (leaves) and Folders (which contain Files and other Folders). If you want to compute "total size," you don't want separate logic for "sum a file" versus "recursively sum a folder" — you want to call getSize() on anything, file or folder, and have it just work. Composite achieves this by giving both Files and Folders a common component interface; a Folder's implementation simply loops over its children and calls the same method on each, whether that child is a File or another Folder.

**Structure:** an abstract Component interface declares operations common to both simple and composite objects. Leaf implements it directly. Composite also implements it, but delegates to (and aggregates results from) its children, which are themselves Components.

**Classic LLD use case:** file systems (Files and Folders), organizational charts (an Employee vs a Manager who has Employees), UI trees (a Button vs a Panel containing Buttons and other Panels) — anywhere you have a recursive "container of the same type of thing" structure and want to avoid special-casing leaves versus branches everywhere in client code.`,
    codeLabel: "composite.cpp",
    code: `// Common interface for both leaves and containers
class FileSystemComponent {
public:
    virtual int getSize() const = 0;
    virtual ~FileSystemComponent() = default;
};

class File : public FileSystemComponent {   // LEAF
    int sizeKb;
public:
    File(int size) : sizeKb(size) {}
    int getSize() const override { return sizeKb; }
};

class Folder : public FileSystemComponent {   // COMPOSITE
    vector<FileSystemComponent*> children;
public:
    void add(FileSystemComponent* c) { children.push_back(c); }

    int getSize() const override {
        int total = 0;
        for (auto* child : children) total += child->getSize();  // same call!
        return total;
    }
};

int main() {
    Folder root;
    root.add(new File(100));
    Folder* docs = new Folder();
    docs->add(new File(50));
    docs->add(new File(20));
    root.add(docs);

    cout << root.getSize();  // 170 — one call, works through the whole tree
}`,
  },

  {
    id: "decorator",
    title: "Decorator",
    oneLiner: "Attach new behavior to an object dynamically, without touching its class.",
    content: `**Intent:** wrap an object in one or more "decorator" objects that add new responsibilities, while preserving the same interface — so the wrapped object can be used everywhere the original could, but with extra behavior layered on.

**Problem it solves:** imagine a Coffee that can optionally have Milk, Whipped Cream, and Caramel added, in any combination, each adding to the cost and description. Modeling every combination as a subclass (MilkWhippedCreamCoffee, CaramelMilkCoffee...) explodes combinatorially. Decorator instead wraps a Coffee in a MilkDecorator, wraps *that* in a WhippedCreamDecorator, and so on — each decorator implements the same Beverage interface, calls through to the object it wraps, and adds its own bit on top.

**How it differs from inheritance:** inheritance adds behavior at compile time, for every instance of a subclass. Decorator adds behavior at **runtime**, to a specific individual instance — you can decorate one particular coffee with milk while leaving another coffee, of the same base class, undecorated.

**Classic LLD use case:** beverage customization (the textbook example), I/O streams (a Java-style BufferedInputStream wrapping a FileInputStream wrapping a network socket), UI components (adding a scrollbar, then a border, then a shadow to a plain TextBox) — anywhere behavior needs to be composed flexibly at runtime.`,
    codeLabel: "decorator.cpp",
    code: `class Beverage {
public:
    virtual string getDescription() const = 0;
    virtual double getCost() const = 0;
    virtual ~Beverage() = default;
};

class Coffee : public Beverage {
public:
    string getDescription() const override { return "Coffee"; }
    double getCost() const override { return 2.00; }
};

// Base decorator — also a Beverage, wraps another Beverage
class BeverageDecorator : public Beverage {
protected:
    Beverage* wrapped;
public:
    BeverageDecorator(Beverage* b) : wrapped(b) {}
};

class MilkDecorator : public BeverageDecorator {
public:
    MilkDecorator(Beverage* b) : BeverageDecorator(b) {}
    string getDescription() const override { return wrapped->getDescription() + " + Milk"; }
    double getCost() const override { return wrapped->getCost() + 0.50; }
};

class CaramelDecorator : public BeverageDecorator {
public:
    CaramelDecorator(Beverage* b) : BeverageDecorator(b) {}
    string getDescription() const override { return wrapped->getDescription() + " + Caramel"; }
    double getCost() const override { return wrapped->getCost() + 0.75; }
};

int main() {
    Beverage* order = new CaramelDecorator(new MilkDecorator(new Coffee()));
    cout << order->getDescription() << " = $" << order->getCost();
    // "Coffee + Milk + Caramel = $3.25" — built by stacking, not subclassing
}`,
  },

  {
    id: "facade",
    title: "Facade",
    oneLiner: "Provide one simple interface in front of a complex subsystem.",
    content: `**Intent:** wrap a complicated set of classes and interactions behind a single, simplified interface, so most callers never need to understand the subsystem's internal complexity at all.

**Problem it solves:** placing an order might involve checking InventoryService, charging PaymentGateway, calling ShippingProvider, and notifying NotificationService — four classes with their own setup and sequencing rules. Without a Facade, every part of your codebase that places an order needs to know all four classes and get the sequencing right. An OrderFacade wraps all four behind one placeOrder() method — the rest of the codebase calls that single method and never touches the subsystem directly.

**Important nuance:** Facade doesn't forbid direct access to the subsystem — power users who need fine-grained control can still reach the underlying classes directly. It simply gives the *common case* a much simpler front door. It also adds no new behavior of its own (unlike Decorator) — it's purely about **simplifying access**, not changing what's possible.

**Classic LLD use case:** a "checkout" or "book a trip" flow that internally touches many services; wrapping a genuinely complex third-party SDK (e.g. a video-encoding library with dozens of configuration classes) behind one simple encode(file) call for the 95% case.`,
    codeLabel: "facade.cpp",
    code: `class InventoryService { public: bool reserve(string item) { cout << "Reserved " << item << "\\n"; return true; } };
class PaymentGateway  { public: bool charge(double amt)   { cout << "Charged $" << amt << "\\n"; return true; } };
class ShippingProvider{ public: void schedule(string item){ cout << "Shipping " << item << "\\n"; } };
class NotificationSvc { public: void notify(string msg)   { cout << "Notified: " << msg << "\\n"; } };

// Facade — one simple method hides four subsystem classes and their sequencing
class OrderFacade {
private:
    InventoryService inventory;
    PaymentGateway payments;
    ShippingProvider shipping;
    NotificationSvc notifications;
public:
    void placeOrder(const string& item, double price) {
        if (!inventory.reserve(item)) return;
        if (!payments.charge(price)) return;
        shipping.schedule(item);
        notifications.notify("Order placed for " + item);
    }
};

int main() {
    OrderFacade store;
    store.placeOrder("Wireless Mouse", 25.99);  // one call — 4 subsystems coordinated
}`,
  },

  {
    id: "flyweight",
    title: "Flyweight",
    oneLiner: "Share common state across many objects to support huge numbers of them cheaply.",
    content: `**Intent:** minimize memory usage when you need a very large number of similar objects, by sharing the state that's identical across instances, and storing only the state that's genuinely unique per instance.

**Problem it solves:** imagine rendering a forest of a million trees, where each tree has a position (unique) but many trees share the exact same mesh, texture, and color (a small number of tree *species*). Storing the full mesh and texture data redundantly in a million objects would be enormous. Flyweight splits object state into:
- **Intrinsic state** — shared, immutable, reusable across many objects (the mesh/texture for "Oak Tree").
- **Extrinsic state** — unique per instance, passed in from outside rather than stored in the shared object (this tree's x/y position).

A Flyweight Factory hands out (and caches) the shared intrinsic objects, ensuring only one "Oak Tree" flyweight ever exists in memory, no matter how many oak trees are drawn.

**Classic LLD use case:** text editors representing each character on a page (glyph shape is intrinsic and shared across every occurrence of the letter "a" in a given font; position on the page is extrinsic), the forest/particle-rendering example above, or a Chess/game board's piece icons shared across many board cells.`,
    codeLabel: "flyweight.cpp",
    code: `// Intrinsic (shared) state — the same TreeType is reused across many trees
class TreeType {
public:
    string name, texture;
    TreeType(string n, string t) : name(n), texture(t) {}
    void render(int x, int y) const {   // extrinsic state (x, y) passed in
        cout << "Rendering " << name << " at (" << x << "," << y << ")\\n";
    }
};

// Flyweight Factory — ensures each distinct TreeType is created only once
class TreeTypeFactory {
private:
    static map<string, TreeType*> cache;
public:
    static TreeType* get(const string& name, const string& texture) {
        if (cache.find(name) == cache.end()) {
            cache[name] = new TreeType(name, texture);   // created once
        }
        return cache[name];   // reused for every subsequent tree of this type
    }
};
map<string, TreeType*> TreeTypeFactory::cache;

// Each Tree stores only its unique (extrinsic) position + a shared flyweight
class Tree {
    int x, y;
    TreeType* type;   // shared — NOT a separate copy per tree
public:
    Tree(int x, int y, TreeType* type) : x(x), y(y), type(type) {}
    void render() const { type->render(x, y); }
};

int main() {
    // A million trees could reuse just a handful of TreeType instances:
    Tree t1(10, 20, TreeTypeFactory::get("Oak", "oak.png"));
    Tree t2(15, 25, TreeTypeFactory::get("Oak", "oak.png"));  // same TreeType*
}`,
  },

  {
    id: "proxy",
    title: "Proxy",
    oneLiner: "A stand-in object that controls access to another object.",
    content: `**Intent:** provide a surrogate object that implements the same interface as a real object, sitting in front of it to control, defer, or restrict access — while remaining a drop-in replacement wherever the real object is expected.

**Problem it solves:** many concerns don't belong inside the real object's core logic — lazy-loading an expensive resource only when actually needed, checking permissions before allowing an operation, caching results to avoid repeated expensive calls, or logging every access for auditing. A Proxy implements the same interface as the RealSubject, and delegates to it, adding its own logic before or after the delegation.

**Common Proxy variants:**
- **Virtual proxy** — defers creating an expensive object until it's actually used (e.g. don't load a huge image from disk until render() is actually called).
- **Protection proxy** — checks permissions before allowing access to the real object.
- **Remote proxy** — represents an object that lives in a different address space (e.g. a stub for a networked service, making a remote call look like a local one).
- **Caching proxy** — stores results of expensive calls and returns the cached result for repeated requests.

**How it differs from Decorator and Facade:** a Proxy implements the *exact same* interface as the thing it wraps and is meant to be a transparent substitute for it (client code often doesn't know it's talking to a proxy). Decorator also wraps, but deliberately *adds new behavior* the client is meant to notice. Facade simplifies access to *multiple* classes; Proxy controls access to a *single* one.`,
    codeLabel: "proxy.cpp",
    code: `class Image {
public:
    virtual void display() = 0;
    virtual ~Image() = default;
};

class RealImage : public Image {   // the expensive real object
    string filename;
public:
    RealImage(string f) : filename(f) {
        cout << "Loading " << filename << " from disk (expensive!)\\n";  // happens NOW
    }
    void display() override { cout << "Displaying " << filename << "\\n"; }
};

// Virtual Proxy — defers loading until display() is actually called
class ImageProxy : public Image {
    string filename;
    RealImage* realImage = nullptr;
public:
    ImageProxy(string f) : filename(f) {}   // cheap — no loading yet

    void display() override {
        if (!realImage) {
            realImage = new RealImage(filename);  // loaded lazily, only once
        }
        realImage->display();
    }
    ~ImageProxy() { delete realImage; }
};

int main() {
    Image* img = new ImageProxy("large_photo.jpg");  // instant — nothing loaded yet
    cout << "Proxy created, gallery UI can render immediately\\n";
    img->display();  // ONLY now does the expensive disk load happen
    img->display();  // second call reuses the already-loaded RealImage
}`,
  },
];
