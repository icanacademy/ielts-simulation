import { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { useStudent } from '../../context/StudentContext';
import { aiAPI } from '../../services/api';
import useTimer from '../../hooks/useTimer';
import useEdgeTTS from '../../hooks/useEdgeTTS';
import Button from '../common/Button';
import LoadingScreen from '../common/LoadingScreen';
import QuestionDisplay from './QuestionDisplay';

// Band score conversion for Listening (out of 40)
const getBandScore = (correct) => {
  if (correct >= 39) return 9.0;
  if (correct >= 37) return 8.5;
  if (correct >= 35) return 8.0;
  if (correct >= 32) return 7.5;
  if (correct >= 30) return 7.0;
  if (correct >= 26) return 6.5;
  if (correct >= 23) return 6.0;
  if (correct >= 18) return 5.5;
  if (correct >= 16) return 5.0;
  if (correct >= 13) return 4.5;
  if (correct >= 11) return 4.0;
  if (correct >= 8) return 3.5;
  if (correct >= 6) return 3.0;
  if (correct >= 4) return 2.5;
  return 2.0;
};

const ListeningSection = ({ onComplete, sectionInfo }) => {
  const { student } = useStudent();
  const { submitAnswer, completeSection } = useSimulation();

  const [currentPart, setCurrentPart] = useState(1);
  const [parts, setParts] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScript, setShowScript] = useState(false);
  const [isTransferTime, setIsTransferTime] = useState(false);

  // TTS state
  const [audioPlayed, setAudioPlayed] = useState({});
  const [waitingToPlay, setWaitingToPlay] = useState(true);

  // Use TTS hook for audio playback
  const tts = useEdgeTTS();

  // Total time: 30 min listening + 10 min transfer = 40 min
  const TOTAL_TIME = 40 * 60;
  const TRANSFER_TIME = 10 * 60;

  const timer = useTimer(TOTAL_TIME, true);

  // Generate questions for current part
  useEffect(() => {
    loadPartQuestions(currentPart);
  }, [currentPart]);

  // Start timer when questions are loaded
  useEffect(() => {
    if (parts[currentPart] && !timer.isRunning) {
      timer.start();
    }
  }, [parts, currentPart]);

  // Handle time up
  useEffect(() => {
    if (timer.isComplete) {
      handleFinish();
    }
  }, [timer.isComplete]);

  // Check for transfer time (last 10 minutes)
  useEffect(() => {
    const remainingSeconds = timer.remainingSeconds;
    if (remainingSeconds <= TRANSFER_TIME && remainingSeconds > 0 && !isTransferTime) {
      setIsTransferTime(true);
    }
  }, [timer.remainingSeconds]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      tts.stop();
    };
  }, []);

  // Play audio using Edge TTS
  const playAudio = async () => {
    const partData = parts[currentPart];
    if (!partData?.audioScript || audioPlayed[currentPart]) return;

    setWaitingToPlay(false);

    try {
      await tts.speak(partData.audioScript, {
        voice: tts.selectedVoice,
        rate: '-5%', // Slightly slower for IELTS clarity
        onProgress: (progress) => {
          // Progress tracking handled by tts hook
        },
        onComplete: () => {
          setAudioPlayed(prev => ({ ...prev, [currentPart]: true }));
        }
      });

      // Mark as played when complete
      setAudioPlayed(prev => ({ ...prev, [currentPart]: true }));
    } catch (err) {
      console.error('TTS error:', err);
      // Still mark as played so user can continue
      setAudioPlayed(prev => ({ ...prev, [currentPart]: true }));
    }
  };

  const loadPartQuestions = async (partNumber) => {
    try {
      setLoading(true);
      setError(null);

      let partData = parts[partNumber];

      if (!partData) {
        const previousListeningScore = student?.previousScores?.listening;
        const targetBand = student?.targetBand || 6;
        const effectiveDifficulty = previousListeningScore
          ? Math.min(targetBand, previousListeningScore + 1)
          : targetBand;

        const result = await aiAPI.generateListening({
          difficulty: effectiveDifficulty,
          partNumber,
          targetWeaknesses: student?.weaknesses?.filter(w => [
            'Multiple Choice', 'Map/Diagram Labeling', 'Form Completion',
            'Note Completion', 'Table Completion', 'Sentence Completion',
            'Summary Completion', 'Matching', 'Short Answer Questions'
          ].includes(w)) || [],
          focusAreas: student?.analysisResults?.focusAreas || [],
          recommendations: student?.analysisResults?.recommendations || [],
          customNotes: student?.customWeaknessNotes || '',
          previousScores: student?.previousScores || {},
          targetBand: targetBand
        });

        partData = result.data;
        setParts(prev => ({
          ...prev,
          [partNumber]: partData
        }));
      }

      setWaitingToPlay(!audioPlayed[partNumber]);
    } catch (err) {
      setError('Failed to generate listening questions. Please check your API key.');
      console.error('Error loading listening:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer) => {
    const partData = parts[currentPart];
    const currentQuestion = partData.questions[currentQuestionIndex];

    timer.pause();

    try {
      const globalQuestionIndex = (currentPart - 1) * 10 + currentQuestionIndex;

      const result = await submitAnswer(
        globalQuestionIndex,
        answer,
        currentQuestion.correctAnswer,
        currentQuestion.questionType
      );

      const answerKey = `${currentPart}-${currentQuestionIndex}`;
      setAnswers(prev => ({
        ...prev,
        [answerKey]: {
          userAnswer: answer,
          correctAnswer: currentQuestion.correctAnswer,
          isCorrect: result.isCorrect,
          explanation: currentQuestion.explanation || result.explanation
        }
      }));

      setLastResult({
        isCorrect: result.isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation || result.explanation
      });
      setShowExplanation(true);
    } catch (err) {
      console.error('Error submitting answer:', err);
      timer.resume();
    }
  };

  const handleNext = () => {
    setShowExplanation(false);
    setLastResult(null);

    const partData = parts[currentPart];

    if (currentQuestionIndex < partData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      timer.resume();
    } else if (currentPart < 4) {
      tts.stop();
      setCurrentPart(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setWaitingToPlay(true);
      setShowScript(false);
      timer.resume();
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      timer.stop();
      tts.stop();
      const result = await completeSection('listening', timer.getElapsedTime());

      // Calculate final scores
      const finalCorrect = Object.values(answers).filter(a => a.isCorrect).length;
      const finalBandScore = getBandScore(finalCorrect);

      // Pass results to parent
      onComplete({
        score: result?.score || finalBandScore,
        rawScore: result?.rawScore || finalCorrect,
        totalQuestions: getTotalQuestions()
      });
    } catch (err) {
      console.error('Error completing section:', err);
      // Still complete even if save fails
      const finalCorrect = Object.values(answers).filter(a => a.isCorrect).length;
      onComplete({
        score: getBandScore(finalCorrect),
        rawScore: finalCorrect,
        totalQuestions: getTotalQuestions()
      });
    }
  };

  const getTotalQuestions = () => {
    let total = 0;
    for (let i = 1; i <= 4; i++) {
      total += parts[i]?.questions?.length || 10;
    }
    return total;
  };

  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = getTotalQuestions();
  const bandScore = getBandScore(correctCount);

  if (loading) {
    return (
      <LoadingScreen
        section="listening"
        currentStep={`Loading Part ${currentPart} of 4...`}
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
            <Button onClick={() => loadPartQuestions(currentPart)} variant="primary">
              Try Again
            </Button>
            <Button onClick={onComplete} variant="ghost">Skip Section</Button>
          </div>
        </div>
      </div>
    );
  }

  const partData = parts[currentPart];
  const currentQuestion = partData?.questions?.[currentQuestionIndex];
  const hasAudioPlayed = audioPlayed[currentPart];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{sectionInfo.icon}</span>
              <div>
                <h2 className="font-semibold text-gray-800">Listening Part {currentPart}</h2>
                <p className="text-sm text-gray-500">
                  Question {(currentPart - 1) * 10 + currentQuestionIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-mono font-bold ${
                timer.isPaused ? 'text-blue-600' :
                isTransferTime ? 'text-orange-500' :
                timer.isCriticalTime ? 'text-red-600 animate-pulse' :
                timer.isLowTime ? 'text-orange-500' : 'text-gray-800'
              }`}>
                {timer.formattedTime}
              </div>
              {timer.isPaused ? (
                <span className="text-xs text-blue-500 font-medium">PAUSED</span>
              ) : isTransferTime ? (
                <span className="text-xs text-orange-500 font-medium">TRANSFER TIME</span>
              ) : (
                <span className="text-xs text-gray-400">40 min total</span>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Score</p>
              <p className="font-bold text-lg text-green-600">
                {correctCount}/{answeredCount}
              </p>
              {answeredCount > 0 && (
                <p className="text-xs text-blue-600 font-medium">
                  Band {bandScore.toFixed(1)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4].map(part => (
              <div key={part} className="flex-1">
                <div className={`h-2 rounded-full ${
                  part < currentPart ? 'bg-green-500' :
                  part === currentPart ? 'bg-purple-500' : 'bg-gray-200'
                }`} />
                <p className="text-xs text-center mt-1 text-gray-500">Part {part}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isTransferTime && (
        <div className="bg-orange-500 text-white py-2 px-4 text-center">
          <p className="font-medium">Transfer Time - Review and check your answers</p>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Audio Controls */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Audio - Part {currentPart}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  hasAudioPlayed
                    ? 'bg-green-100 text-green-600'
                    : tts.isPlaying
                      ? 'bg-purple-100 text-purple-600'
                      : tts.isLoading
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-blue-100 text-blue-600'
                }`}>
                  {hasAudioPlayed ? 'Completed' : tts.isPlaying ? 'Playing...' : tts.isLoading ? 'Generating...' : 'Ready'}
                </span>
              </div>

              {/* Waiting to Play */}
              {waitingToPlay && !hasAudioPlayed && !tts.isPlaying && !tts.isLoading && (
                <div className="text-center py-6">
                  <div className="mb-4">
                    <div className="text-5xl mb-2">🎧</div>
                    <h4 className="font-semibold text-gray-800 mb-1">Ready to Start Part {currentPart}</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Click play to begin. Audio plays <strong>once only</strong>.
                    </p>
                  </div>

                  {/* Voice Info */}
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      Multi-voice audio with realistic male & female speakers
                    </p>
                  </div>

                  <button
                    onClick={playAudio}
                    disabled={tts.isLoading || tts.isPlaying}
                    className="px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play Audio
                  </button>
                </div>
              )}

              {/* Loading/Generating audio */}
              {tts.isLoading && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <div className="w-full h-full border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                  <p className="text-gray-600">Generating multi-voice audio...</p>
                  <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
                </div>
              )}

              {/* Playing or Paused audio */}
              {(tts.isPlaying || tts.isPaused) && !tts.isLoading && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full ${tts.isPaused ? 'bg-yellow-100' : 'bg-purple-100'} flex items-center justify-center`}>
                      {tts.isPaused ? (
                        <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-purple-500 rounded animate-pulse"
                              style={{
                                height: `${Math.random() * 20 + 15}px`,
                                animationDelay: `${i * 150}ms`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${tts.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-purple-600 font-medium">
                          {Math.round(tts.progress)}% complete
                        </span>
                        <span className="text-gray-400">
                          Multi-voice audio
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={() => tts.isPaused ? tts.resume() : tts.pause()}
                      variant="outline"
                      size="sm"
                    >
                      {tts.isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      onClick={() => {
                        tts.stop();
                        setAudioPlayed(prev => ({ ...prev, [currentPart]: true }));
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Skip Audio
                    </Button>
                  </div>
                </div>
              )}

              {/* Audio finished */}
              {hasAudioPlayed && !tts.isPlaying && !tts.isLoading && !waitingToPlay && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-green-500 rounded-full" />
                      <p className="text-sm text-green-600 font-medium mt-2">Audio Completed</p>
                    </div>
                  </div>
                  <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                    Audio has finished. Answer questions from memory.
                  </p>
                </div>
              )}

              {/* Error message */}
              {tts.error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {tts.error}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {partData?.audioContext || 'Listen carefully and answer the questions.'}
                </p>
              </div>
            </div>

            {/* Script Toggle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowScript(!showScript)}
                className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">📝</span>
                  <span className="font-medium text-gray-700">Audio Script</span>
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                    Practice only
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showScript ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showScript && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <p className="text-xs text-orange-500 mt-3 mb-2">
                    Not shown in real IELTS test.
                  </p>
                  <div className="max-h-[300px] overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {partData?.audioScript}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Part {currentPart} Questions</span>
                <span className="text-xs text-gray-400">
                  Q{(currentPart - 1) * 10 + 1} - Q{currentPart * 10}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {partData?.questions?.map((q, index) => {
                  const answerKey = `${currentPart}-${index}`;
                  const answer = answers[answerKey];
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={index}
                      onClick={() => !showExplanation && setCurrentQuestionIndex(index)}
                      disabled={showExplanation}
                      className={`
                        w-8 h-8 rounded-lg text-xs font-medium transition-all
                        ${isCurrent
                          ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                          : answer
                            ? answer.isCorrect
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                        ${showExplanation ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {(currentPart - 1) * 10 + index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <QuestionDisplay
                question={currentQuestion}
                questionNumber={(currentPart - 1) * 10 + currentQuestionIndex + 1}
                onAnswer={handleAnswer}
                disabled={showExplanation}
                userAnswer={answers[`${currentPart}-${currentQuestionIndex}`]?.userAnswer}
              />
            </div>

            {showExplanation && lastResult && (
              <div className={`rounded-xl p-6 ${
                lastResult.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {lastResult.isCorrect ? '✅' : '❌'}
                    </span>
                    <div>
                      <h4 className={`font-semibold ${lastResult.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {lastResult.isCorrect ? 'Correct!' : 'Incorrect'}
                      </h4>
                      {!lastResult.isCorrect && (
                        <p className="text-sm text-gray-600">
                          Correct answer: <strong>{lastResult.correctAnswer}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  {!lastResult.isCorrect && (
                    <button
                      onClick={() => {
                        const answerKey = `${currentPart}-${currentQuestionIndex}`;
                        setAnswers(prev => ({
                          ...prev,
                          [answerKey]: {
                            ...prev[answerKey],
                            isCorrect: true
                          }
                        }));
                        setLastResult(prev => ({ ...prev, isCorrect: true }));
                      }}
                      className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg border border-yellow-300 transition-colors"
                    >
                      Override: Mark Correct
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4">
                    <h5 className="font-medium text-gray-700 mb-2">Explanation</h5>
                    <p className="text-gray-600">{lastResult.explanation}</p>
                  </div>

                  {(currentQuestion?.exactQuote || currentQuestion?.keyPhrase) && (
                    <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                      <h5 className="font-medium text-blue-800 mb-1">Key Quote</h5>
                      <p className="text-blue-700 italic">"{currentQuestion.exactQuote || currentQuestion.keyPhrase}"</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={handleNext} variant="primary">
                    {currentQuestionIndex < partData.questions.length - 1
                      ? 'Next Question'
                      : currentPart < 4
                        ? `Start Part ${currentPart + 1}`
                        : 'Finish Section'
                    }
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button onClick={handleFinish} variant="ghost" disabled={showExplanation}>
                End Section Early
              </Button>
              <div className="text-sm text-gray-500">
                {answeredCount} of {totalQuestions} answered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeningSection;
