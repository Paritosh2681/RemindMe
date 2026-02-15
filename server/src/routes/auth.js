import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { run, get } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sign up
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'That doesn\'t look like a valid email.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password needs to be at least 6 characters.' });
  }

  const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [
      email.toLowerCase().trim(),
      hash,
    ]);

    const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ user: { id: result.lastInsertRowid, email: email.toLowerCase().trim() } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
});

// Log in
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({ user: { id: user.id, email: user.email } });
});

// Log out
router.post('/logout', (_req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ ok: true });
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const user = get('SELECT id, email FROM users WHERE id = ?', [req.userId]);
  if (!user) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'User not found.' });
  }
  res.json({ user });
});

export default router;
