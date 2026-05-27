export type ActionOk<T = undefined> = { ok: true } & (T extends undefined ? object : { data: T });
export type ActionError = { ok: false; error: string };
export type ActionResult<T = undefined> = ActionOk<T> | ActionError;

export function ok(): ActionOk;
export function ok<T>(data: T): ActionOk<T>;
export function ok<T>(data?: T): ActionOk<T> {
  return (data === undefined ? { ok: true } : { ok: true, data }) as ActionOk<T>;
}

export function fail(error: string): ActionError {
  return { ok: false, error };
}

export function isError<T>(result: ActionResult<T>): result is ActionError {
  return result.ok === false;
}
