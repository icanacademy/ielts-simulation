import { useState, useEffect, useCallback, useRef } from 'react';

export const useTimer = (initialSeconds = 0, countDown = true) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = useCallback((totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Start the timer
  const start = useCallback(() => {
    // Don't start if already running and not paused
    if (isRunning && !isPaused) return;

    // Clear any existing interval before starting
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;

    intervalRef.current = setInterval(() => {
      if (countDown) {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setSeconds(prev => prev + 1);
      }
      elapsedRef.current += 1;
    }, 1000);
  }, [isRunning, isPaused, countDown]);

  // Pause the timer
  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;

    clearInterval(intervalRef.current);
    setIsPaused(true);
  }, [isRunning, isPaused]);

  // Resume the timer
  const resume = useCallback(() => {
    if (!isPaused) return;
    start();
  }, [isPaused, start]);

  // Stop the timer
  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  // Reset the timer
  const reset = useCallback((newSeconds = initialSeconds) => {
    clearInterval(intervalRef.current);
    setSeconds(newSeconds);
    setIsRunning(false);
    setIsPaused(false);
    elapsedRef.current = 0;
    startTimeRef.current = null;
  }, [initialSeconds]);

  // Get elapsed time in seconds
  const getElapsedTime = useCallback(() => {
    return elapsedRef.current;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate progress percentage (for both countdown and count-up)
  const progress = countDown && initialSeconds > 0
    ? ((initialSeconds - seconds) / initialSeconds) * 100
    : !countDown && seconds > 0
      ? Math.min((seconds / 3600) * 100, 100) // For count-up, show progress towards 1 hour max
      : 0;

  // Check if time is running low (less than 5 minutes)
  const isLowTime = countDown && seconds > 0 && seconds <= 300;

  // Check if time is critical (less than 1 minute)
  const isCriticalTime = countDown && seconds > 0 && seconds <= 60;

  return {
    seconds,
    remainingSeconds: seconds, // Alias for countdown compatibility
    isRunning,
    isPaused,
    formattedTime: formatTime(seconds),
    progress,
    isLowTime,
    isCriticalTime,
    isComplete: countDown && seconds === 0,
    start,
    pause,
    resume,
    stop,
    reset,
    getElapsedTime
  };
};

export default useTimer;
