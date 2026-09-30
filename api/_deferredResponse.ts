import type { VercelResponse } from "@vercel/node";

/** Keep JSON responses pending until awaited request cleanup is complete. */
export function deferJsonResponse(res: VercelResponse) {
  const send = res.json.bind(res);
  let pending = false;
  let body: unknown;
  res.json = (value) => {
    body = value;
    pending = true;
    return res;
  };
  return () => {
    res.json = send;
    if (pending) {
      pending = false;
      send(body);
    }
  };
}
