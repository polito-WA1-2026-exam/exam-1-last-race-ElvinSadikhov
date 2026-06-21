import { useState, useEffect, useRef } from 'react';

export default function useCountdown(initialSeconds, onExpire) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (timeLeft === 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) onExpireRef.current();
  }, [timeLeft]);

  return timeLeft;
}
