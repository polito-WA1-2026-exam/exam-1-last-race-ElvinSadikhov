import { useState, useEffect, useRef } from 'react';

export default function useCountdown(initialSeconds, onExpire) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const onExpireRef = useRef(onExpire);

  // Keep the ref current so the interval always calls the latest callback.
  useEffect(() => { onExpireRef.current = onExpire; });

  // Schedule the next tick. Stops scheduling when timeLeft reaches 0.
  useEffect(() => {
    if (timeLeft === 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  // Fire the expire callback once, in a dedicated effect with no side effects mixed in.
  useEffect(() => {
    if (timeLeft === 0) onExpireRef.current();
  }, [timeLeft]);

  return timeLeft;
}
