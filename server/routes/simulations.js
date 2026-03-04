import express from 'express';
import Simulation from '../models/Simulation.js';
import Student from '../models/Student.js';
import { calculateBandScore, getPerformanceSummary, analyzeWeaknesses } from '../services/scoringService.js';

const router = express.Router();

/**
 * Smart answer matching for IELTS
 * Handles common variations in answers
 */
const smartAnswerMatch = (userAnswer, correctAnswer) => {
  if (userAnswer === null || userAnswer === undefined) return false;
  if (correctAnswer === null || correctAnswer === undefined) return false;

  // Convert to strings and normalize
  let user = String(userAnswer).trim().toLowerCase();
  let correct = String(correctAnswer).trim().toLowerCase();

  // Direct match
  if (user === correct) return true;

  // Remove common punctuation and extra spaces
  const cleanText = (text) => {
    return text
      .replace(/[.,!?;:'"()[\]{}]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  user = cleanText(user);
  correct = cleanText(correct);

  if (user === correct) return true;

  // Number word equivalents
  const numberWords = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
    'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000',
    'first': '1st', 'second': '2nd', 'third': '3rd', 'fourth': '4th',
    'fifth': '5th', 'sixth': '6th', 'seventh': '7th', 'eighth': '8th',
    'ninth': '9th', 'tenth': '10th'
  };

  // Currency normalization
  const normalizeCurrency = (text) => {
    return text
      // "$20" -> "20 dollars"
      .replace(/\$\s*(\d+(?:\.\d+)?)/g, '$1 dollars')
      // "£20" -> "20 pounds"
      .replace(/£\s*(\d+(?:\.\d+)?)/g, '$1 pounds')
      // "€20" -> "20 euros"
      .replace(/€\s*(\d+(?:\.\d+)?)/g, '$1 euros')
      // "20 usd" -> "20 dollars"
      .replace(/(\d+(?:\.\d+)?)\s*usd/gi, '$1 dollars')
      .replace(/(\d+(?:\.\d+)?)\s*gbp/gi, '$1 pounds')
      .replace(/(\d+(?:\.\d+)?)\s*eur/gi, '$1 euros')
      // Remove "dollars", "pounds" for pure number comparison
      .replace(/\s*(dollars?|pounds?|euros?|cents?|pence)/gi, '');
  };

  // Time normalization
  const normalizeTime = (text) => {
    return text
      // "10:30" and "10.30" are the same
      .replace(/(\d{1,2})[.:](\d{2})/g, '$1:$2')
      // Remove am/pm for comparison
      .replace(/\s*(am|pm|a\.m\.|p\.m\.)/gi, '')
      // "half past ten" -> "10:30" (basic)
      .replace(/half past (\w+)/gi, (_, hour) => {
        const h = numberWords[hour] || hour;
        return h + ':30';
      })
      // "quarter past" -> ":15"
      .replace(/quarter past (\w+)/gi, (_, hour) => {
        const h = numberWords[hour] || hour;
        return h + ':15';
      })
      // "quarter to" -> ":45" of previous hour
      .replace(/quarter to (\w+)/gi, (_, hour) => {
        const h = parseInt(numberWords[hour] || hour) - 1;
        return h + ':45';
      });
  };

  // Date normalization
  const normalizeDate = (text) => {
    const months = {
      'january': '1', 'jan': '1', 'february': '2', 'feb': '2',
      'march': '3', 'mar': '3', 'april': '4', 'apr': '4',
      'may': '5', 'june': '6', 'jun': '6', 'july': '7', 'jul': '7',
      'august': '8', 'aug': '8', 'september': '9', 'sep': '9', 'sept': '9',
      'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
      'december': '12', 'dec': '12'
    };

    let result = text;

    // Replace month names with numbers
    for (const [name, num] of Object.entries(months)) {
      result = result.replace(new RegExp(name, 'gi'), num);
    }

    // Remove ordinal suffixes (1st -> 1, 2nd -> 2, etc.)
    result = result.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

    // Normalize date separators
    result = result.replace(/[/\-\.]/g, ' ');

    return result;
  };

  // Title/honorific normalization
  const normalizeTitle = (text) => {
    return text
      .replace(/\bmr\.?\b/gi, 'mr')
      .replace(/\bmrs\.?\b/gi, 'mrs')
      .replace(/\bms\.?\b/gi, 'ms')
      .replace(/\bdr\.?\b/gi, 'dr')
      .replace(/\bprof\.?\b/gi, 'professor');
  };

  // Apply all normalizations
  const fullyNormalize = (text) => {
    let result = text;

    // Replace number words with digits
    for (const [word, num] of Object.entries(numberWords)) {
      result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), num);
    }

    result = normalizeCurrency(result);
    result = normalizeTime(result);
    result = normalizeDate(result);
    result = normalizeTitle(result);

    // Final cleanup
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  };

  const normalizedUser = fullyNormalize(user);
  const normalizedCorrect = fullyNormalize(correct);

  if (normalizedUser === normalizedCorrect) return true;

  // Check if one contains the other (for partial matches)
  // e.g., "oakwood" matches "oakwood lane"
  if (normalizedCorrect.includes(normalizedUser) || normalizedUser.includes(normalizedCorrect)) {
    // Only accept if the shorter one is at least 60% of the longer one
    const shorter = normalizedUser.length < normalizedCorrect.length ? normalizedUser : normalizedCorrect;
    const longer = normalizedUser.length < normalizedCorrect.length ? normalizedCorrect : normalizedUser;
    if (shorter.length >= longer.length * 0.6) {
      return true;
    }
  }

  // Extract just numbers for numeric comparison
  const extractNumbers = (text) => {
    const nums = text.match(/\d+(?:\.\d+)?/g);
    return nums ? nums.join(' ') : '';
  };

  const userNums = extractNumbers(normalizedUser);
  const correctNums = extractNumbers(normalizedCorrect);

  // If both have the same numbers, likely correct (e.g., "$20" vs "20 dollars")
  if (userNums && correctNums && userNums === correctNums) {
    // But make sure it's not a completely different context
    // Check if at least one non-numeric word matches
    const userWords = normalizedUser.replace(/\d+/g, '').trim().split(/\s+/).filter(w => w.length > 2);
    const correctWords = normalizedCorrect.replace(/\d+/g, '').trim().split(/\s+/).filter(w => w.length > 2);

    if (userWords.length === 0 || correctWords.length === 0) {
      return true; // Pure numbers
    }

    // At least one word should match
    for (const uw of userWords) {
      for (const cw of correctWords) {
        if (uw === cw || cw.includes(uw) || uw.includes(cw)) {
          return true;
        }
      }
    }
  }

  return false;
};

// Start a new simulation
router.post('/start', async (req, res) => {
  try {
    const { studentId, type = 'full', practiceSection } = req.body;

    const simulation = await Simulation.create({
      studentId,
      type,
      practiceSection: type === 'practice' ? practiceSection : undefined,
      status: 'in_progress',
      startedAt: new Date()
    });

    res.status(201).json(simulation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get simulation by ID
router.get('/:id', async (req, res) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    res.json(simulation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit answer for a section
router.post('/:id/answer', async (req, res) => {
  try {
    const { section, questionIndex, userAnswer, correctAnswer, questionType, timeSpent, explanation } = req.body;
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    // Use smart answer matching for flexible comparison
    const isCorrect = smartAnswerMatch(userAnswer, correctAnswer);

    const answerData = {
      questionIndex,
      questionType,
      userAnswer,
      correctAnswer,
      isCorrect,
      explanation,
      timeSpent
    };

    // Initialize section if needed
    if (!simulation.sections[section]) {
      simulation.sections[section] = { answers: [] };
    }

    // Add or update answer
    const existingIndex = simulation.sections[section].answers.findIndex(
      a => a.questionIndex === questionIndex
    );

    if (existingIndex >= 0) {
      simulation.sections[section].answers[existingIndex] = answerData;
    } else {
      simulation.sections[section].answers.push(answerData);
    }

    await simulation.save();

    res.json({
      isCorrect,
      explanation,
      correctAnswer,
      currentScore: simulation.sections[section].answers.filter(a => a.isCorrect).length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete a section
router.post('/:id/complete-section', async (req, res) => {
  try {
    const { section, timeSpent } = req.body;
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    // Initialize section if it doesn't exist
    if (!simulation.sections[section]) {
      simulation.sections[section] = { answers: [], completed: false };
    }

    simulation.sections[section].completed = true;
    simulation.sections[section].timeSpent = timeSpent;

    // Calculate score for listening/reading
    if (section === 'listening' || section === 'reading') {
      const answers = simulation.sections[section].answers || [];
      const rawScore = answers.filter(a => a.isCorrect).length;
      simulation.sections[section].rawScore = rawScore;
      simulation.sections[section].score = calculateBandScore(rawScore, section);
    }

    await simulation.save();

    res.json({
      section,
      completed: true,
      score: simulation.sections[section].score,
      rawScore: simulation.sections[section].rawScore
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Save writing response
router.post('/:id/writing', async (req, res) => {
  try {
    const { taskType, prompt, userResponse, wordCount, evaluation } = req.body;

    console.log('Saving writing:', { taskType, wordCount, simId: req.params.id });

    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      console.error('Simulation not found:', req.params.id);
      return res.status(404).json({ error: 'Simulation not found' });
    }

    // Initialize writing section if needed
    if (!simulation.sections.writing) {
      simulation.sections.writing = {};
    }

    // Convert improvements to strings if they're objects
    let improvements = evaluation?.improvements || [];
    if (improvements.length > 0 && typeof improvements[0] === 'object') {
      improvements = improvements.map(imp =>
        typeof imp === 'object'
          ? `${imp.area || ''}: ${imp.issue || ''} - ${imp.suggestion || ''}`
          : String(imp)
      );
    }

    const taskData = {
      taskType,
      prompt,
      userResponse,
      wordCount,
      scores: evaluation?.scores || {},
      overallScore: evaluation?.overallScore || 0,
      feedback: evaluation?.feedback || '',
      improvements
    };

    if (taskType === 'task1') {
      simulation.sections.writing.task1 = taskData;
    } else {
      simulation.sections.writing.task2 = taskData;
    }

    // Calculate average writing score if both tasks are done
    if (simulation.sections.writing.task1 && simulation.sections.writing.task2) {
      const avg = (simulation.sections.writing.task1.overallScore + simulation.sections.writing.task2.overallScore) / 2;
      simulation.sections.writing.score = Math.round(avg * 2) / 2;
    }

    await simulation.save();
    console.log('Writing saved successfully');
    res.json(taskData);
  } catch (error) {
    console.error('Error saving writing:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Save speaking response
router.post('/:id/speaking', async (req, res) => {
  try {
    const { partNumber, questions, transcription, evaluation } = req.body;
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    if (!simulation.sections.speaking.parts) {
      simulation.sections.speaking.parts = [];
    }

    const partData = {
      partNumber,
      questions,
      transcription,
      scores: evaluation.scores,
      overallScore: evaluation.overallScore,
      feedback: evaluation.feedback
    };

    // Add or update part
    const existingIndex = simulation.sections.speaking.parts.findIndex(
      p => p.partNumber === partNumber
    );

    if (existingIndex >= 0) {
      simulation.sections.speaking.parts[existingIndex] = partData;
    } else {
      simulation.sections.speaking.parts.push(partData);
    }

    // Calculate average speaking score if all parts are done
    if (simulation.sections.speaking.parts.length === 3) {
      const avg = simulation.sections.speaking.parts.reduce((sum, p) => sum + p.overallScore, 0) / 3;
      simulation.sections.speaking.score = Math.round(avg * 2) / 2;
    }

    await simulation.save();
    res.json(partData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete entire simulation
router.post('/:id/complete', async (req, res) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    simulation.status = 'completed';
    simulation.completedAt = new Date();

    // Calculate overall band
    simulation.overallBand = simulation.calculateOverallBand();

    await simulation.save();

    // Get performance summary
    const summary = getPerformanceSummary(simulation);

    // AUTO-UPDATE STUDENT WEAKNESSES based on mistakes
    try {
      if (simulation.studentId) {
        const student = await Student.findById(simulation.studentId);
        if (student) {
          // Collect all wrong answers and their question types
          const allMistakes = [];

          // Listening mistakes
          if (simulation.sections.listening?.answers) {
            simulation.sections.listening.answers
              .filter(a => !a.isCorrect && a.questionType)
              .forEach(a => allMistakes.push(a.questionType));
          }

          // Reading mistakes
          if (simulation.sections.reading?.answers) {
            simulation.sections.reading.answers
              .filter(a => !a.isCorrect && a.questionType)
              .forEach(a => allMistakes.push(a.questionType));
          }

          // Writing weaknesses from feedback
          if (simulation.sections.writing?.task1?.scores) {
            const scores = simulation.sections.writing.task1.scores;
            if (scores.taskAchievement < 6) allMistakes.push('Task 1 Data Description');
            if (scores.coherenceCohesion < 6) allMistakes.push('Coherence & Cohesion');
            if (scores.lexicalResource < 6) allMistakes.push('Vocabulary Range');
            if (scores.grammaticalRange < 6) allMistakes.push('Grammar Accuracy');
          }
          if (simulation.sections.writing?.task2?.scores) {
            const scores = simulation.sections.writing.task2.scores;
            if (scores.taskResponse < 6) allMistakes.push('Task 2 Opinion Essays');
            if (scores.coherenceCohesion < 6) allMistakes.push('Coherence & Cohesion');
            if (scores.lexicalResource < 6) allMistakes.push('Vocabulary Range');
            if (scores.grammaticalRange < 6) allMistakes.push('Grammar Accuracy');
          }

          // Speaking weaknesses
          if (simulation.sections.speaking?.parts) {
            simulation.sections.speaking.parts.forEach(part => {
              if (part.scores) {
                if (part.scores.fluencyCoherence < 6) allMistakes.push('Fluency');
                if (part.scores.lexicalResource < 6) allMistakes.push('Vocabulary Usage');
                if (part.scores.grammaticalRange < 6) allMistakes.push('Grammatical Range');
                if (part.scores.pronunciation < 6) allMistakes.push('Pronunciation');
              }
            });
          }

          // Normalize question types to weakness categories
          const normalizeWeakness = (type) => {
            const mapping = {
              'form-completion': 'Form Completion',
              'note-completion': 'Note Completion',
              'table-completion': 'Table Completion',
              'sentence-completion': 'Sentence Completion',
              'summary-completion': 'Summary Completion',
              'multiple-choice': 'Multiple Choice',
              'matching': 'Matching',
              'map-labeling': 'Map/Diagram Labeling',
              'diagram-labeling': 'Map/Diagram Labeling',
              'true-false-ng': 'True/False/Not Given',
              'yes-no-ng': 'Yes/No/Not Given',
              'matching-headings': 'Matching Headings',
              'matching-information': 'Matching Information',
              'matching-features': 'Matching Features',
              'matching-sentence-endings': 'Matching Sentence Endings',
              'short-answer': 'Short Answer Questions'
            };
            return mapping[type] || type;
          };

          // Count mistakes by type
          const mistakeCounts = {};
          allMistakes.forEach(mistake => {
            const normalized = normalizeWeakness(mistake);
            mistakeCounts[normalized] = (mistakeCounts[normalized] || 0) + 1;
          });

          // Get weaknesses with 2+ mistakes (significant pattern)
          const newWeaknesses = Object.entries(mistakeCounts)
            .filter(([_, count]) => count >= 2)
            .map(([type]) => type);

          // Merge with existing weaknesses (keep unique, limit to 15)
          const existingWeaknesses = student.weaknesses || [];
          const mergedWeaknesses = [...new Set([...newWeaknesses, ...existingWeaknesses])].slice(0, 15);

          // Update student if weaknesses changed
          if (JSON.stringify(mergedWeaknesses.sort()) !== JSON.stringify(existingWeaknesses.sort())) {
            student.weaknesses = mergedWeaknesses;
            await student.save();
            console.log('Updated student weaknesses:', mergedWeaknesses);
          }
        }
      }
    } catch (weaknessErr) {
      console.error('Error updating weaknesses (non-fatal):', weaknessErr);
      // Continue - this is not a critical failure
    }

    res.json({
      simulation,
      summary
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get results
router.get('/:id/results', async (req, res) => {
  try {
    const simulation = await Simulation.findById(req.params.id);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    const summary = getPerformanceSummary(simulation);

    res.json({
      simulation,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
