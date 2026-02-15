import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAssignments, logout, type Assignment } from '../api';
import AddAssignment from '../components/AddAssignment';
import AssignmentItem from '../components/AssignmentItem';
import NotificationPrompt from '../components/NotificationPrompt';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    try {
      const data = await getAssignments();
      setAssignments(data.assignments);
    } catch {
      // silently fail; user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  function handleAdded(assignment: Assignment) {
    setAssignments((prev) => {
      const next = [...prev, assignment];
      next.sort((a, b) => a.due_date.localeCompare(b.due_date));
      return next;
    });
  }

  function handleUpdated(updated: Assignment) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }

  function handleDeleted(id: number) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  const pending = assignments.filter((a) => !a.completed);
  const completed = assignments.filter((a) => a.completed);

  return (
    <div className="dashboard">
      <header className="top-bar">
        <div className="app-logo">RemindMe</div>
        <div className="user-controls">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="btn-text">
            Log out
          </button>
        </div>
      </header>

      <main className="main-content">
        <AddAssignment onAdded={handleAdded} />

        {loading ? (
          <div className="loading-container">Loading assignments...</div>
        ) : (
          <>
            <div className="card list-card">
              <div className="list-header">
                <span>Pending</span>
                <span>{pending.length}</span>
              </div>
              
              {pending.length === 0 ? (
                <div className="empty-state">No pending assignments.</div>
              ) : (
                pending.map((a) => (
                  <AssignmentItem
                    key={a.id}
                    assignment={a}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                  />
                ))
              )}
            </div>

            {completed.length > 0 && (
              <div className="card list-card" style={{ marginTop: '24px', opacity: 0.8 }}>
                <div className="list-header">
                  <span>Completed</span>
                  <span>{completed.length}</span>
                </div>
                {completed.map((a) => (
                  <AssignmentItem
                    key={a.id}
                    assignment={a}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <NotificationPrompt />
    </div>
  );
}
