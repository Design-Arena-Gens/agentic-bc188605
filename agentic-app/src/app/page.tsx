"use client";

import { useMemo, useState } from "react";
import { addDays, format, isBefore } from "date-fns";

import { generateCaption } from "@/lib/caption";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { VideoTask } from "@/types/planner";

const defaultTime = "10:00";

const statusStyles: Record<VideoTask["status"], string> = {
  draft: "bg-slate-100 text-slate-700",
  ready: "bg-blue-100 text-blue-700",
  queued: "bg-amber-100 text-amber-700",
  publishing: "bg-purple-100 text-purple-700",
  published: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

const industries = [
  { label: "General", value: "" },
  { label: "Fitness", value: "fitness" },
  { label: "Food", value: "food" },
  { label: "Travel", value: "travel" },
  { label: "Education", value: "education" },
  { label: "Fashion", value: "fashion" },
];

const initialTaskDraft = (): Omit<VideoTask, "id" | "status" | "createdAt" | "updatedAt"> => ({
  date: new Date().toISOString().slice(0, 10),
  time: defaultTime,
  title: "",
  caption: "",
  hashtags: [],
  videoUrl: "",
  autopost: true,
  notes: "",
});

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

export default function Home() {
  const [tasks, setTasks, hydrated] = usePersistentState<VideoTask[]>("daily-video-agent-tasks", []);
  const [draft, setDraft] = useState(() => initialTaskDraft());
  const [industry, setIndustry] = useState<(typeof industries)[number]["value"]>("");
  const [topic, setTopic] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [hook, setHook] = useState("");
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  const groupedTasks = useMemo(() => {
    return tasks.reduce<Record<string, VideoTask[]>>((acc, task) => {
      acc[task.date] = acc[task.date] ?? [];
      acc[task.date].push(task);
      acc[task.date].sort((a, b) => a.time.localeCompare(b.time));
      return acc;
    }, {});
  }, [tasks]);

  const upcomingDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(new Date(), index);
      const id = format(date, "yyyy-MM-dd");
      return {
        id,
        label: format(date, "EEEE"),
        display: format(date, "MMM d"),
        tasks: groupedTasks[id] ?? [],
      };
    });
  }, [groupedTasks]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((task) => {
      const scheduledAt = new Date(`${task.date}T${task.time}`);
      return isBefore(scheduledAt, now) && task.status !== "published";
    });
  }, [tasks]);

  const saveTaskDraft = () => {
    const newTask: VideoTask = {
      ...draft,
      id: createId(),
      status: draft.autopost ? "queued" : "ready",
      hashtags: draft.hashtags.map((tag) => tag.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks((current) => [...current, newTask]);
    setDraft(initialTaskDraft());
    setHook("");
    setTopic("");
    setCallToAction("");
  };

  const updateTask = (taskId: string, updates: Partial<VideoTask>) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task)),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const handlePublish = async (task: VideoTask) => {
    setIsPublishing(task.id);
    updateTask(task.id, { status: "publishing" });

    try {
      const response = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: task.videoUrl,
          caption: [task.caption, task.hashtags.join(" ")].filter(Boolean).join("\n\n"),
        }),
      });

      const result = (await response.json()) as {
        status: string;
        message: string;
        instagramMediaId?: string;
      };

      if (response.ok && result.status === "success") {
        updateTask(task.id, {
          status: "published",
          notes: `Published with media id ${result.instagramMediaId ?? "unknown"}`,
        });
      } else {
        updateTask(task.id, {
          status: "failed",
          notes: result?.message ?? "Failed to publish video.",
        });
      }
    } catch (error) {
      updateTask(task.id, {
        status: "failed",
        notes: error instanceof Error ? error.message : "Unexpected error while publishing.",
      });
    } finally {
      setIsPublishing(null);
    }
  };

  const handleCaptionGenerate = () => {
    const output = generateCaption({
      hook,
      topic,
      callToAction,
      industry: (industry || undefined) as never,
    });

    setDraft((prev) => ({
      ...prev,
      caption: output,
      hashtags: output
        .split(/\s+/)
        .filter((word) => word.startsWith("#"))
        .map((tag) => tag.trim()),
    }));
  };

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <p className="animate-pulse text-lg">Booting the Instagram video agent…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-6 py-12 text-slate-900">
      <section className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              Daily Instagram Upload Agent
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
              Automate your daily Instagram video drops
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              Plan, stage, and push one reel per day. Drop in a video URL, dial-in the caption, and ship directly to
              Instagram using your Graph API credentials. This agent keeps the pipeline full and the posting streak alive.
            </p>
          </div>
          <div className="flex h-full min-w-[18rem] flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-950 px-6 py-5 text-white">
            <div>
              <span className="text-sm uppercase text-slate-400">Streak</span>
              <p className="mt-2 text-4xl font-semibold">
                {groupedTasks[new Date().toISOString().slice(0, 10)]?.some((task) => task.status === "published")
                  ? "On Track"
                  : "Schedule Today's Drop"}
              </p>
            </div>
            <div>
              <span className="text-sm uppercase text-slate-400">Queued</span>
              <p className="mt-2 text-4xl font-semibold">
                {tasks.filter((task) => task.status === "queued" || task.status === "ready").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Plan & Stage</h2>
            <p className="mt-2 text-sm text-slate-500">
              Generate a caption, attach the video URL (must be publicly reachable), and this agent handles the publish
              workflow via Instagram&apos;s Graph API. For direct uploads you&apos;ll need a storage bucket, CDN link, or
              Meta-hosted video URL.
            </p>

            <form
              className="mt-6 grid gap-6 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveTaskDraft();
              }}
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Video title</label>
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Teaser: Day 5 mobility flow"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Video URL</label>
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="https://..."
                  value={draft.videoUrl}
                  onChange={(event) => setDraft((prev) => ({ ...prev, videoUrl: event.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Scheduled date</label>
                <input
                  type="date"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  value={draft.date}
                  onChange={(event) => setDraft((prev) => ({ ...prev, date: event.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Drop time</label>
                <input
                  type="time"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  value={draft.time}
                  onChange={(event) => setDraft((prev) => ({ ...prev, time: event.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Caption</label>
                <textarea
                  className="min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Daily drop 🎬 ..."
                  value={draft.caption}
                  onChange={(event) => setDraft((prev) => ({ ...prev, caption: event.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Hashtags (comma separated)</label>
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="#DailyDrop, #Reels"
                  value={draft.hashtags.join(", ")}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      hashtags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Auto-publish?</label>
                <select
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  value={draft.autopost ? "yes" : "no"}
                  onChange={(event) => setDraft((prev) => ({ ...prev, autopost: event.target.value === "yes" }))}
                >
                  <option value="yes">Queue for automatic publish</option>
                  <option value="no">Manual review</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Internal notes</label>
                <textarea
                  className="min-h-[80px] rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Remind the editor to trim intro, mention CTA..."
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>

              <div className="flex gap-3 md:col-span-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Stage Video
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                  onClick={handleCaptionGenerate}
                >
                  Auto-caption
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Caption Builder Assist</h2>
            <p className="mt-2 text-sm text-slate-500">
              Set the framing once, then generate drafts for each drop. The assistant will stitch the caption and hashtags.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Hook / opener</label>
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Stop scrolling! Try this 60s mobility blast…"
                  value={hook}
                  onChange={(event) => setHook(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Topic</label>
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Hip mobility stretch routine"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Call to action</label>
                <input
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Comment 'Stretch' and I’ll DM you the playlist."
                  value={callToAction}
                  onChange={(event) => setCallToAction(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Industry</label>
                <select
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                >
                  {industries.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Automation Checklist</h2>
            <ol className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="font-semibold text-slate-900">1. Supply credentials</strong>
                <p className="mt-2 leading-relaxed">
                  Add <code>INSTAGRAM_USER_ID</code>, <code>INSTAGRAM_ACCESS_TOKEN</code>, and optional{" "}
                  <code>INSTAGRAM_GRAPH_API_VERSION</code> to your Vercel environment. Generate these inside Meta Business
                  Suite &gt; Apps &gt; Instagram Graph API.
                </p>
              </li>
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="font-semibold text-slate-900">2. Host the video</strong>
                <p className="mt-2 leading-relaxed">
                  Instagram requires a publicly reachable <code>video_url</code>. Use object storage (S3, GCS, Supabase
                  Storage) or Meta hosting, then paste the HTTPS link in the form.
                </p>
              </li>
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="font-semibold text-slate-900">3. Schedule the drop</strong>
                <p className="mt-2 leading-relaxed">
                  Each staged task lands in your local pipeline. Enable Vercel Cron with <code>vercel cron add</code> or
                  run a daily GitHub Action hitting <code>/api/instagram/publish</code> with the queued task payload.
                </p>
              </li>
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="font-semibold text-slate-900">4. Monitor status</strong>
                <p className="mt-2 leading-relaxed">
                  Completed posts flip to <em>Published</em>. Failures capture the API error for a quick retry.
                </p>
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Overdue queue</h2>
            <p className="mt-2 text-sm text-slate-500">
              Anything stuck before today shows up here. Clear the board to protect the daily streak.
            </p>
            <div className="mt-4 space-y-4">
              {overdueTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  On track — no overdue reels.
                </div>
              ) : (
                overdueTasks.map((task) => (
                  <article key={task.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <header className="flex items-center justify-between">
                      <h3 className="font-semibold text-rose-900">{task.title || "Untitled video"}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}>
                        {task.status}
                      </span>
                    </header>
                    <p className="mt-2 text-sm text-rose-700">
                      Scheduled for {task.date} at {task.time}
                    </p>
                    <p className="mt-2 text-xs text-rose-600">{task.notes || "No error message captured yet."}</p>
                    <div className="mt-3 flex gap-2 text-sm font-medium">
                      <button
                        className="rounded-lg bg-rose-600 px-3 py-2 text-white shadow-sm transition hover:bg-rose-700"
                        onClick={() => handlePublish(task)}
                        disabled={isPublishing === task.id}
                      >
                        {isPublishing === task.id ? "Publishing…" : "Publish now"}
                      </button>
                      <button
                        className="rounded-lg border border-rose-300 px-3 py-2 text-rose-700 transition hover:border-rose-500 hover:text-rose-900"
                        onClick={() => updateTask(task.id, { status: "ready" })}
                      >
                        Reset to ready
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">7-day runway</h2>
            <p className="text-sm text-slate-500">
              Anchor one video a day. Drag next-day ideas into the staging form above and this board keeps the cadence.
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-7">
          {upcomingDays.map((day) => (
            <div key={day.id} className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <header>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{day.label}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{day.display}</h3>
              </header>

              <div className="space-y-3">
                {day.tasks.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-400">
                    Empty slot. Stage a video to lock the streak.
                  </p>
                ) : (
                  day.tasks.map((task) => (
                    <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <header className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-slate-400">{task.time}</p>
                          <h4 className="text-sm font-semibold text-slate-900">{task.title || "Untitled video"}</h4>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}>
                          {task.status}
                        </span>
                      </header>

                      <p className="mt-3 text-xs text-slate-500">{task.caption}</p>

                      {task.hashtags.length > 0 && (
                        <p className="mt-3 text-xs font-medium text-slate-600">{task.hashtags.join(" ")}</p>
                      )}

                      {task.notes && (
                        <p className="mt-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">Notes:</span> {task.notes}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          onClick={() => handlePublish(task)}
                          disabled={isPublishing === task.id}
                        >
                          {isPublishing === task.id ? "Publishing…" : "Publish now"}
                        </button>
                        <button
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                          onClick={() => updateTask(task.id, { status: task.status === "ready" ? "queued" : "ready" })}
                        >
                          Toggle ready
                        </button>
                        <button
                          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
                          onClick={() => deleteTask(task.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
