import type { Difficulty } from "./types";
import { EXTRA_OOD_PROBLEMS } from "./ood-extra-problems";

export type { Difficulty };

export interface OODProblem {
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

// ── C++ code embedded from local files ──────────────────────────────────────

const BOOKMYSHOW_CODE = `#include <iostream>
#include <vector>
#include <string>
using namespace std;

enum class SeatType { NORMAL, PREMIUM };

// Abstraction: Movie entity
class Movie {
public:
    int id;
    string name;
    Movie(int id, string name) : id(id), name(name) {}
};

// Encapsulation: Seat manages booking state
class Seat {
public:
    int id;
    SeatType type;
    bool isBooked;

    Seat(int id, SeatType type) : id(id), type(type), isBooked(false) {}

    bool isAvailable() { return !isBooked; }
    void book() { isBooked = true; }
};

// Abstraction: Show = movie + seats
class Show {
public:
    int id;
    Movie* movie;
    vector<Seat*> seats;

    Show(int id, Movie* movie, vector<Seat*> seats)
        : id(id), movie(movie), seats(seats) {}
};

// Booking entity
class Booking {
public:
    int id;
    Show* show;
    vector<Seat*> seats;

    Booking(int id, Show* show, vector<Seat*> seats)
        : id(id), show(show), seats(seats) {}
};

// Manager class (handles business logic)
class BookingSystem {
private:
    int bookingCounter = 0;  // Encapsulation: controlled ID generation

public:
    // Abstraction: hides seat validation logic
    bool checkAvailability(Show* show, vector<int> seatIds) {
        for (int id : seatIds) {
            if (!show->seats[id]->isAvailable()) return false;
        }
        return true;
    }

    Booking* bookSeats(Show* show, vector<int> seatIds) {
        if (!checkAvailability(show, seatIds)) return nullptr;

        vector<Seat*> selected;
        for (int id : seatIds) {
            Seat* seat = show->seats[id];
            seat->book();
            selected.push_back(seat);
        }
        return new Booking(++bookingCounter, show, selected);
    }
};

int main() {
    Movie* movie = new Movie(1, "Inception");

    vector<Seat*> seats;
    for (int i = 0; i < 5; i++)
        seats.push_back(new Seat(i, SeatType::NORMAL));

    Show* show = new Show(1, movie, seats);
    BookingSystem system;

    // Book seats [1,2]
    Booking* b1 = system.bookSeats(show, {1, 2});
    if (b1) cout << "Booking ID: " << b1->id << endl;

    // Try same seats again (should fail)
    Booking* b2 = system.bookSeats(show, {1, 2});
    if (!b2) cout << "Booking failed (already booked)" << endl;

    // Book different seats [3,4]
    Booking* b3 = system.bookSeats(show, {3, 4});
    if (b3) cout << "Booking ID: " << b3->id << endl;

    return 0;
}`;

const ELEVATOR_CODE = `#include <iostream>
#include <vector>
#include <queue>
#include <cmath>
using namespace std;

enum Direction { UP, DOWN, IDLE };

class Request {
public:
    int floor;
    Direction direction;
    Request(int floor, Direction direction) : floor(floor), direction(direction) {}
};

// Elevator class — encapsulates state + movement
class Elevator {
public:
    int id;
    int currentFloor;
    Direction direction;
    queue<int> requests;

    Elevator(int id) : id(id), currentFloor(0), direction(IDLE) {}

    void addRequest(int floor) { requests.push(floor); }

    void move() {
        if (requests.empty()) { direction = IDLE; return; }

        int target = requests.front();

        if (currentFloor < target)      { currentFloor++; direction = UP; }
        else if (currentFloor > target) { currentFloor--; direction = DOWN; }
        else                             { requests.pop(); }  // reached target
    }
};

// ElevatorSystem — orchestrator
class ElevatorSystem {
private:
    vector<Elevator*> elevators;

public:
    ElevatorSystem(int n) {
        for (int i = 0; i < n; i++)
            elevators.push_back(new Elevator(i));
    }

    Elevator* findBestElevator(int floor, Direction dir) {
        Elevator* best = nullptr;
        int minDist = 1e9;

        // Prefer same direction or idle elevator
        for (auto e : elevators) {
            int dist = abs(e->currentFloor - floor);
            if ((e->direction == dir || e->direction == IDLE) && dist < minDist) {
                minDist = dist;
                best = e;
            }
        }

        // Fallback: nearest elevator
        if (!best) {
            for (auto e : elevators) {
                int dist = abs(e->currentFloor - floor);
                if (dist < minDist) { minDist = dist; best = e; }
            }
        }
        return best;
    }

    void requestElevator(int floor, Direction dir) {
        Elevator* e = findBestElevator(floor, dir);
        if (e) {
            e->addRequest(floor);
            cout << "Assigned Elevator " << e->id << " to floor " << floor << endl;
        }
    }

    void step() {
        for (auto e : elevators) {
            e->move();
            cout << "Elevator " << e->id << " at floor " << e->currentFloor << endl;
        }
        cout << "----" << endl;
    }
};

int main() {
    ElevatorSystem system(4);

    system.requestElevator(3, UP);
    system.requestElevator(7, DOWN);

    for (int i = 0; i < 10; i++) system.step();

    return 0;
}`;

const PARKING_V1_CODE = `#include <iostream>
#include <vector>
#include <string>
#include <ctime>
#include <cmath>
using namespace std;

// SOLID PRINCIPLES DEMO
// SRP  = Single Responsibility Principle
// OCP  = Open-Closed Principle
// LSP  = Liskov Substitution Principle
// ISP  = Interface Segregation Principle
// DIP  = Dependency Inversion Principle

enum class VehicleType { BIKE, CAR, TRUCK };
enum class SpotType    { BIKE, CAR, TRUCK };

// SRP: holds only vehicle data, no parking logic
class Vehicle {
private:
    string number;
    VehicleType type;
public:
    Vehicle(string number, VehicleType type) : number(number), type(type) {}
    VehicleType getType() const { return type; }
    string getNumber() const    { return number; }
};

// Abstraction + OCP: abstract base for all spot types
// New spot types extend this without modifying ParkingLot
class ParkingSpot {
protected:
    SpotType type;
    bool isFree;
    int id;
public:
    ParkingSpot(SpotType type, int id) : type(type), isFree(true), id(id) {}

    virtual bool canFitVehicle(VehicleType vehicleType) = 0;

    bool isAvailable() const { return isFree; }
    void occupy()   { isFree = false; }
    void freeSpace(){ isFree = true;  }

    virtual ~ParkingSpot() {}
};

// OCP: concrete class — extends without modifying parent
class CarSpot : public ParkingSpot {
public:
    CarSpot(int id) : ParkingSpot(SpotType::CAR, id) {}

    bool canFitVehicle(VehicleType vehicleType) override {
        return vehicleType == VehicleType::CAR;
    }
};

// SRP: represents a parking session only
class Ticket {
private:
    int ticketId;
    time_t entryTime;
    ParkingSpot* spot;
    Vehicle* vehicle;
public:
    Ticket(int ticketId, Vehicle* vehicle, ParkingSpot* spot)
        : ticketId(ticketId), vehicle(vehicle), spot(spot) {
        entryTime = time(nullptr);
    }
    time_t getEntryTime() const { return entryTime; }
    ParkingSpot* getSpot() const { return spot; }
};

// SRP: isolated pricing — changes here don't affect ParkingLot
class FeeCalculator {
public:
    static double calculate(time_t entryTime, time_t exitTime) {
        double hours = difftime(exitTime, entryTime) / 3600;
        return ceil(hours) * 50;  // ₹50 per hour
    }
};

// SRP: manages spots within a single floor
class ParkingFloor {
private:
    vector<ParkingSpot*> spots;
public:
    ParkingFloor(const vector<ParkingSpot*>& spots) : spots(spots) {}

    ParkingSpot* getAvailableSpot(VehicleType type) {
        for (auto spot : spots)
            if (spot->isAvailable() && spot->canFitVehicle(type))
                return spot;
        return nullptr;
    }
};

// DIP: depends on ParkingSpot abstraction, not concrete types
class ParkingLot {
private:
    vector<ParkingFloor*> floors;
    int ticketCounter;
public:
    ParkingLot(const vector<ParkingFloor*>& floors)
        : floors(floors), ticketCounter(0) {}

    Ticket* parkVehicle(Vehicle* vehicle) {
        for (auto floor : floors) {
            ParkingSpot* spot = floor->getAvailableSpot(vehicle->getType());
            if (spot) {
                spot->occupy();
                return new Ticket(++ticketCounter, vehicle, spot);
            }
        }
        return nullptr;  // full
    }

    double unparkVehicle(Ticket* ticket) {
        time_t exitTime = time(nullptr);
        double fee = FeeCalculator::calculate(ticket->getEntryTime(), exitTime);
        ticket->getSpot()->freeSpace();
        return fee;
    }
};`;

const PARKING_V2_CODE = `#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <cmath>
using namespace std;

enum class VehicleType { BIKE, CAR, TRUCK };
enum class SpotType    { SMALL, MEDIUM, LARGE };

class Vehicle {
public:
    string license;
    VehicleType type;
    Vehicle(string license, VehicleType type) : license(license), type(type) {}
};

// Encapsulation: ParkingSpot manages its own state
class ParkingSpot {
public:
    int id;
    SpotType type;
    bool isOccupied;
    Vehicle* vehicle;

    ParkingSpot(int id, SpotType type)
        : id(id), type(type), isOccupied(false), vehicle(nullptr) {}

    // Fitting logic: bike fits anywhere, car needs medium+, truck needs large
    bool canFit(VehicleType vType) {
        if (vType == VehicleType::BIKE)  return true;
        if (vType == VehicleType::CAR)   return type != SpotType::SMALL;
        if (vType == VehicleType::TRUCK) return type == SpotType::LARGE;
        return false;
    }

    void park(Vehicle* v)  { vehicle = v; isOccupied = true;  }
    void unpark()          { vehicle = nullptr; isOccupied = false; }
};

// Ticket = vehicle ↔ spot link
class Ticket {
public:
    int id;
    Vehicle* vehicle;
    ParkingSpot* spot;
    Ticket(int id, Vehicle* v, ParkingSpot* s) : id(id), vehicle(v), spot(s) {}
};

// Each floor manages its own spots
class Floor {
public:
    int id;
    vector<ParkingSpot*> spots;

    Floor(int id, vector<ParkingSpot*> spots) : id(id), spots(spots) {}

    ParkingSpot* findSpot(VehicleType type) {
        for (auto spot : spots)
            if (!spot->isOccupied && spot->canFit(type))
                return spot;
        return nullptr;
    }
};

class ParkingLot {
private:
    vector<Floor*> floors;
    int ticketCounter = 0;
public:
    ParkingLot(vector<Floor*> floors) : floors(floors) {}

    Ticket* parkVehicle(Vehicle* v) {
        for (auto floor : floors) {
            ParkingSpot* spot = floor->findSpot(v->type);
            if (spot) { spot->park(v); return new Ticket(++ticketCounter, v, spot); }
        }
        return nullptr;
    }

    void unparkVehicle(Ticket* t) {
        if (t && t->spot) t->spot->unpark();
    }
};

int main() {
    vector<ParkingSpot*> f1spots = {
        new ParkingSpot(1, SpotType::SMALL),
        new ParkingSpot(2, SpotType::MEDIUM)
    };
    vector<ParkingSpot*> f2spots = {
        new ParkingSpot(3, SpotType::LARGE),
        new ParkingSpot(4, SpotType::MEDIUM)
    };

    ParkingLot lot({ new Floor(1, f1spots), new Floor(2, f2spots) });

    Vehicle* v1 = new Vehicle("DL01AA1234", VehicleType::BIKE);
    Vehicle* v2 = new Vehicle("DL02BB5678", VehicleType::CAR);
    Vehicle* v3 = new Vehicle("DL03CC9999", VehicleType::TRUCK);

    Ticket* t1 = lot.parkVehicle(v1);
    if (t1) cout << "Bike parked. Ticket: " << t1->id << endl;

    Ticket* t2 = lot.parkVehicle(v2);
    if (t2) cout << "Car parked. Ticket: "  << t2->id << endl;

    Ticket* t3 = lot.parkVehicle(v3);
    if (t3) cout << "Truck parked. Ticket: " << t3->id << endl;

    cout << "\\nUnparking car (ticket " << t2->id << ")..." << endl;
    lot.unparkVehicle(t2);

    Vehicle* v4 = new Vehicle("DL04DD0001", VehicleType::CAR);
    Ticket* t4 = lot.parkVehicle(v4);
    if (t4) cout << "New car parked. Ticket: " << t4->id << endl;

    return 0;
}`;

// ── Problem definitions ──────────────────────────────────────────────────────

export const OOD_PROBLEMS: OODProblem[] = [
  {
    id: "bookmyshow",
    title: "BookMyShow — Movie Ticket Booking",
    difficulty: "medium",
    tags: ["OOP", "Encapsulation", "Abstraction", "Booking System"],
    description: `Design a movie ticket booking system like BookMyShow.

**Requirements:**
- Movies have shows, each show has a set of seats
- Seats can be Normal or Premium
- Users can book multiple seats in one request
- Booking should fail if any requested seat is already taken
- Each booking gets a unique incremental ID

**Key Design Decisions:**
- \`Seat\` encapsulates its own booking state (isBooked)
- \`BookingSystem\` handles validation and coordination
- \`Show\` links a movie to a seat inventory
- Abstraction: callers only interact with \`bookSeats()\`, not seat internals`,
    concepts: ["Encapsulation", "Abstraction", "SRP", "Entity modeling"],
    filename: "bookmyshow.cpp",
    code: BOOKMYSHOW_CODE,
    practicePrompt: `// Implement a movie ticket booking system.
// Requirements:
// - Movie has: id, name
// - Seat has: id, type (NORMAL/PREMIUM), isBooked
// - Show links a Movie to a vector<Seat*>
// - Booking has: id, show, vector of booked seats
// - BookingSystem::bookSeats(show, seatIds) returns Booking* or nullptr

#include <iostream>
#include <vector>
#include <string>
using namespace std;

// TODO: Define SeatType enum

// TODO: Implement Movie class

// TODO: Implement Seat class (encapsulate booking state)

// TODO: Implement Show class

// TODO: Implement Booking class

// TODO: Implement BookingSystem class

int main() {
    // Test your implementation here
    return 0;
}`,
  },
  {
    id: "elevator",
    title: "Elevator System",
    difficulty: "hard",
    tags: ["OOP", "State Machine", "Queue", "Dispatch Algorithm"],
    description: `Design an elevator management system for a multi-floor building.

**Requirements:**
- Multiple elevators in a building
- External requests: floor + direction (UP/DOWN)
- System assigns best elevator to each request
- Elevator moves one floor per step (simplified simulation)
- Movement is driven by a pending request queue

**Key Design Decisions:**
- \`Elevator\` encapsulates its own floor/direction/queue state
- \`ElevatorSystem\` acts as the orchestrator/dispatcher
- Best elevator selection: prefer same-direction or IDLE elevators
- Fallback: nearest elevator by absolute distance`,
    concepts: ["Encapsulation", "State machine", "Dispatch algorithm", "Queue"],
    filename: "Elevtor.cpp",
    code: ELEVATOR_CODE,
    practicePrompt: `// Implement an elevator management system.
// Requirements:
// - Direction enum: UP, DOWN, IDLE
// - Elevator: id, currentFloor, direction, queue<int> requests
//   - addRequest(floor): adds a floor to pending queue
//   - move(): advances one step toward next pending floor
// - ElevatorSystem: manages N elevators
//   - requestElevator(floor, dir): finds best elevator and assigns
//   - step(): moves all elevators one step
// - Assignment strategy: prefer same-direction/IDLE, then nearest

#include <iostream>
#include <vector>
#include <queue>
#include <cmath>
using namespace std;

// TODO: Define Direction enum

// TODO: Implement Elevator class

// TODO: Implement ElevatorSystem class

int main() {
    // Test: create 4 elevators, make 2 requests, simulate 10 steps
    return 0;
}`,
  },
  {
    id: "parking-solid",
    title: "Parking Lot — SOLID Principles",
    difficulty: "medium",
    tags: ["SOLID", "OCP", "SRP", "DIP", "Abstraction", "Polymorphism"],
    description: `Design a parking lot system applying all SOLID principles.

**Requirements:**
- Multiple floors, each with multiple parking spots
- Spots are typed (BIKE, CAR, TRUCK)
- Vehicles park and unpark with a ticket
- Fee is calculated based on duration (₹50/hour)

**SOLID Breakdown:**
| Principle | Applied Where |
|---|---|
| **SRP** | Vehicle holds data only, FeeCalculator handles pricing |
| **OCP** | New spot types extend \`ParkingSpot\` without modifying \`ParkingLot\` |
| **LSP** | \`CarSpot\` substitutes \`ParkingSpot\` everywhere |
| **DIP** | \`ParkingLot\` depends on \`ParkingSpot\` abstraction, not \`CarSpot\` |`,
    concepts: ["SRP", "OCP", "LSP", "DIP", "Abstract classes", "Virtual functions"],
    filename: "parking.cpp",
    code: PARKING_V1_CODE,
    practicePrompt: `// Implement a parking lot with SOLID principles.
// Requirements:
// - VehicleType enum: BIKE, CAR, TRUCK
// - Vehicle: license, type — only data, no logic (SRP)
// - ParkingSpot (abstract): pure virtual canFitVehicle()
// - CarSpot extends ParkingSpot (OCP)
// - Ticket: links vehicle + spot + entry time (SRP)
// - FeeCalculator: static calculate() — isolated pricing (SRP)
// - ParkingFloor: finds available spot on one floor (SRP)
// - ParkingLot: depends on ParkingSpot abstraction (DIP)

#include <iostream>
#include <vector>
#include <ctime>
#include <cmath>
using namespace std;

// TODO: VehicleType and SpotType enums

// TODO: Vehicle class (SRP — data only)

// TODO: Abstract ParkingSpot class

// TODO: CarSpot extends ParkingSpot (OCP)

// TODO: Ticket class (SRP)

// TODO: FeeCalculator (SRP — isolated pricing)

// TODO: ParkingFloor (SRP)

// TODO: ParkingLot (DIP — depends on abstraction)

int main() {
    return 0;
}`,
  },
  {
    id: "parking-clean",
    title: "Parking Lot — Clean OOP",
    difficulty: "easy",
    tags: ["OOP", "Encapsulation", "Multi-floor", "Flex sizing"],
    description: `A cleaner, simpler version of the parking lot design.

**What's Different from v1:**
- Spot types: SMALL / MEDIUM / LARGE (more flexible)
- Fitting rules: Bike fits anywhere, Car needs Medium+, Truck needs Large
- No abstract base class — simpler, more direct
- Floor class delegates spot-finding to itself
- Demonstrates clean OOP without over-engineering

**Good for:** Understanding the difference between when to use polymorphism vs. simpler encapsulation.`,
    concepts: ["Encapsulation", "Multi-floor", "Delegation pattern", "Simple fitting rules"],
    filename: "parking2.cpp",
    code: PARKING_V2_CODE,
    practicePrompt: `// Implement a clean, simple parking lot.
// SpotType: SMALL, MEDIUM, LARGE
// Fitting: bike→any, car→medium+, truck→large only
// No abstract classes — keep it simple.

#include <iostream>
#include <vector>
#include <string>
using namespace std;

// TODO: VehicleType and SpotType enums

// TODO: Vehicle class

// TODO: ParkingSpot class with canFit() logic

// TODO: Ticket class

// TODO: Floor class with findSpot()

// TODO: ParkingLot class

int main() {
    // Create 2 floors, park a bike, car, truck
    // Unpark one, park another car
    return 0;
}`,
  },
];

// Merge local C++ files + standard OOP problems
export const ALL_OOD_PROBLEMS: OODProblem[] = [
  ...OOD_PROBLEMS,
  ...EXTRA_OOD_PROBLEMS,
];
