import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { useSimulation } from '../context/SimulationContext';
import Button from '../components/common/Button';
import ReadingSection from '../components/simulation/ReadingSection';
import WritingSection from '../components/simulation/WritingSection';
import ListeningSection from '../components/simulation/ListeningSection';
import SpeakingSection from '../components/simulation/SpeakingSection';

const SECTION_INFO = {
  listening: {
    name: 'Listening', time: 30 * 60, icon: '🎧', questions: 40, order: 1,
    styles: {
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      bgLight: 'bg-purple-100',
      ring: 'ring-purple-200',
      text: 'text-purple-700',
      textDark: 'text-purple-600',
      checkbox: 'border-purple-500 bg-purple-500'
    }
  },
  reading: {
    name: 'Reading', time: 60 * 60, icon: '📖', questions: 40, order: 2,
    styles: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      bgLight: 'bg-blue-100',
      ring: 'ring-blue-200',
      text: 'text-blue-700',
      textDark: 'text-blue-600',
      checkbox: 'border-blue-500 bg-blue-500'
    }
  },
  writing: {
    name: 'Writing', time: 60 * 60, icon: '✍️', tasks: 2, order: 3,
    styles: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      bgLight: 'bg-green-100',
      ring: 'ring-green-200',
      text: 'text-green-700',
      textDark: 'text-green-600',
      checkbox: 'border-green-500 bg-green-500'
    }
  },
  speaking: {
    name: 'Speaking', time: 14 * 60, icon: '🎤', parts: 3, order: 4,
    styles: {
      border: 'border-orange-500',
      bg: 'bg-orange-50',
      bgLight: 'bg-orange-100',
      ring: 'ring-orange-200',
      text: 'text-orange-700',
      textDark: 'text-orange-600',
      checkbox: 'border-orange-500 bg-orange-500'
    }
  }
};

const SECTION_ORDER = ['listening', 'reading', 'writing', 'speaking'];

const Simulation = () => {
  const navigate = useNavigate();
  const { student } = useStudent();
  const {
    simulation,
    loading,
    error,
    startSimulation,
    completeSimulation,
    resetSimulation,
    setCurrentSection
  } = useSimulation();

  const [step, setStep] = useState('choose'); // choose, in-progress, summary
  const [selectedSections, setSelectedSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState([]);
  const [sectionResults, setSectionResults] = useState({}); // Store results for each section

  useEffect(() => {
    resetSimulation();
  }, []);

  // Get current section being taken
  const currentSection = selectedSections[currentSectionIndex];

  // Toggle section selection
  const toggleSection = (section) => {
    setSelectedSections(prev => {
      if (prev.includes(section)) {
        return prev.filter(s => s !== section);
      } else {
        // Add and sort by order
        const newSections = [...prev, section];
        return newSections.sort((a, b) => SECTION_INFO[a].order - SECTION_INFO[b].order);
      }
    });
  };

  // Select all sections (Full Test)
  const selectFullTest = () => {
    setSelectedSections([...SECTION_ORDER]);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSections([]);
  };

  // Calculate total time for selected sections
  const totalTime = selectedSections.reduce((sum, section) => sum + SECTION_INFO[section].time, 0);

  // Start the simulation
  const handleStart = async () => {
    if (!student?._id) {
      navigate('/setup');
      return;
    }

    if (selectedSections.length === 0) {
      return;
    }

    try {
      const type = selectedSections.length === 4 ? 'full' : 'practice';
      await startSimulation(student._id, type, selectedSections[0]);
      setCurrentSection(selectedSections[0]);
      setCurrentSectionIndex(0);
      setCompletedSections([]);
      setStep('in-progress');
    } catch (err) {
      console.error('Failed to start simulation:', err);
    }
  };

  // Handle section completion - now shows summary before moving to next
  const handleSectionComplete = async (results = {}) => {
    const justCompleted = currentSection;
    setCompletedSections(prev => [...prev, justCompleted]);

    // Store the results for this section
    setSectionResults(prev => ({
      ...prev,
      [justCompleted]: results
    }));

    // Show summary screen
    setStep('summary');
  };

  // Continue to next section after viewing summary
  const handleContinueToNext = async () => {
    if (currentSectionIndex < selectedSections.length - 1) {
      // Move to next section
      const nextIndex = currentSectionIndex + 1;
      const nextSection = selectedSections[nextIndex];
      setCurrentSectionIndex(nextIndex);
      setCurrentSection(nextSection);
      setStep('in-progress');
    } else {
      // All sections complete - go to final results
      try {
        await completeSimulation();
        navigate(`/results/${simulation._id}`);
      } catch (err) {
        console.error('Failed to complete simulation:', err);
        navigate('/dashboard');
      }
    }
  };

  // Render section component
  const renderSection = () => {
    const props = {
      onComplete: handleSectionComplete,
      sectionInfo: SECTION_INFO[currentSection]
    };

    switch (currentSection) {
      case 'listening':
        return <ListeningSection {...props} />;
      case 'reading':
        return <ReadingSection {...props} />;
      case 'writing':
        return <WritingSection {...props} />;
      case 'speaking':
        return <SpeakingSection {...props} />;
      default:
        return null;
    }
  };

  // Choose Test Screen
  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ICAN IELTS Practice
            </h1>
            <p className="text-gray-600">
              Select the sections you want to practice
            </p>
            {student?.weaknesses?.length > 0 && (
              <p className="text-sm text-purple-600 mt-2">
                🎯 Questions will target your {student.weaknesses.length} identified weaknesses
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Quick Options */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={selectFullTest}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedSections.length === 4
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border-2 border-indigo-200 text-indigo-600 hover:border-indigo-400'
              }`}
            >
              Full Test (All 4 Sections)
            </button>
            {selectedSections.length > 0 && (
              <button
                onClick={clearSelection}
                className="px-6 py-2 rounded-full font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Section Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {SECTION_ORDER.map((key) => {
              const info = SECTION_INFO[key];
              const isSelected = selectedSections.includes(key);
              const s = info.styles;

              return (
                <button
                  key={key}
                  onClick={() => toggleSection(key)}
                  disabled={loading}
                  className={`
                    p-6 rounded-xl text-left transition-all border-2
                    ${isSelected
                      ? `${s.border} ${s.bg} shadow-lg ring-2 ${s.ring}`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                    group relative
                  `}
                >
                  {/* Checkbox */}
                  <div className={`
                    absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${isSelected ? `${s.checkbox} text-white` : 'border-gray-300'}
                  `}>
                    {isSelected && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className={`
                      w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                      ${isSelected ? s.bgLight : 'bg-gray-100'}
                      group-hover:scale-105 transition-transform
                    `}>
                      {info.icon}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isSelected ? s.text : 'text-gray-800'}`}>
                        {info.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {Math.floor(info.time / 60)} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {info.questions ? `${info.questions} questions` : info.tasks ? `${info.tasks} tasks` : `${info.parts} parts`}
                    </span>
                    {isSelected && (
                      <span className={`${s.textDark} font-medium`}>
                        #{selectedSections.indexOf(key) + 1} in order
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selection Summary & Start Button */}
          {selectedSections.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Your Test Plan</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedSections.map((section, index) => {
                      const info = SECTION_INFO[section];
                      return (
                        <span key={section} className="flex items-center gap-1">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${info.styles.bgLight} ${info.styles.text}`}>
                            {index + 1}. {info.name}
                          </span>
                          {index < selectedSections.length - 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Time</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.floor(totalTime / 60)} min
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleStart}
                  disabled={loading || selectedSections.length === 0}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Start {selectedSections.length === 4 ? 'Full Test' : `Practice (${selectedSections.length} section${selectedSections.length > 1 ? 's' : ''})`}
                </Button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-3">Tips Before You Start:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div className="flex items-start gap-2">
                <span>🎧</span>
                <span><strong>Listening:</strong> Use headphones for best audio quality</span>
              </div>
              <div className="flex items-start gap-2">
                <span>📖</span>
                <span><strong>Reading:</strong> Practice skimming and scanning techniques</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✍️</span>
                <span><strong>Writing:</strong> Task 1 = 150+ words, Task 2 = 250+ words</span>
              </div>
              <div className="flex items-start gap-2">
                <span>🎤</span>
                <span><strong>Speaking:</strong> Allow microphone access for voice recording</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button onClick={() => navigate('/')} variant="ghost">
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // In Progress - Show section progress and render current section
  if (step === 'in-progress' && currentSection) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Multi-section Progress Bar */}
        {selectedSections.length > 1 && (
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="container mx-auto max-w-4xl">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {selectedSections.map((section, index) => {
                  const info = SECTION_INFO[section];
                  const s = info.styles;
                  const isCompleted = completedSections.includes(section);
                  const isCurrent = section === currentSection;

                  return (
                    <div key={section} className="flex items-center">
                      <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                        ${isCompleted
                          ? 'bg-green-100 text-green-700'
                          : isCurrent
                            ? `${s.bgLight} ${s.text} ring-2 ${s.ring}`
                            : 'bg-gray-100 text-gray-400'
                        }
                      `}>
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span>{info.icon}</span>
                        )}
                        <span>{info.name}</span>
                      </div>
                      {index < selectedSections.length - 1 && (
                        <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Current Section */}
        {renderSection()}
      </div>
    );
  }

  // Summary Screen - shown after each section completes
  if (step === 'summary') {
    const justCompletedSection = completedSections[completedSections.length - 1];
    const sectionInfo = SECTION_INFO[justCompletedSection];
    const results = sectionResults[justCompletedSection] || {};
    const s = sectionInfo.styles;
    const isLastSection = currentSectionIndex >= selectedSections.length - 1;
    const nextSection = !isLastSection ? selectedSections[currentSectionIndex + 1] : null;
    const nextSectionInfo = nextSection ? SECTION_INFO[nextSection] : null;

    // Get score display based on section type
    const getScoreDisplay = () => {
      if (justCompletedSection === 'listening' || justCompletedSection === 'reading') {
        return {
          score: results.score || results.bandScore || 0,
          detail: results.rawScore !== undefined ? `${results.rawScore}/40 correct` : null
        };
      } else if (justCompletedSection === 'writing') {
        const task1Score = results.task1?.overallScore || 0;
        const task2Score = results.task2?.overallScore || 0;
        const avgScore = task1Score && task2Score ? ((task1Score + task2Score) / 2).toFixed(1) : (task1Score || task2Score || 0);
        return {
          score: avgScore,
          detail: `Task 1: ${task1Score || '-'} | Task 2: ${task2Score || '-'}`
        };
      } else if (justCompletedSection === 'speaking') {
        return {
          score: results.overallScore || results.score || 0,
          detail: results.partsCompleted ? `${results.partsCompleted}/3 parts` : null
        };
      }
      return { score: results.score || 0, detail: null };
    };

    const scoreDisplay = getScoreDisplay();
    const getBandColor = (score) => {
      if (score >= 7) return 'text-green-600';
      if (score >= 6) return 'text-blue-600';
      if (score >= 5) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
          {/* Section Complete Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-full ${s.bgLight} flex items-center justify-center text-4xl mb-4`}>
              {sectionInfo.icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {sectionInfo.name} Complete!
            </h2>
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Section {completedSections.length} of {selectedSections.length}</span>
            </div>
          </div>

          {/* Score Display */}
          <div className={`${s.bg} rounded-xl p-6 mb-6`}>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Your Score</p>
              <p className={`text-5xl font-bold ${getBandColor(scoreDisplay.score)} mb-2`}>
                {scoreDisplay.score > 0 ? `Band ${scoreDisplay.score}` : 'Pending'}
              </p>
              {scoreDisplay.detail && (
                <p className={`text-sm ${s.text}`}>{scoreDisplay.detail}</p>
              )}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Progress</h3>
            <div className="flex gap-2">
              {selectedSections.map((section, idx) => {
                const info = SECTION_INFO[section];
                const isComplete = completedSections.includes(section);
                const result = sectionResults[section];
                return (
                  <div
                    key={section}
                    className={`flex-1 p-3 rounded-lg text-center ${
                      isComplete ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <p className="text-xs text-gray-600 mt-1">{info.name}</p>
                    {isComplete && result?.score !== undefined && (
                      <p className="text-sm font-bold text-green-600">{result.score}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isLastSection ? (
              <>
                <Button onClick={handleContinueToNext} variant="primary" size="lg" fullWidth>
                  Continue to {nextSectionInfo?.name} {nextSectionInfo?.icon}
                </Button>
                <p className="text-center text-sm text-gray-500">
                  {selectedSections.length - completedSections.length} section(s) remaining
                </p>
              </>
            ) : (
              <>
                <Button onClick={handleContinueToNext} variant="primary" size="lg" fullWidth>
                  View Final Results
                </Button>
                <p className="text-center text-sm text-gray-500">
                  All sections completed!
                </p>
              </>
            )}
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              fullWidth
            >
              Save & Exit to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Simulation;
