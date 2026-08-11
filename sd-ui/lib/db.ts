import { Pool } from "pg";
import type { Message } from "./types";

// Persistent, cross-device chat history — only reachable for a signed-in
// user, and only ever queried/written scoped to that user's verified id
// (see route handlers). Absent DATABASE_URL, every function here is a no-op:
// the app still works fully off sessionStorage, it just won't sync anywhere.

let pool: Pool | null = null;

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  const p = getPool();
  if (!p) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = p.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        topic_id   TEXT NOT NULL,
        mode       TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

      CREATE TABLE IF NOT EXISTS messages (
        id              BIGSERIAL PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role            TEXT NOT NULL,
        content         TEXT NOT NULL,
        sources         JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);
    `).then(() => {});
  }
  return schemaReady;
}

function conversationId(userId: string, topicId: string, mode: string): string {
  return `${userId}::${topicId}::${mode}`;
}

export async function loadHistory(
  userId: string, topicId: string, mode: string
): Promise<Pick<Message, "role" | "content" | "sources">[]> {
  const p = getPool();
  if (!p) return [];
  await ensureSchema();
  const convId = conversationId(userId, topicId, mode);
  const { rows } = await p.query(
    `SELECT role, content, sources FROM messages
     WHERE conversation_id = $1 ORDER BY id ASC`,
    [convId]
  );
  return rows.map(r => ({ role: r.role, content: r.content, sources: r.sources ?? [] }));
}

export async function appendExchange(
  userId: string, topicId: string, mode: string,
  userText: string, assistantText: string, sources: unknown
): Promise<void> {
  const p = getPool();
  if (!p) return;
  await ensureSchema();
  const convId = conversationId(userId, topicId, mode);
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO conversations (id, user_id, topic_id, mode, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
      [convId, userId, topicId, mode]
    );
    await client.query(
      `INSERT INTO messages (conversation_id, role, content, sources) VALUES ($1, 'user', $2, '[]')`,
      [convId, userText]
    );
    await client.query(
      `INSERT INTO messages (conversation_id, role, content, sources) VALUES ($1, 'assistant', $2, $3)`,
      [convId, assistantText, JSON.stringify(sources ?? [])]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
