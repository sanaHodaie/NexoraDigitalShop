import React, { useEffect, useState } from 'react';
import { toPersianDigits } from '../utils/formatters';

export default function AnimatedCounter({
  value,
  duration = 1200,
  formatter = (val) => toPersianDigits(Math.round(val).toLocaleString()),
  decimals = 0,
  prefix = '',
  suffix = ''
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const targetValue = Number(value) || 0;
    const startValue = 0;

    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // Quartic ease out for super smooth organic deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (targetValue - startValue) * easeOutQuart;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  const formattedNum = decimals > 0
    ? toPersianDigits(displayValue.toFixed(decimals))
    : toPersianDigits(Math.round(displayValue).toLocaleString());

  return (
    <span className="tabular-nums tracking-normal inline-block">
      {prefix}
      {formattedNum}
      {suffix}
    </span>
  );
}
