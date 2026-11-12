export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string };

export const okResult = <T,>(message?: string, data?: T): ActionResult<T> => ({ ok: true, message, data });
export const errResult = (error: string): ActionResult<never> => ({ ok: false, error });
