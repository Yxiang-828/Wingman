import type { DiaryEntry } from "../api/Diary";

export interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  mood: string;
  user_id: string;
  created_at: string;  // Timestamp format from DB: '2025-05-22 20:32:14.15151+00'
  entry_date: string;  // Date format from DB: '2025-05-23'
  updated_at: string;  // Timestamp format from DB: '2025-05-23 08:26:17.52363+00'
  date?: string;       // This appears to be an alias for entry_date in some places
}

export interface MonthData {
  name: string;
  entries: DiaryEntry[];
  count: number;
}