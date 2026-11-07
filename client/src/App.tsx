import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlarmClock, ArrowRight, Award, BookOpen, CalendarDays, Check,
  CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock3, FileText,
  Flame, FolderOpen, GraduationCap, LayoutDashboard, ListTodo, LogIn,
  Menu, Moon, MoreHorizontal, NotebookPen, Play, Plus, Search, Settings2,
  ShieldCheck, Sparkles, Sun, Target, Trash2, TrendingUp, Upload, UserRound,
  X, Pause, RotateCcw, Coffee, Brain, BarChart3, Bell, Pencil, BookMarked,
  ClipboardCheck
} from "lucide-react";
import { useAuth, useSignIn, useSignUp, useUser } from "@clerk/react";
import "./App.css";

type Subject = { id: string; name: string; color: string };
type Task = { id: string; title: string; subjectId: string; due: string; priority: "Low" | "Medium" | "High"; done: boolean; notes: string; sessions: number };
type AttendanceMark = "present" | "absent";
type Attendance = Record<string, AttendanceMark>;
type StudyLog = { id: string; date: string; subjectId: string; task: string; minutes: number };
type StoredNote = { id: string; name: string; subjectId: string; date: string; size: string; kind: string };

const PALETTE = ["#28245f", "#303b91", "#275db2", "#207fbd", "#169fd6", "#20b7e8", "#29457c", "#27649c", "#2789bd", "#24a6d5"];
const TODAY = () => new Date().toISOString().slice(0, 10);
const makeId = () => Math.random().toString(36).slice(2, 10);
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000";
type ApiTask = { _id: string; title: string; completed: boolean; priority: "low" | "medium" | "high"; dueDate: string | null; subjectId?: string; notes?: string; sessions?: number };
const priorityFromApi = (p: string): Task["priority"] => p === "high" ? "High" : p === "low" ? "Low" : "Medium";
const fromApiTask = (t: ApiTask): Task => ({ id: t._id, title: t.title, done: t.completed, priority: priorityFromApi(t.priority), due: t.dueDate ? t.dueDate.slice(0, 10) : TODAY(), subjectId: t.subjectId || "s1", notes: t.notes || "", sessions: t.sessions ?? 0 });
const initialSubjects: Subject[] = [
  { id: "s1", name: "Signals & Systems", color: "#207fbd" },
  { id: "s2", name: "Data Structures", color: "#169fd6" },
  { id: "s3", name: "Analog Circuits", color: "#303b91" },
];
const initialTasks: Task[] = [
  { id: "t1", title: "Revise Fourier transforms", subjectId: "s1", due: TODAY(), priority: "High", done: false, notes: "", sessions: 3 },
  { id: "t2", title: "Solve graph problems", subjectId: "s2", due: TODAY(), priority: "Medium", done: false, notes: "", sessions: 2 },
  { id: "t3", title: "Review BJT notes", subjectId: "s3", due: TODAY(), priority: "Low", done: true, notes: "", sessions: 1 },
];
function readStore<T,>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function dayKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function monthLabel(date: Date) { return date.toLocaleDateString("en", { month: "long", year: "numeric" }); }
function fmtTime(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }

type Page = "Dashboard" | "Study Planner" | "Calendar" | "Pomodoro" | "Attendance" | "My Notes" | "Analytics" | "Subjects";
const navItems: { label: Page; icon: React.ElementType; group: string }[] = [
  { label: "Dashboard", icon: LayoutDashboard, group: "STUDY SPACE" },
  { label: "Study Planner", icon: ListTodo, group: "STUDY SPACE" },
  { label: "Calendar", icon: CalendarDays, group: "STUDY SPACE" },
  { label: "Pomodoro", icon: AlarmClock, group: "STUDY SPACE" },
  { label: "Attendance", icon: ClipboardCheck, group: "STUDY SPACE" },
  { label: "My Notes", icon: FolderOpen, group: "LIBRARY" },
  { label: "Analytics", icon: BarChart3, group: "INSIGHTS" },
  { label: "Subjects", icon: BookMarked, group: "INSIGHTS" },
];

export default function App() {
  const [dark, setDark] = useState(() => readStore("sf-dark", false));
  const [page, setPage] = useState<Page>("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>(() => readStore("sf-subjects", initialSubjects));
  const [tasks, setTasks] = useState<Task[]>(() => readStore("sf-tasks", initialTasks));
  const [logs, setLogs] = useState<StudyLog[]>(() => readStore("sf-logs", []));
  const [notes, setNotes] = useState<StoredNote[]>(() => readStore("sf-notes", []));
  const [attendance, setAttendance] = useState<Record<string, Attendance>>(() => readStore("sf-attendance", {}));
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState(PALETTE[3]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState(initialSubjects[0].id);
  const [taskDue, setTaskDue] = useState(TODAY());
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("Medium");
  const [taskSessions, setTaskSessions] = useState(2);
  const [taskNotes, setTaskNotes] = useState("");
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(TODAY());
  const [attendanceSubject, setAttendanceSubject] = useState<string | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date());
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(TODAY());
  const [noteSubject, setNoteSubject] = useState(initialSubjects[0].id);
  const [noteSearch, setNoteSearch] = useState("");
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(4);
  const [sessionCount, setSessionCount] = useState(0);
  const [timerMode, setTimerMode] = useState<"focus" | "short" | "long">("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState("");
  const [sessionReflection, setSessionReflection] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [loginScreen, setLoginScreen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [token, setToken] = useState<string>(() => readStore("sf-token", ""));
  const [userName, setUserName] = useState<string>(() => readStore("sf-user-name", ""));
  const [toast, setToast] = useState("");

  useEffect(() => { localStorage.setItem("sf-dark", JSON.stringify(dark)); }, [dark]);
  useEffect(() => { localStorage.setItem("sf-subjects", JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem("sf-tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("sf-logs", JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem("sf-notes", JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem("sf-attendance", JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem("sf-token", JSON.stringify(token)); }, [token]);

  // --- Clerk managed authentication ---
  const { isLoaded: clerkLoaded, isSignedIn, getToken, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const [code, setCode] = useState("");
  const [pendingCode, setPendingCode] = useState<"signup" | "login" | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Keep the API bearer token synced to the Clerk session, refreshing before
  // Clerk's short-lived session tokens expire.
  useEffect(() => {
    if (!clerkLoaded) return;
    let cancelled = false;
    const syncToken = async () => {
      if (!isSignedIn) { setToken(""); return; }
      try {
        const t = await getToken();
        if (!cancelled) setToken(t || "");
      } catch { if (!cancelled) setToken(""); }
    };
    void syncToken();
    const iv = setInterval(syncToken, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [clerkLoaded, isSignedIn, getToken]);

  // Show the signed-in name from the Clerk profile.
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      setUserName(clerkUser.firstName || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0] || "");
    }
    if (!isSignedIn) setUserName("");
  }, [isSignedIn, clerkUser]);
  useEffect(() => { localStorage.setItem("sf-user-name", JSON.stringify(userName)); }, [userName]);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((rows: ApiTask[]) => setTasks(rows.map(fromApiTask)))
      .catch(() => setToast("Could not load your synced tasks"));
  }, [token]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(id); }, [toast]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setSecondsLeft(v => {
      if (v <= 1) { window.clearInterval(id); setTimerRunning(false); setToast(timerMode === "focus" ? "Focus session complete — take a breath!" : "Break complete — you're ready to go."); return 0; }
      return v - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerMode]);
  useEffect(() => { setSecondsLeft((timerMode === "focus" ? studyMinutes : timerMode === "short" ? shortBreak : longBreak) * 60); }, [studyMinutes, shortBreak, longBreak, timerMode]);

  const subjectFor = (id: string) => subjects.find(s => s.id === id) ?? { id, name: "Unassigned", color: "#2789bd" };
  const completed = tasks.filter(t => t.done).length;
  const minutesToday = logs.filter(l => l.date === TODAY()).reduce((sum, l) => sum + l.minutes, 0);
  const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0);
  const filteredTasks = tasks.filter(t => `${t.title} ${subjectFor(t.subjectId).name}`.toLowerCase().includes(query.toLowerCase()));
  const dailyStudy = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach(l => { map[l.date] = (map[l.date] || 0) + l.minutes; });
    return map;
  }, [logs]);
  const streak = useMemo(() => {
    let count = 0; const cursor = new Date();
    if (!(dailyStudy[TODAY()] > 0)) cursor.setDate(cursor.getDate() - 1);
    while (dailyStudy[dayKey(cursor)] > 0) { count++; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }, [dailyStudy]);
  const weekMinutes = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); const key = dayKey(d);
    return { label: d.toLocaleDateString("en", { weekday: "short" }), minutes: logs.filter(l => l.date === key).reduce((sum, l) => sum + l.minutes, 0) };
  }), [logs]);
  const subjectMinutes = subjects.map(s => ({ ...s, minutes: logs.filter(l => l.subjectId === s.id).reduce((sum, l) => sum + l.minutes, 0) }));

  async function addTask(e: React.FormEvent) {
    e.preventDefault(); if (!taskTitle.trim()) return;
    const task: Task = { id: editingTask ?? makeId(), title: taskTitle.trim(), subjectId: taskSubject, due: taskDue, priority: taskPriority, done: false, notes: taskNotes, sessions: taskSessions };
    let note = editingTask ? "Task updated" : "Task added to your plan";
    const applyLocal = () => setTasks(old => editingTask ? old.map(t => t.id === editingTask ? { ...task, done: t.done } : t) : [task, ...old]);
    if (token) {
      try {
        const payload = { title: task.title, priority: task.priority.toLowerCase(), dueDate: task.due, subjectId: task.subjectId, notes: task.notes, sessions: task.sessions };
        const res = await fetch(editingTask ? `${API_URL}/api/tasks/${editingTask}` : `${API_URL}/api/tasks`, {
          method: editingTask ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const saved = fromApiTask(await res.json());
          setTasks(old => editingTask ? old.map(t => t.id === editingTask ? { ...saved, done: t.done } : t) : [saved, ...old]);
        } else { applyLocal(); note = "Saved on this device - sync will retry next visit"; }
      } catch { applyLocal(); note = "Saved on this device - sync will retry next visit"; }
    } else {
      applyLocal();
    }
    setTaskTitle(""); setTaskNotes(""); setTaskSessions(2); setTaskModal(false); setEditingTask(null); setToast(note);
  }
  function openEdit(task: Task) { setEditingTask(task.id); setTaskTitle(task.title); setTaskSubject(task.subjectId); setTaskDue(task.due); setTaskPriority(task.priority); setTaskNotes(task.notes); setTaskSessions(task.sessions); setTaskModal(true); }
  function toggleTask(id: string) {
    const target = tasks.find(t => t.id === id);
    setTasks(old => old.map(t => t.id === id ? { ...t, done: !t.done } : t));
    if (token && target) {
      fetch(`${API_URL}/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ completed: !target.done }) }).catch(() => {});
    }
  }
  function logFocusSession() {
    if (timerMode !== "focus") { setTimerMode("focus"); setTimerRunning(false); return; }
    const matchingTask = tasks.find(t => t.title.trim().toLowerCase() === pomodoroTask.trim().toLowerCase());
    const taskName = pomodoroTask.trim() || "Focused study";
    setLogs(old => [...old, { id: makeId(), date: TODAY(), subjectId: matchingTask?.subjectId ?? taskSubject, task: taskName, minutes: studyMinutes }]);
    setSessionCount(v => v + 1); setReflectionSaved(false); setToast(`${studyMinutes} minutes added to your study log`);
  }
  function switchTimerMode(mode: "focus" | "short" | "long") { setTimerRunning(false); setTimerMode(mode); }
  function addSubject(e: React.FormEvent) { e.preventDefault(); if (!subjectName.trim()) return; setSubjects(old => [...old, { id: makeId(), name: subjectName.trim(), color: subjectColor }]); setSubjectName(""); setToast("Subject added"); }
  function markAttendance(date: string, mark?: AttendanceMark) {
    if (!attendanceSubject) return;
    setAttendance(old => {
      const bySubject = { ...(old[attendanceSubject] || {}) };
      if (!mark || bySubject[date] === mark) delete bySubject[date]; else bySubject[date] = mark;
      return { ...old, [attendanceSubject]: bySubject };
    });
  }
  function uploadNotes(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNotes(old => [...files.map(f => ({ id: makeId(), name: f.name, subjectId: noteSubject, date: TODAY(), size: f.size < 1024 * 1024 ? `${Math.max(1, Math.round(f.size / 1024))} KB` : `${(f.size / 1024 / 1024).toFixed(1)} MB`, kind: f.name.split(".").pop()?.toUpperCase() || "FILE" })), ...old]);
    if (files.length) setToast("File details added to your library");
    e.target.value = "";
  }
  function clerkErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as { errors?: { code?: string; longMessage?: string; message?: string }[]; message?: string } | null;
    const first = anyErr?.errors?.[0];
    const errCode = first?.code || "";
    if (errCode === "form_identifier_not_found" || errCode === "form_password_incorrect") {
      return "Invalid email or password.";
    }
    if (errCode === "form_password_pwned" || errCode === "form_password_not_strong_enough") {
      return "That password is too easy to guess. Try a stronger one.";
    }
    if (errCode === "form_password_length_too_short") {
      return "Password must be at least 8 characters long.";
    }
    return first?.longMessage || anyErr?.message || fallback;
  }

  function finishSignIn(mode: "login" | "signup") {
    setPendingCode(null); setCode(""); setLoginScreen(false);
    setToast(mode === "login" ? "Welcome back! Your tasks now sync to your account." : "Account created! Your tasks now sync to your account.");
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!clerkLoaded || !clerkSignIn || !clerkSignUp) { setToast("Sign-in is still loading. Try again in a moment."); return; }
    setAuthBusy(true);
    try {
      if (authMode === "login") {
        const { error } = await clerkSignIn.password({ emailAddress: email.trim(), password });
        if (error) { setToast(clerkErrorMessage(error, "Could not sign in. Try again.")); return; }
        if (clerkSignIn.status === "complete") {
          await clerkSignIn.finalize();
          finishSignIn("login");
        } else if (clerkSignIn.status === "needs_client_trust" || clerkSignIn.status === "needs_second_factor") {
          const send = await clerkSignIn.mfa.sendEmailCode();
          if (send.error) { setToast(clerkErrorMessage(send.error, "Could not send the verification email.")); return; }
          setPendingCode("login");
          setToast("New device - we emailed you a 6-digit code to confirm it is you.");
        } else {
          setToast("Could not sign in. Try again.");
        }
      } else {
        const { error } = await clerkSignUp.password({ emailAddress: email.trim(), password, firstName: name.trim() || undefined });
        if (error) { setToast(clerkErrorMessage(error, "Could not create the account. Try again.")); return; }
        await clerkSignUp.verifications.sendEmailCode();
        setPendingCode("signup");
        setToast("We emailed you a 6-digit code. Enter it to finish creating your account.");
      }
    } catch (err) {
      setToast(clerkErrorMessage(err, "Could not reach the sign-in service. Check your connection."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!clerkSignIn || !clerkSignUp || !pendingCode) return;
    setAuthBusy(true);
    try {
      if (pendingCode === "signup") {
        const { error } = await clerkSignUp.verifications.verifyEmailCode({ code });
        if (error) { setToast(clerkErrorMessage(error, "That code did not work. Check it and try again.")); return; }
        if (clerkSignUp.status === "complete") { await clerkSignUp.finalize(); finishSignIn("signup"); return; }
      } else {
        const { error } = await clerkSignIn.mfa.verifyEmailCode({ code });
        if (error) { setToast(clerkErrorMessage(error, "That code did not work. Check it and try again.")); return; }
        if (clerkSignIn.status === "complete") { await clerkSignIn.finalize(); finishSignIn("login"); return; }
      }
      setToast("Almost there - finish the remaining sign-in steps.");
    } catch (err) {
      setToast(clerkErrorMessage(err, "Could not verify the code. Try again."));
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() { void clerkSignOut(); setPendingCode(null); setCode(""); setToast("Signed out. Tasks stay on this device in guest mode."); }
  async function deleteTask(id: string) {
    setTasks(old => old.filter(t => t.id !== id));
    if (token) {
      try { await fetch(`${API_URL}/api/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch { /* stays deleted locally */ }
    }
  }
  function monthCells(date: Date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }
  const calendarCells = monthCells(month);
  const attendanceCells = monthCells(attendanceMonth);
  const attendanceData = attendanceSubject ? (attendance[attendanceSubject] || {}) : {};
  const totalClasses = Object.keys(attendanceData).length;
  const presentClasses = Object.values(attendanceData).filter(v => v === "present").length;
  const absentClasses = Object.values(attendanceData).filter(v => v === "absent").length;
  const attendancePct = totalClasses ? Math.round(presentClasses / totalClasses * 100) : 0;

  const MonthGrid = ({ date, cells, onChangeMonth, onSelect, selected, heatmap = false, marks = {} as Record<string, string> }: { date: Date; cells: (number | null)[]; onChangeMonth: (d: Date) => void; onSelect: (d: string) => void; selected: string; heatmap?: boolean; marks?: Record<string, string> }) => (
    <div className="month-widget">
      <div className="month-heading"><button className="icon-button" onClick={() => onChangeMonth(new Date(date.getFullYear(), date.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={17}/></button><strong>{monthLabel(date)}</strong><button className="icon-button" onClick={() => onChangeMonth(new Date(date.getFullYear(), date.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={17}/></button></div>
      <div className="calendar-grid weekdays">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`${d}${i}`}>{d}</span>)}</div>
      <div className="calendar-grid">{cells.map((day, i) => {
        if (!day) return <span key={`blank-${i}`} />;
        const key = dayKey(new Date(date.getFullYear(), date.getMonth(), day));
        const mins = dailyStudy[key] || 0;
        const mark = marks[key];
        const isSelected = key === selected;
        return <button key={key} className={`day-cell ${isSelected ? "selected" : ""} ${heatmap && mins ? mins >= 120 ? "heat-4" : mins >= 60 ? "heat-3" : mins >= 25 ? "heat-2" : "heat-1" : ""} ${mark ? `mark-${mark}` : ""}`} onClick={() => onSelect(key)} title={`${key}${mins ? ` · ${Math.floor(mins / 60)}h ${mins % 60}m studied` : ""}${mark ? ` · ${mark}` : ""}`}>{day}{heatmap && mins > 0 && <i/>}</button>;
      })}</div>
    </div>
  );

  const taskList = (items: Task[]) => items.length ? <div className="task-list">{items.map(task => {
    const subject = subjectFor(task.subjectId);
    return <div className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}>
      <button className={`task-check ${task.done ? "checked" : ""}`} onClick={() => toggleTask(task.id)} aria-label={task.done ? "Mark incomplete" : "Complete task"}>{task.done && <Check size={14}/>}</button>
      <div className="task-main"><strong>{task.title}</strong><div className="task-meta"><span className="subject-tag"><i style={{ background: subject.color }}/>{subject.name}</span><span><Clock3 size={12}/>{task.sessions} sessions</span><span><CalendarDays size={12}/>{task.due}</span></div>{task.notes && <p className="task-note-preview">{task.notes}</p>}</div>
      <span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><button className="icon-button task-more" onClick={() => openEdit(task)} title="Edit task"><Pencil size={15}/></button><button className="icon-button task-more" onClick={() => deleteTask(task.id)} title="Delete task"><Trash2 size={15}/></button>
    </div>;
  })}</div> : <div className="empty-state"><CheckCircle2 size={25}/><strong>All clear for now</strong><span>Add a task to make your next study session count.</span></div>;

  if (loginScreen) return <div className={`login-screen ${dark ? "dark-mode" : ""}`}><div className="login-art"><div className="login-doodle doodle-book"><BookOpen size={44}/></div><div className="login-doodle doodle-spark"><Sparkles size={30}/></div><div className="login-brand"><span className="brand-mark"><GraduationCap size={25}/></span><span>studyflow<span className="brand-dot">.</span></span></div><h1>Make time for<br/><em>what matters.</em></h1><p>A calmer way to plan your studies, build consistency, and understand your focus.</p><div className="login-art-bottom"><span><Flame size={16}/> Small steps. Real streaks.</span><span><Brain size={16}/> Reflect. Learn. Improve.</span></div></div><form className="login-form-card" onSubmit={pendingCode ? verifyCode : signIn}><button type="button" className="login-close icon-button" onClick={() => setLoginScreen(false)} aria-label="Close"><X size={18}/></button><span className="eyebrow">YOUR STUDY SPACE</span>{pendingCode ? <><h2>Check your email</h2><p>Enter the 6-digit code we sent to {email}.</p><label>Verification code</label><div className="field-with-icon"><ShieldCheck size={17}/><input type="text" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))} placeholder="6-digit code"/></div><button className="primary-button login-submit" type="submit" disabled={authBusy}><LogIn size={17}/> Verify <ArrowRight size={17}/></button><p className="login-legal" style={{ cursor: "pointer" }} onClick={() => { setPendingCode(null); setCode(""); }}>Wrong email? Go back</p></> : <>{authMode === "login" ? <><h2>Welcome back</h2><p>Sign in to continue your study journey.</p></> : <><h2>Create your account</h2><p>Sync your tasks across devices.</p></>}<label>Email address</label><div className="field-with-icon"><UserRound size={17}/><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div>{authMode === "signup" && <><label>Your name</label><div className="field-with-icon"><UserRound size={17}/><input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?"/></div></>}<label>Password</label><div className="field-with-icon"><ShieldCheck size={17}/><input type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div><button className="primary-button login-submit" type="submit" disabled={authBusy}><LogIn size={17}/> Continue <ArrowRight size={17}/></button><div className="login-divider"><span/>or<span/></div><button className="google-button" type="button" onClick={() => setToast("Google sign-in needs OAuth credentials and a backend connection.")}><span className="google-g">G</span> Continue with Google</button><p className="login-legal"><ShieldCheck size={14}/> Passwords are securely hashed before storage.</p><p className="login-legal" style={{ cursor: "pointer" }} onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</p></>}</form></div>;

  return <div className={`app-shell ${dark ? "dark-mode" : ""}`}>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><GraduationCap size={24}/></span><span>studyflow<span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="profile-chip"><div className="avatar">S</div><div><strong>Student space</strong><span>Keep showing up</span></div><MoreHorizontal size={17}/></div>
      <nav>{["STUDY SPACE", "LIBRARY", "INSIGHTS"].map(group => <div className="nav-group" key={group}><span className="nav-label">{group}</span>{navItems.filter(n => n.group === group).map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${page === item.label ? "active" : ""}`} onClick={() => { setPage(item.label); setMobileNav(false); }}><Icon size={18}/><span>{item.label}</span>{item.label === "Pomodoro" && <span className="nav-new">FOCUS</span>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="streak-mini"><div className="streak-icon"><Flame size={19}/></div><div><strong>{streak} day streak</strong><span>Consistency over intensity</span></div></div><div className="sidebar-quote"><Sparkles size={15}/><span>One focused session is a win.</span></div><button className="profile-bottom" onClick={() => token ? signOut() : setLoginScreen(true)}><div className="avatar">{userName ? userName[0].toUpperCase() : "S"}</div><div><strong>{userName || "Your account"}</strong><span>{token ? "Synced account" : "Guest - saved on this device"}</span></div><Settings2 size={17}/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb"><span>Study space</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="topbar-actions"><div className="topbar-date"><CalendarDays size={15}/>{new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</div><button className="icon-button top-icon" title="Notifications" onClick={() => setToast("You're all caught up — keep going!") }><Bell size={18}/><i className="notification-dot"/></button><button className="theme-toggle" onClick={() => setDark(!dark)} title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun size={18}/> : <Moon size={18}/>}<span>{dark ? "Light" : "Dark"}</span></button></div></header>
      <div className="content-area">
        {page === "Dashboard" && <>
          <section className="welcome-row"><div><span className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL STUDY SPACE</span><h1>Small steps, <em>big progress.</em></h1><p>Make today count, one focused session at a time.</p></div><button className="primary-button" onClick={() => { setEditingTask(null); setTaskTitle(""); setTaskNotes(""); setTaskModal(true); }}><Plus size={17}/> Add a task</button><div className="welcome-doodle"><BookOpen size={36}/><span>✳</span><span>∑</span></div></section>
          <section className="stats-grid"><StatCard icon={Clock3} label="Focused today" value={`${Math.floor(minutesToday / 60)}h ${minutesToday % 60}m`} hint="Logged study time" tone="blue"/><StatCard icon={Flame} label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} hint="Keep the chain alive" tone="orange"/><StatCard icon={CheckCircle2} label="Tasks completed" value={`${completed}/${tasks.length}`} hint="Across your study plan" tone="green"/><StatCard icon={Award} label="Focus points" value={`${Math.floor(totalMinutes / 25) * 10 + completed * 5}`} hint="Earned by showing up" tone="violet"/></section>
          <div className="dashboard-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR PLAN</span><h2>Today's tasks</h2></div><button className="text-button" onClick={() => setPage("Study Planner")}>View all <ArrowRight size={14}/></button></div>{taskList(tasks.filter(t => t.due === TODAY()).slice(0, 4))}<button className="add-inline" onClick={() => { setEditingTask(null); setTaskTitle(""); setTaskNotes(""); setTaskModal(true); }}><Plus size={16}/> Add another task</button></section>
            <section className="panel focus-panel"><div className="panel-heading"><div><span className="eyebrow">STAY IN THE MOMENT</span><h2>Focus corner</h2></div><span className="focus-spark"><Sparkles size={18}/></span></div><div className="focus-circle"><div className="focus-circle-inner"><span>READY WHEN YOU ARE</span><strong>25:00</strong><small>minutes of focus</small></div></div><p className="focus-message">You don't need a perfect day.<br/>Just a place to begin.</p><button className="primary-button full-button" onClick={() => { setPage("Pomodoro"); setTimerMode("focus"); }}><Play size={16} fill="currentColor"/> Start a focus session</button><div className="focus-footer"><span><Coffee size={15}/> Breaks are productive, too</span></div></section>
            <section className="panel streak-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR CONSISTENCY</span><h2>Study streak calendar</h2></div><button className="text-button" onClick={() => setPage("Calendar")}>Full calendar <ArrowRight size={14}/></button></div><MonthGrid date={month} cells={calendarCells} onChangeMonth={setMonth} onSelect={setSelectedDate} selected={selectedDate} heatmap/><div className="heat-legend"><span>Less</span>{["heat-empty","heat-1","heat-2","heat-3","heat-4"].map(c => <i className={c} key={c}/>)}<span>More</span><span className="legend-note">Minutes studied per day</span></div></section>
            <section className="panel coach-panel"><div className="coach-top"><div className="coach-icon"><Brain size={20}/></div><div><span className="eyebrow">YOUR STUDY COACH</span><h2>A little guidance</h2></div><span className="demo-tag">STARTER</span></div><p>{tasks.filter(t => !t.done).length > 3 ? "You have a full plate. Pick the one task that matters most, then split it into small focus blocks. You can always re-plan later." : minutesToday === 0 ? "Try one 25-minute focus block on your highest-priority task. Put your phone away, write down distractions, and review how it went afterward." : "Nice work showing up today. Before your next block, take a 2-minute reset and choose one clear outcome for the session."}</p><button className="coach-action" onClick={() => { setPage("Pomodoro"); setToast("Tip: write a reflection after your focus session so you can spot patterns."); }}>Plan my next session <ArrowRight size={15}/></button><div className="coach-disclaimer"><CircleHelp size={13}/> Starter tips are rule-based. Connect an AI service for personalized coaching.</div></section></div>
        </>}
        {page === "Study Planner" && <><PageTitle eyebrow="MAKE A PLAN THAT FITS YOUR LIFE" title="Study planner" subtitle="Break your goals into manageable steps. Plans can change — progress still counts." action={<button className="primary-button" onClick={() => { setEditingTask(null); setTaskTitle(""); setTaskNotes(""); setTaskModal(true); }}><Plus size={17}/> New task</button>}/><div className="toolbar"><div className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks or subjects…"/></div><span className="result-count">{filteredTasks.length} tasks</span></div><section className="panel">{taskList(filteredTasks)}</section><section className="tip-strip"><Sparkles size={20}/><div><strong>Make the task smaller than your resistance.</strong><span>Give each task a clear finish line, then assign the number of focus sessions it needs.</span></div></section></>}
        {page === "Calendar" && <><PageTitle eyebrow="SEE THE BIG PICTURE" title="Your study calendar" subtitle="Every focused day leaves a mark. Select any date to see your planned tasks and logged study time."/><div className="calendar-page-grid"><section className="panel"><MonthGrid date={month} cells={calendarCells} onChangeMonth={setMonth} onSelect={setSelectedDate} selected={selectedDate} heatmap/><div className="heat-legend"><span>Less</span>{["heat-empty","heat-1","heat-2","heat-3","heat-4"].map(c => <i className={c} key={c}/>)}<span>More</span></div></section><section className="panel selected-day-panel"><span className="eyebrow">SELECTED DAY</span><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</h2><div className="day-summary"><div><Clock3 size={17}/><strong>{Math.floor((dailyStudy[selectedDate] || 0) / 60)}h {(dailyStudy[selectedDate] || 0) % 60}m</strong><span>focused</span></div><div><ListTodo size={17}/><strong>{tasks.filter(t => t.due === selectedDate).length}</strong><span>planned tasks</span></div></div><h3>Planned tasks</h3>{taskList(tasks.filter(t => t.due === selectedDate))}<button className="secondary-button full-button" onClick={() => { setTaskDue(selectedDate); setTaskModal(true); }}><Plus size={16}/> Plan something for this day</button><h3>Study log</h3>{logs.filter(l => l.date === selectedDate).length ? logs.filter(l => l.date === selectedDate).map(l => <div className="log-row" key={l.id}><i style={{ background: subjectFor(l.subjectId).color }}/><span>{l.task}<small>{subjectFor(l.subjectId).name}</small></span><strong>{l.minutes} min</strong></div>) : <p className="muted-text">No sessions logged for this day yet.</p>}</section></div></>}
        {page === "Pomodoro" && <><PageTitle eyebrow="FOCUS, REST, REPEAT" title="Pomodoro studio" subtitle="Choose your own rhythm. A session counts even when it isn't perfect."/><div className="pomodoro-layout"><section className="panel timer-panel"><div className="timer-tabs"><button className={timerMode === "focus" ? "active" : ""} onClick={() => switchTimerMode("focus")}><Brain size={15}/> Focus</button><button className={timerMode === "short" ? "active" : ""} onClick={() => switchTimerMode("short")}><Coffee size={15}/> Short break</button><button className={timerMode === "long" ? "active" : ""} onClick={() => switchTimerMode("long")}><Sun size={15}/> Long break</button></div><div className={`big-timer ${timerMode !== "focus" ? "break-timer" : ""}`}><div className="timer-ring"><div><span>{timerMode === "focus" ? "TIME TO FOCUS" : timerMode === "short" ? "A LITTLE RESET" : "REST & RECHARGE"}</span><strong>{fmtTime(secondsLeft)}</strong><small>{timerMode === "focus" ? "one thing at a time" : "step away from the screen"}</small></div></div></div><div className="timer-controls"><button className="primary-button timer-start" onClick={() => { if (secondsLeft === 0) setSecondsLeft((timerMode === "focus" ? studyMinutes : timerMode === "short" ? shortBreak : longBreak) * 60); setTimerRunning(!timerRunning); }}>{timerRunning ? <><Pause size={17}/> Pause</> : <><Play size={17} fill="currentColor"/> {secondsLeft === 0 ? "Start again" : "Start timer"}</>}</button><button className="secondary-button" onClick={() => { setTimerRunning(false); setSecondsLeft((timerMode === "focus" ? studyMinutes : timerMode === "short" ? shortBreak : longBreak) * 60); }}><RotateCcw size={16}/> Reset</button></div><div className="session-progress"><span>Completed focus sessions</span><strong>{sessionCount}</strong><div className="progress-track"><i style={{ width: `${Math.min(100, sessionCount % sessionsBeforeLong / sessionsBeforeLong * 100)}%` }}/></div><small>{sessionCount % sessionsBeforeLong || 0} of {sessionsBeforeLong} before a long break</small></div><button className="complete-session" onClick={logFocusSession}><CheckCircle2 size={16}/> Log a completed focus session</button></section>
          <div className="pomodoro-side"><section className="panel settings-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR RHYTHM</span><h2>Timer settings</h2></div><Settings2 size={19}/></div><label>Focus duration <strong>{studyMinutes} min</strong></label><input type="range" min="5" max="90" step="5" value={studyMinutes} onChange={e => setStudyMinutes(+e.target.value)}/><label>Short break <strong>{shortBreak} min</strong></label><input type="range" min="1" max="20" value={shortBreak} onChange={e => setShortBreak(+e.target.value)}/><label>Long break <strong>{longBreak} min</strong></label><input type="range" min="5" max="45" step="5" value={longBreak} onChange={e => setLongBreak(+e.target.value)}/><label>Focus sessions before long break</label><div className="choice-row">{[2,3,4,5].map(n => <button key={n} className={sessionsBeforeLong === n ? "selected" : ""} onClick={() => setSessionsBeforeLong(n)}>{n} sessions</button>)}</div><label htmlFor="pomodoro-task-name">What are you working on?</label><input id="pomodoro-task-name" className="pomodoro-task-input" value={pomodoroTask} onChange={e => setPomodoroTask(e.target.value)} placeholder="Type your task, e.g. revise Fourier transforms"/></section><section className="panel reflection-panel"><div className="panel-heading"><div><span className="eyebrow">AFTER THE SESSION</span><h2>Quick reflection</h2></div><NotebookPen size={19}/></div><p>What helped you focus? What pulled you away? A note today can help you plan better next time.</p><textarea value={sessionReflection} onChange={e => { setSessionReflection(e.target.value); setReflectionSaved(false); }} placeholder="I lost focus when… Next time I'll try…"/><button className="secondary-button full-button" onClick={() => { const task = tasks.find(t => t.title.trim().toLowerCase() === pomodoroTask.trim().toLowerCase()); if (task && sessionReflection.trim()) setTasks(old => old.map(t => t.id === task.id ? { ...t, notes: `${t.notes}${t.notes ? "\n" : ""}[${TODAY()} reflection] ${sessionReflection}` } : t)); setReflectionSaved(true); setToast(task ? "Reflection added to this task's notes" : "Reflection saved in this session view"); }}><NotebookPen size={15}/> Save reflection</button>{reflectionSaved && <span className="saved-note"><Check size={14}/> Reflection saved{pomodoroTask ? " to the selected task" : " for this view"}.</span>}</section></div></div></>}
        {page === "Attendance" && <><PageTitle eyebrow="YOUR CLASSES, YOUR RECORD" title="Self attendance" subtitle="Add your subjects, select a date, and mark present or absent. Attendance is calculated from dates you mark." action={!attendanceSubject ? <span className="inline-count">{subjects.length} subjects</span> : <button className="secondary-button" onClick={() => setAttendanceSubject(null)}><ChevronLeft size={16}/> All subjects</button>}/>{!attendanceSubject ? <><form className="panel add-subject-form" onSubmit={addSubject}><div className="form-heading-icon"><BookOpen size={20}/></div><div className="form-fields"><label htmlFor="subjectName">Add a subject</label><input id="subjectName" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Digital Signal Processing" required/><span>Choose a colour so your subjects are easy to recognise.</span></div><label className="subject-color-control"><span>Subject colour</span><input type="color" value={subjectColor} onChange={e => setSubjectColor(e.target.value)} aria-label="Choose any subject colour"/></label><button className="primary-button" type="submit"><Plus size={16}/> Add subject</button></form><div className="subject-card-grid">{subjects.map(s => { const data = attendance[s.id] || {}; const total = Object.keys(data).length; const present = Object.values(data).filter(v => v === "present").length; const absent = Object.values(data).filter(v => v === "absent").length; const pct = total ? Math.round(present / total * 100) : 0; return <button className="subject-attendance-card" key={s.id} onClick={() => { setAttendanceSubject(s.id); setSelectedAttendanceDate(TODAY()); }}><div className="subject-card-top"><span className="subject-color-icon" style={{ background: s.color }}><BookOpen size={18}/></span><ChevronRight size={18}/></div><strong>{s.name}</strong><span className="subject-attendance-meta">{total} marked classes · {pct}% attendance</span><div className="progress-track"><i style={{ width: `${pct}%`, background: s.color }}/></div><div className="subject-card-foot"><span><i className="present-dot"/> {present} present</span><span><i className="absent-dot"/> {absent} absent</span></div></button>; })}</div></> : <><div className="attendance-subject-heading"><div className="subject-color-icon large" style={{ background: subjectFor(attendanceSubject).color }}><BookOpen size={21}/></div><div><h2>{subjectFor(attendanceSubject).name}</h2><p>Tap a date, then mark your attendance below.</p></div></div><div className="attendance-layout"><section className="panel attendance-calendar-panel"><MonthGrid date={attendanceMonth} cells={attendanceCells} onChangeMonth={setAttendanceMonth} onSelect={setSelectedAttendanceDate} selected={selectedAttendanceDate} marks={attendanceData}/><div className="attendance-legend"><span><i className="present-dot"/> Present</span><span><i className="absent-dot"/> Absent</span><span><i className="unmarked-dot"/> Not marked</span></div><div className="mark-date-box"><span className="eyebrow">SELECTED DATE</span><strong>{new Date(`${selectedAttendanceDate}T12:00:00`).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong><div className="mark-actions"><button className="mark-present" onClick={() => markAttendance(selectedAttendanceDate, "present")}><CheckCircle2 size={16}/> Mark present</button><button className="mark-absent" onClick={() => markAttendance(selectedAttendanceDate, "absent")}><X size={16}/> Mark absent</button><button className="mark-clear" onClick={() => markAttendance(selectedAttendanceDate)}><RotateCcw size={15}/> Clear</button></div></div></section><section className="attendance-summary"><div className="attendance-percent-card"><span>ATTENDANCE PERCENTAGE</span><strong>{attendancePct}%</strong><div className="progress-track"><i style={{ width: `${attendancePct}%`, background: subjectFor(attendanceSubject).color }}/></div><small>{attendancePct >= 75 ? "You're above the usual 75% threshold." : "Keep an eye on your attendance and plan ahead."}</small></div><div className="attendance-stat-grid"><div><span>Total classes</span><strong>{totalClasses}</strong></div><div><span>Present</span><strong className="present-text">{presentClasses}</strong></div><div><span>Absent</span><strong className="absent-text">{absentClasses}</strong></div></div><div className="attendance-reminder"><Bell size={18}/><div><strong>Close the loop</strong><p>If you marked a class absent, add a follow-up task to collect notes or review the missed topic.</p><button className="text-button" onClick={() => { setTaskTitle(`Catch up: ${subjectFor(attendanceSubject).name}`); setTaskSubject(attendanceSubject); setTaskDue(TODAY()); setTaskModal(true); }}>Create catch-up task <ArrowRight size={14}/></button></div></div><button className="text-button delete-subject" onClick={() => { if (window.confirm(`Remove ${subjectFor(attendanceSubject).name} and its attendance history?`)) { setSubjects(old => old.filter(s => s.id !== attendanceSubject)); setAttendance(old => { const next = { ...old }; delete next[attendanceSubject]; return next; }); setAttendanceSubject(null); } }}>Remove subject and attendance history</button></section></div></>}</>}
        {page === "My Notes" && <><PageTitle eyebrow="YOUR PERSONAL LIBRARY" title="Notes & resources" subtitle="Keep your study materials organised by subject so they're easy to find." action={<label className="primary-button upload-button"><Upload size={17}/> Upload files<input type="file" multiple onChange={uploadNotes}/></label>}/><div className="notes-toolbar"><div className="search-field"><Search size={16}/><input value={noteSearch} onChange={e => setNoteSearch(e.target.value)} placeholder="Find a file…"/></div><select value={noteSubject} onChange={e => setNoteSubject(e.target.value)}><option value="">All subjects</option>{subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></div><div className="notes-grid">{notes.filter(n => n.name.toLowerCase().includes(noteSearch.toLowerCase()) && (!noteSubject || n.subjectId === noteSubject)).map(n => <div className="note-card" key={n.id}><div className="file-icon"><FileText size={23}/></div><div className="note-card-title"><strong>{n.name}</strong><span>{subjectFor(n.subjectId).name}</span></div><div className="note-card-meta"><span>{n.kind}</span><span>{n.size}</span><span>{n.date}</span></div><button className="icon-button" title="Remove from library" onClick={() => setNotes(old => old.filter(x => x.id !== n.id))}><Trash2 size={15}/></button></div>)}</div>{!notes.length && <div className="panel upload-empty"><div className="upload-empty-icon"><FolderOpen size={28}/></div><h2>Your library, all in one place</h2><p>Upload PDFs, slides, and other files to organise a personal study library.</p><label className="secondary-button upload-button"><Upload size={16}/> Choose files<input type="file" multiple onChange={uploadNotes}/></label><small>Starter UI stores file names and details only; actual file storage and secure access need backend storage.</small></div>}</>}
        {page === "Analytics" && <><PageTitle eyebrow="NOTICE YOUR PROGRESS" title="Progress & insights" subtitle="Look for patterns, celebrate your effort, and adjust without judgement."/><section className="stats-grid"><StatCard icon={Clock3} label="Total focus time" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} hint="All logged sessions" tone="blue"/><StatCard icon={Flame} label="Current streak" value={`${streak} days`} hint="Days with study time" tone="orange"/><StatCard icon={Target} label="Tasks finished" value={String(completed)} hint="Completed tasks" tone="green"/><StatCard icon={TrendingUp} label="Study days" value={String(Object.values(dailyStudy).filter(v => v > 0).length)} hint="Days with at least one log" tone="violet"/></section><div className="analytics-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">LAST 7 DAYS</span><h2>Study time</h2></div><Activity size={19}/></div><div className="bar-chart">{weekMinutes.map(d => <div className="bar-column" key={d.label}><span>{d.minutes ? `${Math.round(d.minutes)}m` : "—"}</span><div className="bar-track"><i style={{ height: `${Math.max(3, d.minutes / Math.max(60, ...weekMinutes.map(x => x.minutes)) * 100)}%` }}/></div><small>{d.label}</small></div>)}</div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">BY SUBJECT</span><h2>Where time went</h2></div><BookOpen size={19}/></div>{subjectMinutes.map(s => <div className="subject-progress-row" key={s.id}><div><i style={{ background: s.color }}/><span>{s.name}</span><strong>{Math.floor(s.minutes / 60)}h {s.minutes % 60}m</strong></div><div className="progress-track"><i style={{ width: `${totalMinutes ? s.minutes / totalMinutes * 100 : 0}%`, background: s.color }}/></div></div>)}{!totalMinutes && <p className="muted-text">Log focus sessions to see your subject breakdown.</p>}</section><section className="panel insights-panel"><div className="coach-icon"><Brain size={20}/></div><div><span className="eyebrow">REFLECTION, NOT PRESSURE</span><h2>Your weekly check-in</h2><p>{totalMinutes === 0 ? "Start with one focus session and come back to review your patterns. Your data should help you, not judge you." : `You've logged ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m of focus time so far. Choose a realistic target for next week, and protect a few short blocks for your hardest subject.`}</p><button className="secondary-button" onClick={() => setPage("Pomodoro")}>Plan next session <ArrowRight size={15}/></button></div></section></div></>}
        {page === "Subjects" && <><PageTitle eyebrow="MAKE IT YOURS" title="Your subjects" subtitle="Add subjects, choose a colour, and use the same colour across your study space."/><form className="panel add-subject-form" onSubmit={addSubject}><div className="form-heading-icon"><BookOpen size={20}/></div><div className="form-fields"><label htmlFor="subjectName2">Subject name</label><input id="subjectName2" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Probability & Statistics" required/><span>Pick a shade from your colour palette.</span></div><label className="subject-color-control"><span>Subject colour</span><input type="color" value={subjectColor} onChange={e => setSubjectColor(e.target.value)} aria-label="Choose any subject colour"/></label><button className="primary-button"><Plus size={16}/> Add subject</button></form><div className="subject-management-grid">{subjects.map(s => <div className="subject-manage-card" key={s.id}><span className="subject-color-icon" style={{ background: s.color }}><BookOpen size={19}/></span><div><strong>{s.name}</strong><span>{tasks.filter(t => t.subjectId === s.id).length} tasks · {notes.filter(n => n.subjectId === s.id).length} files</span></div><button className="icon-button" onClick={() => { const name = window.prompt("Rename subject", s.name); if (name?.trim()) setSubjects(old => old.map(x => x.id === s.id ? { ...x, name: name.trim() } : x)); }} title="Rename"><Pencil size={15}/></button><label className="subject-inline-color" title="Choose any subject colour"><span className="color-swatch" style={{ background: s.color }}/><input type="color" value={s.color} aria-label={`Change colour for ${s.name}`} onChange={e => setSubjects(old => old.map(x => x.id === s.id ? { ...x, color: e.target.value } : x))}/></label></div>)}</div></>}
        <footer className="app-footer"><span>studyflow<span className="brand-dot">.</span> <span className="footer-separator">·</span> built for steady progress</span><span><ShieldCheck size={13}/> Your study space, your pace.</span></footer>
      </div>
    </main>
    {taskModal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setTaskModal(false); }}><form className="task-modal" onSubmit={addTask}><div className="modal-heading"><div><span className="eyebrow">{editingTask ? "REFINE YOUR PLAN" : "MAKE A LITTLE PLAN"}</span><h2>{editingTask ? "Edit task" : "Add a task"}</h2></div><button type="button" className="icon-button" onClick={() => setTaskModal(false)}><X size={19}/></button></div><label>What do you want to get done?</label><input autoFocus required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Practice convolution problems"/><div className="form-two-col"><div><label>Subject</label><select value={taskSubject} onChange={e => setTaskSubject(e.target.value)}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label>Due date</label><input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}/></div></div><div className="form-two-col"><div><label>Priority</label><select value={taskPriority} onChange={e => setTaskPriority(e.target.value as Task["priority"])}><option>Low</option><option>Medium</option><option>High</option></select></div><div><label>Estimated focus sessions</label><input type="number" min="1" max="30" value={taskSessions} onChange={e => setTaskSessions(Math.max(1, Number(e.target.value)))}/></div></div><label>Notes (optional)</label><textarea value={taskNotes} onChange={e => setTaskNotes(e.target.value)} placeholder="What does done look like? Add a reminder to yourself…"/><div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setTaskModal(false)}>Cancel</button><button className="primary-button" type="submit"><Check size={16}/>{editingTask ? "Save changes" : "Add to plan"}</button></div></form></div>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}

function StatCard({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: string; hint: string; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span><span className="stat-doodle">✳</span></div>;
}
function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <section className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</section>;
}
