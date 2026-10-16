export function sessionHeaders(
  roomId: string,
  role: "HOST" | "PLAYER",
): Record<string, string> {
  const token = sessionStorage.getItem(
    `${role.toLowerCase()}Session:${roomId}`,
  );
  return token ? { Authorization: `Bearer ${token}` } : {};
}
