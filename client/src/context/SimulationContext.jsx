import { createContext, useContext, useState, useCallback } from 'react';
import { simulationAPI, aiAPI } from '../services/api';

const SimulationContext = createContext();

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

export const SimulationProvider = ({ children }) => {
  const [simulation, setSimulation] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // Start a new simulation
  const startSimulation = async (studentId, type = 'full', practiceSection = null) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting simulation...', { studentId, type, practiceSection });
      const { data } = await simulationAPI.start({ studentId, type, practiceSection });
      console.log('Simulation created:', data._id);
      setSimulation(data);
      setAnswers({});
      setResults(null);
      return data;
    } catch (err) {
      console.error('Failed to start simulation:', err);
      setError(err.response?.data?.error || 'Failed to start simulation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate questions for a section
  const generateQuestions = useCallback(async (section, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      let data;

      switch (section) {
        case 'reading':
          const readingRes = await aiAPI.generateReading(options);
          data = readingRes.data;
          break;
        case 'listening':
          const listeningRes = await aiAPI.generateListening(options);
          data = listeningRes.data;
          break;
        case 'writing':
          const writingRes = await aiAPI.generateWriting(options);
          data = writingRes.data;
          break;
        case 'speaking':
          const speakingRes = await aiAPI.generateSpeaking(options);
          data = speakingRes.data;
          break;
        default:
          throw new Error('Invalid section');
      }

      setQuestions(data);
      setCurrentSection(section);
      setCurrentQuestionIndex(0);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate questions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit an answer
  const submitAnswer = async (questionIndex, userAnswer, correctAnswer, questionType) => {
    if (!simulation) return;

    try {
      const { data } = await simulationAPI.submitAnswer(simulation._id, {
        section: currentSection,
        questionIndex,
        userAnswer,
        correctAnswer,
        questionType,
        timeSpent: 0 // Will be calculated by timer
      });

      setAnswers(prev => ({
        ...prev,
        [currentSection]: {
          ...prev[currentSection],
          [questionIndex]: {
            userAnswer,
            correctAnswer,
            isCorrect: data.isCorrect,
            explanation: data.explanation
          }
        }
      }));

      return data;
    } catch (err) {
      console.error('Failed to submit answer:', err);
      throw err;
    }
  };

  // Complete a section
  const completeSection = async (section, timeSpent) => {
    if (!simulation) return;

    try {
      const { data } = await simulationAPI.completeSection(simulation._id, {
        section,
        timeSpent
      });
      return data;
    } catch (err) {
      console.error('Failed to complete section:', err);
      throw err;
    }
  };

  // Submit writing
  const submitWriting = async (taskType, prompt, userResponse, evaluation) => {
    console.log('submitWriting called, simulation:', simulation?._id || 'NULL');

    if (!simulation) {
      console.error('No simulation exists! Cannot save writing.');
      throw new Error('No active simulation. Please start a test first.');
    }

    try {
      const wordCount = userResponse.trim().split(/\s+/).length;
      const { data } = await simulationAPI.submitWriting(simulation._id, {
        taskType,
        prompt,
        userResponse,
        wordCount,
        evaluation
      });
      return data;
    } catch (err) {
      console.error('Failed to submit writing:', err);
      throw err;
    }
  };

  // Submit speaking
  const submitSpeaking = async (partNumber, questions, transcription, evaluation) => {
    if (!simulation) return;

    try {
      const { data } = await simulationAPI.submitSpeaking(simulation._id, {
        partNumber,
        questions,
        transcription,
        evaluation
      });
      return data;
    } catch (err) {
      console.error('Failed to submit speaking:', err);
      throw err;
    }
  };

  // Complete entire simulation
  const completeSimulation = async () => {
    if (!simulation) return;

    try {
      setLoading(true);
      const { data } = await simulationAPI.complete(simulation._id);
      setResults(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete simulation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get results
  const getResults = async () => {
    if (!simulation) return;

    try {
      const { data } = await simulationAPI.getResults(simulation._id);
      setResults(data);
      return data;
    } catch (err) {
      console.error('Failed to get results:', err);
      throw err;
    }
  };

  // Reset simulation state
  const resetSimulation = () => {
    setSimulation(null);
    setCurrentSection(null);
    setQuestions(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResults(null);
    setError(null);
  };

  const value = {
    simulation,
    currentSection,
    questions,
    currentQuestionIndex,
    answers,
    loading,
    error,
    results,
    startSimulation,
    generateQuestions,
    submitAnswer,
    completeSection,
    submitWriting,
    submitSpeaking,
    completeSimulation,
    getResults,
    resetSimulation,
    setCurrentSection,
    setCurrentQuestionIndex,
    setQuestions
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export default SimulationContext;
