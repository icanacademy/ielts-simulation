import { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { useStudent } from '../../context/StudentContext';
import { aiAPI } from '../../services/api';
import useTimer from '../../hooks/useTimer';
import Button from '../common/Button';
import ChartDisplay from './ChartDisplay';

const WritingSection = ({ onComplete, sectionInfo }) => {
  const { student } = useStudent();
  const { submitWriting, completeSection, simulation } = useSimulation();

  const [currentTask, setCurrentTask] = useState(1); // 1 or 2
  const [tasks, setTasks] = useState({ task1: null, task2: null });
  const [responses, setResponses] = useState({ task1: '', task2: '' });
  const [evaluations, setEvaluations] = useState({ task1: null, task2: null });
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState(null);

  const timer = useTimer(sectionInfo.time, true);

  // Generate prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  // Start timer when prompts loaded
  useEffect(() => {
    if (tasks.task1 && tasks.task2 && !timer.isRunning) {
      timer.start();
    }
  }, [tasks]);

  // Handle time up
  useEffect(() => {
    if (timer.isComplete) {
      handleFinish();
    }
  }, [timer.isComplete]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter writing-specific weaknesses
      const writingWeaknesses = student?.weaknesses?.filter(w => [
        'Task 1 Data Description', 'Task 1 Process Description', 'Task 1 Map Description',
        'Task 2 Opinion Essays', 'Task 2 Discussion Essays', 'Task 2 Problem-Solution',
        'Task 2 Advantages-Disadvantages', 'Grammar Accuracy', 'Vocabulary Range',
        'Coherence & Cohesion', 'Grammatical Range'
      ].includes(w)) || [];

      const [task1Res, task2Res] = await Promise.all([
        aiAPI.generateWriting({
          taskType: 'task1',
          difficulty: student?.targetBand || 6,
          targetWeaknesses: writingWeaknesses
        }),
        aiAPI.generateWriting({
          taskType: 'task2',
          difficulty: student?.targetBand || 6,
          targetWeaknesses: writingWeaknesses
        })
      ]);

      setTasks({
        task1: task1Res.data,
        task2: task2Res.data
      });
    } catch (err) {
      setError('Failed to generate writing prompts. Please check your API key.');
      console.error('Error loading prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (e) => {
    const taskKey = currentTask === 1 ? 'task1' : 'task2';
    setResponses(prev => ({
      ...prev,
      [taskKey]: e.target.value
    }));
  };

  const handleSubmitTask = async () => {
    const taskKey = currentTask === 1 ? 'task1' : 'task2';
    const task = tasks[taskKey];
    const response = responses[taskKey];

    if (!response.trim()) return;

    try {
      setEvaluating(true);
      setError(null);

      // Evaluate with AI
      const evalRes = await aiAPI.evaluateWriting({
        task: { prompt: task.prompt, taskType: task.taskType || taskKey },
        userResponse: response
      });

      setEvaluations(prev => ({
        ...prev,
        [taskKey]: evalRes.data
      }));

      // Try to save to simulation (don't fail if this errors)
      try {
        await submitWriting(task.taskType || taskKey, task.prompt, response, evalRes.data);
      } catch (saveErr) {
        console.warn('Could not save to simulation:', saveErr);
        // Continue anyway - evaluation succeeded
      }

      setShowFeedback(true);
    } catch (err) {
      console.error('Error evaluating writing:', err);
      setError('Failed to evaluate your writing. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextTask = () => {
    setShowFeedback(false);
    if (currentTask === 1) {
      setCurrentTask(2);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      timer.stop();
      await completeSection('writing', timer.getElapsedTime());

      // Calculate writing scores
      const task1Score = evaluations.task1?.overallScore || 0;
      const task2Score = evaluations.task2?.overallScore || 0;
      const avgScore = task1Score && task2Score
        ? Math.round(((task1Score + task2Score) / 2) * 2) / 2
        : (task1Score || task2Score || 0);

      // Pass results to parent
      onComplete({
        score: avgScore,
        task1: evaluations.task1,
        task2: evaluations.task2
      });
    } catch (err) {
      console.error('Error completing section:', err);
      // Still complete even if save fails
      const task1Score = evaluations.task1?.overallScore || 0;
      const task2Score = evaluations.task2?.overallScore || 0;
      onComplete({
        score: task1Score && task2Score ? ((task1Score + task2Score) / 2).toFixed(1) : (task1Score || task2Score || 0),
        task1: evaluations.task1,
        task2: evaluations.task2
      });
    }
  };

  const wordCount = (responses[currentTask === 1 ? 'task1' : 'task2'] || '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  const minWords = currentTask === 1 ? 150 : 250;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Generating writing prompts...</p>
        </div>
      </div>
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
            <Button onClick={loadPrompts} variant="primary">Try Again</Button>
            <Button onClick={onComplete} variant="ghost">Skip Section</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentTaskData = currentTask === 1 ? tasks.task1 : tasks.task2;
  const currentResponse = currentTask === 1 ? responses.task1 : responses.task2;
  const currentEvaluation = currentTask === 1 ? evaluations.task1 : evaluations.task2;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{sectionInfo.icon}</span>
              <div>
                <h2 className="font-semibold text-gray-800">Writing Task {currentTask}</h2>
                <p className="text-sm text-gray-500">
                  {currentTask === 1 ? 'Describe the visual' : 'Essay writing'}
                </p>
              </div>
            </div>

            {/* Timer */}
            <div className={`text-2xl font-mono font-bold ${
              timer.isCriticalTime ? 'text-red-600 animate-pulse' :
              timer.isLowTime ? 'text-orange-500' : 'text-gray-800'
            }`}>
              {timer.formattedTime}
            </div>

            {/* Task Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => !showFeedback && setCurrentTask(1)}
                disabled={showFeedback}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentTask === 1
                    ? 'bg-green-500 text-white'
                    : evaluations.task1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                Task 1 {evaluations.task1 && '✓'}
              </button>
              <button
                onClick={() => !showFeedback && setCurrentTask(2)}
                disabled={showFeedback}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentTask === 2
                    ? 'bg-green-500 text-white'
                    : evaluations.task2
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                Task 2 {evaluations.task2 && '✓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {!showFeedback ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prompt */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                Writing Task {currentTask}
              </h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{currentTaskData?.prompt}</p>
              </div>

              {currentTaskData?.chartType && currentTaskData?.chartData && (
                <div className="mt-4">
                  <ChartDisplay
                    chartType={currentTaskData.chartType}
                    chartData={currentTaskData.chartData}
                    chartTitle={currentTaskData.chartTitle}
                  />
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Requirements:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Write at least {minWords} words</li>
                  <li>• {currentTask === 1 ? 'Spend about 20 minutes on this task' : 'Spend about 40 minutes on this task'}</li>
                  <li>• {currentTask === 1 ? 'Summarize the main features and make comparisons' : 'Present a clear position and support it with reasons and examples'}</li>
                </ul>
              </div>
            </div>

            {/* Writing Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Your Response</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  wordCount >= minWords
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {wordCount} / {minWords}+ words
                </span>
              </div>

              <textarea
                value={currentResponse}
                onChange={handleResponseChange}
                placeholder={`Start writing your ${currentTask === 1 ? 'report' : 'essay'} here...`}
                className="w-full h-[400px] p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />

              <div className="mt-4 flex justify-between items-center">
                <Button onClick={handleFinish} variant="ghost">
                  End Section Early
                </Button>
                <Button
                  onClick={handleSubmitTask}
                  loading={evaluating}
                  disabled={wordCount < 50}
                  variant="primary"
                >
                  Submit Task {currentTask}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Feedback View */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">{currentEvaluation?.overallScore >= 6 ? '🎉' : '📝'}</div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Task {currentTask} Score: {currentEvaluation?.overallScore}
                </h2>
                <p className="text-gray-500">Word count: {currentEvaluation?.wordCount}</p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Task Achievement', key: 'taskAchievement' },
                  { label: 'Coherence & Cohesion', key: 'coherenceCohesion' },
                  { label: 'Lexical Resource', key: 'lexicalResource' },
                  { label: 'Grammar', key: 'grammaticalRange' }
                ].map(({ label, key }) => (
                  <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {currentEvaluation?.scores?.[key] || '-'}
                    </p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Feedback */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Feedback</h4>
                  <p className="text-blue-700">{currentEvaluation?.feedback}</p>
                </div>

                {currentEvaluation?.strengths?.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
                    <ul className="text-green-700 space-y-2">
                      {currentEvaluation.strengths.map((s, i) => (
                        <li key={i} className="ml-4">
                          {typeof s === 'object' ? (
                            <div>
                              <span className="font-medium">{s.criterion || s.area || ''}: </span>
                              {s.description || s.example || JSON.stringify(s)}
                            </div>
                          ) : (
                            <span>• {s}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentEvaluation?.improvements?.length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Areas to Improve</h4>
                    <ul className="text-yellow-700 space-y-3">
                      {currentEvaluation.improvements.map((imp, i) => (
                        <li key={i} className="ml-4">
                          {typeof imp === 'object' ? (
                            <div className="space-y-1">
                              <div className="font-medium">{imp.area || imp.criterion || 'Improvement'}</div>
                              {imp.issue && <div className="text-sm">Issue: {imp.issue}</div>}
                              {imp.suggestion && <div className="text-sm">Suggestion: {imp.suggestion}</div>}
                              {imp.example && <div className="text-sm italic">Example: {imp.example}</div>}
                            </div>
                          ) : (
                            <span>• {imp}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <Button onClick={handleNextTask} variant="primary" size="lg">
                  {currentTask === 1 ? 'Continue to Task 2' : 'Finish Writing Section'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WritingSection;
