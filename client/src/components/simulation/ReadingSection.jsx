import { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { useStudent } from '../../context/StudentContext';
import { aiAPI } from '../../services/api';
import useTimer from '../../hooks/useTimer';
import Button from '../common/Button';
import LoadingScreen from '../common/LoadingScreen';
import QuestionDisplay from './QuestionDisplay';

// Band score conversion for Reading (out of 40)
const getBandScore = (correct) => {
  if (correct >= 39) return 9.0;
  if (correct >= 37) return 8.5;
  if (correct >= 35) return 8.0;
  if (correct >= 33) return 7.5;
  if (correct >= 30) return 7.0;
  if (correct >= 27) return 6.5;
  if (correct >= 23) return 6.0;
  if (correct >= 19) return 5.5;
  if (correct >= 15) return 5.0;
  if (correct >= 13) return 4.5;
  if (correct >= 10) return 4.0;
  if (correct >= 8) return 3.5;
  if (correct >= 6) return 3.0;
  if (correct >= 4) return 2.5;
  return 2.0;
};

const ReadingSection = ({ onComplete, sectionInfo }) => {
  const { student } = useStudent();
  const { submitAnswer, completeSection, simulation } = useSimulation();

  // State for 3 passages
  const [passages, setPassages] = useState([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 3 });
  const [error, setError] = useState(null);

  const timer = useTimer(sectionInfo.time, true);

  // Get current passage and its questions with null safety
  const currentPassage = passages.length > currentPassageIndex ? passages[currentPassageIndex] : null;
  const allQuestions = passages.flatMap(p => p?.questions || []);
  const currentQuestion = currentPassage?.questions?.[currentQuestionIndex] || null;

  // Calculate global question number (1-40)
  const getGlobalQuestionNumber = () => {
    let globalIndex = 0;
    for (let i = 0; i < currentPassageIndex; i++) {
      globalIndex += passages[i]?.questions?.length || 0;
    }
    return globalIndex + currentQuestionIndex + 1;
  };

  // Load all 3 passages on mount
  useEffect(() => {
    loadAllPassages();
  }, []);

  // Start timer when passages loaded
  useEffect(() => {
    if (passages.length === 3 && !timer.isRunning) {
      timer.start();
    }
  }, [passages]);

  // Handle time up
  useEffect(() => {
    if (timer.isComplete) {
      handleFinish();
    }
  }, [timer.isComplete]);

  const loadAllPassages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate all 3 passages at once using the full reading endpoint
      const { data } = await aiAPI.generateFullReading({
        difficulty: student?.targetBand || 6,
        targetWeaknesses: student?.weaknesses?.filter(w => [
          'True/False/Not Given', 'Yes/No/Not Given', 'Matching Headings',
          'Matching Information', 'Matching Features', 'Matching Sentence Endings',
          'Short Answer Questions', 'Summary Completion', 'Sentence Completion',
          'Multiple Choice'
        ].includes(w)) || []
      });

      setPassages(data.passages);
    } catch (err) {
      setError('Failed to generate reading passages. Please check your API key.');
      console.error('Error loading passages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer) => {
    if (!currentQuestion) return;

    timer.pause();

    try {
      const globalQuestionNum = getGlobalQuestionNumber();

      const result = await submitAnswer(
        globalQuestionNum - 1,
        answer,
        currentQuestion.correctAnswer,
        currentQuestion.questionType
      );

      setAnswers(prev => ({
        ...prev,
        [globalQuestionNum]: {
          userAnswer: answer,
          correctAnswer: currentQuestion.correctAnswer,
          isCorrect: result.isCorrect,
          explanation: currentQuestion.explanation || result.explanation,
          passageIndex: currentPassageIndex,
          questionIndex: currentQuestionIndex
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

    // Check if there are more questions in current passage
    if (currentQuestionIndex < (currentPassage?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      timer.resume();
    }
    // Check if there are more passages
    else if (currentPassageIndex < passages.length - 1) {
      setCurrentPassageIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
      timer.resume();
    }
    // All done
    else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      timer.stop();
      const result = await completeSection('reading', timer.getElapsedTime());

      // Calculate final scores
      const finalCorrect = Object.values(answers).filter(a => a.isCorrect).length;
      const finalBandScore = getBandScore(finalCorrect);

      // Pass results to parent
      onComplete({
        score: result?.score || finalBandScore,
        rawScore: result?.rawScore || finalCorrect,
        totalQuestions: allQuestions.length
      });
    } catch (err) {
      console.error('Error completing section:', err);
      // Still complete even if save fails
      const finalCorrect = Object.values(answers).filter(a => a.isCorrect).length;
      onComplete({
        score: getBandScore(finalCorrect),
        rawScore: finalCorrect,
        totalQuestions: allQuestions.length
      });
    }
  };

  // Navigate to specific passage
  const goToPassage = (passageIndex) => {
    if (!showExplanation && passageIndex !== currentPassageIndex) {
      setCurrentPassageIndex(passageIndex);
      setCurrentQuestionIndex(0);
    }
  };

  // Calculate scores
  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;
  const bandScore = getBandScore(correctCount);

  // Loading screen with progress and tips
  if (loading) {
    return <LoadingScreen section="reading" />;
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={loadAllPassages} variant="primary">
              Try Again
            </Button>
            <Button onClick={onComplete} variant="ghost">
              Skip Section
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{sectionInfo.icon}</span>
              <div>
                <h2 className="font-semibold text-gray-800">{sectionInfo.name}</h2>
                <p className="text-sm text-gray-500">
                  Question {getGlobalQuestionNumber()} of {totalQuestions}
                </p>
              </div>
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className={`text-2xl font-mono font-bold ${
                timer.isPaused ? 'text-blue-600' :
                timer.isCriticalTime ? 'text-red-600 animate-pulse' :
                timer.isLowTime ? 'text-orange-500' : 'text-gray-800'
              }`}>
                {timer.formattedTime}
              </div>
              {timer.isPaused && (
                <span className="text-xs text-blue-500 font-medium">PAUSED - Reviewing</span>
              )}
            </div>

            {/* Score with Band */}
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

          {/* Passage Tabs */}
          <div className="mt-3 flex gap-2">
            {passages.map((passage, index) => {
              const passageQuestions = passage?.questions || [];
              const passageAnswers = Object.values(answers).filter(a => a.passageIndex === index);
              const passageCorrect = passageAnswers.filter(a => a.isCorrect).length;
              const isActive = index === currentPassageIndex;

              return (
                <button
                  key={index}
                  onClick={() => goToPassage(index)}
                  disabled={showExplanation}
                  className={`
                    flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                    ${showExplanation ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>Passage {index + 1}</span>
                    {passageAnswers.length > 0 && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-blue-400' : 'bg-gray-200'
                      }`}>
                        {passageCorrect}/{passageAnswers.length}
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-75 truncate mt-0.5">
                    {passage?.passage?.title || 'Loading...'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(getGlobalQuestionNumber() / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Passage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-600 font-medium">
                    PASSAGE {currentPassageIndex + 1} OF 3
                  </span>
                  <h3 className="font-semibold text-gray-800">{currentPassage?.passage?.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{currentPassage?.passage?.wordCount} words</p>
                  <p className="text-xs text-gray-400">{currentPassage?.passage?.topic}</p>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                {currentPassage?.passage?.text?.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {/* Question Navigation for Current Passage */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  Passage {currentPassageIndex + 1} Questions
                </span>
                <span className="text-xs text-gray-400">
                  Q{currentPassage?.questions?.[0]?.questionNumber || '?'} - Q{currentPassage?.questions?.[currentPassage?.questions?.length - 1]?.questionNumber || '?'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentPassage?.questions?.map((q, index) => {
                  // Calculate the correct global question number for this question
                  let baseNum = 0;
                  for (let i = 0; i < currentPassageIndex; i++) {
                    baseNum += passages[i]?.questions?.length || 0;
                  }
                  const globalNum = baseNum + index + 1;
                  const answer = answers[globalNum];
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={index}
                      onClick={() => !showExplanation && setCurrentQuestionIndex(index)}
                      disabled={showExplanation}
                      className={`
                        w-8 h-8 rounded-lg text-xs font-medium transition-all
                        ${isCurrent
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                          : answer
                            ? answer.isCorrect
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                        ${showExplanation ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {q.questionNumber || globalNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Question */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {currentQuestion && (
                <QuestionDisplay
                  question={currentQuestion}
                  questionNumber={currentQuestion.questionNumber}
                  onAnswer={handleAnswer}
                  disabled={showExplanation}
                  userAnswer={answers[getGlobalQuestionNumber()]?.userAnswer}
                />
              )}
            </div>

            {/* Explanation */}
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
                        const answerKey = `${currentPassageIndex}-${currentQuestionIndex}`;
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

                  {currentQuestion?.paragraphReference && (
                    <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                      <h5 className="font-medium text-blue-800 mb-1">Location in Passage</h5>
                      <p className="text-blue-700">{currentQuestion.paragraphReference}</p>
                    </div>
                  )}

                  {currentQuestion?.keyEvidence && (
                    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                      <h5 className="font-medium text-yellow-800 mb-1">Key Evidence</h5>
                      <p className="text-yellow-700 italic">"{currentQuestion.keyEvidence}"</p>
                    </div>
                  )}

                  {currentQuestion?.studyTip && (
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                      <h5 className="font-medium text-green-800 mb-1">Study Tip</h5>
                      <p className="text-green-700">{currentQuestion.studyTip}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={handleNext} variant="primary">
                    {getGlobalQuestionNumber() < totalQuestions ? 'Next Question' : 'Finish Section'}
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handleFinish}
                variant="ghost"
                disabled={showExplanation}
              >
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

export default ReadingSection;
