import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { verifyCredentials, getUserById } from './services/authService.js';
import { AppError, UnauthorizedError, NotFoundError } from './errors/AppError.js';
import { networkService } from './services/NetworkService.js';

// ─── Passport ─────────────────────────────────────────────────────────────────

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await verifyCredentials(email, password);
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
  secret: 'lastrace-secret-key', // in production: read from env var
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
app.use(passport.authenticate('session'));

// ─── Middleware helpers ────────────────────────────────────────────────────────

export function isLoggedIn(req, _res, next) {
  if (req.isAuthenticated()) return next();
  next(new UnauthorizedError());
}

// ─── Network routes ───────────────────────────────────────────────────────────

app.get('/api/network', (_req, res) => {
  res.json(networkService.getNetworkData());
});

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(new UnauthorizedError(info?.message ?? 'Login failed'));
    req.login(user, err => {
      if (err) return next(err);
      res.json(user);
    });
  })(req, res, next);
});

app.get('/api/sessions/current', (req, res, next) => {
  if (req.isAuthenticated()) return res.json(req.user);
  next(new UnauthorizedError());
});

app.delete('/api/sessions/current', isLoggedIn, (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.status(204).end();
  });
});

// ─── 404 + Error middleware ────────────────────────────────────────────────────

app.use((_req, _res, next) => next(new NotFoundError('Route not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err instanceof AppError ? err.status : (err.status ?? 500);
  const body = err.errors
    ? { error: err.message, errors: err.errors }
    : { error: err.message };
  if (status === 500) console.error(err);
  res.status(status).json(body);
});

process.on('unhandledRejection', err => { console.error('Unhandled rejection:', err); process.exit(1); });

// ─── Start ────────────────────────────────────────────────────────────────────

networkService.init()
  .then(() => app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)))
  .catch(err => { console.error('Failed to init NetworkService:', err); process.exit(1); });

export default app;
