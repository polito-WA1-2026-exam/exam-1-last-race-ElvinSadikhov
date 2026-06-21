import { networkService } from './NetworkService.js';
import { getAllEvents } from '../dao/eventsDao.js';
import { createGame, getGameByIdAndUser, saveGameResult, getRanking as getRankingDao } from '../dao/gamesDao.js';
import { NotFoundError, ConflictError } from '../errors/AppError.js';

function validateRoute(segments, startId, destId) {
  if (!segments || segments.length === 0)
    return { valid: false, reason: 'Route is empty' };

  if (segments[0].from !== startId)
    return { valid: false, reason: 'Route does not start at the assigned station' };

  if (segments[segments.length - 1].to !== destId)
    return { valid: false, reason: 'Route does not end at the assigned destination' };

  const seen = new Set();
  for (const seg of segments) {
    const edgeLines = networkService.getEdgeLines(seg.from, seg.to);
    if (edgeLines.size === 0)
      return { valid: false, reason: `Segment ${seg.from}→${seg.to} does not exist in the network` };

    const key = `${Math.min(seg.from, seg.to)}-${Math.max(seg.from, seg.to)}`;
    if (seen.has(key))
      return { valid: false, reason: `Segment ${seg.from}→${seg.to} appears more than once` };
    seen.add(key);
  }

  let activeLines = networkService.getEdgeLines(segments[0].from, segments[0].to);

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];

    if (prev.to !== curr.from)
      return { valid: false, reason: `Segments are not connected at step ${i}` };

    const currLines = networkService.getEdgeLines(curr.from, curr.to);
    const shared = new Set([...activeLines].filter(l => currLines.has(l)));

    if (shared.size > 0) {
      activeLines = shared;
    } else {
      if (!networkService.isInterchange(curr.from))
        return { valid: false, reason: `Line change at station ${curr.from} is not allowed — not an interchange` };
      activeLines = currLines;
    }
  }

  return { valid: true };
}

function calculateScore(segments, events) {
  let coins = 20;
  const steps = segments.map((seg, i) => {
    coins += events[i].effect;
    return {
      from: seg.from,
      to: seg.to,
      fromName: networkService.getStationName(seg.from),
      toName: networkService.getStationName(seg.to),
      event: { description: events[i].description, effect: events[i].effect },
      coinsAfter: coins,
    };
  });
  return { steps, finalScore: Math.max(0, coins) };
}

export async function startGame(userId) {
  const { startId, destId } = networkService.getRandomGamePair();
  const gameId = await createGame(userId, startId, destId);
  return {
    gameId,
    startStation: { id: startId, name: networkService.getStationName(startId) },
    destStation:  { id: destId,  name: networkService.getStationName(destId)  },
  };
}

export async function submitRoute(gameId, userId, segments) {
  const game = await getGameByIdAndUser(gameId, userId);
  if (!game) throw new NotFoundError('Game not found');
  if (game.status !== 'active') throw new ConflictError('Game already completed');

  const { valid, reason } = validateRoute(segments, game.start_station_id, game.dest_station_id);

  if (!valid) {
    await saveGameResult(gameId, 0);
    return { valid: false, reason, steps: null, finalScore: 0 };
  }

  const allEvents = await getAllEvents();
  const pickedEvents = segments.map(() => allEvents[Math.floor(Math.random() * allEvents.length)]);

  const { steps, finalScore } = calculateScore(segments, pickedEvents);
  await saveGameResult(gameId, finalScore);

  return { valid: true, steps, finalScore };
}

export async function getRanking() {
  return getRankingDao();
}
