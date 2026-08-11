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

      -- Attempts became a first-class column after the first rows were written.
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS attempt_id TEXT;

      -- Backfill: early rows encoded the attempt in the 4th segment of the id.
      UPDATE conversations
         SET attempt_id = split_part(id, '::', 4)
       WHERE attempt_id IS NULL AND split_part(id, '::', 4) <> '';

      -- Rows predating attempts entirely get a stable label, so every row has an
      -- attempt the client can adopt and keep writing to instead of forking.
      UPDATE conversations SET attempt_id = 'legacy' WHERE attempt_id IS NULL;

      CREATE INDEX IF NOT EXISTS idx_conversations_lookup
        ON conversations(user_id, topic_id, mode, updated_at DESC);
    `).then(() => {});
  }
  return schemaReady;
}

// One row per *attempt*, so retaking a quiz starts a fresh thread instead of
// appending to the previous one. Attempt id is omitted for rows written before
// attempts existed, which keeps those readable under their original id.
function conversationId(userId: string, topicId: string, mode: string, attemptId?: string): string {
  const base = `${userId}::${topicId}::${mode}`;
  return attemptId ? `${base}::${attemptId}` : base;
}

export interface LoadedConversation {
  /** Attempt actually loaded — null when this user has nothing saved here yet. */
  attemptId: string | null;
  messages:  Pick<Message, "role" | "content" | "sources">[];
}

/**
 * Load a saved conversation.
 *
 * With `attemptId`, loads exactly that attempt (so a cleared screen stays
 * cleared). Without one — a fresh browser or device, where the client has no
 * attempt to ask for — falls back to this user's most recent attempt, which is
 * what makes history actually reappear after signing back in.
 *
 * Every query filters on user_id, so a guessed attempt or conversation id can
 * never surface another user's thread.
 */
export async function loadHistory(
  userId: string, topicId: string, mode: string, attemptId?: string
): Promise<LoadedConversation> {
  const p = getPool();
  if (!p) return { attemptId: attemptId ?? null, messages: [] };
  await ensureSchema();

  const conv = await p.query(
    `SELECT id, attempt_id
       FROM conversations
      WHERE user_id = $1 AND topic_id = $2 AND mode = $3
        AND ($4::text IS NULL OR attempt_id = $4)
      ORDER BY updated_at DESC
      LIMIT 1`,
    [userId, topicId, mode, attemptId ?? null]
  );
  if (!conv.rowCount) return { attemptId: attemptId ?? null, messages: [] };

  const { rows } = await p.query(
    `SELECT role, content, sources FROM messages
      WHERE conversation_id = $1 ORDER BY id ASC`,
    [conv.rows[0].id]
  );
  return {
    attemptId: conv.rows[0].attempt_id ?? attemptId ?? null,
    messages:  rows.map(r => ({ role: r.role, content: r.content, sources: r.sources ?? [] })),
  };
}

/** Permanently remove every saved attempt for this user's topic+mode. */
export async function deleteHistory(
  userId: string, topicId: string, mode: string
): Promise<number> {
  const p = getPool();
  if (!p) return 0;
  await ensureSchema();
  // messages cascade via the FK on conversation_id.
  const { rowCount } = await p.query(
    `DELETE FROM conversations WHERE user_id = $1 AND topic_id = $2 AND mode = $3`,
    [userId, topicId, mode]
  );
  return rowCount ?? 0;
}

export async function appendExchange(
  userId: string, topicId: string, mode: string,
  userText: string, assistantText: string, sources: unknown,
  attemptId?: string
): Promise<void> {
  const p = getPool();
  if (!p) return;
  await ensureSchema();
  const client = await p.connect();
  try {
    await client.query("BEGIN");

    // Resolve the conversation by (user, topic, mode, attempt) rather than by a
    // derived id: rows written before attempts existed have ids in the older
    // format, and deriving an id would fork a new row instead of continuing them.
    const found = await client.query(
      `SELECT id FROM conversations
        WHERE user_id = $1 AND topic_id = $2 AND mode = $3
          AND attempt_id IS NOT DISTINCT FROM $4
        LIMIT 1
        FOR UPDATE`,
      [userId, topicId, mode, attemptId ?? null]
    );

    let convId: string;
    if (found.rowCount) {
      convId = found.rows[0].id;
      await client.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [convId]);
    } else {
      convId = conversationId(userId, topicId, mode, attemptId);
      await client.query(
        `INSERT INTO conversations (id, user_id, topic_id, mode, attempt_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
        [convId, userId, topicId, mode, attemptId ?? null]
      );
    }
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
