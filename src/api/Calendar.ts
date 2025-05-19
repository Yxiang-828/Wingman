export interface Task {
  id: number;
  date: string; // "YYYY-MM-DD"
  text: string;
  completed: boolean;
}

export async function fetchTasks(date: string): Promise<Task[]> {
  const res = await fetch(`/api/v1/tasks/${date}`);
  return res.json();
}

export async function addTask(task: Omit<Task, "id">): Promise<Task> {
  const res = await fetch(`/api/v1/tasks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function updateTask(task: Task): Promise<Task> {
  const res = await fetch(`/api/v1/tasks/${task.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function deleteTask(id: number): Promise<void> {
  await fetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
}