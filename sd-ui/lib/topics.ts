import type { Category, Topic } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "fund",
    label: "Fundamentals",
    icon: "Settings2",
    sub: "Core algorithms & building blocks",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    hex: "#3b82f6",
  },
  {
    id: "stor",
    label: "Storage & Data",
    icon: "Database",
    sub: "Databases, caching & object storage",
    color: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    hex: "#14b8a6",
  },
  {
    id: "core",
    label: "Core Systems",
    icon: "Layers3",
    sub: "Real-world product architectures",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    hex: "#8b5cf6",
  },
  {
    id: "infra",
    label: "Infrastructure",
    icon: "Server",
    sub: "Queues, monitoring & geo-services",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    hex: "#f59e0b",
  },
  {
    id: "adv",
    label: "Advanced",
    icon: "Rocket",
    sub: "High-stakes, complex transaction systems",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    hex: "#ef4444",
  },
];

export const TOPICS: Topic[] = [
  { id: "consistent-hashing", label: "Consistent Hashing", cat: "fund", difficulty: "medium", desc: "Distribute load across nodes with minimal rehashing on topology changes", icon: "Share2", tags: ["hashing", "distribution"], prompt: "Explain consistent hashing — what problem it solves and how it works." },
  { id: "rate-limiter",        label: "Rate Limiter",        cat: "fund", difficulty: "medium", desc: "Control request throughput using token bucket, leaky bucket, or sliding window", icon: "Gauge", tags: ["throttling", "algorithms"], prompt: "How does the rate limiter design work? Cover all major algorithms." },
  { id: "unique-id",           label: "Unique ID Generator", cat: "fund", difficulty: "medium", desc: "Generate globally unique, sortable IDs in distributed systems via Snowflake", icon: "Fingerprint", tags: ["distributed", "snowflake"], prompt: "How do you design a distributed unique ID generator?" },
  { id: "url-shortener",       label: "URL Shortener",       cat: "fund", difficulty: "easy",   desc: "Convert long URLs to short aliases; resolve collisions with base62 encoding", icon: "Link", tags: ["hashing", "base62"], prompt: "Explain the URL shortener design from the books." },

  { id: "key-value-store", label: "Key-Value Store",      cat: "stor", difficulty: "hard",   desc: "Distributed KV with replication, CAP tradeoffs, gossip protocol", icon: "Database", tags: ["CAP", "replication"], prompt: "Walk me through designing a distributed key-value store." },
  { id: "db-sharding",     label: "Database Sharding",    cat: "stor", difficulty: "medium", desc: "Horizontal partitioning strategies: range, hash, directory sharding", icon: "LayoutTemplate", tags: ["partitioning", "hotspot"], prompt: "Explain database sharding strategies and tradeoffs." },
  { id: "dist-cache",      label: "Distributed Cache",    cat: "stor", difficulty: "medium", desc: "Multi-tier caching with LRU/LFU eviction, TTL, and write-through policies", icon: "Zap", tags: ["Redis", "eviction"], prompt: "How does a distributed cache like Redis work at scale?" },
  { id: "obj-storage",     label: "S3 Object Storage",    cat: "stor", difficulty: "hard",   desc: "Immutable blob storage with metadata service, replication, and erasure coding", icon: "Cloud", tags: ["blob", "metadata"], prompt: "Design an S3-like distributed object storage system." },

  { id: "news-feed",     label: "News Feed",            cat: "core", difficulty: "medium", desc: "Fan-out patterns, ranking algorithms, and cursor-based pagination at scale", icon: "Newspaper", tags: ["fanout", "ranking"], prompt: "How is a scalable news feed system designed?" },
  { id: "chat-system",   label: "Chat System",          cat: "core", difficulty: "hard",   desc: "WebSocket sessions, message delivery guarantees, and presence tracking", icon: "MessageCircle", tags: ["WebSocket", "presence"], prompt: "What's the architecture of a chat system like WhatsApp?" },
  { id: "notifications", label: "Notification System",  cat: "core", difficulty: "medium", desc: "Push delivery pipelines, topic fan-out, retry logic, and deduplication", icon: "Bell", tags: ["push", "fanout"], prompt: "How do push notification systems work at scale?" },
  { id: "autocomplete",  label: "Search Autocomplete",  cat: "core", difficulty: "medium", desc: "Trie-based prefix search with real-time ranking, caching, and fuzzy matching", icon: "Search", tags: ["trie", "ranking"], prompt: "How is type-ahead search autocomplete implemented?" },
  { id: "youtube",       label: "YouTube / Video CDN",  cat: "core", difficulty: "hard",   desc: "Video transcoding pipelines, adaptive bitrate streaming, and CDN delivery", icon: "Play", tags: ["transcoding", "CDN"], prompt: "How does a video streaming platform like YouTube work?" },
  { id: "gdrive",        label: "Google Drive",         cat: "core", difficulty: "hard",   desc: "Chunked uploads, delta sync, conflict resolution, and metadata storage", icon: "FolderOpen", tags: ["sync", "chunking"], prompt: "Design a cloud file storage system like Google Drive." },
  { id: "crawler",       label: "Web Crawler",          cat: "core", difficulty: "medium", desc: "Distributed BFS crawling with politeness, deduplication, and priority queues", icon: "Bot", tags: ["BFS", "deduplication"], prompt: "Design a distributed web crawler." },

  { id: "msg-queue",  label: "Message Queue",       cat: "infra", difficulty: "hard",   desc: "Durable pub-sub with ordering guarantees, consumer groups, dead-letter queues", icon: "MailStack", tags: ["Kafka", "ordering"], prompt: "Design a distributed message queue system like Kafka." },
  { id: "metrics",    label: "Metrics Monitoring",  cat: "infra", difficulty: "medium", desc: "Time-series ingestion, aggregation pipelines, alerting, and long-term storage", icon: "LineChart", tags: ["time-series", "alerting"], prompt: "How do large-scale metrics monitoring systems work?" },
  { id: "proximity",  label: "Proximity Service",   cat: "infra", difficulty: "medium", desc: "Geohash and quadtree for location indexing and radius search at scale", icon: "MapPin", tags: ["geohash", "location"], prompt: "How is a proximity / location-based service designed?" },

  { id: "payment", label: "Payment System",       cat: "adv", difficulty: "hard", desc: "Idempotent transactions, double-spend prevention, and ledger reconciliation", icon: "CreditCard", tags: ["idempotency", "reconciliation"], prompt: "Design a reliable distributed payment system." },
  { id: "hotel",   label: "Hotel Reservation",    cat: "adv", difficulty: "hard", desc: "Inventory management, overbooking prevention, and distributed transactions", icon: "Building2", tags: ["inventory", "transactions"], prompt: "Design a hotel room reservation system." },
  { id: "ad-click",label: "Ad Click Aggregation", cat: "adv", difficulty: "hard", desc: "High-throughput click ingestion, real-time aggregation, and fraud detection", icon: "MousePointerClick", tags: ["streaming", "aggregation"], prompt: "Design an ad click event aggregation system." },
  { id: "maps",    label: "Google Maps",           cat: "adv", difficulty: "hard", desc: "Graph routing, ETA prediction, tile serving, and real-time traffic updates", icon: "Map", tags: ["graph", "ETA"], prompt: "How does a mapping and navigation system like Google Maps work?" },
];

export function getCategoryById(id: string) {
  return CATEGORIES.find(c => c.id === id);
}

export function getTopicById(id: string) {
  return TOPICS.find(t => t.id === id);
}
