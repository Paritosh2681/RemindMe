import { Router } from 'express';
import webPush from 'web-push';
import cron from 'node-cron';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

let isPushConfigured = false;

// Configure web-push
export function setupWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('⚠ VAPID keys not set. Run `npm run generate-vapid` and add them to .env');
    return;
  }

  webPush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:dev@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  isPushConfigured = true;
  console.log('Web Push configured.');
}

// Get VAPID public key (client needs this)
router.get('/vapid-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

// Save push subscription
router.post('/subscribe', authenticate, async (req, res) => {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription.' });
  }

  try {
    // Upsert: delete old subscription for this endpoint, insert new
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [subscription.endpoint]);

    await query(
      'INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth) VALUES ($1, $2, $3, $4)',
      [req.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
});

// Unsubscribe
router.post('/unsubscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    try {
      await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [
        endpoint,
        req.userId,
      ]);
    } catch (err) {
      console.error('Unsubscribe error:', err);
    }
  }
  res.json({ ok: true });
});

// Send notifications for pending assignments
async function sendPendingNotifications() {
  if (!isPushConfigured) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Find assignments that are not completed and due date >= today
    const assignmentsResult = await query(
      `SELECT a.*, u.email FROM assignments a 
       JOIN users u ON a.user_id = u.id
       WHERE a.completed = false AND a.due_date >= $1`,
      [today]
    );

    const assignments = assignmentsResult.rows;

    for (const assignment of assignments) {
      const subsResult = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [
        assignment.user_id,
      ]);
      const subscriptions = subsResult.rows;

      if (subscriptions.length === 0) continue;

      const dueDate = new Date(assignment.due_date);
      const todayDate = new Date(today);
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let body;
      if (diffDays === 0) {
        body = `"${assignment.title}" is due today.`;
      } else if (diffDays === 1) {
        body = `"${assignment.title}" is due tomorrow.`;
      } else {
        body = `"${assignment.title}" is due in ${diffDays} days.`;
      }

      const payload = JSON.stringify({
        title: 'RemindMe',
        body,
        tag: `assignment-${assignment.id}`,
        data: { assignmentId: assignment.id },
      });

      for (const sub of subscriptions) {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        };

        webPush.sendNotification(pushSub, payload).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or invalid — remove it
            await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
          } else {
            console.error('Push error:', err.message);
          }
        });
      }
    }
  } catch (err) {
    console.error('Notification cron error:', err);
  }
}

// Check every day at 9 AM and 7 PM
export function scheduleNotifications() {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn('⚠ Skipping notification scheduling (no VAPID keys).');
    return;
  }

  cron.schedule('0 9 * * *', () => {
    console.log('Sending morning notifications...');
    sendPendingNotifications();
  });

  cron.schedule('0 19 * * *', () => {
    console.log('Sending evening notifications...');
    sendPendingNotifications();
  });

  console.log('Notification scheduler active (9 AM & 7 PM).');
}

// Manual trigger for testing
router.post('/test-send', authenticate, async (_req, res) => {
  await sendPendingNotifications();
  res.json({ ok: true, message: 'Notifications sent for pending assignments.' });
});

export default router;
