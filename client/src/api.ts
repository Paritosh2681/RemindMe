const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

// Auth
export function signup(email: string, password: string) {
  return request<{ user: User }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export function getMe() {
  return request<{ user: User }>('/auth/me');
}

// Assignments
export function getAssignments() {
  return request<{ assignments: Assignment[] }>('/assignments');
}

export function addAssignment(title: string, dueDate: string) {
  return request<{ assignment: Assignment }>('/assignments', {
    method: 'POST',
    body: JSON.stringify({ title, dueDate }),
  });
}

export function toggleAssignment(id: number) {
  return request<{ assignment: Assignment }>(`/assignments/${id}/toggle`, {
    method: 'PATCH',
  });
}

export function deleteAssignment(id: number) {
  return request<{ ok: boolean }>(`/assignments/${id}`, {
    method: 'DELETE',
  });
}

// Notifications
export function getVapidKey() {
  return request<{ key: string }>('/notifications/vapid-key');
}

export function subscribePush(subscription: PushSubscription) {
  return request<{ ok: boolean }>('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  });
}

export function unsubscribePush(endpoint: string) {
  return request<{ ok: boolean }>('/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  });
}

export function testNotification() {
  return request<{ ok: boolean }>('/notifications/test-send', {
    method: 'POST',
  });
}

// Types
export interface User {
  id: number;
  email: string;
}

export interface Assignment {
  id: number;
  user_id: number;
  title: string;
  due_date: string;
  completed: number;
  created_at: string;
}
