import type { ApiCurrent, ApiEntries, CarEntry } from "@/types";

const BASE = "/api";

export async function fetchCurrent(): Promise<ApiCurrent> {
  const res = await fetch(`${BASE}/current`);
  return res.json();
}

export async function fetchEntries(category?: string): Promise<ApiEntries> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const res = await fetch(`${BASE}/entries?${params}`);
  return res.json();
}

export async function fetchEntry(id: number): Promise<CarEntry> {
  const res = await fetch(`${BASE}/entries/${id}`);
  return res.json();
}
