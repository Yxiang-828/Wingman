export interface User {
  id: string;
  name: string;
}

export async function registerUser(
  name: string,
  password: string,
  email?: string
): Promise<User> {
  const res = await fetch("/api/v1/user/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password, email }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function loginUser(password: string): Promise<User> {
  const res = await fetch("/api/v1/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateUser(user_id: string, name?: string): Promise<User> {
  const res = await fetch(`/api/v1/user/${user_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}