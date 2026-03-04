// IELTS Band Score Conversion Tables

// Raw score to band score conversion for Listening
export const listeningBandTable = {
  39: 9.0, 40: 9.0,
  37: 8.5, 38: 8.5,
  35: 8.0, 36: 8.0,
  33: 7.5, 34: 7.5,
  30: 7.0, 31: 7.0, 32: 7.0,
  27: 6.5, 28: 6.5, 29: 6.5,
  23: 6.0, 24: 6.0, 25: 6.0, 26: 6.0,
  20: 5.5, 21: 5.5, 22: 5.5,
  16: 5.0, 17: 5.0, 18: 5.0, 19: 5.0,
  13: 4.5, 14: 4.5, 15: 4.5,
  10: 4.0, 11: 4.0, 12: 4.0,
  6: 3.5, 7: 3.5, 8: 3.5, 9: 3.5,
  4: 3.0, 5: 3.0,
  3: 2.5,
  2: 2.0,
  1: 1.0
};

// Raw score to band score conversion for Reading (Academic)
export const readingBandTable = {
  39: 9.0, 40: 9.0,
  37: 8.5, 38: 8.5,
  35: 8.0, 36: 8.0,
  33: 7.5, 34: 7.5,
  30: 7.0, 31: 7.0, 32: 7.0,
  27: 6.5, 28: 6.5, 29: 6.5,
  23: 6.0, 24: 6.0, 25: 6.0, 26: 6.0,
  19: 5.5, 20: 5.5, 21: 5.5, 22: 5.5,
  15: 5.0, 16: 5.0, 17: 5.0, 18: 5.0,
  13: 4.5, 14: 4.5,
  10: 4.0, 11: 4.0, 12: 4.0,
  8: 3.5, 9: 3.5,
  6: 3.0, 7: 3.0,
  4: 2.5, 5: 2.5,
  3: 2.0,
  2: 1.0, 1: 1.0
};

// Convert raw score to band score
export const calculateBandScore = (rawScore, section) => {
  const table = section === 'listening' ? listeningBandTable : readingBandTable;

  // Find the band score for the raw score
  for (let score = rawScore; score >= 0; score--) {
    if (table[score] !== undefined) {
      return table[score];
    }
  }
  return 0;
};

// Calculate overall band score from all sections
export const calculateOverallBand = (scores) => {
  const { listening, reading, writing, speaking } = scores;
  const validScores = [listening, reading, writing, speaking].filter(s => s !== undefined && s !== null);

  if (validScores.length === 0) return 0;

  const sum = validScores.reduce((a, b) => a + b, 0);
  const average = sum / validScores.length;

  // IELTS rounds to nearest 0.5
  return Math.round(average * 2) / 2;
};

// Analyze mistakes and identify weaknesses
export const analyzeWeaknesses = (answers) => {
  const weaknessCount = {};

  answers.forEach(answer => {
    if (!answer.isCorrect && answer.questionType) {
      const type = answer.questionType;
      weaknessCount[type] = (weaknessCount[type] || 0) + 1;
    }
  });

  // Sort by frequency
  const sorted = Object.entries(weaknessCount)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / answers.filter(a => a.questionType === type).length) * 100)
    }));

  return sorted;
};

// Get performance summary
export const getPerformanceSummary = (simulation) => {
  const sections = simulation.sections;
  const summary = {
    listening: null,
    reading: null,
    writing: null,
    speaking: null,
    overall: null,
    weaknesses: [],
    strengths: [],
    recommendations: []
  };

  // Listening analysis
  if (sections.listening?.completed) {
    const totalAnswered = sections.listening.answers?.length || 0;
    const correct = sections.listening.answers.filter(a => a.isCorrect).length;
    summary.listening = {
      rawScore: correct,
      totalQuestions: totalAnswered,
      bandScore: sections.listening.score,
      accuracy: totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0,
      weakAreas: analyzeWeaknesses(sections.listening.answers)
    };
  }

  // Reading analysis
  if (sections.reading?.completed) {
    const totalAnswered = sections.reading.answers?.length || 0;
    const correct = sections.reading.answers.filter(a => a.isCorrect).length;
    summary.reading = {
      rawScore: correct,
      totalQuestions: totalAnswered,
      bandScore: sections.reading.score,
      accuracy: totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0,
      weakAreas: analyzeWeaknesses(sections.reading.answers)
    };
  }

  // Writing analysis
  if (sections.writing?.completed) {
    summary.writing = {
      bandScore: sections.writing.score,
      task1Score: sections.writing.task1?.overallScore,
      task2Score: sections.writing.task2?.overallScore,
      feedback: {
        task1: sections.writing.task1?.feedback,
        task2: sections.writing.task2?.feedback
      }
    };
  }

  // Speaking analysis
  if (sections.speaking?.completed) {
    summary.speaking = {
      bandScore: sections.speaking.score,
      partScores: sections.speaking.parts?.map(p => ({
        part: p.partNumber,
        score: p.overallScore
      }))
    };
  }

  // Overall
  summary.overall = simulation.overallBand;

  // Compile all weaknesses
  const allWeaknesses = [];
  if (summary.listening?.weakAreas) allWeaknesses.push(...summary.listening.weakAreas);
  if (summary.reading?.weakAreas) allWeaknesses.push(...summary.reading.weakAreas);

  summary.weaknesses = allWeaknesses
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return summary;
};

// Calculate time per question
export const calculateTimeMetrics = (answers, totalTime) => {
  const avgTimePerQuestion = totalTime / answers.length;
  const slowQuestions = answers.filter(a => a.timeSpent > avgTimePerQuestion * 1.5);
  const fastQuestions = answers.filter(a => a.timeSpent < avgTimePerQuestion * 0.5);

  return {
    averageTime: Math.round(avgTimePerQuestion),
    slowQuestions: slowQuestions.length,
    fastQuestions: fastQuestions.length,
    recommendation: slowQuestions.length > answers.length * 0.3
      ? 'You spent too long on some questions. Practice time management.'
      : 'Good time management overall.'
  };
};

export default {
  calculateBandScore,
  calculateOverallBand,
  analyzeWeaknesses,
  getPerformanceSummary,
  calculateTimeMetrics
};
