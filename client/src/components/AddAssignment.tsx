import { useState, type FormEvent } from 'react';
import { addAssignment, type Assignment } from '../api';

interface Props {
  onAdded: (assignment: Assignment) => void;
}

export default function AddAssignment({ onAdded }: Props) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Minimum date is today
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const data = await addAssignment(title.trim(), dueDate);
      onAdded(data.assignment);
      setTitle('');
      setDueDate('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card add-card">
      <div className="add-card-header">Add New Assignment</div>
      <form onSubmit={handleSubmit}>
        <div className="add-form-row">
          <div className="input-group">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="input-date-group">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              min={today}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? '…' : 'Add'}
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
      </form>
    </div>
  );
}
