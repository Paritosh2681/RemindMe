import { Router } from 'express';
import { run, get, all } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get all assignments for current user
router.get('/', authenticate, (req, res) => {
  const assignments = all(
    'SELECT * FROM assignments WHERE user_id = ? ORDER BY due_date ASC, created_at DESC',
    [req.userId]
  );

  res.json({ assignments });
});

// Add assignment
router.post('/', authenticate, (req, res) => {
  const { title, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Give your assignment a name.' });
  }

  if (!dueDate) {
    return res.status(400).json({ error: 'When is it due?' });
  }

  // Basic date validation
  const parsed = new Date(dueDate);
  if (isNaN(parsed.getTime())) {
    return res.status(400).json({ error: 'That date doesn\'t look right.' });
  }

  const result = run(
    'INSERT INTO assignments (user_id, title, due_date) VALUES (?, ?, ?)',
    [req.userId, title.trim(), dueDate]
  );

  const assignment = get('SELECT * FROM assignments WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ assignment });
});

// Toggle completed
router.patch('/:id/toggle', authenticate, (req, res) => {
  const assignment = get(
    'SELECT * FROM assignments WHERE id = ? AND user_id = ?',
    [Number(req.params.id), req.userId]
  );

  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  run('UPDATE assignments SET completed = ? WHERE id = ?', [
    assignment.completed ? 0 : 1,
    assignment.id,
  ]);

  const updated = get('SELECT * FROM assignments WHERE id = ?', [assignment.id]);
  res.json({ assignment: updated });
});

// Delete assignment
router.delete('/:id', authenticate, (req, res) => {
  const assignment = get(
    'SELECT * FROM assignments WHERE id = ? AND user_id = ?',
    [Number(req.params.id), req.userId]
  );

  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  run('DELETE FROM assignments WHERE id = ?', [assignment.id]);
  res.json({ ok: true });
});

export default router;
