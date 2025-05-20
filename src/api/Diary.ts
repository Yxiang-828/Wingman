export interface DiaryEntry {
  id: number;
  date: string;
  title: string;
  content: string;
}

export async function fetchDiaryEntries(date: string): Promise<DiaryEntry[]> {
  const res = await fetch(`/api/v1/diary/${date}`);
  return res.json();
}

export async function addDiaryEntry(entry: Omit<DiaryEntry, "id">): Promise<DiaryEntry> {
  const res = await fetch(`/api/v1/diary/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  return res.json();
}

export async function updateDiaryEntry(entry: DiaryEntry): Promise<DiaryEntry> {
  const res = await fetch(`/api/v1/diary/${entry.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  return res.json();
}

export async function deleteDiaryEntry(id: number): Promise<void> {
  await fetch(`/api/v1/diary/${id}`, { method: "DELETE" });
}