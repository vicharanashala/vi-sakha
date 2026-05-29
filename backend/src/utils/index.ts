// Backend global utilities and helpers
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function cleanString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}
