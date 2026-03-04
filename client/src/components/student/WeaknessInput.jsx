const weaknessCategories = {
  Listening: [
    'Multiple Choice',
    'Map/Diagram Labeling',
    'Form Completion',
    'Note Completion',
    'Table Completion',
    'Sentence Completion',
    'Summary Completion',
    'Matching'
  ],
  Reading: [
    'True/False/Not Given',
    'Yes/No/Not Given',
    'Matching Headings',
    'Matching Information',
    'Matching Features',
    'Matching Sentence Endings',
    'Short Answer Questions',
    'Diagram Labeling'
  ],
  Writing: [
    'Task 1 Data Description',
    'Task 1 Process Description',
    'Task 1 Map Description',
    'Task 2 Opinion Essays',
    'Task 2 Discussion Essays',
    'Task 2 Problem-Solution',
    'Task 2 Advantages-Disadvantages',
    'Grammar Accuracy',
    'Vocabulary Range',
    'Coherence & Cohesion'
  ],
  Speaking: [
    'Fluency',
    'Pronunciation',
    'Vocabulary Usage',
    'Grammatical Range',
    'Part 2 Long Turn',
    'Part 3 Discussion'
  ]
};

const categoryColors = {
  Listening: 'bg-purple-100 border-purple-300 text-purple-800',
  Reading: 'bg-blue-100 border-blue-300 text-blue-800',
  Writing: 'bg-green-100 border-green-300 text-green-800',
  Speaking: 'bg-orange-100 border-orange-300 text-orange-800'
};

const selectedColors = {
  Listening: 'bg-purple-500 border-purple-500 text-white',
  Reading: 'bg-blue-500 border-blue-500 text-white',
  Writing: 'bg-green-500 border-green-500 text-white',
  Speaking: 'bg-orange-500 border-orange-500 text-white'
};

const WeaknessInput = ({ selectedWeaknesses = [], onChange }) => {
  const toggleWeakness = (weakness) => {
    if (selectedWeaknesses.includes(weakness)) {
      onChange(selectedWeaknesses.filter(w => w !== weakness));
    } else {
      onChange([...selectedWeaknesses, weakness]);
    }
  };

  const selectAllInCategory = (category) => {
    const categoryWeaknesses = weaknessCategories[category];
    const allSelected = categoryWeaknesses.every(w => selectedWeaknesses.includes(w));

    if (allSelected) {
      onChange(selectedWeaknesses.filter(w => !categoryWeaknesses.includes(w)));
    } else {
      const newWeaknesses = [...new Set([...selectedWeaknesses, ...categoryWeaknesses])];
      onChange(newWeaknesses);
    }
  };

  const getCategoryForWeakness = (weakness) => {
    for (const [category, weaknesses] of Object.entries(weaknessCategories)) {
      if (weaknesses.includes(weakness)) return category;
    }
    return 'Listening';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Areas to Improve</h3>
      <p className="text-sm text-gray-500 mb-4">
        Select the areas where you feel you need the most practice. The AI will focus on generating questions targeting these weaknesses.
      </p>

      <div className="space-y-6">
        {Object.entries(weaknessCategories).map(([category, weaknesses]) => {
          const selectedCount = weaknesses.filter(w => selectedWeaknesses.includes(w)).length;
          const allSelected = selectedCount === weaknesses.length;

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-700">{category}</h4>
                  <span className="text-xs text-gray-400">
                    ({selectedCount}/{weaknesses.length} selected)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => selectAllInCategory(category)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {weaknesses.map(weakness => {
                  const isSelected = selectedWeaknesses.includes(weakness);
                  return (
                    <button
                      key={weakness}
                      type="button"
                      onClick={() => toggleWeakness(weakness)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                        ${isSelected ? selectedColors[category] : categoryColors[category]}
                        hover:opacity-80
                      `}
                    >
                      {weakness}
                      {isSelected && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedWeaknesses.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{selectedWeaknesses.length}</span> weakness areas selected.
            The simulation will prioritize these areas.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeaknessInput;
