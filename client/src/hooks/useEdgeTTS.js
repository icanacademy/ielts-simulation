import { useState, useEffect, useRef, useCallback } from 'react';
import { ttsAPI } from '../services/api';

/**
 * Hook for Server TTS (Google TTS - Free)
 * Provides natural-sounding speech for IELTS with different accents
 */
export const useEdgeTTS = () => {
  const [voices, setVoices] = useState({});
  const [selectedVoice, setSelectedVoice] = useState('en-US-Neural2-C');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // Load available voices on mount
  useEffect(() => {
    loadVoices();
    return () => {
      // Cleanup audio URL on unmount
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const loadVoices = async () => {
    try {
      const { data } = await ttsAPI.getVoices();
      setVoices(data);
      if (data.defaultVoice) {
        setSelectedVoice(data.defaultVoice);
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
      // Use default voice list if API fails
      setVoices({
        voices: {
          'en-US-Neural2-C': { name: 'American Female', accent: 'American', gender: 'Female' },
          'en-US-Neural2-A': { name: 'American Male', accent: 'American', gender: 'Male' },
        },
        defaultVoice: 'en-US-Neural2-C'
      });
    }
  };

  /**
   * Speak text using Edge TTS
   * @param {string} text - Text to speak
   * @param {object} options - Options { voice, rate, onProgress, onComplete }
   */
  const speak = useCallback(async (text, options = {}) => {
    const {
      voice = selectedVoice,
      rate = '-5%',
      onProgress,
      onComplete
    } = options;

    if (!text || text.trim().length === 0) {
      setError('No text provided');
      return;
    }

    // Stop any current playback
    stop();

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setIsPaused(false);

    try {
      // Generate audio from server
      const response = await ttsAPI.speak(text, voice, rate);

      // Create audio blob and URL
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });

      // Revoke previous URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setIsLoading(false);
      };

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          const currentProgress = (audio.currentTime / audio.duration) * 100;
          setProgress(currentProgress);
          if (onProgress) onProgress(currentProgress, audio.currentTime, audio.duration);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(100);
        if (onComplete) onComplete();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsLoading(false);
      };

      await audio.play();
      setIsPlaying(true);

      return new Promise((resolve) => {
        audio.onended = () => {
          setIsPlaying(false);
          setProgress(100);
          if (onComplete) onComplete();
          resolve();
        };
      });
    } catch (err) {
      console.error('TTS Error:', err);
      setError(err.response?.data?.error || 'Failed to generate speech');
      setIsLoading(false);
      throw err;
    }
  }, [selectedVoice]);

  /**
   * Stop current playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  }, []);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, []);

  /**
   * Resume playback
   */
  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsPaused(false);
        })
        .catch(err => console.error('Resume failed:', err));
    }
  }, []);

  /**
   * Test a voice with a sample phrase
   */
  const testVoice = useCallback(async (voice) => {
    try {
      setIsLoading(true);
      const response = await ttsAPI.testVoice(voice);

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Test voice error:', err);
      setError('Failed to test voice');
      setIsLoading(false);
    }
  }, []);

  /**
   * Get voices grouped by accent
   */
  const getVoicesByAccent = useCallback(() => {
    return voices.byAccent || {};
  }, [voices]);

  /**
   * Get recommended voices for IELTS (British and Australian)
   */
  const getIELTSVoices = useCallback(() => {
    const voiceList = voices.voices || {};
    return Object.entries(voiceList)
      .filter(([id, info]) => ['British', 'Australian'].includes(info.accent))
      .map(([id, info]) => ({ id, ...info }));
  }, [voices]);

  /**
   * Get all available voices as array
   */
  const getAllVoices = useCallback(() => {
    const voiceList = voices.voices || {};
    return Object.entries(voiceList).map(([id, info]) => ({ id, ...info }));
  }, [voices]);

  return {
    // State
    voices: voices.voices || {},
    selectedVoice,
    isLoading,
    isPlaying,
    isPaused,
    error,
    progress,

    // Actions
    speak,
    stop,
    pause,
    resume,
    testVoice,
    setSelectedVoice,

    // Helpers
    getVoicesByAccent,
    getIELTSVoices,
    getAllVoices,

    // Audio ref for direct access
    audioElement: audioRef.current
  };
};

export default useEdgeTTS;
