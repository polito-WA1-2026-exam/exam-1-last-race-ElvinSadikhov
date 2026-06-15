import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { getUserByCredentials, getUserById } from './dao/usersDao.js';
import { AppError } from './errors/AppError.js';

// ─── Passport ─────────────────────────────────────────────────────────────────

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await getUserByCredentials(email, password);
      done(null, user);
    } catch (err) {
      done(null, false, { message: err.message });
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await getUserById(id);
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();
const PORT = 3001;

app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(session({
  secret: 'lastrace-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
app.use(passport.authenticate('session'));

// ─── Middleware helpers ────────────────────────────────────────────────────────

export function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message ?? 'Login failed' });
    req.login(user, err => {
      if (err) return next(err);
      res.json(user);
    });
  })(req, res, next);
});

app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) return res.json(req.user);
  res.status(401).json({ error: 'Not authenticated' });
});

app.delete('/api/sessions/current', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.status(204).end();
  });
});

// ─── Error middleware ──────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err instanceof AppError ? err.status : 500;
  const body = { error: err.message };
  if (err.errors) body.errors = err.errors;
  if (status === 500) console.error(err);
  res.status(status).json(body);
});

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

export default app;
