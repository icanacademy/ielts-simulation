import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Text-to-Speech with enhanced voice selection
 * Prioritizes natural-sounding voices available on the system
 */
export const useTTS = () => {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState(null);

  const utteranceRef = useRef(null);
  const sentencesRef = useRef([]);
  const currentIndexRef = useRef(0);
  const onCompleteRef = useRef(null);

  // Voice quality rankings - higher is better
  const voiceQuality = {
    // Premium/Enhanced voices (macOS)
    'Daniel': 100,           // British - Perfect for IELTS
    'Karen': 95,             // Australian - Great for IELTS
    'Moira': 90,             // Irish English
    'Samantha': 85,          // American (Enhanced version is excellent)
    'Alex': 80,              // American - Very natural
    'Fiona': 75,             // Scottish
    'Tessa': 70,             // South African
    'Rishi': 65,             // Indian English
    // Google voices (Chrome)
    'Google UK English Male': 90,
    'Google UK English Female': 90,
    'Google US English': 80,
    // Microsoft voices (Edge)
    'Microsoft Zira': 75,
    'Microsoft David': 75,
    'Microsoft Mark': 70,
    // Other decent voices
    'Nicky': 60,
    'Tom': 55,
    'Victoria': 50,
  };

  // Categorize voices by accent for IELTS
  const accentPriority = {
    'en-GB': 100,  // British - most common in IELTS
    'en-AU': 90,   // Australian - common in IELTS
    'en-IE': 85,   // Irish
    'en-NZ': 80,   // New Zealand
    'en-US': 70,   // American
    'en-IN': 65,   // Indian
    'en-ZA': 60,   // South African
    'en': 50,      // Generic English
  };

  // Load and sort voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();

      // Filter English voices and sort by quality
      const englishVoices = availableVoices
        .filter(v => v.lang.startsWith('en'))
        .map(voice => {
          // Calculate quality score
          const nameScore = Object.entries(voiceQuality).reduce((score, [name, quality]) => {
            if (voice.name.includes(name)) return Math.max(score, quality);
            return score;
          }, 0);

          const accentScore = accentPriority[voice.lang] || 40;
          const enhancedBonus = voice.name.includes('Enhanced') || voice.name.includes('Premium') ? 20 : 0;
          const localBonus = voice.localService ? 10 : 0; // Local voices often sound better

          return {
            voice,
            name: voice.name,
            lang: voice.lang,
            quality: nameScore + accentScore + enhancedBonus + localBonus,
            isEnhanced: voice.name.includes('Enhanced') || voice.name.includes('Premium'),
            accent: getAccentName(voice.lang)
          };
        })
        .sort((a, b) => b.quality - a.quality);

      setVoices(englishVoices);

      // Auto-select best voice
      if (englishVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(englishVoices[0]);
      }
    };

    // Load voices (may need to wait for them)
    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Retry loading after a delay (some browsers load voices async)
    const timeout = setTimeout(loadVoices, 500);
    return () => clearTimeout(timeout);
  }, []);

  // Get readable accent name
  const getAccentName = (lang) => {
    const accents = {
      'en-GB': 'British',
      'en-AU': 'Australian',
      'en-US': 'American',
      'en-IE': 'Irish',
      'en-NZ': 'New Zealand',
      'en-IN': 'Indian',
      'en-ZA': 'South African',
      'en-CA': 'Canadian',
      'en': 'English'
    };
    return accents[lang] || 'English';
  };

  // Split text into sentences for progress tracking
  const splitIntoSentences = (text) => {
    if (!text) return [];
    return text
      .replace(/([.!?])\s+/g, '$1|')
      .replace(/([.!?])$/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0);
  };

  // Speak text
  const speak = useCallback((text, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!text || text.trim().length === 0) {
        reject(new Error('No text provided'));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const {
        rate = 0.9,
        pitch = 1,
        volume = 1,
        onProgress,
        onSentence,
        voice = selectedVoice?.voice
      } = options;

      const sentences = splitIntoSentences(text);
      sentencesRef.current = sentences;
      currentIndexRef.current = 0;
      onCompleteRef.current = resolve;

      setIsSpeaking(true);
      setIsPaused(false);
      setProgress(0);
      setError(null);

      const speakNextSentence = () => {
        if (currentIndexRef.current >= sentences.length) {
          setIsSpeaking(false);
          setProgress(100);
          setCurrentText('');
          resolve();
          return;
        }

        const sentence = sentences[currentIndexRef.current];
        const utterance = new SpeechSynthesisUtterance(sentence);
        utteranceRef.current = utterance;

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          const progressPercent = Math.round((currentIndexRef.current / sentences.length) * 100);
          setProgress(progressPercent);
          setCurrentText(sentence);
          if (onProgress) onProgress(progressPercent, currentIndexRef.current, sentences.length);
          if (onSentence) onSentence(sentence, currentIndexRef.current);
        };

        utterance.onend = () => {
          currentIndexRef.current++;
          // Small natural pause between sentences
          setTimeout(speakNextSentence, 150);
        };

        utterance.onerror = (event) => {
          console.error('TTS Error:', event);
          if (event.error !== 'interrupted') {
            setError(`Speech error: ${event.error}`);
          }
          currentIndexRef.current++;
          speakNextSentence();
        };

        window.speechSynthesis.speak(utterance);
      };

      // Start speaking
      speakNextSentence();
    });
  }, [selectedVoice]);

  // Speak a single phrase (no sentence splitting)
  const speakPhrase = useCallback((text, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!text) {
        reject(new Error('No text provided'));
        return;
      }

      window.speechSynthesis.cancel();

      const {
        rate = 0.9,
        pitch = 1,
        volume = 1,
        voice = selectedVoice?.voice
      } = options;

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      if (voice) {
        utterance.voice = voice;
      }

      setIsSpeaking(true);
      setCurrentText(text);

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentText('');
        resolve();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        if (event.error !== 'interrupted') {
          reject(new Error(event.error));
        } else {
          resolve();
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [selectedVoice]);

  // Stop speaking
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentText('');
  }, []);

  // Pause speaking
  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  // Resume speaking
  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  // Select voice by name or index
  const selectVoice = useCallback((voiceNameOrIndex) => {
    if (typeof voiceNameOrIndex === 'number') {
      if (voices[voiceNameOrIndex]) {
        setSelectedVoice(voices[voiceNameOrIndex]);
      }
    } else {
      const found = voices.find(v => v.name === voiceNameOrIndex || v.voice.name === voiceNameOrIndex);
      if (found) {
        setSelectedVoice(found);
      }
    }
  }, [voices]);

  // Get top N voices for display
  const getTopVoices = useCallback((count = 5) => {
    return voices.slice(0, count);
  }, [voices]);

  // Get voices grouped by accent
  const getVoicesByAccent = useCallback(() => {
    const grouped = {};
    voices.forEach(v => {
      const accent = v.accent;
      if (!grouped[accent]) grouped[accent] = [];
      grouped[accent].push(v);
    });
    return grouped;
  }, [voices]);

  return {
    // State
    voices,
    selectedVoice,
    isSpeaking,
    isPaused,
    progress,
    currentText,
    error,

    // Actions
    speak,
    speakPhrase,
    stop,
    pause,
    resume,
    selectVoice,

    // Helpers
    getTopVoices,
    getVoicesByAccent,

    // Current sentence info
    currentSentenceIndex: currentIndexRef.current,
    totalSentences: sentencesRef.current.length,
    sentences: sentencesRef.current
  };
};

export default useTTS;
