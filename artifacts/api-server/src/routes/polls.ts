import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { polls, pollVotes, conversationMembers, users } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

async function buildPoll(poll: typeof polls.$inferSelect, userId: string) {
  const options = JSON.parse(poll.options) as string[];
  const votes = await db
    .select({ optionIndex: pollVotes.optionIndex, userId: pollVotes.userId })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, poll.id));

  const myVotes = votes.filter((v) => v.userId === userId).map((v) => v.optionIndex);
  const votesByOption = options.map((_, i) => votes.filter((v) => v.optionIndex === i).length);

  let creatorName = "Unknown";
  const [creator] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, poll.createdBy)).limit(1);
  if (creator) creatorName = creator.displayName;

  return {
    id: poll.id,
    conversationId: poll.conversationId,
    createdBy: poll.createdBy,
    creatorName,
    question: poll.question,
    options: options.map((text, i) => ({
      index: i,
      text,
      voteCount: votesByOption[i],
      isVotedByMe: myVotes.includes(i),
    })),
    totalVotes: votes.length,
    isMultiple: poll.isMultiple,
    isAnonymous: poll.isAnonymous,
    isClosed: !!poll.closedAt,
    createdAt: poll.createdAt.toISOString(),
  };
}

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        conversationId: z.string().uuid(),
        question: z.string().min(1).max(300),
        options: z.array(z.string().min(1)).min(2).max(10),
        isMultiple: z.boolean().optional().default(false),
        isAnonymous: z.boolean().optional().default(false),
      })
      .parse(req.body);

    const [member] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, body.conversationId),
          eq(conversationMembers.userId, req.userId!)
        )
      )
      .limit(1);

    if (!member) {
      res.status(403).json({ error: "Not a member" });
      return;
    }

    const [poll] = await db
      .insert(polls)
      .values({
        conversationId: body.conversationId,
        createdBy: req.userId!,
        question: body.question,
        options: JSON.stringify(body.options),
        isMultiple: body.isMultiple,
        isAnonymous: body.isAnonymous,
      })
      .returning();

    res.json(await buildPoll(poll, req.userId!));
  } catch (err) {
    logger.error({ err }, "Create poll error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/conversation/:conversationId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [member] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, String(req.params.conversationId)),
          eq(conversationMembers.userId, req.userId!)
        )
      )
      .limit(1);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    const convPolls = await db
      .select()
      .from(polls)
      .where(eq(polls.conversationId, String(req.params.conversationId)));

    res.json({ polls: await Promise.all(convPolls.map((p) => buildPoll(p, req.userId!))) });
  } catch (err) {
    logger.error({ err }, "Get polls error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:pollId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, String(req.params.pollId)))
      .limit(1);
    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

    const [member] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, poll.conversationId),
          eq(conversationMembers.userId, req.userId!)
        )
      )
      .limit(1);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    res.json(await buildPoll(poll, req.userId!));
  } catch (err) {
    logger.error({ err }, "Get poll error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:pollId/vote", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { optionIndex } = z
      .object({ optionIndex: z.number().int().min(0) })
      .parse(req.body);

    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, String(req.params.pollId)))
      .limit(1);
    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
    if (poll.closedAt && poll.closedAt < new Date()) {
      res.status(400).json({ error: "Poll is closed" }); return;
    }

    const options = JSON.parse(poll.options) as string[];
    if (optionIndex >= options.length) {
      res.status(400).json({ error: "Invalid option" }); return;
    }

    if (!poll.isMultiple) {
      await db.delete(pollVotes).where(
        and(eq(pollVotes.pollId, poll.id), eq(pollVotes.userId, req.userId!))
      );
    }

    await db
      .insert(pollVotes)
      .values({ pollId: poll.id, userId: req.userId!, optionIndex })
      .onConflictDoNothing();

    res.json(await buildPoll(poll, req.userId!));
  } catch (err) {
    logger.error({ err }, "Vote poll error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:pollId/vote", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { optionIndex } = z
      .object({ optionIndex: z.number().int().min(0) })
      .parse(req.body);

    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, String(req.params.pollId)))
      .limit(1);
    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

    await db.delete(pollVotes).where(
      and(
        eq(pollVotes.pollId, poll.id),
        eq(pollVotes.userId, req.userId!),
        eq(pollVotes.optionIndex, optionIndex)
      )
    );

    res.json(await buildPoll(poll, req.userId!));
  } catch (err) {
    logger.error({ err }, "Unvote poll error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:pollId/close", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, String(req.params.pollId)))
      .limit(1);
    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
    if (poll.createdBy !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    await db.update(polls).set({ closedAt: new Date() }).where(eq(polls.id, poll.id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Close poll error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
