import type { OODProblem } from "./ood-problems";

// ── Extra OOP problems ────────────────────────────────────────────────────────

export const EXTRA_OOD_PROBLEMS: OODProblem[] = [
  {
    id: "atm-machine",
    title: "ATM Machine",
    difficulty: "medium",
    tags: ["State Pattern", "Encapsulation", "OOP", "Banking"],
    description: `Design an ATM machine with card insertion, PIN validation, and cash withdrawal.

**Requirements:**
- ATM has 3 states: Idle → CardInserted → PinVerified
- Operations: insertCard, enterPin, checkBalance, withdraw, ejectCard
- Each operation validates the current state before executing
- Tracks ATM cash inventory separately from account balance

**State Transitions:**
| State | Allowed | Blocked |
|---|---|---|
| **Idle** | insertCard() | everything else |
| **CardInserted** | enterPin(), ejectCard() | withdraw, checkBalance |
| **PinVerified** | checkBalance(), withdraw(), ejectCard() | insertCard |

**Key Design Decisions:**
- ATMState enum guards every operation — clean, explicit state machine
- BankAccount encapsulates balance + PIN validation — ATM never accesses raw data
- Wrong PIN auto-ejects the card (security policy in ATM class)`,
    concepts: ["State machine", "Encapsulation", "Guard clauses", "SRP"],
    filename: "atm.cpp",
    code: `#include <iostream>
#include <string>
#include <map>
using namespace std;

enum class ATMState { IDLE, CARD_INSERTED, PIN_VERIFIED };

// Encapsulation: account owns its own validation logic
class BankAccount {
public:
    string id;
    string pin;
    double balance;

    BankAccount(string id, string pin, double bal)
        : id(id), pin(pin), balance(bal) {}

    bool validatePin(const string& p) const { return pin == p; }

    bool withdraw(double amount) {
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }
};

class ATM {
private:
    ATMState     state;
    BankAccount* currentAccount;
    map<string, BankAccount*> accounts;
    double       cashAvailable;

public:
    ATM(double cash)
        : state(ATMState::IDLE), currentAccount(nullptr), cashAvailable(cash) {}

    void addAccount(BankAccount* acc) { accounts[acc->id] = acc; }

    bool insertCard(const string& accountId) {
        if (state != ATMState::IDLE) {
            cout << "Eject current card first.\\n"; return false;
        }
        auto it = accounts.find(accountId);
        if (it == accounts.end()) { cout << "Invalid card.\\n"; return false; }
        currentAccount = it->second;
        state = ATMState::CARD_INSERTED;
        cout << "Card accepted. Enter PIN.\\n";
        return true;
    }

    bool enterPin(const string& pin) {
        if (state != ATMState::CARD_INSERTED) { cout << "Insert card first.\\n"; return false; }
        if (!currentAccount->validatePin(pin)) {
            cout << "Wrong PIN. Card ejected.\\n";
            ejectCard();
            return false;
        }
        state = ATMState::PIN_VERIFIED;
        cout << "PIN verified. Select transaction.\\n";
        return true;
    }

    void checkBalance() {
        if (state != ATMState::PIN_VERIFIED) { cout << "Authenticate first.\\n"; return; }
        cout << "Balance: $" << currentAccount->balance << endl;
    }

    bool withdraw(double amount) {
        if (state != ATMState::PIN_VERIFIED) { cout << "Authenticate first.\\n"; return false; }
        if (amount > cashAvailable)          { cout << "ATM has insufficient cash.\\n"; return false; }
        if (!currentAccount->withdraw(amount)){ cout << "Insufficient balance.\\n"; return false; }
        cashAvailable -= amount;
        cout << "Dispensing $" << amount << ". Balance: $" << currentAccount->balance << "\\n";
        return true;
    }

    void ejectCard() {
        state = ATMState::IDLE;
        currentAccount = nullptr;
        cout << "Card ejected.\\n";
    }
};

int main() {
    ATM atm(10000);
    atm.addAccount(new BankAccount("ACC001", "1234", 5000));
    atm.addAccount(new BankAccount("ACC002", "9999", 1500));

    // Happy path
    atm.insertCard("ACC001");
    atm.enterPin("1234");
    atm.checkBalance();
    atm.withdraw(200);
    atm.ejectCard();

    cout << "---\\n";

    // Wrong PIN → auto-eject
    atm.insertCard("ACC002");
    atm.enterPin("0000");   // wrong

    // Operation before auth → blocked
    atm.checkBalance();     // state = IDLE after eject

    return 0;
}`,
    practicePrompt: `// Design an ATM Machine with a 3-state machine.
// States: IDLE → CARD_INSERTED → PIN_VERIFIED
//
// BankAccount: id, pin, balance
//   - validatePin(string) → bool
//   - withdraw(double)    → bool (false if insufficient)
//
// ATM: map<string, BankAccount*>, ATMState, BankAccount* current, double cashAvailable
//   - insertCard(id)    → IDLE → CARD_INSERTED (or reject)
//   - enterPin(pin)     → CARD_INSERTED → PIN_VERIFIED (wrong PIN ejects card)
//   - checkBalance()    → only valid in PIN_VERIFIED
//   - withdraw(amount)  → checks both ATM cash AND account balance
//   - ejectCard()       → resets to IDLE

#include <iostream>
#include <string>
#include <map>
using namespace std;

// TODO: ATMState enum

// TODO: BankAccount class

// TODO: ATM class

int main() {
    // Test: happy path, wrong PIN, operation before auth
    return 0;
}`,
  },

  {
    id: "library-management",
    title: "Library Management System",
    difficulty: "easy",
    tags: ["OOP", "SRP", "Encapsulation", "CRUD", "Due Dates"],
    description: `Design a library system to manage books, members, and borrowings.

**Requirements:**
- Members can borrow up to 3 books at a time
- Each borrowal has a 14-day due date; overdue triggers a fine message
- Books can be searched by title keyword
- Returning a book restores its availability

**Entity Responsibilities (SRP):**
| Class | Responsibility |
|---|---|
| **Book** | isbn, title, author, isAvailable |
| **Member** | member data + canBorrow() rule |
| **BorrowRecord** | one borrowal: dates, isOverdue() |
| **Library** | orchestrates borrow / return / search |

**Key Decisions:**
- \`Member::canBorrow()\` encapsulates the 3-book limit
- \`BorrowRecord::isOverdue()\` encapsulates the 14-day rule
- Library uses \`map<isbn, Book*>\` for O(1) book lookup`,
    concepts: ["SRP", "Encapsulation", "Map indexing", "Date handling", "CRUD"],
    filename: "library.cpp",
    code: `#include <iostream>
#include <vector>
#include <map>
#include <string>
#include <algorithm>
#include <ctime>
using namespace std;

class Book {
public:
    string isbn, title, author;
    bool   isAvailable;
    Book(string isbn, string title, string author)
        : isbn(isbn), title(title), author(author), isAvailable(true) {}
};

class Member {
public:
    int    id;
    string name;
    vector<string> borrowedIsbns;
    Member(int id, string name) : id(id), name(name) {}
    bool canBorrow() const { return borrowedIsbns.size() < 3; }
};

class BorrowRecord {
public:
    int    memberId;
    string isbn;
    time_t borrowDate, dueDate;
    BorrowRecord(int mId, const string& isbn) : memberId(mId), isbn(isbn) {
        borrowDate = time(nullptr);
        dueDate    = borrowDate + (14 * 24 * 3600);   // 14 days
    }
    bool isOverdue() const { return time(nullptr) > dueDate; }
};

class Library {
private:
    map<string, Book*>    books;
    map<int, Member*>     members;
    vector<BorrowRecord*> records;

public:
    void addBook(Book* b)     { books[b->isbn] = b; }
    void addMember(Member* m) { members[m->id] = m; }

    bool borrowBook(int memberId, const string& isbn) {
        auto mit = members.find(memberId);
        auto bit = books.find(isbn);
        if (mit == members.end())           { cout << "Member not found.\\n";    return false; }
        if (bit == books.end())             { cout << "Book not found.\\n";      return false; }
        if (!bit->second->isAvailable)      { cout << "Book not available.\\n";  return false; }
        if (!mit->second->canBorrow())      { cout << "Borrow limit reached.\\n"; return false; }

        bit->second->isAvailable = false;
        mit->second->borrowedIsbns.push_back(isbn);
        records.push_back(new BorrowRecord(memberId, isbn));
        cout << mit->second->name << " borrowed '" << bit->second->title << "'\\n";
        return true;
    }

    bool returnBook(int memberId, const string& isbn) {
        auto mit = members.find(memberId);
        auto bit = books.find(isbn);
        if (mit == members.end() || bit == books.end()) return false;

        for (auto rec : records)
            if (rec->memberId == memberId && rec->isbn == isbn && rec->isOverdue())
                cout << "  Overdue! Fine applies.\\n";

        bit->second->isAvailable = true;
        auto& v = mit->second->borrowedIsbns;
        v.erase(remove(v.begin(), v.end(), isbn), v.end());
        cout << mit->second->name << " returned '" << bit->second->title << "'\\n";
        return true;
    }

    void searchByTitle(const string& keyword) {
        cout << "Results for '" << keyword << "':\\n";
        for (auto& [isbn, book] : books)
            if (book->title.find(keyword) != string::npos)
                cout << "  [" << (book->isAvailable ? "Available" : "Borrowed")
                     << "] " << book->title << " by " << book->author << "\\n";
    }
};

int main() {
    Library lib;
    lib.addBook(new Book("ISBN001", "Clean Code",         "Robert Martin"));
    lib.addBook(new Book("ISBN002", "Clean Architecture", "Robert Martin"));
    lib.addBook(new Book("ISBN003", "Design Patterns",    "Gang of Four"));
    lib.addMember(new Member(1, "Alice"));
    lib.addMember(new Member(2, "Bob"));

    lib.borrowBook(1, "ISBN001");
    lib.borrowBook(1, "ISBN002");
    lib.searchByTitle("Clean");
    lib.returnBook(1, "ISBN001");
    lib.borrowBook(2, "ISBN001");   // now available again
    return 0;
}`,
    practicePrompt: `// Design a Library Management System.
//
// Book:   isbn, title, author, isAvailable
// Member: id, name, vector<string> borrowedIsbns
//   - canBorrow() → false if borrowedIsbns.size() >= 3
// BorrowRecord: memberId, isbn, borrowDate, dueDate (14 days from now)
//   - isOverdue() → time(nullptr) > dueDate
// Library: map<isbn,Book*>, map<id,Member*>, vector<BorrowRecord*>
//   - borrowBook(memberId, isbn) → validate all rules, update state
//   - returnBook(memberId, isbn) → check overdue, restore availability
//   - searchByTitle(keyword)     → print matching books with status

#include <iostream>
#include <vector>
#include <map>
#include <string>
#include <ctime>
using namespace std;

// TODO: Book class
// TODO: Member class
// TODO: BorrowRecord class
// TODO: Library class

int main() {
    return 0;
}`,
  },

  {
    id: "vending-machine",
    title: "Vending Machine",
    difficulty: "hard",
    tags: ["State Pattern", "Design Pattern", "OOP", "Polymorphism", "Virtual"],
    description: `Design a Vending Machine using the State design pattern.

**Requirements:**
- Customers insert money, select a product, and receive it with change
- Machine is always in exactly one state; invalid operations are blocked
- Automatically returns to Idle after each successful transaction

**States:**
| State | insertMoney | selectProduct |
|---|---|---|
| **Idle** | ✅ → HasMoney | ❌ blocked |
| **HasMoney** | ✅ add more | ✅ if enough money |

**Why State Pattern over if/else?**
Without it every method needs a chain of state checks. The State pattern moves each state's logic into its own class — adding a new state means adding a new class, not modifying existing ones (OCP).

**Implementation tip:** Forward-declare \`VendingMachine\` before the State classes, then implement the state methods *after* the full \`VendingMachine\` definition to resolve the circular dependency.`,
    concepts: ["State pattern", "OCP", "Polymorphism", "Virtual dispatch", "Forward declaration"],
    filename: "vending.cpp",
    code: `#include <iostream>
#include <map>
#include <string>
using namespace std;

class VendingMachine;  // forward declare

// Abstract state interface
class State {
public:
    virtual void insertMoney(double amount) = 0;
    virtual void selectProduct(const string& name) = 0;
    virtual string stateName() const = 0;
    virtual ~State() {}
};

class IdleState : public State {
    VendingMachine* vm;
public:
    IdleState(VendingMachine* vm) : vm(vm) {}
    void insertMoney(double amount) override;
    void selectProduct(const string&) override { cout << "Insert money first.\\n"; }
    string stateName() const override { return "Idle"; }
};

class HasMoneyState : public State {
    VendingMachine* vm;
public:
    HasMoneyState(VendingMachine* vm) : vm(vm) {}
    void insertMoney(double amount) override;
    void selectProduct(const string& product) override;
    string stateName() const override { return "HasMoney"; }
};

// Context: holds state + product data
class VendingMachine {
public:
    map<string, double> prices;
    map<string, int>    inventory;
    double              inserted = 0;
    State*              currentState;
    State*              idleState;
    State*              hasMoneyState;

    VendingMachine() {
        idleState     = new IdleState(this);
        hasMoneyState = new HasMoneyState(this);
        currentState  = idleState;
    }

    void addProduct(const string& name, double price, int qty) {
        prices[name] = price; inventory[name] = qty;
    }

    void insertMoney(double a)         { currentState->insertMoney(a); }
    void selectProduct(const string& p){ currentState->selectProduct(p); }
    void setState(State* s)            { currentState = s; }

    void status() {
        cout << "[" << currentState->stateName() << "] $" << inserted << " inserted\\n";
    }
};

// Implement state methods AFTER VendingMachine is fully defined
void IdleState::insertMoney(double amount) {
    vm->inserted += amount;
    cout << "Inserted $" << amount << "\\n";
    vm->setState(vm->hasMoneyState);
}

void HasMoneyState::insertMoney(double amount) {
    vm->inserted += amount;
    cout << "Added $" << amount << ". Total: $" << vm->inserted << "\\n";
}

void HasMoneyState::selectProduct(const string& product) {
    if (vm->prices.find(product) == vm->prices.end()) { cout << "Not found.\\n"; return; }
    if (vm->inventory[product] == 0)                  { cout << "Out of stock.\\n"; return; }
    double price = vm->prices[product];
    if (vm->inserted < price) {
        cout << "Need $" << (price - vm->inserted) << " more.\\n"; return;
    }
    double change = vm->inserted - price;
    vm->inventory[product]--;
    vm->inserted = 0;
    cout << "Dispensing " << product << "!";
    if (change > 0) cout << " Change: $" << change;
    cout << "\\n";
    vm->setState(vm->idleState);
}

int main() {
    VendingMachine vm;
    vm.addProduct("Cola",  1.50, 5);
    vm.addProduct("Chips", 2.00, 3);

    vm.insertMoney(1.00);
    vm.insertMoney(0.75);
    vm.selectProduct("Cola");     // dispenses, $0.25 change

    vm.insertMoney(1.00);
    vm.selectProduct("Chips");    // needs $1.00 more
    vm.insertMoney(1.00);
    vm.selectProduct("Chips");    // dispenses

    vm.selectProduct("Cola");     // blocked: Idle state

    return 0;
}`,
    practicePrompt: `// Implement a Vending Machine using the State Pattern.
//
// States: Idle, HasMoney
//   Idle::insertMoney()         → add to total, transition to HasMoney
//   Idle::selectProduct()       → print "Insert money first"
//   HasMoney::insertMoney()     → add more money
//   HasMoney::selectProduct()   → validate price/stock, dispense, give change, back to Idle
//
// VendingMachine (Context):
//   map<string,double> prices, map<string,int> inventory, double inserted
//   State* currentState, *idleState, *hasMoneyState
//
// IMPORTANT: Forward-declare VendingMachine before State classes.
// Implement state method bodies AFTER VendingMachine is fully defined.

#include <iostream>
#include <map>
#include <string>
using namespace std;

// TODO: forward declare VendingMachine
// TODO: abstract State class
// TODO: IdleState class (method declarations only)
// TODO: HasMoneyState class (method declarations only)
// TODO: VendingMachine class (full definition)
// TODO: State method implementations here

int main() {
    return 0;
}`,
  },

  {
    id: "bank-account",
    title: "Bank Account — Inheritance & Polymorphism",
    difficulty: "easy",
    tags: ["Inheritance", "Polymorphism", "Abstract Class", "Virtual", "LSP"],
    description: `Design a bank account hierarchy demonstrating inheritance and polymorphism.

**Account Types:**
- **SavingsAccount**: must keep a minimum balance (default $100)
- **CheckingAccount**: allows overdraft up to a configured limit (default $500)

**Inheritance Hierarchy:**
\`\`\`
BankAccount (abstract)
├── SavingsAccount   → withdraw() enforces min balance
└── CheckingAccount  → withdraw() allows overdraft
\`\`\`

**Method ownership:**
| Method | Location | Reason |
|---|---|---|
| withdraw() | Each subclass | Different rules |
| deposit()  | Base class | Same for all |
| transfer() | Base class | Calls withdraw + deposit |
| printHistory() | Base class | Shared logic |

**LSP in action:** Code that works with \`BankAccount*\` works equally well with \`SavingsAccount*\` or \`CheckingAccount*\` — the pointer type can be swapped without breaking the caller.`,
    concepts: ["Inheritance", "Polymorphism", "Abstract classes", "LSP", "Virtual functions"],
    filename: "bank.cpp",
    code: `#include <iostream>
#include <vector>
#include <string>
#include <cmath>
using namespace std;

enum class TxType { DEPOSIT, WITHDRAWAL, TRANSFER };

struct Transaction {
    TxType type; double amount; string note;
    Transaction(TxType t, double a, string n) : type(t), amount(a), note(n) {}
};

// Abstract base: defines interface + shared behaviour
class BankAccount {
protected:
    int    accountNo;
    string holder;
    double balance;
    vector<Transaction> history;

public:
    BankAccount(int no, string holder, double init)
        : accountNo(no), holder(holder), balance(init) {}

    virtual bool withdraw(double amount) = 0;   // each subclass has its own rule

    void deposit(double amount) {
        balance += amount;
        history.emplace_back(TxType::DEPOSIT, amount, "Deposit");
        cout << "Deposited $" << amount << ". Balance: $" << balance << "\\n";
    }

    bool transfer(BankAccount* target, double amount) {
        if (!withdraw(amount)) return false;
        target->deposit(amount);
        history.emplace_back(TxType::TRANSFER, amount, "Transfer to " + target->holder);
        return true;
    }

    double getBalance() const { return balance; }

    void printHistory() const {
        cout << "Account #" << accountNo << " (" << holder << "):\\n";
        for (auto& t : history) {
            string k = t.type==TxType::DEPOSIT?"DEP":t.type==TxType::WITHDRAWAL?"WDR":"TXF";
            cout << "  " << k << " $" << t.amount << " — " << t.note << "\\n";
        }
    }

    virtual string accountType() const = 0;
    virtual ~BankAccount() {}
};

// SavingsAccount: enforce minimum balance
class SavingsAccount : public BankAccount {
    double minBalance;
public:
    SavingsAccount(int no, string holder, double init, double minBal = 100)
        : BankAccount(no, holder, init), minBalance(minBal) {}

    bool withdraw(double amount) override {
        if (balance - amount < minBalance) {
            cout << "Savings: minimum balance $" << minBalance << " required.\\n";
            return false;
        }
        balance -= amount;
        history.emplace_back(TxType::WITHDRAWAL, amount, "Withdrawal");
        cout << "Withdrew $" << amount << ". Balance: $" << balance << "\\n";
        return true;
    }

    string accountType() const override { return "Savings"; }
};

// CheckingAccount: allow overdraft up to a limit
class CheckingAccount : public BankAccount {
    double overdraftLimit;
public:
    CheckingAccount(int no, string holder, double init, double limit = 500)
        : BankAccount(no, holder, init), overdraftLimit(limit) {}

    bool withdraw(double amount) override {
        if (balance - amount < -overdraftLimit) {
            cout << "Checking: overdraft limit $" << overdraftLimit << " exceeded.\\n";
            return false;
        }
        balance -= amount;
        history.emplace_back(TxType::WITHDRAWAL, amount, "Withdrawal");
        if (balance < 0) cout << "  Overdrawn by $" << abs(balance) << "\\n";
        cout << "Withdrew $" << amount << ". Balance: $" << balance << "\\n";
        return true;
    }

    string accountType() const override { return "Checking"; }
};

int main() {
    SavingsAccount*  s = new SavingsAccount(1001, "Alice", 1000, 100);
    CheckingAccount* c = new CheckingAccount(2001, "Bob",   500, 300);

    s->deposit(200);
    s->withdraw(900);   // OK: leaves $300 (> min $100)
    s->withdraw(300);   // Fail: would leave $0

    cout << "---\\n";
    c->withdraw(700);   // OK: balance = -$200 (within $300 overdraft)
    c->withdraw(200);   // Fail: would be -$400

    cout << "---\\n";
    s->transfer(c, 500);

    cout << "---\\n";
    s->printHistory();
    c->printHistory();

    return 0;
}`,
    practicePrompt: `// Design a Bank Account hierarchy.
//
// BankAccount (abstract):
//   - protected: accountNo, holder, balance, vector<Transaction> history
//   - virtual bool withdraw(amount) = 0   ← subclasses override
//   - void deposit(amount)               ← shared
//   - bool transfer(target, amount)      ← shared, calls withdraw + deposit
//   - void printHistory()               ← shared
//
// SavingsAccount: withdraw() fails if balance would drop below minBalance
// CheckingAccount: withdraw() allows balance to go negative up to overdraftLimit

#include <iostream>
#include <vector>
#include <string>
using namespace std;

// TODO: Transaction struct

// TODO: Abstract BankAccount class

// TODO: SavingsAccount (min balance rule)

// TODO: CheckingAccount (overdraft rule)

int main() {
    return 0;
}`,
  },

  {
    id: "snake-ladder",
    title: "Snake and Ladder",
    difficulty: "easy",
    tags: ["Game Design", "OOP", "Encapsulation", "Map", "Randomization"],
    description: `Design a Snake and Ladder board game.

**Requirements:**
- Configurable board size (standard: 100 cells)
- Add snakes (head → tail) and ladders (bottom → top)
- Multiple players take turns rolling a dice
- Landing on a snake/ladder triggers an automatic jump
- First player to reach exactly cell 100 wins; overshoot = no move

**Entity Responsibilities:**
| Class | Responsibility |
|---|---|
| **Dice** | Returns random 1–6 |
| **Board** | Stores jumps (both snakes + ladders in one map) |
| **Player** | Tracks name + current position |
| **Game** | Turn loop, win detection |

**One map for both snakes and ladders:**
\`map<int, int> jumps\` — if destination < source it's a snake, if destination > source it's a ladder. Clean and simple.`,
    concepts: ["Encapsulation", "Map for O(1) lookup", "Game loop", "Delegation"],
    filename: "snake_ladder.cpp",
    code: `#include <iostream>
#include <map>
#include <vector>
#include <string>
#include <cstdlib>
using namespace std;

class Dice {
public:
    int roll() { return rand() % 6 + 1; }
};

class Board {
public:
    int           size;
    map<int, int> jumps;    // snakes and ladders share one map

    Board(int size = 100) : size(size) {}

    void addSnake(int head, int tail)   { jumps[head]   = tail; }   // tail < head
    void addLadder(int bottom, int top) { jumps[bottom] = top;  }   // top  > bottom

    int resolve(int pos) const {
        auto it = jumps.find(pos);
        return it != jumps.end() ? it->second : pos;
    }

    bool isSnake(int pos) const {
        auto it = jumps.find(pos);
        return it != jumps.end() && it->second < pos;
    }
    bool isLadder(int pos) const {
        auto it = jumps.find(pos);
        return it != jumps.end() && it->second > pos;
    }
};

class Player {
public:
    string name;
    int    position;
    Player(string name) : name(name), position(0) {}
};

class SnakeLadderGame {
    Board*          board;
    Dice            dice;
    vector<Player*> players;
    int             turn = 0;

public:
    SnakeLadderGame(Board* b) : board(b) { srand(42); }

    void addPlayer(Player* p) { players.push_back(p); }

    bool takeTurn() {
        Player* p    = players[turn];
        int     roll = dice.roll();
        int     newPos = p->position + roll;

        cout << p->name << " rolls " << roll;

        if (newPos > board->size) {
            cout << " — overshoot, stays at " << p->position << "\\n";
        } else {
            int final = board->resolve(newPos);
            if (board->isLadder(newPos))
                cout << " → " << newPos << "  Ladder! → " << final;
            else if (board->isSnake(newPos))
                cout << " → " << newPos << "  Snake!  → " << final;
            else
                cout << " → " << final;
            p->position = final;
            cout << "\\n";
        }

        if (p->position == board->size) {
            cout << p->name << " WINS!\\n"; return true;
        }
        turn = (turn + 1) % players.size();
        return false;
    }

    void play() {
        cout << "Game starts!\\n\\n";
        for (int i = 0; i < 300; i++)
            if (takeTurn()) return;
    }
};

int main() {
    Board* board = new Board(100);
    board->addSnake(97, 78);  board->addSnake(54, 34);
    board->addSnake(40, 3);   board->addSnake(74, 53);
    board->addLadder(6, 25);  board->addLadder(11, 40);
    board->addLadder(60, 85); board->addLadder(46, 90);

    SnakeLadderGame game(board);
    game.addPlayer(new Player("Alice"));
    game.addPlayer(new Player("Bob"));
    game.play();
    return 0;
}`,
    practicePrompt: `// Design Snake and Ladder.
//
// Dice: roll() → 1-6
// Board: size, map<int,int> jumps
//   - addSnake(head, tail)    — tail < head
//   - addLadder(bottom, top)  — top > bottom
//   - resolve(pos)            — return jump destination or pos
// Player: name, position (starts 0)
// Game: vector<Player*>, Dice, Board*
//   - takeTurn() → roll, move, apply jumps, check win; return true if won
//   - play()     → loop until someone wins

#include <iostream>
#include <map>
#include <vector>
#include <string>
#include <cstdlib>
using namespace std;

// TODO: Dice class
// TODO: Board class
// TODO: Player class
// TODO: SnakeLadderGame class

int main() {
    return 0;
}`,
  },

  {
    id: "hotel-management",
    title: "Hotel Management System",
    difficulty: "medium",
    tags: ["OOP", "SRP", "Resource Management", "Enum", "CRUD"],
    description: `Design a hotel system to manage room reservations.

**Requirements:**
- Rooms have a type (SINGLE, DOUBLE, SUITE) and nightly rate
- Check-in auto-assigns the first available room of the requested type
- Check-out frees the room and prints the total bill
- Room status: AVAILABLE, OCCUPIED, MAINTENANCE

**Entity Responsibilities (SRP):**
| Class | Responsibility |
|---|---|
| **Room** | type, status, pricePerNight |
| **Guest** | id, name, contact |
| **Reservation** | guest + room + nights + totalCost |
| **Hotel** | findRoom, checkIn, checkOut, listRooms |

**Key Decisions:**
- \`Reservation\` calculates \`totalCost\` in its constructor (single place)
- Hotel controls room status transitions (AVAILABLE ↔ OCCUPIED)
- \`findAvailableRoom(type)\` encapsulates the search logic`,
    concepts: ["SRP", "Encapsulation", "Enum states", "Resource allocation"],
    filename: "hotel.cpp",
    code: `#include <iostream>
#include <vector>
#include <map>
#include <string>
using namespace std;

enum class RoomType   { SINGLE, DOUBLE, SUITE };
enum class RoomStatus { AVAILABLE, OCCUPIED, MAINTENANCE };

class Room {
public:
    int number; RoomType type; RoomStatus status; double pricePerNight;
    Room(int n, RoomType t, double p) : number(n), type(t), status(RoomStatus::AVAILABLE), pricePerNight(p) {}
    bool isAvailable() const { return status == RoomStatus::AVAILABLE; }
    string typeName() const {
        return type==RoomType::SINGLE?"Single":type==RoomType::DOUBLE?"Double":"Suite";
    }
};

class Guest {
public:
    int id; string name, contact;
    Guest(int id, string name, string contact) : id(id), name(name), contact(contact) {}
};

class Reservation {
public:
    int id; Guest* guest; Room* room; int nights; double totalCost;
    Reservation(int id, Guest* g, Room* r, int n)
        : id(id), guest(g), room(r), nights(n), totalCost(n * r->pricePerNight) {}
};

class Hotel {
    vector<Room*>        rooms;
    map<int, Guest*>     guests;
    vector<Reservation*> reservations;
    int                  resCounter = 0;

public:
    void addRoom(Room* r)   { rooms.push_back(r); }
    void addGuest(Guest* g) { guests[g->id] = g; }

    Room* findAvailableRoom(RoomType type) {
        for (auto r : rooms) if (r->type==type && r->isAvailable()) return r;
        return nullptr;
    }

    Reservation* checkIn(int guestId, RoomType type, int nights) {
        auto it = guests.find(guestId);
        if (it == guests.end()) { cout << "Guest not found.\\n"; return nullptr; }
        Room* room = findAvailableRoom(type);
        if (!room) { cout << "No " << (type==RoomType::SINGLE?"Single":"Double") << " room available.\\n"; return nullptr; }
        room->status = RoomStatus::OCCUPIED;
        auto* res = new Reservation(++resCounter, it->second, room, nights);
        reservations.push_back(res);
        cout << "Checked in: " << it->second->name << " → Room " << room->number
             << " (" << room->typeName() << ") x" << nights << " nights. Total: $" << res->totalCost << "\\n";
        return res;
    }

    void checkOut(int resId) {
        for (auto res : reservations) {
            if (res->id == resId) {
                res->room->status = RoomStatus::AVAILABLE;
                cout << "Checked out: " << res->guest->name << " from Room " << res->room->number
                     << ". Charge: $" << res->totalCost << "\\n";
                return;
            }
        }
        cout << "Reservation #" << resId << " not found.\\n";
    }

    void listRooms() const {
        for (auto r : rooms)
            cout << "  Room " << r->number << " (" << r->typeName() << ") "
                 << (r->isAvailable()?"Available":"Occupied") << " $" << r->pricePerNight << "/night\\n";
    }
};

int main() {
    Hotel hotel;
    hotel.addRoom(new Room(101, RoomType::SINGLE, 80));
    hotel.addRoom(new Room(102, RoomType::SINGLE, 80));
    hotel.addRoom(new Room(201, RoomType::DOUBLE, 150));
    hotel.addRoom(new Room(301, RoomType::SUITE,  350));
    hotel.addGuest(new Guest(1, "Alice", "alice@example.com"));
    hotel.addGuest(new Guest(2, "Bob",   "bob@example.com"));

    hotel.listRooms();  cout << "---\\n";
    auto* r1 = hotel.checkIn(1, RoomType::SINGLE, 3);
    auto* r2 = hotel.checkIn(2, RoomType::DOUBLE, 2);
    hotel.listRooms();  cout << "---\\n";
    hotel.checkOut(r1->id);
    hotel.listRooms();
    return 0;
}`,
    practicePrompt: `// Design a Hotel Management System.
//
// RoomType: SINGLE, DOUBLE, SUITE
// RoomStatus: AVAILABLE, OCCUPIED, MAINTENANCE
//
// Room: number, type, status, pricePerNight
//   - isAvailable() → status == AVAILABLE
// Guest: id, name, contact
// Reservation: id, guest*, room*, nights
//   - totalCost = nights * pricePerNight (set in constructor)
// Hotel: vector<Room*>, map<id,Guest*>, vector<Reservation*>
//   - checkIn(guestId, type, nights) → find room, set OCCUPIED, return Reservation*
//   - checkOut(reservationId)        → set AVAILABLE, print bill
//   - listRooms()                    → print all with status

#include <iostream>
#include <vector>
#include <map>
#include <string>
using namespace std;

// TODO: enums, Room, Guest, Reservation, Hotel

int main() {
    return 0;
}`,
  },

  {
    id: "observer-pattern",
    title: "Observer Pattern — Order Notifications",
    difficulty: "medium",
    tags: ["Observer Pattern", "Design Pattern", "OCP", "DIP", "Decoupling"],
    description: `Implement the Observer (Pub-Sub) pattern for an order notification system.

**Requirements:**
- Order events: ORDER_PLACED, ORDER_SHIPPED, ORDER_DELIVERED
- Observer types: Email, SMS, Push Notification
- Observers can subscribe/unsubscribe at runtime
- OrderSystem broadcasts without knowing observer types

**Pattern Structure:**
\`\`\`
Subject (interface)         Observer (interface)
  subscribe(obs)              update(event, data)
  unsubscribe(obs)
  notify(event, data)
       │
  OrderSystem              EmailNotifier
  (concrete subject)       SMSNotifier
                           PushNotifier
\`\`\`

**Why Observer over direct calls?**
Without it, \`OrderSystem\` would need a reference to every channel and call them one by one — tightly coupled. Observer inverts the dependency: channels register themselves and the system broadcasts blindly (OCP + DIP).`,
    concepts: ["Observer pattern", "OCP", "DIP", "Interface", "Loose coupling"],
    filename: "observer.cpp",
    code: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

// Observer interface
class Observer {
public:
    virtual void update(const string& event, const string& data) = 0;
    virtual string observerId() const = 0;
    virtual ~Observer() {}
};

// Subject interface
class Subject {
public:
    virtual void subscribe(Observer* obs)   = 0;
    virtual void unsubscribe(Observer* obs) = 0;
    virtual void notify(const string& event, const string& data) = 0;
    virtual ~Subject() {}
};

// Concrete observers — each handles the event its own way
class EmailNotifier : public Observer {
    string email;
public:
    EmailNotifier(string email) : email(email) {}
    void update(const string& event, const string& data) override {
        cout << "  [EMAIL → " << email << "] " << event << ": " << data << "\\n";
    }
    string observerId() const override { return "email:" + email; }
};

class SMSNotifier : public Observer {
    string phone;
public:
    SMSNotifier(string phone) : phone(phone) {}
    void update(const string& event, const string& data) override {
        cout << "  [SMS  → " << phone << "] " << event << ": " << data << "\\n";
    }
    string observerId() const override { return "sms:" + phone; }
};

class PushNotifier : public Observer {
    string token;
public:
    PushNotifier(string token) : token(token) {}
    void update(const string& event, const string& data) override {
        cout << "  [PUSH → " << token.substr(0,8) << "...] " << event << ": " << data << "\\n";
    }
    string observerId() const override { return "push:" + token.substr(0,8); }
};

// Concrete subject — broadcasts without knowing observer types
class OrderSystem : public Subject {
    vector<Observer*> observers;
    int               counter = 0;

public:
    void subscribe(Observer* obs) override {
        observers.push_back(obs);
        cout << obs->observerId() << " subscribed\\n";
    }

    void unsubscribe(Observer* obs) override {
        observers.erase(remove(observers.begin(), observers.end(), obs), observers.end());
        cout << obs->observerId() << " unsubscribed\\n";
    }

    void notify(const string& event, const string& data) override {
        for (auto obs : observers) obs->update(event, data);
    }

    void placeOrder(const string& item, int qty) {
        int id = ++counter;
        cout << "\\n[ORDER #" << id << " — " << item << " x" << qty << "]\\n";
        notify("ORDER_PLACED", "Order #" + to_string(id) + ": " + item + " x" + to_string(qty));
    }

    void shipOrder(int id) {
        cout << "\\n[ORDER #" << id << " shipped]\\n";
        notify("ORDER_SHIPPED", "Order #" + to_string(id) + " is on its way");
    }

    void deliverOrder(int id) {
        cout << "\\n[ORDER #" << id << " delivered]\\n";
        notify("ORDER_DELIVERED", "Order #" + to_string(id) + " has arrived");
    }
};

int main() {
    OrderSystem orders;

    EmailNotifier* email = new EmailNotifier("alice@example.com");
    SMSNotifier*   sms   = new SMSNotifier("+1-555-0100");
    PushNotifier*  push  = new PushNotifier("device_token_abc123xyz");

    orders.subscribe(email);
    orders.subscribe(sms);
    orders.subscribe(push);

    orders.placeOrder("MacBook Pro", 1);   // all 3 notified

    orders.unsubscribe(sms);               // Bob opts out of SMS

    orders.shipOrder(1);                   // only email + push
    orders.deliverOrder(1);                // only email + push

    return 0;
}`,
    practicePrompt: `// Implement the Observer (Pub-Sub) Pattern.
//
// Observer (interface):
//   - update(event, data) → pure virtual
//   - observerId()        → string (for logging)
//
// Subject (interface):
//   - subscribe(obs), unsubscribe(obs)
//   - notify(event, data) → loop through all observers
//
// Concrete observers: EmailNotifier, SMSNotifier, PushNotifier
//   Each prints its own formatted message.
//
// Concrete subject: OrderSystem
//   - subscribe/unsubscribe/notify (store in vector<Observer*>)
//   - placeOrder(item, qty)   → notify("ORDER_PLACED", ...)
//   - shipOrder(orderId)      → notify("ORDER_SHIPPED", ...)
//   - deliverOrder(orderId)   → notify("ORDER_DELIVERED", ...)
//
// Key: OrderSystem never calls EmailNotifier directly.
//      It calls notify() — observers respond polymorphically.

#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

// TODO: Observer interface
// TODO: Subject interface
// TODO: EmailNotifier, SMSNotifier, PushNotifier
// TODO: OrderSystem

int main() {
    // Subscribe all 3 → placeOrder → unsubscribe SMS → shipOrder
    return 0;
}`,
  },
];
