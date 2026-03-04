import { useState, useEffect } from 'react';

// IELTS tips by section
const tips = {
  reading: [
    "Tip: Skim the passage first to get a general understanding before reading questions.",
    "Tip: Don't spend too long on one question - you have about 1.5 minutes per question.",
    "Tip: Look for keywords in questions, then locate them in the passage.",
    "Tip: For True/False/Not Given, be careful - 'Not Given' means the info isn't there, not that it's false.",
    "Tip: Read the instructions carefully - some questions require specific word limits.",
    "Tip: Passage 3 is usually the hardest - manage your time accordingly.",
    "Did you know? You have 60 minutes for 40 questions (3 passages).",
    "Tip: Matching headings? Read the first and last sentence of each paragraph.",
    "Tip: Underline key parts of questions to stay focused.",
    "Tip: Answers appear in passage order for most question types."
  ],
  listening: [
    "Tip: You only hear the audio ONCE - listen carefully!",
    "Tip: Read questions before each section plays to know what to listen for.",
    "Tip: Write answers as you hear them - don't wait until the end.",
    "Tip: Watch out for spelling - misspelled words are marked wrong.",
    "Tip: Listen for signposting words like 'however', 'but', 'actually' for answer changes.",
    "Tip: Part 4 is usually the hardest - stay focused!",
    "Did you know? You get 10 minutes at the end to transfer your answers.",
    "Tip: Numbers, names, and places are often spelled out - listen carefully.",
    "Tip: If you miss an answer, move on - don't lose focus on the next questions.",
    "Tip: Plurals matter! Listen for 's' sounds carefully."
  ],
  speaking: [
    "Tip: Don't give yes/no answers - extend your responses naturally.",
    "Tip: It's okay to pause briefly to think - use fillers like 'well', 'let me think'.",
    "Tip: Part 2: Use the 1 minute prep time to make brief notes.",
    "Tip: Speak clearly and at a natural pace - don't rush.",
    "Tip: If you don't understand, ask the examiner to repeat the question.",
    "Tip: Use a variety of vocabulary - avoid repeating the same words.",
    "Tip: Part 3 tests abstract thinking - give thoughtful, developed answers.",
    "Did you know? Speaking is 11-14 minutes total, divided into 3 parts.",
    "Tip: Practice speaking for 2 minutes without stopping for Part 2.",
    "Tip: Use examples from your own experience to support your points."
  ],
  writing: [
    "Tip: Task 2 is worth twice as much as Task 1 - spend 40 minutes on it.",
    "Tip: Plan before you write - spend 3-5 minutes organizing your ideas.",
    "Tip: Task 1 needs at least 150 words, Task 2 needs at least 250 words.",
    "Tip: Use paragraphs to organize your writing clearly.",
    "Tip: Don't memorize essays - examiners can tell and will mark you down.",
    "Did you know? Writing is marked on 4 criteria: Task, Coherence, Lexical, Grammar.",
    "Tip: Leave 2-3 minutes at the end to check for errors.",
    "Tip: Use linking words to connect your ideas smoothly.",
    "Tip: For Task 1, describe the main trends - don't list every data point.",
    "Tip: For Task 2, make sure you address ALL parts of the question."
  ]
};

// Progress stages by section
const stages = {
  reading: [
    "Preparing reading content...",
    "Generating Passage 1 of 3...",
    "Generating Passage 2 of 3...",
    "Generating Passage 3 of 3...",
    "Creating questions...",
    "Finalizing test..."
  ],
  listening: [
    "Preparing listening content...",
    "Generating Part 1 of 4...",
    "Generating Part 2 of 4...",
    "Generating Part 3 of 4...",
    "Generating Part 4 of 4...",
    "Creating audio...",
    "Finalizing test..."
  ],
  speaking: [
    "Preparing speaking prompts...",
    "Generating questions...",
    "Setting up examiner...",
    "Finalizing..."
  ],
  writing: [
    "Preparing writing tasks...",
    "Generating Task 1...",
    "Generating Task 2...",
    "Finalizing..."
  ]
};

// Estimated times (in seconds)
const estimatedTimes = {
  reading: 90,   // 1.5 minutes for 3 passages
  listening: 120, // 2 minutes for 4 parts + audio
  speaking: 30,   // 30 seconds per part
  writing: 45     // 45 seconds for 2 tasks
};

const LoadingScreen = ({ section = 'reading', currentStep = null }) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const sectionTips = tips[section] || tips.reading;
  const sectionStages = stages[section] || stages.reading;
  const estimatedTime = estimatedTimes[section] || 60;

  // Rotate tips every 5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % sectionTips.length);
    }, 5000);

    return () => clearInterval(tipInterval);
  }, [sectionTips.length]);

  // Simulate progress stages
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStageIndex(prev => {
        const next = prev + 1;
        return next >= sectionStages.length ? prev : next;
      });
    }, estimatedTime / sectionStages.length * 1000);

    return () => clearInterval(stageInterval);
  }, [sectionStages.length, estimatedTime]);

  // Animate progress bar
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Slow down as it approaches 95%
        const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.3;
        return Math.min(prev + increment, 95);
      });
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(progressInterval);
  }, []);

  // Format remaining time estimate
  const getRemainingTime = () => {
    const remaining = Math.max(0, estimatedTime - elapsedTime);
    if (remaining < 60) {
      return `~${remaining}s remaining`;
    }
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `~${mins}:${secs.toString().padStart(2, '0')} remaining`;
  };

  // Get section-specific icon and color
  const getSectionStyle = () => {
    switch (section) {
      case 'reading':
        return { icon: '📖', color: 'blue', gradient: 'from-blue-500 to-blue-600' };
      case 'listening':
        return { icon: '🎧', color: 'purple', gradient: 'from-purple-500 to-purple-600' };
      case 'speaking':
        return { icon: '🎤', color: 'orange', gradient: 'from-orange-500 to-orange-600' };
      case 'writing':
        return { icon: '✍️', color: 'green', gradient: 'from-green-500 to-green-600' };
      default:
        return { icon: '📝', color: 'gray', gradient: 'from-gray-500 to-gray-600' };
    }
  };

  const style = getSectionStyle();
  const currentStage = currentStep || sectionStages[stageIndex];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-lg w-full">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-r ${style.gradient} flex items-center justify-center shadow-lg`}>
            <span className="text-4xl animate-bounce">{style.icon}</span>
          </div>
          {/* Spinning ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-28 h-28 border-4 border-${style.color}-200 border-t-${style.color}-500 rounded-full animate-spin`} />
          </div>
        </div>

        {/* Current Stage */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {currentStage}
        </h2>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${style.gradient} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time Estimate */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <span>{Math.round(progress)}% complete</span>
          <span>{getRemainingTime()}</span>
        </div>

        {/* Stage Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {sectionStages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index < stageIndex
                  ? `bg-${style.color}-500`
                  : index === stageIndex
                    ? `bg-${style.color}-500 animate-pulse scale-125`
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Rotating Tips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-h-[80px] flex items-center justify-center">
          <div className="transition-opacity duration-500">
            <div className={`text-${style.color}-600 text-sm font-medium`}>
              {sectionTips[tipIndex]}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-gray-400 mt-4">
          AI is generating personalized content for your practice session.
          <br />
          Please wait - this ensures high-quality, exam-like material.
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
