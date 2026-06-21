import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { body, param, validationResult } from 'express-validator';
import { verifyCredentials, getUserById } from './services/authService.js';
import { startGame, submitRoute, getRanking } from './services/gameService.js';
import { AppError, UnauthorizedError, NotFoundError, ValidationError } from './errors/AppError.js';
import { networkService } from './services/NetworkService.js';

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

export function isLoggedIn(req, _res, next) {
  if (req.isAuthenticated()) return next();
  next(new UnauthorizedError());
}

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(new ValidationError('Invalid request body', errors.array()));
  next();
}

app.get('/api/network', (_req, res) => {
  res.json(networkService.getNetworkData());
});

app.post('/api/sessions',
  body('email').isString().withMessage('email is required').bail().trim().notEmpty().withMessage('email is required'),
  body('password').isString().withMessage('password is required').bail().notEmpty().withMessage('password is required'),
  validate,
  (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return next(new UnauthorizedError(info?.message ?? 'Login failed'));
      req.login(user, err => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  }
);

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

app.post('/api/games', isLoggedIn, async (req, res) => {
  const result = await startGame(req.user.id);
  res.status(201).json(result);
});

app.post('/api/games/:id/route',
  isLoggedIn,
  param('id').isInt({ min: 1 }).withMessage('Game ID must be a positive integer'),
  body('segments').isArray().withMessage('segments must be an array'),
  body('segments.*.from').isInt().withMessage('segment.from must be an integer'),
  body('segments.*.to').isInt().withMessage('segment.to must be an integer'),
  validate,
  async (req, res) => {
    const gameId = Number(req.params.id);
    const { segments } = req.body;
    const result = await submitRoute(gameId, req.user.id, segments);
    res.json(result);
  }
);

app.get('/api/ranking', isLoggedIn, async (_req, res) => {
  const ranking = await getRanking();
  res.json(ranking);
});

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

networkService.init()
  .then(() => app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)))
  .catch(err => { console.error('Failed to init NetworkService:', err); process.exit(1); });

export default app;
