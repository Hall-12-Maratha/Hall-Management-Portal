/**
 * Next.js instrumentation hook.
 *
 * On long-running Node hosts (not Vercel) you can opt in to an in-process
 * hourly scheduler with ENABLE_IN_PROCESS_SCHEDULER=true, replicating the
 * APScheduler behaviour of the FastAPI backend. On Vercel the daily cron plus
 * the lazy maintenance hooks cover the same work.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_IN_PROCESS_SCHEDULER !== "true") return;

  const globalRef = globalThis as typeof globalThis & { __hmpScheduler?: NodeJS.Timeout };
  if (globalRef.__hmpScheduler) return;

  const { runAllJobs } = await import("./lib/server/jobs");

  const run = () => {
    runAllJobs().catch((err) => console.error("[scheduler] run failed:", err));
  };

  // First run shortly after boot, then hourly.
  setTimeout(run, 10_000).unref();
  globalRef.__hmpScheduler = setInterval(run, 60 * 60 * 1000);
  globalRef.__hmpScheduler.unref();
  console.info("[scheduler] In-process hourly maintenance scheduler started.");
}
