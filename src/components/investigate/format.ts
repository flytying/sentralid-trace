export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.|web\.|m\.)?/, "").replace(/\/$/, "");
}

export function formatDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
