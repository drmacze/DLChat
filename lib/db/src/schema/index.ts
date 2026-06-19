import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const d = sql`gen_random_uuid()`;
const now = sql`now()`;

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const privacyEnum = pgEnum("privacy_level", [
  "everyone",
  "contacts",
  "nobody",
]);
export const convTypeEnum = pgEnum("conv_type", ["direct", "group", "channel"]);
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
  "subscriber",
]);
export const msgTypeEnum = pgEnum("msg_type", [
  "text",
  "image",
  "video",
  "file",
  "audio",
  "voice",
  "system",
]);
export const msgStatusEnum = pgEnum("msg_status", [
  "sent",
  "delivered",
  "read",
]);
export const storyTypeEnum = pgEnum("story_type", ["text", "image", "video"]);
export const postVisEnum = pgEnum("post_visibility", [
  "public",
  "contacts",
  "private",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "resolved",
  "rejected",
]);
export const reportTargetEnum = pgEnum("report_target", [
  "user",
  "post",
  "message",
  "story",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(d),
  phoneNumber: text("phone_number").unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  statusText: text("status_text"),
  role: userRoleEnum("role").notNull().default("user"),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  privacyLastSeen: privacyEnum("privacy_last_seen").notNull().default("everyone"),
  privacyProfilePhoto: privacyEnum("privacy_profile_photo").notNull().default("everyone"),
  privacyReadReceipts: boolean("privacy_read_receipts").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(d),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  deviceName: text("device_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().default(now),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().default(d),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactUserId: uuid("contact_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customName: text("custom_name"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.ownerId, t.contactUserId)]
);

export const blockedUsers = pgTable(
  "blocked_users",
  {
    id: uuid("id").primaryKey().default(d),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.blockerId, t.blockedId)]
);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(d),
  type: convTypeEnum("type").notNull(),
  title: text("title"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  createdBy: uuid("created_by").references(() => users.id),
  isPublic: boolean("is_public").notNull().default(false),
  disappearTimer: integer("disappear_timer").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    id: uuid("id").primaryKey().default(d),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().default(now),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    lastReadMessageId: uuid("last_read_message_id"),
  },
  (t) => [unique().on(t.conversationId, t.userId)]
);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(d),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id),
  type: msgTypeEnum("type").notNull().default("text"),
  content: text("content"),
  mediaUrl: text("media_url"),
  replyToMessageId: uuid("reply_to_message_id"),
  forwardedFromMessageId: uuid("forwarded_from_message_id"),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});

export const messageStatus = pgTable(
  "message_status",
  {
    id: uuid("id").primaryKey().default(d),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: msgStatusEnum("status").notNull().default("sent"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.messageId, t.userId)]
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid("id").primaryKey().default(d),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.messageId, t.userId, t.emoji)]
);

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().default(d),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: storyTypeEnum("type").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),
  backgroundColor: text("background_color"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const storyViews = pgTable(
  "story_views",
  {
    id: uuid("id").primaryKey().default(d),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    viewerId: uuid("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.storyId, t.viewerId)]
);

export const storyReactions = pgTable(
  "story_reactions",
  {
    id: uuid("id").primaryKey().default(d),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull().default("heart"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.storyId, t.userId)]
);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().default(d),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content"),
  mediaUrl: text("media_url"),
  visibility: postVisEnum("visibility").notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").primaryKey().default(d),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.postId, t.userId)]
);

export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().default(d),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().default(d),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  question: text("question").notNull(),
  options: text("options").notNull(),
  isMultiple: boolean("is_multiple").notNull().default(false),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").primaryKey().default(d),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.pollId, t.userId, t.optionIndex)]
);

export const savedMessages = pgTable("saved_messages", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(d),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  relatedType: text("related_type"),
  relatedId: uuid("related_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().default(d),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id),
  targetType: reportTargetEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().default(d),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => [unique().on(t.token)]
);

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().default(d),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});

export const channelInvites = pgTable("channel_invites", {
  id: uuid("id").primaryKey().default(d),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});
