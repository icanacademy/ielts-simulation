import { useState, useEffect } from 'react';
import Button from '../common/Button';

const QuestionDisplay = ({
  question,
  questionNumber,
  onAnswer,
  disabled = false,
  userAnswer = null
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [inputAnswer, setInputAnswer] = useState('');

  // Reset answers when question changes
  useEffect(() => {
    setSelectedAnswer(userAnswer || '');
    setInputAnswer(userAnswer || '');
  }, [questionNumber, userAnswer]);

  if (!question) return null;

  // Determine if this is a selection-based or input-based question
  // Must have ACTUAL options to be a selection type
  const isSelectionType = () => {
    const type = question.questionType?.toLowerCase() || '';
    const hasValidOptions = question.options && question.options.length > 0 && question.options[0];

    // These types are always selection-based (have fixed options)
    if (type === 'true-false-ng' || type === 'yes-no-ng') {
      return true;
    }

    // For other types, only selection if they have valid options
    return hasValidOptions && (
      type === 'multiple-choice' ||
      type.includes('matching')
    );
  };

  const handleSubmit = () => {
    const answer = isSelectionType() ? selectedAnswer : inputAnswer.trim();
    if (answer && onAnswer) {
      onAnswer(answer);
    }
  };

  const handleSelectAnswer = (option) => {
    if (!disabled) {
      setSelectedAnswer(option);
    }
  };

  const handleInputChange = (value) => {
    if (!disabled) {
      setInputAnswer(value);
    }
  };

  const renderQuestionType = () => {
    const type = question.questionType?.toLowerCase() || '';

    // Multiple choice with options
    if (type === 'multiple-choice' && question.options?.length > 0) {
      return (
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectAnswer(option)}
              disabled={disabled}
              className={`
                w-full p-3 text-left rounded-lg border transition-all
                ${selectedAnswer === option
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
              `}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          ))}
        </div>
      );
    }

    // True/False/Not Given
    if (type === 'true-false-ng') {
      return (
        <div className="flex gap-3 flex-wrap">
          {['TRUE', 'FALSE', 'NOT GIVEN'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelectAnswer(option)}
              disabled={disabled}
              className={`
                flex-1 min-w-[100px] py-3 px-4 rounded-lg border font-medium transition-all
                ${selectedAnswer === option
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
                ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
              `}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // Yes/No/Not Given
    if (type === 'yes-no-ng') {
      return (
        <div className="flex gap-3 flex-wrap">
          {['YES', 'NO', 'NOT GIVEN'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelectAnswer(option)}
              disabled={disabled}
              className={`
                flex-1 min-w-[100px] py-3 px-4 rounded-lg border font-medium transition-all
                ${selectedAnswer === option
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
                ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
              `}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // Matching types with options
    if (type.includes('matching') && question.options?.length > 0) {
      return (
        <div>
          <select
            value={selectedAnswer}
            onChange={(e) => handleSelectAnswer(e.target.value)}
            disabled={disabled}
            className={`
              w-full p-3 border rounded-lg text-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            `}
          >
            <option value="">Select an answer...</option>
            {question.options.map((option, index) => (
              <option key={index} value={option}>
                {String.fromCharCode(65 + index)}. {option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Default: Text input for form-completion, note-completion, sentence-completion, etc.
    return (
      <div>
        <input
          type="text"
          value={inputAnswer}
          onChange={(e) => handleInputChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer here..."
          className={`
            w-full p-3 border rounded-lg text-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          `}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && inputAnswer.trim()) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <p className="mt-2 text-sm text-gray-500">
          Write NO MORE THAN THREE WORDS for your answer
        </p>
      </div>
    );
  };

  // Calculate if we have an answer
  const currentAnswer = isSelectionType() ? selectedAnswer : inputAnswer.trim();
  const hasAnswer = !!currentAnswer;

  return (
    <div className="space-y-4">
      {/* Question Type Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {question.targetedSkill && (
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold uppercase tracking-wide border border-purple-200">
              Targeting: {question.targetedSkill}
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs capitalize">
            {question.questionType?.replace(/-/g, ' ') || 'Question'}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-500">Q{questionNumber}</span>
      </div>

      {/* Question Text */}
      <div className="text-lg text-gray-800">
        <span className="font-semibold text-blue-600 mr-2">{questionNumber}.</span>
        {question.questionText}
      </div>

      {/* Answer Options */}
      <div className="pt-2">
        {renderQuestionType()}
      </div>

      {/* Submit Button - Always show unless already answered */}
      {!disabled && (
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!hasAnswer}
            variant="primary"
            fullWidth
          >
            Submit Answer
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;
