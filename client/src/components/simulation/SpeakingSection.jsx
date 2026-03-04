import { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { useStudent } from '../../context/StudentContext';
import { aiAPI } from '../../services/api';
import useTimer from '../../hooks/useTimer';
import useEdgeTTS from '../../hooks/useEdgeTTS';
import Button from '../common/Button';
import LoadingScreen from '../common/LoadingScreen';

// Band score conversion for Speaking
const getBandScore = (score) => {
  if (score >= 8.5) return 9.0;
  if (score >= 7.5) return 8.0;
  if (score >= 6.5) return 7.0;
  if (score >= 5.5) return 6.0;
  if (score >= 4.5) return 5.0;
  if (score >= 3.5) return 4.0;
  if (score >= 2.5) return 3.0;
  if (score >= 1.5) return 2.0;
  return 1.0;
};

const SpeakingSection = ({ onComplete, sectionInfo }) => {
  const { student } = useStudent();
  const { submitSpeaking, completeSection } = useSimulation();

  // Part management
  const [currentPart, setCurrentPart] = useState(1);
  const [parts, setParts] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Per-question answers for Parts 1 & 3 (realistic IELTS format)
  const [questionAnswers, setQuestionAnswers] = useState({});
  // Format: { partNumber: { questionIndex: { question: "...", answer: "...", duration: 0 } } }

  // Part 2 long turn recording
  const [part2Transcription, setPart2Transcription] = useState('');

  // TTS for examiner voice
  const examinerTTS = useEdgeTTS();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  // Per-question timer (60 seconds per answer for Parts 1 & 3)
  const answerTimer = useTimer(60, true);

  // Part 2 specific
  const [prepTime, setPrepTime] = useState(false);
  const prepTimer = useTimer(60, true);
  const speakingTimer = useTimer(120, true);

  // Evaluation state
  const [evaluations, setEvaluations] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partStarted, setPartStarted] = useState(false);
  const [partComplete, setPartComplete] = useState(false);

  // Main timer
  const timer = useTimer(sectionInfo.time, true);

  // Load prompts on mount and when part changes
  useEffect(() => {
    loadPartPrompts(currentPart);
  }, [currentPart]);

  // Start main timer when first part loads
  useEffect(() => {
    if (parts[1] && !timer.isRunning) {
      timer.start();
    }
  }, [parts]);

  // Handle time up
  useEffect(() => {
    if (timer.isComplete) {
      handleFinish();
    }
  }, [timer.isComplete]);

  // Handle answer timer complete (auto move to next question)
  useEffect(() => {
    if (answerTimer.isComplete && isRecording && currentPart !== 2) {
      handleNextQuestion();
    }
  }, [answerTimer.isComplete]);

  // Handle prep time complete for Part 2
  useEffect(() => {
    if (prepTime && prepTimer.isComplete && !isRecording) {
      setPrepTime(false);
      speakingTimer.start();
      startRecording();
    }
  }, [prepTimer.isComplete, prepTime, isRecording]);

  // Handle speaking time complete for Part 2
  useEffect(() => {
    if (speakingTimer.isComplete && isRecording && currentPart === 2) {
      stopRecording(true); // true = final stop for Part 2
    }
  }, [speakingTimer.isComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      examinerTTS.stop();
    };
  }, []);

  const loadPartPrompts = async (partNumber) => {
    if (parts[partNumber]) return;

    try {
      setLoading(true);
      setError(null);

      // Filter speaking-specific weaknesses
      const speakingWeaknesses = student?.weaknesses?.filter(w => [
        'Fluency', 'Pronunciation', 'Vocabulary Usage', 'Grammatical Range',
        'Part 2 Long Turn', 'Part 3 Discussion'
      ].includes(w)) || [];

      const result = await aiAPI.generateSpeaking({
        partNumber,
        difficulty: student?.targetBand || 6,
        targetWeaknesses: speakingWeaknesses
      });

      setParts(prev => ({
        ...prev,
        [partNumber]: result.data
      }));
    } catch (err) {
      setError('Failed to generate speaking prompts. Please check your API key.');
      console.error('Error loading prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Play examiner question and start recording after
  const playExaminerQuestion = async (questionText, onComplete) => {
    setIsExaminerSpeaking(true);
    try {
      await examinerTTS.speak(questionText, {
        voice: examinerTTS.selectedVoice,
        rate: '-5%',
        onComplete: () => {
          setIsExaminerSpeaking(false);
          if (onComplete) onComplete();
        }
      });
    } catch (err) {
      console.error('TTS error:', err);
      setIsExaminerSpeaking(false);
      if (onComplete) onComplete();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      setLiveTranscript('');

      // Start answer timer for Parts 1 & 3
      if (currentPart !== 2) {
        answerTimer.reset();
        answerTimer.start();
      }

      // Start speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          setLiveTranscript(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
          if (isRecording && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.start();
      }

      // Duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone.');
    }
  };

  // Stop recording (optionally save answer)
  const stopRecording = (isFinalStop = false) => {
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop timer
    answerTimer.stop();

    // Stop duration counter
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    // Save the current answer
    if (currentPart === 2) {
      setPart2Transcription(liveTranscript);
    } else {
      // Save per-question answer
      const partData = parts[currentPart];
      const currentQuestion = partData?.questions?.[currentQuestionIndex];

      setQuestionAnswers(prev => ({
        ...prev,
        [currentPart]: {
          ...prev[currentPart],
          [currentQuestionIndex]: {
            question: currentQuestion,
            answer: liveTranscript || '[No speech detected]',
            duration: recordingDuration
          }
        }
      }));
    }

    if (isFinalStop) {
      setPartComplete(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartPart = async () => {
    // Request microphone permission first
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHTTPS = window.location.protocol === 'https:';

        if (!isLocalhost && !isHTTPS) {
          setError(`Microphone requires HTTPS or localhost. You're on ${window.location.hostname}. Please access via https://`);
        } else {
          setError('Your browser does not support microphone access.');
        }
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      console.error('Microphone error:', err.name, err.message);

      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow access and refresh.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect one and try again.');
      } else {
        setError(`Microphone error: ${err.message || err.name}`);
      }
      return;
    }

    setPartStarted(true);
    setPartComplete(false);
    setCurrentQuestionIndex(0);
    setLiveTranscript('');

    const partData = parts[currentPart];

    if (currentPart === 2) {
      // Part 2: Read cue card intro, then start prep time
      const cueCardIntro = `You have 1 minute to prepare to talk about the following topic. ${partData?.cueCard?.topic}. You should say: ${partData?.cueCard?.bulletPoints?.join('. ')}.`;

      await playExaminerQuestion(cueCardIntro, () => {
        setPrepTime(true);
        prepTimer.start();
      });
    } else {
      // Parts 1 and 3: Start with first question
      const firstQuestion = partData?.questions?.[0];
      if (firstQuestion) {
        await playExaminerQuestion(firstQuestion, () => {
          startRecording();
        });
      }
    }
  };

  const handleNextQuestion = async () => {
    // Stop current recording and save answer
    stopRecording(false);

    const partData = parts[currentPart];
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < (partData?.questions?.length || 0)) {
      // Move to next question
      setCurrentQuestionIndex(nextIndex);
      setLiveTranscript('');
      setRecordingDuration(0);

      const nextQuestion = partData?.questions?.[nextIndex];
      if (nextQuestion) {
        // Play next question, then start recording
        await playExaminerQuestion(nextQuestion, () => {
          startRecording();
        });
      }
    } else {
      // All questions done
      setPartComplete(true);
    }
  };

  const handleEvaluatePart = async () => {
    const partData = parts[currentPart];

    let questions, transcription;

    if (currentPart === 2) {
      questions = [partData?.cueCard?.topic, ...(partData?.cueCard?.bulletPoints || [])];
      transcription = part2Transcription || '[No speech detected]';
    } else {
      // Build Q&A transcript for Parts 1 & 3
      const answers = questionAnswers[currentPart] || {};
      const qaList = Object.values(answers);

      questions = qaList.map(qa => qa.question);
      transcription = qaList.map((qa, i) =>
        `Question ${i + 1}: ${qa.question}\nAnswer: ${qa.answer}`
      ).join('\n\n');
    }

    try {
      setEvaluating(true);

      const evalRes = await aiAPI.evaluateSpeaking({
        partNumber: currentPart,
        questions,
        transcription
      });

      setEvaluations(prev => ({
        ...prev,
        [currentPart]: evalRes.data
      }));

      try {
        await submitSpeaking(currentPart, questions, transcription, evalRes.data);
      } catch (saveErr) {
        console.warn('Could not save to simulation:', saveErr);
      }

      setShowFeedback(true);
    } catch (err) {
      console.error('Error evaluating speaking:', err);
      setError('Failed to evaluate your response. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextPart = () => {
    setShowFeedback(false);
    setPartStarted(false);
    setPartComplete(false);
    setRecordingDuration(0);
    setLiveTranscript('');
    prepTimer.reset();
    speakingTimer.reset();
    answerTimer.reset();

    if (currentPart < 3) {
      setCurrentPart(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      timer.stop();
      examinerTTS.stop();
      if (isRecording) {
        stopRecording(true);
      }
      await completeSection('speaking', timer.getElapsedTime());

      // Calculate speaking scores
      const evalValues = Object.values(evaluations);
      const avgScore = evalValues.length > 0
        ? evalValues.reduce((sum, e) => sum + (e.overallScore || 0), 0) / evalValues.length
        : 0;
      const finalScore = getBandScore(avgScore);

      // Pass results to parent
      onComplete({
        score: finalScore,
        overallScore: finalScore,
        partsCompleted: evalValues.length,
        evaluations: evaluations
      });
    } catch (err) {
      console.error('Error completing section:', err);
      // Still complete even if save fails
      const evalValues = Object.values(evaluations);
      const avgScore = evalValues.length > 0
        ? evalValues.reduce((sum, e) => sum + (e.overallScore || 0), 0) / evalValues.length
        : 0;
      onComplete({
        score: getBandScore(avgScore),
        partsCompleted: evalValues.length
      });
    }
  };

  const getOverallBandScore = () => {
    const evalValues = Object.values(evaluations);
    if (evalValues.length === 0) return null;

    const avgScore = evalValues.reduce((sum, e) => sum + (e.overallScore || 0), 0) / evalValues.length;
    return getBandScore(avgScore);
  };

  if (loading) {
    return (
      <LoadingScreen
        section="speaking"
        currentStep={`Loading Part ${currentPart} prompts...`}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => { setError(null); loadPartPrompts(currentPart); }} variant="primary">
              Try Again
            </Button>
            <Button onClick={onComplete} variant="ghost">Skip Section</Button>
          </div>
        </div>
      </div>
    );
  }

  const partData = parts[currentPart];
  const currentEvaluation = evaluations[currentPart];
  const answeredCount = Object.keys(questionAnswers[currentPart] || {}).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{sectionInfo.icon}</span>
              <div>
                <h2 className="font-semibold text-gray-800">Speaking Part {currentPart}</h2>
                <p className="text-sm text-gray-500">
                  {currentPart === 1 ? 'Introduction & Interview' :
                   currentPart === 2 ? 'Individual Long Turn' : 'Two-way Discussion'}
                </p>
              </div>
            </div>

            <div className={`text-2xl font-mono font-bold ${
              timer.isCriticalTime ? 'text-red-600 animate-pulse' :
              timer.isLowTime ? 'text-orange-500' : 'text-gray-800'
            }`}>
              {timer.formattedTime}
            </div>

            <div className="flex gap-2">
              {[1, 2, 3].map(part => (
                <div
                  key={part}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    part === currentPart
                      ? 'bg-orange-500 text-white'
                      : evaluations[part]
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  Part {part} {evaluations[part] && '✓'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {!showFeedback ? (
          <div className="space-y-6">
            {/* Part Introduction */}
            {!partStarted && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">
                    {currentPart === 1 ? '👋' : currentPart === 2 ? '📝' : '💬'}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Part {currentPart}: {currentPart === 1 ? 'Introduction & Interview' :
                                         currentPart === 2 ? 'Individual Long Turn' : 'Two-way Discussion'}
                  </h3>

                  <div className="text-gray-600 mb-6 space-y-2">
                    {currentPart === 1 && (
                      <>
                        <p>The examiner will ask you {partData?.questions?.length || 4} questions about yourself.</p>
                        <p className="text-sm text-gray-500">Answer each question individually (up to 60 seconds each)</p>
                      </>
                    )}
                    {currentPart === 2 && (
                      <>
                        <p>You will receive a cue card with a topic.</p>
                        <p className="text-sm text-gray-500">1 minute prep + 2 minutes speaking</p>
                      </>
                    )}
                    {currentPart === 3 && (
                      <>
                        <p>The examiner will ask deeper questions related to Part 2.</p>
                        <p className="text-sm text-gray-500">{partData?.questions?.length || 4} questions (up to 60 seconds each)</p>
                      </>
                    )}
                  </div>

                  <Button onClick={handleStartPart} variant="primary" size="lg">
                    Start Part {currentPart}
                  </Button>
                </div>
              </div>
            )}

            {/* Active Part Content */}
            {partStarted && !partComplete && (
              <>
                {/* Question Display */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  {currentPart === 2 ? (
                    /* Part 2: Cue Card */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">Cue Card</h3>
                        {prepTime && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <span className="text-sm">Prep:</span>
                            <span className="text-xl font-mono font-bold">{prepTimer.formattedTime}</span>
                          </div>
                        )}
                        {speakingTimer.isRunning && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <span className="text-sm">Speaking:</span>
                            <span className="text-xl font-mono font-bold">{speakingTimer.formattedTime}</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                        <h4 className="text-lg font-semibold text-orange-800 mb-4">
                          {partData?.cueCard?.topic}
                        </h4>
                        <p className="text-orange-700 mb-3">You should say:</p>
                        <ul className="space-y-2 text-orange-700">
                          {partData?.cueCard?.bulletPoints?.map((point, i) => (
                            <li key={i}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    /* Part 1 & 3: Individual Questions */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">
                          Question {currentQuestionIndex + 1} of {partData?.questions?.length || 0}
                        </h3>
                        {isRecording && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <span className="text-sm">Time left:</span>
                            <span className="text-xl font-mono font-bold">{answerTimer.formattedTime}</span>
                          </div>
                        )}
                      </div>

                      {/* Examiner speaking indicator */}
                      {isExaminerSpeaking && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-blue-700 font-medium">Examiner is asking the question...</span>
                        </div>
                      )}

                      <div className="p-4 bg-gray-50 rounded-lg mb-4">
                        <p className="text-xl text-gray-700">
                          "{partData?.questions?.[currentQuestionIndex]}"
                        </p>
                      </div>

                      {/* Question progress */}
                      <div className="flex gap-2">
                        {partData?.questions?.map((_, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-2 rounded-full ${
                              i < currentQuestionIndex ? 'bg-green-500' :
                              i === currentQuestionIndex ? 'bg-orange-500' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recording Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="text-center">
                    {/* Recording indicator */}
                    {isRecording && !isExaminerSpeaking && (
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 text-red-500 mb-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="font-medium">Recording your answer...</span>
                        </div>

                        {/* Live transcript */}
                        {liveTranscript && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-left max-h-32 overflow-y-auto">
                            <p className="text-xs text-gray-400 mb-1">Your answer:</p>
                            <p className="text-sm text-gray-700">{liveTranscript}</p>
                          </div>
                        )}

                        {!liveTranscript && recordingDuration > 3 && (
                          <p className="text-xs text-orange-500 mt-2">Speak clearly into your microphone</p>
                        )}
                      </div>
                    )}

                    {/* Prep time for Part 2 */}
                    {prepTime && (
                      <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                        <p className="text-yellow-800 font-medium mb-2">⏱️ Preparation Time</p>
                        <p className="text-sm text-yellow-700 mb-3">Organize your thoughts. Recording starts automatically.</p>
                        <Button
                          onClick={() => {
                            setPrepTime(false);
                            prepTimer.stop();
                            speakingTimer.start();
                            startRecording();
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Skip Prep - Start Speaking Now
                        </Button>
                      </div>
                    )}

                    {/* Controls for Parts 1 & 3 */}
                    {isRecording && !isExaminerSpeaking && currentPart !== 2 && (
                      <div className="flex justify-center gap-4">
                        {currentQuestionIndex < (partData?.questions?.length || 0) - 1 ? (
                          <Button onClick={handleNextQuestion} variant="primary" size="lg">
                            Done - Next Question →
                          </Button>
                        ) : (
                          <Button onClick={() => stopRecording(true)} variant="primary" size="lg">
                            Finish Part {currentPart}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Controls for Part 2 */}
                    {isRecording && !isExaminerSpeaking && currentPart === 2 && (
                      <div className="flex justify-center gap-4 mt-4">
                        <Button onClick={() => stopRecording(true)} variant="primary" size="lg">
                          Done Speaking - Finish Part 2
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Answered questions summary */}
                {currentPart !== 2 && answeredCount > 0 && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">✅ Answered: {answeredCount} question(s)</h4>
                    <div className="space-y-2">
                      {Object.entries(questionAnswers[currentPart] || {}).map(([idx, qa]) => (
                        <div key={idx} className="text-sm text-green-700 border-l-2 border-green-300 pl-3">
                          <p className="font-medium">Q{parseInt(idx) + 1}: {qa.question?.substring(0, 50)}...</p>
                          <p className="text-green-600">Your answer: {qa.answer?.substring(0, 80)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Part Complete */}
            {partComplete && !showFeedback && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Part {currentPart} Complete!
                  </h3>

                  {currentPart !== 2 && (
                    <p className="text-gray-600 mb-4">
                      You answered {Object.keys(questionAnswers[currentPart] || {}).length} questions
                    </p>
                  )}

                  <div className="flex justify-center gap-4">
                    <Button onClick={handleEvaluatePart} variant="primary" size="lg" loading={evaluating}>
                      {evaluating ? 'Evaluating...' : 'Get Feedback'}
                    </Button>
                    <Button
                      onClick={() => {
                        setPartComplete(false);
                        setPartStarted(false);
                        setQuestionAnswers(prev => ({ ...prev, [currentPart]: {} }));
                        setPart2Transcription('');
                      }}
                      variant="outline"
                    >
                      Re-do Part
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <Button onClick={handleFinish} variant="ghost">
                End Section Early
              </Button>
            </div>
          </div>
        ) : (
          /* Feedback View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{currentEvaluation?.overallScore >= 6 ? '🎉' : '📝'}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Part {currentPart} Score</h2>
              <div className="text-4xl font-bold text-orange-600">
                Band {currentEvaluation?.overallScore?.toFixed(1) || '-'}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Fluency', key: 'fluencyCoherence' },
                { label: 'Vocabulary', key: 'lexicalResource' },
                { label: 'Grammar', key: 'grammaticalRange' },
                { label: 'Pronunciation', key: 'pronunciation' }
              ].map(({ label, key }) => (
                <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {currentEvaluation?.scores?.[key]?.toFixed(1) || '-'}
                  </p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Q&A Review for Parts 1 & 3 */}
            {currentPart !== 2 && questionAnswers[currentPart] && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">Your Responses:</h4>
                <div className="space-y-4">
                  {Object.entries(questionAnswers[currentPart]).map(([idx, qa]) => (
                    <div key={idx} className="border-l-2 border-orange-300 pl-3">
                      <p className="font-medium text-gray-700">Q{parseInt(idx) + 1}: {qa.question}</p>
                      <p className="text-gray-600 text-sm mt-1">{qa.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Feedback</h4>
                <p className="text-blue-700">{currentEvaluation?.feedback}</p>
              </div>

              {currentEvaluation?.improvements?.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Areas to Improve</h4>
                  <ul className="text-yellow-700 space-y-2">
                    {currentEvaluation.improvements.map((imp, i) => (
                      <li key={i} className="ml-4">
                        {typeof imp === 'object' ? (
                          <span>• {imp.area}: {imp.suggestion || imp.issue}</span>
                        ) : (
                          <span>• {imp}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Overall Score */}
            {Object.keys(evaluations).length === 3 && (
              <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-center">
                  <h4 className="font-medium text-orange-800 mb-2">Overall Speaking Score</h4>
                  <div className="text-3xl font-bold text-orange-600">
                    Band {getOverallBandScore()?.toFixed(1)}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button onClick={handleNextPart} variant="primary" size="lg">
                {currentPart < 3 ? `Continue to Part ${currentPart + 1}` : 'Finish Speaking Section'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakingSection;
