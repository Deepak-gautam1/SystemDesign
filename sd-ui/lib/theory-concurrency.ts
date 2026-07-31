import type { TheoryTopic } from "./types";

export const CONCURRENCY_TOPICS: TheoryTopic[] = [
  {
    id: "concurrency-basics",
    title: "Concurrency Basics",
    oneLiner: "Concurrency vs parallelism, processes vs threads, thread lifecycle, and race conditions.",
    content: `## Concurrency vs Parallelism
**Concurrency** is about *structure*: dealing with multiple tasks that are in progress at overlapping times, even on a single CPU core, by rapidly switching between them (interleaving). **Parallelism** is about *execution*: multiple tasks physically running at the exact same instant, which requires multiple cores. A single-core machine can be concurrent (juggling many threads) but never truly parallel. A well-known framing: concurrency is about *dealing with* many things at once; parallelism is about *doing* many things at once.

## Processes vs Threads
A **process** is an independently running program with its own isolated memory space — one process can't directly read another's memory. A **thread** is a unit of execution *within* a process; all threads in the same process share that process's memory (heap, global variables), but each thread has its own stack and instruction pointer. This shared memory is exactly what makes threads lightweight and fast to communicate through — and exactly what makes them dangerous without synchronization.

## Thread Lifecycle and States
A thread typically moves through: **New** (created, not yet started) → **Runnable** (ready to run, waiting for CPU time) → **Running** (actually executing on a core) → **Blocked/Waiting** (paused — waiting on a lock, I/O, or a signal) → **Terminated** (finished execution). A thread can cycle between Runnable, Running, and Blocked many times before reaching Terminated.

## Race Conditions and Critical Sections
A **race condition** occurs when two or more threads access shared data concurrently, and at least one of them writes to it, with the final outcome depending on the unpredictable timing of which thread "wins" the race. The section of code that accesses shared data and must not be entered by more than one thread at a time is called a **critical section**. The entire point of the synchronization primitives in the next topic is to protect critical sections from concurrent access.`,
    codeLabel: "race_condition.cpp",
    code: `int counter = 0;   // shared state — no protection

void incrementUnsafe() {
    for (int i = 0; i < 100000; i++) {
        counter++;   // NOT atomic: read counter, add 1, write counter —
                     // three separate steps another thread can interleave with
    }
}

int main() {
    thread t1(incrementUnsafe);
    thread t2(incrementUnsafe);
    t1.join(); t2.join();

    // Expected: 200000. Actual: usually LESS — a classic race condition.
    // Both threads read the same value of counter before either writes
    // back the incremented result, so some increments are silently lost.
    cout << counter << "\\n";
}

// This exact "read-modify-write" gap on shared state is what mutexes,
// atomics, and every other synchronization primitive exist to close.`,
  },

  {
    id: "synchronization-primitives",
    title: "Synchronization Primitives",
    oneLiner: "Mutexes, semaphores, condition variables, locking granularity, and atomics.",
    content: `## Mutex (Mutual Exclusion)
A **mutex** allows only one thread to hold it at a time — any other thread trying to lock it blocks until the current holder releases it. It's the standard tool for protecting a critical section: lock before touching shared state, unlock after. In modern C++, prefer a scoped lock_guard or unique_lock over manual lock()/unlock() calls, so the mutex is automatically released even if an exception is thrown.

## Semaphores
A **semaphore** maintains an internal counter and allows up to N threads to proceed simultaneously, where N is set at creation. A **binary semaphore** (count of 1) behaves similarly to a mutex but, unlike most mutex implementations, can be signaled by a *different* thread than the one that acquired it — making it suited to signaling between threads, not just mutual exclusion. A **counting semaphore** is ideal for limiting concurrent access to a pool of N identical resources (e.g. at most 5 concurrent database connections).

## Condition Variables
A **condition variable** lets a thread sleep until another thread notifies it that some condition may now be true (e.g. "the queue is no longer empty") — avoiding wasteful busy-waiting (spinning in a loop repeatedly checking a flag). It's always used together with a mutex: the waiting thread holds the mutex, calls wait() (which atomically releases the mutex and sleeps), and wakes up when notified, re-acquiring the mutex before continuing.

## Coarse-grained vs Fine-grained Locking
**Coarse-grained locking** protects a large section of code (or an entire data structure) with a single lock — simple to reason about, but limits concurrency, since unrelated operations block each other unnecessarily. **Fine-grained locking** uses multiple, smaller locks (e.g. one lock per bucket in a hash map instead of one lock for the whole map) — allows much higher concurrency, at the cost of significantly more complexity and higher risk of deadlocks if locks aren't acquired in a consistent order.

## Reentrant Locks
A standard mutex deadlocks if the *same* thread tries to lock it twice (e.g. a recursive function locking on every call). A **reentrant (recursive) lock** tracks which thread holds it and how many times, allowing that same thread to acquire it repeatedly without blocking itself — it must then release it the same number of times before another thread can acquire it.

## Try-Lock and Timed Locking
A plain lock() call blocks indefinitely until the lock is available. A **try_lock()** attempts to acquire the lock and returns immediately with success/failure, without blocking — useful when a thread has other useful work to do if the lock isn't free. A **timed lock** (try_lock_for/try_lock_until) blocks only up to a specified duration before giving up, useful for avoiding indefinite waits in latency-sensitive systems.

## Compare-and-Swap (CAS)
**CAS** is a hardware-supported atomic operation: "read a value, and if it still equals an expected value, swap in a new value — all as one indivisible step." It's the foundation of *lock-free* programming: instead of blocking other threads with a mutex, a thread optimistically attempts its update and retries (in a loop) if another thread's CAS won the race first. C++'s std::atomic type exposes this via compare_exchange_weak/strong.`,
    codeLabel: "synchronization_primitives.cpp",
    code: `// Mutex — the standard fix for the race condition on the previous page
mutex mtx;
int counter = 0;

void incrementSafe() {
    for (int i = 0; i < 100000; i++) {
        lock_guard<mutex> lock(mtx);   // acquired here, auto-released at scope end
        counter++;                      // now a true critical section
    }
}

// Compare-And-Swap — a lock-free alternative for simple cases
atomic<int> atomicCounter{0};

void incrementLockFree() {
    for (int i = 0; i < 100000; i++) {
        atomicCounter.fetch_add(1);   // hardware-atomic, no mutex needed at all
    }
}

// Condition variable — thread sleeps until notified, instead of busy-waiting
mutex cvMtx;
condition_variable cv;
bool dataReady = false;

void waitForData() {
    unique_lock<mutex> lock(cvMtx);
    cv.wait(lock, [] { return dataReady; });   // sleeps until predicate is true
    cout << "Data is ready, proceeding\\n";
}

void produceData() {
    { lock_guard<mutex> lock(cvMtx); dataReady = true; }
    cv.notify_one();   // wakes the waiting thread
}`,
  },

  {
    id: "concurrency-challenges",
    title: "Concurrency Challenges",
    oneLiner: "Deadlock, livelock, and starvation — the failure modes of concurrent systems.",
    content: `## Deadlock
A **deadlock** occurs when two or more threads are each waiting for a resource the other holds, and neither can ever proceed. The classic example: Thread A locks Mutex 1 and then tries to lock Mutex 2, while Thread B locks Mutex 2 and then tries to lock Mutex 1 — both now wait forever. Four conditions (the **Coffman conditions**) must all hold simultaneously for deadlock to occur: mutual exclusion (resources can't be shared), hold-and-wait (a thread holds one resource while waiting for another), no preemption (a resource can't be forcibly taken away), and circular wait (a cycle of threads each waiting on the next). Break any one condition and deadlock becomes impossible — in practice, the easiest and most common fix is eliminating circular wait by always **acquiring locks in the same global order** everywhere in the codebase.

## Livelock
A **livelock** is subtly different from deadlock: the threads involved are **not blocked** — they're actively running — but they're stuck responding to each other in a way that prevents any of them from making real progress. The classic analogy: two people in a hallway repeatedly stepping the same direction to let the other pass, and colliding again each time. In code, this often happens when threads detect a potential conflict and both "politely" back off and retry in a way that keeps re-triggering the same conflict.

## Starvation
Related to both: **starvation** occurs when a thread is perpetually denied the resources it needs to proceed, not because of a deadlock, but because other threads are repeatedly prioritized ahead of it (e.g. an unfair lock implementation that always favors the most recently arrived thread). Fair locking policies (like a strict first-come-first-served queue for waiting threads) are the standard fix.`,
    codeLabel: "deadlock_example.cpp",
    code: `mutex mutexA, mutexB;

// ❌ DEADLOCK RISK: inconsistent lock ordering between threads
void threadOneWork() {
    lock_guard<mutex> lockA(mutexA);   // locks A first...
    lock_guard<mutex> lockB(mutexB);   // ...then B
}

void threadTwoWork() {
    lock_guard<mutex> lockB(mutexB);   // locks B first...
    lock_guard<mutex> lockA(mutexA);   // ...then A  — OPPOSITE ORDER — deadlock risk!
}

// ✅ FIX: always acquire locks in the SAME global order, everywhere.
void threadOneWorkFixed() {
    lock_guard<mutex> lockA(mutexA);   // A always before B
    lock_guard<mutex> lockB(mutexB);
}

void threadTwoWorkFixed() {
    lock_guard<mutex> lockA(mutexA);   // A always before B — same order, no cycle possible
    lock_guard<mutex> lockB(mutexB);
}

// Alternative fix: std::lock(mutexA, mutexB) acquires both atomically,
// avoiding the ordering problem entirely regardless of acquisition order.`,
  },

  {
    id: "concurrency-patterns",
    title: "Concurrency Patterns",
    oneLiner: "Signaling, thread pools, producer-consumer, and reader-writer — reusable multi-threading designs.",
    content: `## Signaling Pattern
The **signaling pattern** uses a condition variable (or similar primitive) so one thread can notify another that a specific event has occurred, letting the waiting thread sleep efficiently instead of repeatedly polling a flag. This is the basic building block underneath most of the more elaborate patterns below.

## Thread Pool Pattern
Creating a new OS thread for every incoming task is expensive (thread creation/teardown has real overhead) and unbounded thread counts can overwhelm a system. A **thread pool** pre-creates a fixed number of worker threads once, and hands them tasks from a shared queue as tasks arrive — workers loop: pull a task, execute it, go back to waiting for the next one. This bounds resource usage and amortizes thread-creation cost across many tasks. Virtually every production web server and job-processing system is built on this pattern.

## Producer-Consumer Pattern
One or more **producer** threads generate items and place them into a shared, bounded buffer/queue; one or more **consumer** threads remove and process those items. A condition variable coordinates both directions: producers wait if the buffer is full, consumers wait if it's empty, and each side signals the other when the buffer's state changes. This decouples the *rate* at which items are produced from the rate at which they're consumed.

## Reader-Writer Pattern
Many concurrent readers of shared data can safely run simultaneously (reading doesn't conflict with reading) — but a writer needs **exclusive** access (no other reader or writer may run at the same time). A plain mutex is overly conservative here, since it would block readers from running concurrently with each other for no reason. A **reader-writer lock** (shared_mutex in C++) allows multiple simultaneous "shared" (read) locks, but only one "exclusive" (write) lock, with no readers active, at a time — a much better fit for read-heavy workloads like an in-memory cache.`,
    codeLabel: "producer_consumer.cpp",
    code: `queue<int> buffer;
const size_t MAX_SIZE = 10;
mutex mtx;
condition_variable notFull, notEmpty;

void producer() {
    for (int i = 0; i < 100; i++) {
        unique_lock<mutex> lock(mtx);
        notFull.wait(lock, [] { return buffer.size() < MAX_SIZE; });  // wait if full

        buffer.push(i);
        notEmpty.notify_one();   // wake a waiting consumer
    }
}

void consumer() {
    for (int i = 0; i < 100; i++) {
        unique_lock<mutex> lock(mtx);
        notEmpty.wait(lock, [] { return !buffer.empty(); });   // wait if empty

        int item = buffer.front();
        buffer.pop();
        notFull.notify_one();   // wake a waiting producer
        // ... process 'item' outside the lock, ideally ...
    }
}

// Reader-Writer lock — many concurrent readers, one exclusive writer
shared_mutex cacheMutex;

int readFromCache() {
    shared_lock<shared_mutex> lock(cacheMutex);   // shared — many readers OK
    return 42;
}
void writeToCache(int value) {
    unique_lock<shared_mutex> lock(cacheMutex);   // exclusive — blocks everyone else
}`,
  },
];
