import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb, rowToApiReflection, type ReflectionRow } from "../d1";

const router = Router();

// All reflection routes require a signed-in user; reflections are scoped per user.
router.use(requireAuth);

const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

// GET: Fetch the signed-in user's reflections, newest first
router.get("/", async (req, res) => {
  try {
    const { results } = await getDb()
      .prepare("SELECT * FROM reflections WHERE user_id = ? ORDER BY created_at DESC")
      .bind(req.userId)
      .all<ReflectionRow>();
    res.json(results.map(rowToApiReflection));
  } catch (error) {
    console.error("Error fetching reflections:", error);
    res.status(500).json({ message: "Failed to fetch reflections" });
  }
});

// POST: Save a new reflection for the signed-in user
router.post("/", async (req, res) => {
  try {
    const { text, taskId, taskTitle, createdAt } = req.body ?? {};

    if (typeof text !== "string" || !text.trim()) {
      res.status(400).json({ message: "Reflection text is required" });
      return;
    }
    if (text.length > 4000) {
      res.status(400).json({ message: "Reflection is too long" });
      return;
    }
    const id = crypto.randomUUID();
    const clientDate = typeof createdAt === "string" && createdAt.trim() && !Number.isNaN(Date.parse(createdAt));
    const now = clientDate ? new Date(createdAt).toISOString() : new Date().toISOString();

    await getDb()
      .prepare(
        "INSERT INTO reflections (id, user_id, task_id, task_title, text, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(id, req.userId, asStr(taskId), asStr(taskTitle), text.trim(), now)
      .run();

    const row = await getDb().prepare("SELECT * FROM reflections WHERE id = ?").bind(id).first<ReflectionRow>();
    res.status(201).json(rowToApiReflection(row!));
  } catch (error) {
    console.error("Error creating reflection:", error);
    res.status(500).json({ message: "Failed to save reflection" });
  }
});

// DELETE: Delete one of the signed-in user's reflections
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDb()
      .prepare("DELETE FROM reflections WHERE id = ? AND user_id = ?")
      .bind(id, req.userId)
      .run();

    if (!result.meta?.changes) {
      res.status(404).json({ message: "Reflection not found" });
      return;
    }
    res.json({ message: "Reflection deleted successfully" });
  } catch (error) {
    console.error("Error deleting reflection:", error);
    res.status(500).json({ message: "Failed to delete reflection" });
  }
});

export default router;
