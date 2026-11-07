import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDb, rowToApi, type TaskRow } from "../d1";

const router = Router();

// All task routes require a signed-in user; tasks are scoped per user.
router.use(requireAuth);

const PRIORITIES = new Set(["low", "medium", "high"]);
const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const asSessions = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

// GET: Fetch the signed-in user's tasks
router.get("/", async (req, res) => {
  try {
    const { results } = await getDb()
      .prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC")
      .bind(req.userId)
      .all<TaskRow>();
    res.json(results.map(rowToApi));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// POST: Create a new task for the signed-in user
router.post("/", async (req, res) => {
  try {
    const { title, description, priority, dueDate, subjectId, notes, sessions } = req.body ?? {};

    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ message: "Task title is required" });
      return;
    }
    const prio = PRIORITIES.has(priority) ? priority : "medium";
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const due =
      typeof dueDate === "string" && dueDate.trim()
        ? new Date(dueDate).toISOString()
        : null;

    await getDb()
      .prepare(
        "INSERT INTO tasks (id, user_id, title, description, completed, priority, due_date, subject_id, notes, sessions, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        req.userId,
        title.trim(),
        asStr(description),
        prio,
        due,
        asStr(subjectId),
        asStr(notes),
        asSessions(sessions),
        now,
        now
      )
      .run();

    const row = await getDb().prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<TaskRow>();
    res.status(201).json(rowToApi(row!));
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// PATCH: Update one of the signed-in user's tasks
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string" || id.length > 64) {
      res.status(400).json({ message: "Invalid task ID" });
      return;
    }

    const existing = await getDb()
      .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
      .bind(id, req.userId)
      .first<TaskRow>();
    if (!existing) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const body = req.body ?? {};
    const next = {
      title:
        Object.prototype.hasOwnProperty.call(body, "title")
          ? asStr(body.title).trim()
          : existing.title,
      description: Object.prototype.hasOwnProperty.call(body, "description")
        ? asStr(body.description)
        : existing.description,
      completed: Object.prototype.hasOwnProperty.call(body, "completed")
        ? (body.completed ? 1 : 0)
        : existing.completed,
      priority: Object.prototype.hasOwnProperty.call(body, "priority")
        ? (PRIORITIES.has(body.priority) ? body.priority : "medium")
        : existing.priority,
      due_date: Object.prototype.hasOwnProperty.call(body, "dueDate")
        ? (typeof body.dueDate === "string" && body.dueDate.trim()
            ? new Date(body.dueDate).toISOString()
            : null)
        : existing.due_date,
      subject_id: Object.prototype.hasOwnProperty.call(body, "subjectId")
        ? asStr(body.subjectId)
        : existing.subject_id,
      notes: Object.prototype.hasOwnProperty.call(body, "notes")
        ? asStr(body.notes)
        : existing.notes,
      sessions: Object.prototype.hasOwnProperty.call(body, "sessions")
        ? asSessions(body.sessions)
        : existing.sessions,
    };
    if (!next.title) {
      res.status(400).json({ message: "Task title is required" });
      return;
    }

    await getDb()
      .prepare(
        "UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ?, subject_id = ?, notes = ?, sessions = ?, updated_at = ? WHERE id = ? AND user_id = ?"
      )
      .bind(
        next.title,
        next.description,
        next.completed,
        next.priority,
        next.due_date,
        next.subject_id,
        next.notes,
        next.sessions,
        new Date().toISOString(),
        id,
        req.userId
      )
      .run();

    const row = await getDb().prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<TaskRow>();
    res.json(rowToApi(row!));
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// DELETE: Delete one of the signed-in user's tasks
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDb()
      .prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?")
      .bind(id, req.userId)
      .run();

    if (!result.meta?.changes) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

export default router;
