import { useEffect } from 'react';
import useTimer from '../../hooks/useTimer';

const Timer = ({
  initialSeconds,
  onTimeUp,
  onTick,
  autoStart = false,
  showProgress = true,
  size = 'md'
}) => {
  const {
    seconds,
    isRunning,
    formattedTime,
    progress,
    isLowTime,
    isCriticalTime,
    isComplete,
    start,
    pause,
    resume,
    reset
  } = useTimer(initialSeconds, true);

  // Auto start timer
  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart, start]);

  // Handle time up
  useEffect(() => {
    if (isComplete && onTimeUp) {
      onTimeUp();
    }
  }, [isComplete, onTimeUp]);

  // Tick callback
  useEffect(() => {
    if (isRunning && onTick) {
      onTick(seconds);
    }
  }, [seconds, isRunning, onTick]);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const getTimerColor = () => {
    if (isCriticalTime) return 'text-red-600 animate-pulse';
    if (isLowTime) return 'text-orange-500';
    return 'text-gray-800';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Timer Display */}
      <div className={`font-mono font-bold ${sizeClasses[size]} ${getTimerColor()}`}>
        {formattedTime}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isCriticalTime ? 'bg-red-500' : isLowTime ? 'bg-orange-400' : 'bg-blue-500'
            }`}
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      )}

      {/* Warning Messages */}
      {isLowTime && !isCriticalTime && (
        <p className="text-orange-500 text-sm font-medium">Less than 5 minutes remaining!</p>
      )}
      {isCriticalTime && (
        <p className="text-red-600 text-sm font-bold animate-pulse">Less than 1 minute remaining!</p>
      )}
    </div>
  );
};

export const TimerControls = ({ timer }) => {
  const { isRunning, isPaused, start, pause, resume, reset } = timer;

  return (
    <div className="flex gap-2">
      {!isRunning && !isPaused && (
        <button
          onClick={start}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Start
        </button>
      )}
      {isRunning && !isPaused && (
        <button
          onClick={pause}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
        >
          Pause
        </button>
      )}
      {isPaused && (
        <button
          onClick={resume}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Resume
        </button>
      )}
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
      >
        Reset
      </button>
    </div>
  );
};

export default Timer;
