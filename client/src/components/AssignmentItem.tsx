import { useState } from 'react';
import { toggleAssignment, deleteAssignment, type Assignment } from '../api';

interface Props {
  assignment: Assignment;
  onUpdated: (a: Assignment) => void;
  onDeleted: (id: number) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays <= 7 && diffDays > 1) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function isOverdue(dateStr: string, completed: boolean): boolean {
  if (completed) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

export default function AssignmentItem({ assignment, onUpdated, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    try {
      const data = await toggleAssignment(assignment.id);
      onUpdated(data.assignment);
    } catch {
      // leave as is
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this assignment?')) return;
    setBusy(true);
    try {
      await deleteAssignment(assignment.id);
      onDeleted(assignment.id);
    } catch {
      setBusy(false);
    }
  }

  const overdue = isOverdue(assignment.due_date, !!assignment.completed);
  const done = !!assignment.completed;

  return (
    <div className={`assignment-item${done ? ' item-completed' : ''}`}>
      <div className="checkbox-wrapper">
        <button
          className={`custom-checkbox ${done ? 'checked' : ''}`}
          onClick={handleToggle}
          disabled={busy}
          aria-label={done ? "Mark as not done" : "Mark as done"}
        >
          {done && (
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
               <polyline points="20 6 9 17 4 12"></polyline>
             </svg>
          )}
        </button>
      </div>

      <div className="assignment-content">
        <div className="task-title">{assignment.title}</div>
        <div className={`task-date ${overdue ? 'is-overdue' : ''}`}>
           {overdue && !done && <span>Overdue • </span>}
           <span>{formatDate(assignment.due_date)}</span>
        </div>
      </div>

      <button
        className="delete-btn"
        onClick={handleDelete}
        disabled={busy}
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}
