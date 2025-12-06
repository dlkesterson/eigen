import { useEffect, useState } from 'react';
import { useSpring } from 'framer-motion';

interface CounterProps {
  value: number;
  formattingFn?: (value: number) => string;
  className?: string;
}

export function Counter({ value, formattingFn, className }: CounterProps) {
  const springValue = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const [displayValue, setDisplayValue] = useState(formattingFn ? formattingFn(0) : '0');

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (current) => {
      setDisplayValue(formattingFn ? formattingFn(current) : Math.round(current).toLocaleString());
    });
    return unsubscribe;
  }, [springValue, formattingFn]);

  return <span className={className}>{displayValue}</span>;
}
