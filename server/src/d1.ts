// Access to the D1 binding from anywhere in the app (Workers runtime).
// cloudflare:workers has no type declarations in this CJS tsconfig.
// @ts-expect-error runtime-only module
import { env } from "cloudflare:workers";

export interface D1Result<T> {
  results: T[];
  success: boolean;
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export function getDb(): D1Database {
  const db = (env as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error("D1 binding DB is missing. Check wrangler configuration.");
  }
  return db;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  completed: number;
  priority: string;
  due_date: string | null;
  subject_id: string;
  notes: string;
  sessions: number;
  created_at: string;
  updated_at: string;
}

// Keep the JSON shape identical to the previous Mongo/Mongoose API so the
// frontend contract does not change: _id, camelCase fields, booleans.
export function rowToApi(r: TaskRow) {
  return {
    _id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    completed: !!r.completed,
    priority: r.priority,
    dueDate: r.due_date,
    subjectId: r.subject_id,
    notes: r.notes,
    sessions: r.sessions,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface ReflectionRow {
  id: string;
  user_id: string;
  task_id: string;
  task_title: string;
  text: string;
  created_at: string;
}

export function rowToApiReflection(r: ReflectionRow) {
  return {
    _id: r.id,
    userId: r.user_id,
    taskId: r.task_id,
    taskTitle: r.task_title,
    text: r.text,
    createdAt: r.created_at,
  };
}
