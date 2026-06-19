import http from "http";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { setupSocket } from "./socket/index.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

if (!process.env["DATABASE_URL"]) {
  logger.error("DATABASE_URL is required. Please provision a PostgreSQL database.");
  process.exit(1);
}

const server = http.createServer(app);
setupSocket(server);

async function runMigrations() {
  try {
    await db.execute(sql`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE privacy_level AS ENUM ('everyone', 'contacts', 'nobody');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE conv_type AS ENUM ('direct', 'group', 'channel');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'subscriber');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE msg_type AS ENUM ('text', 'image', 'video', 'file', 'audio', 'voice', 'system');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE msg_status AS ENUM ('sent', 'delivered', 'read');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE story_type AS ENUM ('text', 'image', 'video');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE post_visibility AS ENUM ('public', 'contacts', 'private');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN
        CREATE TYPE report_target AS ENUM ('user', 'post', 'message', 'story');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number TEXT UNIQUE,
        username TEXT UNIQUE,
        display_name TEXT NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        status_text TEXT,
        role user_role NOT NULL DEFAULT 'user',
        is_online BOOLEAN NOT NULL DEFAULT false,
        last_seen_at TIMESTAMPTZ,
        privacy_last_seen privacy_level NOT NULL DEFAULT 'everyone',
        privacy_profile_photo privacy_level NOT NULL DEFAULT 'everyone',
        privacy_read_receipts BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        device_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        revoked_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        custom_name TEXT,
        is_favorite BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(owner_id, contact_user_id)
      );
      CREATE TABLE IF NOT EXISTS blocked_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(blocker_id, blocked_id)
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type conv_type NOT NULL,
        title TEXT,
        description TEXT,
        avatar_url TEXT,
        created_by UUID REFERENCES users(id),
        is_public BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS conversation_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role member_role NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        muted_until TIMESTAMPTZ,
        pinned_at TIMESTAMPTZ,
        archived_at TIMESTAMPTZ,
        last_read_message_id UUID,
        UNIQUE(conversation_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id),
        type msg_type NOT NULL DEFAULT 'text',
        content TEXT,
        media_url TEXT,
        reply_to_message_id UUID,
        forwarded_from_message_id UUID,
        edited_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS message_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status msg_status NOT NULL DEFAULT 'sent',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(message_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS message_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(message_id, user_id, emoji)
      );
      CREATE TABLE IF NOT EXISTS stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type story_type NOT NULL,
        content TEXT,
        media_url TEXT,
        background_color TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS story_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(story_id, viewer_id)
      );
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        media_url TEXT,
        visibility post_visibility NOT NULL DEFAULT 'public',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS post_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(post_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS post_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        related_type TEXT,
        related_id UUID,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NOT NULL REFERENCES users(id),
        target_type report_target NOT NULL,
        target_id UUID NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        status report_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS push_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        platform TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(token)
      );

      CREATE TABLE IF NOT EXISTS channel_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        invite_code TEXT NOT NULL UNIQUE,
        created_by UUID NOT NULL REFERENCES users(id),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Fix existing columns: drop NOT NULL on phone_number (now optional)
      ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;

      -- Add columns that may be missing from older schema versions
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status_text TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_last_seen privacy_level NOT NULL DEFAULT 'everyone';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_profile_photo privacy_level NOT NULL DEFAULT 'everyone';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_read_receipts BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

      -- Add unique constraints if not already present
      DO $$ BEGIN
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
      EXCEPTION WHEN duplicate_table THEN null; END $$;
      DO $$ BEGIN
        ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
      EXCEPTION WHEN duplicate_table THEN null; END $$;

      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

      CREATE TABLE IF NOT EXISTS streaks (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_streak INTEGER NOT NULL DEFAULT 1,
        longest_streak INTEGER NOT NULL DEFAULT 1,
        last_active_date TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ai_contacts (
        id TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        country TEXT NOT NULL,
        gender TEXT NOT NULL,
        persona_json TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_contacts_user ON ai_contacts(user_id);

      CREATE TABLE IF NOT EXISTS ai_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ai_contact_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        mood TEXT NOT NULL DEFAULT 'happy',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_messages_user_contact ON ai_messages(user_id, ai_contact_id);

      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

      CREATE TABLE IF NOT EXISTS starred_messages (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, message_id)
      );

      -- Phase 2: New features (2025-06)
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS disappear_timer INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS story_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL DEFAULT 'heart',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(story_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS polls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id),
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        is_multiple BOOLEAN NOT NULL DEFAULT false,
        is_anonymous BOOLEAN NOT NULL DEFAULT false,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS poll_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        option_index INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(poll_id, user_id, option_index)
      );

      CREATE TABLE IF NOT EXISTS saved_messages (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);
      CREATE INDEX IF NOT EXISTS idx_polls_conv ON polls(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
    `);
    logger.info("Database schema initialized");
  } catch (err) {
    logger.error({ err }, "Migration error");
  }
}

server.listen(port, async () => {
  await runMigrations();
  logger.info({ port }, "Server listening");
});
