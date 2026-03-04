import express from 'express';
import {
  generateReadingQuestions,
  generateFullReadingTest,
  generateListeningQuestions,
  generateWritingPrompt,
  evaluateWriting,
  generateSpeakingPrompt,
  evaluateSpeaking,
  generateExplanation
} from '../services/openaiService.js';
import { synthesizeMultiVoice } from '../services/edgeTTSService.js';
import Question from '../models/Question.js';

const router = express.Router();

// Generate Reading passage and questions
router.post('/generate/reading', async (req, res) => {
  try {
    const { difficulty, targetWeaknesses, topic } = req.body;

    const result = await generateReadingQuestions({
      difficulty: difficulty || 6,
      targetWeaknesses: targetWeaknesses || [],
      topic
    });

    // Optionally cache the question
    const question = await Question.create({
      section: 'reading',
      questionTypes: [...new Set(result.questions.map(q => q.questionType))],
      difficulty: difficulty || 6,
      targetWeaknesses,
      passage: result.passage,
      questions: result.questions
    });

    res.json({
      ...result,
      questionId: question._id
    });
  } catch (error) {
    console.error('Error generating reading:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to sanitize question options (AI sometimes returns wrong format)
const sanitizeQuestions = (questions) => {
  return questions.map(q => {
    let options = q.options;

    // If options is a string, try to parse it (AI sometimes returns JSON as string)
    if (typeof options === 'string') {
      try {
        // Replace single quotes with double quotes for JSON parsing
        const jsonStr = options.replace(/'/g, '"');
        options = JSON.parse(jsonStr);
      } catch {
        // If parsing fails, wrap as single option
        options = [options];
      }
    }

    // If options is an array with objects, extract values
    // e.g., [{ '1': 'Option A', '2': 'Option B' }] -> ['Option A', 'Option B']
    if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object') {
      options = Object.values(options[0]);
    }

    // Ensure all options are strings and clean up any "A: " prefixes if needed
    if (Array.isArray(options)) {
      options = options.map(o => {
        let str = typeof o === 'object' ? Object.values(o)[0] : String(o);
        return str;
      });
    }

    // Fallback: if still not a valid array, create empty array
    if (!Array.isArray(options)) {
      options = [];
    }

    return { ...q, options };
  });
};

// Generate Full Reading test (3 passages, 40 questions)
router.post('/generate/reading/full', async (req, res) => {
  try {
    const { difficulty, targetWeaknesses } = req.body;

    console.log('Generating full reading test with 3 passages...');

    const result = await generateFullReadingTest({
      difficulty: difficulty || 6,
      targetWeaknesses: targetWeaknesses || []
    });

    // Sanitize questions to fix any format issues
    for (const passageData of result.passages) {
      passageData.questions = sanitizeQuestions(passageData.questions);
    }

    // Cache each passage (non-blocking, don't fail if caching fails)
    for (const passageData of result.passages) {
      try {
        await Question.create({
          section: 'reading',
          questionTypes: [...new Set(passageData.questions.map(q => q.questionType))],
          difficulty: difficulty || 6,
          targetWeaknesses,
          passage: passageData.passage,
          questions: passageData.questions
        });
      } catch (cacheError) {
        console.warn('Failed to cache passage (continuing):', cacheError.message);
      }
    }

    console.log('Full reading test generated successfully');
    res.json(result);
  } catch (error) {
    console.error('Error generating full reading:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate Listening script and questions
router.post('/generate/listening', async (req, res) => {
  try {
    const {
      difficulty,
      partNumber,
      targetWeaknesses,
      focusAreas,
      recommendations,
      customNotes,
      previousScores,
      targetBand
    } = req.body;

    console.log(`Generating Listening Part ${partNumber || 1}...`);

    const result = await generateListeningQuestions({
      difficulty: difficulty || 6,
      partNumber: partNumber || 1,
      targetWeaknesses: targetWeaknesses || [],
      focusAreas: focusAreas || [],
      recommendations: recommendations || [],
      customNotes: customNotes || '',
      previousScores: previousScores || {},
      targetBand: targetBand || 6
    });

    // Cache the question
    const question = await Question.create({
      section: 'listening',
      partNumber,
      questionTypes: [...new Set(result.questions.map(q => q.questionType))],
      difficulty: difficulty || 6,
      targetWeaknesses,
      audioScript: result.audioScript,
      audioContext: result.audioContext,
      questions: result.questions
    });

    res.json({
      ...result,
      questionId: question._id
    });
  } catch (error) {
    console.error('Error generating listening:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate audio from script (TTS)
router.post('/generate/audio', async (req, res) => {
  try {
    const { script, questionId } = req.body;

    if (!script || script.trim().length === 0) {
      console.error('Audio generation failed: No script provided');
      return res.status(400).json({ error: 'No script provided' });
    }

    console.log(`Generating multi-voice audio for script (${script.length} chars)...`);
    const startTime = Date.now();

    // Use Google Cloud TTS with multiple voices for conversations
    const audioBuffer = await synthesizeMultiVoice(script);

    const duration = Date.now() - startTime;
    console.log(`Multi-voice audio generated: ${audioBuffer.length} bytes in ${duration}ms`);

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length < 1000) {
      console.error('Audio generation failed: Invalid audio buffer');
      return res.status(500).json({ error: 'Invalid audio generated' });
    }

    // Set appropriate headers for audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating audio:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Generate Writing prompt
router.post('/generate/writing', async (req, res) => {
  try {
    const { taskType, difficulty } = req.body;

    const result = await generateWritingPrompt({
      taskType: taskType || 'task2',
      difficulty: difficulty || 6
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating writing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Evaluate Writing response
router.post('/evaluate/writing', async (req, res) => {
  try {
    const { task, userResponse } = req.body;

    console.log('Evaluating writing:', { taskType: task?.taskType, responseLength: userResponse?.length });

    if (!userResponse || userResponse.trim().length === 0) {
      return res.status(400).json({ error: 'No response provided' });
    }

    if (!task || !task.prompt) {
      return res.status(400).json({ error: 'Task data missing' });
    }

    // Ensure taskType is set
    const taskWithType = {
      ...task,
      taskType: task.taskType || 'task2'
    };

    const evaluation = await evaluateWriting(taskWithType, userResponse);

    console.log('Writing evaluation complete:', { overallScore: evaluation.overallScore });
    res.json(evaluation);
  } catch (error) {
    console.error('Error evaluating writing:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate Speaking prompts
router.post('/generate/speaking', async (req, res) => {
  try {
    const { partNumber, difficulty } = req.body;

    const result = await generateSpeakingPrompt({
      partNumber: partNumber || 1,
      difficulty: difficulty || 6
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating speaking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Evaluate Speaking response
router.post('/evaluate/speaking', async (req, res) => {
  try {
    const { partNumber, questions, transcription } = req.body;

    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json({ error: 'No transcription provided' });
    }

    const evaluation = await evaluateSpeaking(partNumber, questions, transcription);

    res.json(evaluation);
  } catch (error) {
    console.error('Error evaluating speaking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get explanation for an answer
router.post('/explain', async (req, res) => {
  try {
    const { question, userAnswer, correctAnswer } = req.body;

    const explanation = await generateExplanation(question, userAnswer, correctAnswer);

    res.json(explanation);
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate targeted practice questions based on weaknesses
router.post('/generate/practice', async (req, res) => {
  try {
    const { section, weaknesses, difficulty } = req.body;

    let result;

    switch (section) {
      case 'reading':
        result = await generateReadingQuestions({
          difficulty,
          targetWeaknesses: weaknesses
        });
        break;
      case 'listening':
        // Generate all 4 parts
        const parts = [];
        for (let i = 1; i <= 4; i++) {
          const part = await generateListeningQuestions({
            difficulty,
            partNumber: i,
            targetWeaknesses: weaknesses
          });
          parts.push(part);
        }
        result = { parts };
        break;
      case 'writing':
        const task1 = await generateWritingPrompt({ taskType: 'task1', difficulty });
        const task2 = await generateWritingPrompt({ taskType: 'task2', difficulty });
        result = { task1, task2 };
        break;
      case 'speaking':
        const speakingParts = [];
        for (let i = 1; i <= 3; i++) {
          const part = await generateSpeakingPrompt({ partNumber: i, difficulty });
          speakingParts.push(part);
        }
        result = { parts: speakingParts };
        break;
      default:
        return res.status(400).json({ error: 'Invalid section' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error generating practice:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
