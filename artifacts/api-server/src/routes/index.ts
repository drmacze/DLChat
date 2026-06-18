import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import contactsRouter from "./contacts.js";
import conversationsRouter from "./conversations.js";
import messagesRouter from "./messages.js";
import messageCrudRouter from "./messageCrud.js";
import postsRouter from "./posts.js";
import storiesRouter from "./stories.js";
import notificationsRouter from "./notifications.js";
import uploadRouter from "./upload.js";
import reportsRouter from "./reports.js";
import aiRouter from "./ai.js";
import streakRouter from "./streak.js";
import botRouter from "./bot.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/contacts", contactsRouter);
router.use("/conversations", conversationsRouter);
router.use("/conversations", messagesRouter);
router.use("/messages", messageCrudRouter);
router.use("/posts", postsRouter);
router.use("/stories", storiesRouter);
router.use("/notifications", notificationsRouter);
router.use("/upload", uploadRouter);
router.use("/reports", reportsRouter);
router.use("/ai", aiRouter);
router.use("/streak", streakRouter);
router.use("/bot", botRouter);
router.use("/", reportsRouter);

export default router;
