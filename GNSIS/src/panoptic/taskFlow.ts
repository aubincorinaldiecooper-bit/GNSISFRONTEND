// What happens to a task typed into the landing's bar.
//
//   submit task → access enabled? ─ no  → early-access form, task kept
//                                 └ yes → Video Search session, task handed over
//
// Nobody has Video Search access yet and there is no session screen, so
// currentAccess() says no and every task goes to early access, where it is
// stored exactly as typed with the sign-up. Switching access on later means
// giving currentAccess() a real answer and a real session address; the rest of
// this flow already handles the "yes" branch.

export interface VideoSearchAccess {
  enabled: boolean;
  /** Where a session starts. Access without a place to go is not access. */
  sessionPath: string | null;
}

export type TaskDestination =
  | { kind: "early-access"; task: string }
  | { kind: "session"; task: string; path: string };

export function currentAccess(): VideoSearchAccess {
  return { enabled: false, sessionPath: null };
}

export function routeTask(task: string, access: VideoSearchAccess = currentAccess()): TaskDestination {
  if (access.enabled && access.sessionPath) {
    return { kind: "session", task, path: access.sessionPath };
  }
  return { kind: "early-access", task };
}

export const PENDING_TASK_KEY = "gnsis.videoSearch.pendingTask";

/** Keeps the task for the session screen, so a reload on arrival does not lose it. */
export function handOffTask(task: string): void {
  try {
    window.sessionStorage.setItem(PENDING_TASK_KEY, task);
  } catch {
    // Storage can be off (private windows); the task also travels in history state.
  }
}

/** Reads and clears a handed-over task. For the session screen, when it exists. */
export function takePendingTask(): string | null {
  try {
    const task = window.sessionStorage.getItem(PENDING_TASK_KEY);
    window.sessionStorage.removeItem(PENDING_TASK_KEY);
    return task;
  } catch {
    return null;
  }
}
