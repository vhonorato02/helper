const TODOIST_API_URL = 'https://api.todoist.com/api/v1';

export type TodoistTaskInput = {
  content: string;
  description?: string;
  project_id?: string;
  parent_id?: string;
  priority?: number;
  labels?: string[];
  due_date?: string;
  due_datetime?: string;
};

export type TodoistTask = TodoistTaskInput & { id: string; is_completed?: boolean };

function getTodoistToken() {
  const token = process.env.TODOIST_API_TOKEN;
  if (!token) throw new Error('TODOIST_API_TOKEN não configurado.');
  return token;
}

async function todoistRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${TODOIST_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getTodoistToken()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 1000);
    throw new Error(`Todoist ${response.status}: ${body}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function helperPriorityToTodoist(priority: 'baixa' | 'media' | 'alta' | 'urgente') {
  return { baixa: 1, media: 2, alta: 3, urgente: 4 }[priority];
}

export function createTodoistTask(input: TodoistTaskInput) {
  return todoistRequest<TodoistTask>('/tasks', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTodoistTask(id: string, input: Partial<TodoistTaskInput>) {
  return todoistRequest<TodoistTask>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function closeTodoistTask(id: string) {
  return todoistRequest<void>(`/tasks/${encodeURIComponent(id)}/close`, { method: 'POST' });
}

export function reopenTodoistTask(id: string) {
  return todoistRequest<void>(`/tasks/${encodeURIComponent(id)}/reopen`, { method: 'POST' });
}
