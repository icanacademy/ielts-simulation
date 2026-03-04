import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  const audioRef = useRef(new Audio());
  const animationRef = useRef(null);
  const onEndedCallbackRef = useRef(null);

  // Update current time during playback
  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // Load audio from URL or Blob
  const loadAudio = useCallback(async (source) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsReady(false);
      setHasEnded(false);

      // Stop any current playback
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);

      // Store the old src for cleanup
      const oldSrc = audioRef.current.src;

      // Set the source
      let newSrc;
      if (source instanceof Blob) {
        // Validate blob has content
        if (!source || source.size < 100) {
          throw new Error('Invalid audio blob: too small or empty');
        }
        newSrc = URL.createObjectURL(source);
        console.log(`Created blob URL for audio: ${source.size} bytes`);
      } else if (typeof source === 'string' && source.length > 0) {
        newSrc = source;
      } else {
        throw new Error('Invalid audio source');
      }

      audioRef.current.src = newSrc;

      // Revoke OLD blob URL after setting new one (not before)
      if (oldSrc && oldSrc.startsWith('blob:') && oldSrc !== newSrc) {
        URL.revokeObjectURL(oldSrc);
      }

      // Wait for audio to be ready with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Audio load timeout'));
        }, 30000); // 30 second timeout

        const cleanup = () => {
          clearTimeout(timeout);
          audioRef.current.removeEventListener('canplaythrough', handleCanPlay);
          audioRef.current.removeEventListener('error', handleError);
        };

        const handleCanPlay = () => {
          cleanup();
          setDuration(audioRef.current.duration);
          resolve();
        };

        const handleError = (e) => {
          cleanup();
          const errorMsg = e?.target?.error?.message || 'Unknown audio error';
          reject(new Error('Failed to load audio: ' + errorMsg));
        };

        audioRef.current.addEventListener('canplaythrough', handleCanPlay);
        audioRef.current.addEventListener('error', handleError);

        // Also handle loadedmetadata as fallback
        audioRef.current.onloadedmetadata = () => {
          setDuration(audioRef.current.duration);
        };

        // Trigger load
        audioRef.current.load();
      });

      setIsLoading(false);
      setIsReady(true);
      setCurrentTime(0);
      console.log(`Audio loaded successfully, duration: ${audioRef.current.duration}s`);
    } catch (err) {
      console.error('Audio load error:', err);
      setError(err.message);
      setIsLoading(false);
      setIsReady(false);
    }
  }, []);

  // Play audio
  const play = useCallback(async () => {
    try {
      // Ensure we have a valid source before playing
      if (!audioRef.current.src || audioRef.current.src === '') {
        throw new Error('No audio source loaded');
      }
      await audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
      setHasEnded(false);
      animationRef.current = requestAnimationFrame(updateProgress);
      console.log('Audio playback started');
    } catch (err) {
      console.error('Failed to play audio:', err);
      setError('Failed to play audio: ' + err.message);
    }
  }, [updateProgress]);

  // Pause audio
  const pause = useCallback(() => {
    audioRef.current.pause();
    setIsPlaying(false);
    setIsPaused(true);
    cancelAnimationFrame(animationRef.current);
  }, []);

  // Stop audio
  const stop = useCallback(() => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    cancelAnimationFrame(animationRef.current);
  }, []);

  // Seek to position
  const seek = useCallback((time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Set playback rate
  const setPlaybackRate = useCallback((rate) => {
    audioRef.current.playbackRate = rate;
  }, []);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Set onEnded callback
  const setOnEnded = useCallback((callback) => {
    onEndedCallbackRef.current = callback;
  }, []);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      console.log('Audio ended naturally at', audio.currentTime);
      setIsPlaying(false);
      setIsPaused(false);
      setHasEnded(true);
      setCurrentTime(duration);
      cancelAnimationFrame(animationRef.current);

      // Call the callback if set
      if (onEndedCallbackRef.current) {
        onEndedCallbackRef.current();
      }
    };

    const handlePause = () => {
      // Only log if we didn't expect the pause (i.e., not from our pause() function)
      console.log('Audio paused at', audio.currentTime, '/', audio.duration);
    };

    const handleError = (e) => {
      console.error('Audio error event:', e);
      setIsPlaying(false);
      setError('Audio playback error');
    };

    const handleStalled = () => {
      console.warn('Audio stalled - buffering or network issue');
    };

    const handleWaiting = () => {
      console.log('Audio waiting for data...');
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('waiting', handleWaiting);
      cancelAnimationFrame(animationRef.current);
    };
  }, [duration]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    isPlaying,
    isPaused,
    isLoading,
    isReady,
    hasEnded,
    error,
    duration,
    currentTime,
    progress,
    formattedCurrentTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    loadAudio,
    play,
    pause,
    stop,
    seek,
    setPlaybackRate,
    setOnEnded
  };
};

export default useAudioPlayer;
