import { useState, useRef, useCallback, useEffect } from 'react';

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscription(prev => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      setTranscription('');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsTranscribing(true);
      }
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
      console.error('Recording error:', err);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    }

    setIsRecording(false);
    setIsPaused(false);
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    }
  }, []);

  // Reset recording
  const resetRecording = useCallback(() => {
    stopRecording();

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setTranscription('');
    chunksRef.current = [];
  }, [stopRecording, audioUrl]);

  // Format duration
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    transcription,
    isTranscribing,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    setTranscription
  };
};

export default useVoiceRecorder;
