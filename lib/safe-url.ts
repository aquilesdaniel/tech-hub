export function isHttpUrl(value: unknown) {
  try {
    const { protocol } = new URL(String(value));
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
