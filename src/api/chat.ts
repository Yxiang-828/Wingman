export interface ChatMessage {
  id: number;
  user_id: string;
  message: string;
  timestamp: string;
}

export async function fetchChatHistory(user_id: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/v1/chat/${user_id}`);
  return res.json();
}

export async function sendChatMessage(user_id: string, message: string, timestamp: string): Promise<ChatMessage> {
  const res = await fetch(`/api/v1/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, message, timestamp }),
  });
  return res.json();
}