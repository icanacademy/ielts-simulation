import OpenAI from 'openai';

let openaiClient = null;

export const initializeOpenAI = (apiKey) => {
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

export const getOpenAIClient = () => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Please provide an API key.');
  }
  return openaiClient;
};

// Analyze student weaknesses based on their profile
export const analyzeWeaknesses = async (studentData) => {
  const client = getOpenAIClient();

  const customNotesSection = studentData.customWeaknessNotes
    ? `
IMPORTANT - Additional Findings/Feedback Provided by Student:
"""
${studentData.customWeaknessNotes}
"""
Please carefully analyze the above feedback to identify specific patterns, recurring issues, and detailed weaknesses. This information is crucial for accurate analysis.`
    : '';

  const prompt = `You are an expert IELTS examiner and tutor. Analyze this student's profile and provide a detailed weakness analysis. You must respond with valid JSON only.

Student Profile:
- Name: ${studentData.name}
- Target Band: ${studentData.targetBand}
- Test Date: ${studentData.testDate || 'Not specified'}
- Previous Scores:
  * Listening: ${studentData.previousScores?.listening || 'N/A'}
  * Reading: ${studentData.previousScores?.reading || 'N/A'}
  * Writing: ${studentData.previousScores?.writing || 'N/A'}
  * Speaking: ${studentData.previousScores?.speaking || 'N/A'}
- Self-identified Weaknesses: ${studentData.weaknesses?.join(', ') || 'None specified'}
${customNotesSection}

Provide your analysis in the following JSON format:
{
  "overallWeakness": "Brief summary of main weakness area",
  "focusAreas": ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5"],
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4",
    "Specific recommendation 5"
  ],
  "priorityOrder": ["section1", "section2", "section3", "section4"],
  "estimatedCurrentBand": 6.5,
  "gapToTarget": "Analysis of what's needed to reach target",
  "detailedFindings": [
    {
      "area": "Specific weakness area identified",
      "evidence": "What in the profile/notes indicates this",
      "impact": "How this affects IELTS score",
      "actionPlan": "Specific steps to improve this"
    }
  ],
  "extractedIssues": ["Specific issues extracted from the additional findings if provided"],
  "practiceSchedule": {
    "daily": ["Daily practice activity 1", "Daily practice activity 2"],
    "weekly": ["Weekly focus area 1", "Weekly focus area 2"]
  },
  "resourceSuggestions": ["Suggested resource or practice material 1", "Suggested resource 2"]
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
};

// Generate a single Reading passage with questions
export const generateSingleReadingPassage = async (options = {}) => {
  const client = getOpenAIClient();
  const { difficulty = 6, targetWeaknesses = [], topic = null, passageNumber = 1, questionCount = 13, startQuestionNumber = 1 } = options;

  const questionTypes = targetWeaknesses.length > 0
    ? targetWeaknesses.filter(w => [
        'True/False/Not Given', 'Yes/No/Not Given', 'Matching Headings',
        'Matching Information', 'Matching Features', 'Matching Sentence Endings',
        'Short Answer Questions', 'Summary Completion',
        'Sentence Completion', 'Multiple Choice'
      ].includes(w))
    : ['True/False/Not Given', 'Multiple Choice', 'Summary Completion'];

  // Log what weaknesses are being targeted
  if (questionTypes.length > 0) {
    console.log(`Reading Passage ${passageNumber}: Targeting weaknesses: ${questionTypes.join(', ')}`);
  }

  const topics = [
    'science and technology',
    'history and archaeology',
    'environment and nature',
    'health and medicine',
    'social sciences and psychology',
    'business and economics',
    'art and culture',
    'education and learning'
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const prompt = `You are an expert IELTS exam creator. Generate IELTS Academic Reading Passage ${passageNumber} with questions.

Requirements:
- This is Passage ${passageNumber} of 3 in a full IELTS Reading test
- Difficulty Level: Band ${difficulty} (Passage 1 is easiest, Passage 3 is hardest)
- Topic: ${topic || randomTopic}
- Question Types to Include: ${questionTypes.join(', ') || 'Mixed types'}
- Passage Length: 800-900 words
- Number of Questions: exactly ${questionCount} questions
- Question numbers should start from ${startQuestionNumber}

CRITICAL - Question Format Rules for each type:

1. TRUE/FALSE/NOT GIVEN:
   - questionType: "true-false-ng"
   - options: ["TRUE", "FALSE", "NOT GIVEN"]
   - questionText: A statement to evaluate

2. MULTIPLE CHOICE:
   - questionType: "multiple-choice"
   - options: ["First option text", "Second option text", "Third option text", "Fourth option text"]
   - questionText: The question asking what/why/how
   - correctAnswer: Must match EXACTLY one of the options

3. MATCHING HEADINGS:
   - questionType: "matching-headings"
   - options: ["i. First heading", "ii. Second heading", "iii. Third heading", "iv. Fourth heading", "v. Fifth heading"]
   - questionText: "Choose the correct heading for Paragraph X"
   - correctAnswer: Must match EXACTLY one option (e.g., "ii. Second heading")

4. MATCHING INFORMATION:
   - questionType: "matching-information"
   - options: ["A", "B", "C", "D", "E"] (paragraph labels)
   - questionText: "Which paragraph contains information about X?"
   - correctAnswer: A single letter (e.g., "C")

5. SENTENCE COMPLETION:
   - questionType: "sentence-completion"
   - options: [] (empty array - user types answer)
   - questionText: "Complete the sentence: The main cause of X was _____"
   - correctAnswer: The word(s) from the passage (1-3 words)

6. SUMMARY COMPLETION:
   - questionType: "summary-completion"
   - options: [] (empty array - user types answer)
   - questionText: "The passage states that _____ is responsible for climate change."
   - correctAnswer: The word(s) from the passage (1-3 words)

7. SHORT ANSWER:
   - questionType: "short-answer"
   - options: [] (empty array - user types answer)
   - questionText: "What year was the discovery made?"
   - correctAnswer: The answer from the passage (1-3 words)

You must respond with valid JSON in this exact format:
{
  "passage": {
    "title": "Passage Title",
    "text": "Full passage text here with multiple paragraphs labeled as A, B, C, etc. for matching questions...",
    "wordCount": 850,
    "topic": "Topic category",
    "passageNumber": ${passageNumber}
  },
  "questions": [
    {
      "questionNumber": ${startQuestionNumber},
      "questionText": "Question text here",
      "questionType": "one of the types above",
      "targetedSkill": "Skill name",
      "skillCategory": "reading",
      "options": ["Array of options OR empty array for text input"],
      "correctAnswer": "Must match an option exactly OR be the text answer",
      "explanation": "Detailed explanation",
      "paragraphReference": "Paragraph/Section reference",
      "keyEvidence": "Quote from passage",
      "studyTip": "Strategy tip",
      "commonMistake": "Common error"
    }
  ]
}

IMPORTANT:
- Generate EXACTLY ${questionCount} questions numbered ${startQuestionNumber} to ${startQuestionNumber + questionCount - 1}
- For selection questions, correctAnswer MUST exactly match one of the options
- For text input questions, options must be an empty array []
- Vary question types: mix True/False, Multiple Choice, and completion types
- Label passage paragraphs A, B, C, D, E, F if using matching information questions`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 4000
  });

  return JSON.parse(response.choices[0].message.content);
};

// Generate full Reading test with 3 passages (40 questions total)
export const generateFullReadingTest = async (options = {}) => {
  const { difficulty = 6, targetWeaknesses = [] } = options;

  // Generate 3 passages with progressive difficulty (IN PARALLEL for speed)
  // Passage 1: 13 questions (Q1-13), easiest
  // Passage 2: 13 questions (Q14-26), medium
  // Passage 3: 14 questions (Q27-40), hardest

  const passageConfigs = [
    { passageNumber: 1, questionCount: 13, startQuestionNumber: 1, difficulty: Math.max(5, difficulty - 0.5) },
    { passageNumber: 2, questionCount: 13, startQuestionNumber: 14, difficulty: difficulty },
    { passageNumber: 3, questionCount: 14, startQuestionNumber: 27, difficulty: Math.min(9, difficulty + 0.5) }
  ];

  // Generate all 3 passages simultaneously for ~3x faster generation
  const passages = await Promise.all(
    passageConfigs.map(config =>
      generateSingleReadingPassage({
        ...config,
        targetWeaknesses
      })
    )
  );

  return { passages };
};

// Generate Reading passage and questions (legacy - single passage)
export const generateReadingQuestions = async (options = {}) => {
  const client = getOpenAIClient();
  const { difficulty = 6, targetWeaknesses = [], topic = null } = options;

  const questionTypes = targetWeaknesses.length > 0
    ? targetWeaknesses.filter(w => [
        'True/False/Not Given', 'Yes/No/Not Given', 'Matching Headings',
        'Matching Information', 'Matching Features', 'Matching Sentence Endings',
        'Short Answer Questions', 'Summary Completion',
        'Sentence Completion', 'Multiple Choice'
      ].includes(w))
    : ['True/False/Not Given', 'Multiple Choice', 'Summary Completion'];

  const prompt = `You are an expert IELTS exam creator. Generate an IELTS Academic Reading passage with questions.

Requirements:
- Difficulty Level: Band ${difficulty} (adjust vocabulary and complexity accordingly)
- Topic: ${topic || 'Academic topic (science, history, technology, environment, or society)'}
- Question Types to Include: ${questionTypes.join(', ') || 'Mixed types'}
- Passage Length: 700-900 words
- Number of Questions: 13-14 questions

Generate a response in this exact JSON format:
{
  "passage": {
    "title": "Passage Title",
    "text": "Full passage text here...",
    "wordCount": 800,
    "topic": "Topic category"
  },
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Question text",
      "questionType": "true-false-ng",
      "targetedSkill": "True/False/Not Given",
      "skillCategory": "reading",
      "options": ["TRUE", "FALSE", "NOT GIVEN"],
      "correctAnswer": "TRUE",
      "explanation": "Detailed explanation with: (1) The exact evidence from the passage, (2) Step-by-step reasoning process, (3) Why other options are wrong",
      "paragraphReference": "Paragraph 2",
      "keyEvidence": "The exact quote or paraphrase from the passage that supports the answer",
      "studyTip": "A helpful strategy for answering similar questions in the future",
      "commonMistake": "What students often get wrong and why"
    }
  ]
}

Important:
- Ensure questions test genuine comprehension
- Include paragraph references where relevant
- Make explanations VERY detailed and educational - explain the reasoning step by step
- Each explanation must include: (1) why the correct answer is right with specific evidence, (2) why wrong answers are incorrect, (3) a study tip for this question type
- Vary question difficulty within the set`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 4000
  });

  return JSON.parse(response.choices[0].message.content);
};

// Generate Listening script and questions (2-step process to ensure matching)
export const generateListeningQuestions = async (options = {}) => {
  const client = getOpenAIClient();
  const {
    difficulty = 6,
    partNumber = 1,
    targetWeaknesses = [],
    focusAreas = [],
    recommendations = [],
    customNotes = '',
    previousScores = {},
    targetBand = 6
  } = options;

  // Random scenarios for variety - different each time
  const part1Scenarios = [
    'booking a hotel room', 'renting a car', 'joining a gym', 'booking a restaurant',
    'registering for a library card', 'arranging a delivery', 'booking a flight',
    'registering for a course', 'arranging home repairs', 'booking a dental appointment',
    'renting an apartment', 'ordering furniture', 'booking a tour', 'joining a club'
  ];
  const part2Scenarios = [
    'local museum tour', 'community center facilities', 'university campus tour',
    'shopping mall guide', 'public transport information', 'city park facilities',
    'sports complex tour', 'library services', 'art gallery exhibition', 'zoo tour',
    'botanical garden guide', 'historic building tour', 'beach resort facilities'
  ];
  const part3Topics = [
    'research project planning', 'group presentation preparation', 'essay feedback discussion',
    'internship experiences', 'study abroad planning', 'thesis proposal', 'lab experiment results',
    'field trip planning', 'course selection', 'career planning discussion'
  ];
  const part4Topics = [
    'marine biology', 'urban planning', 'renewable energy', 'child psychology',
    'ancient civilizations', 'climate change', 'artificial intelligence', 'nutrition science',
    'architecture history', 'animal behavior', 'economic theories', 'space exploration'
  ];

  const scenarioLists = { 1: part1Scenarios, 2: part2Scenarios, 3: part3Topics, 4: part4Topics };
  const randomScenario = scenarioLists[partNumber][Math.floor(Math.random() * scenarioLists[partNumber].length)];
  const randomSeed = Date.now().toString().slice(-6); // For variety

  const partDescriptions = {
    1: `A conversation between two people about: ${randomScenario}`,
    2: `A monologue/speech about: ${randomScenario}`,
    3: `A conversation between 2-4 students/tutor discussing: ${randomScenario}`,
    4: `An academic lecture about: ${randomScenario}`
  };

  const speakerFormats = {
    1: 'Two people with appropriate roles (e.g., AGENT and CLIENT, STAFF and CUSTOMER)',
    2: 'SPEAKER (single person giving information)',
    3: 'TUTOR and 2-3 STUDENTS with unique names',
    4: 'LECTURER (single academic speaker)'
  };

  // Map weaknesses to question types
  const weaknessToQuestionType = {
    'Multiple Choice': 'multiple-choice',
    'Form Completion': 'form-completion',
    'Note Completion': 'note-completion',
    'Table Completion': 'table-completion',
    'Sentence Completion': 'sentence-completion',
    'Summary Completion': 'summary-completion',
    'Matching': 'matching',
    'Map/Diagram Labeling': 'labeling'
  };

  const targetQuestionTypes = targetWeaknesses
    .map(w => weaknessToQuestionType[w])
    .filter(Boolean);

  // Combine all weakness indicators for smarter targeting
  const allFocusAreas = [...new Set([
    ...targetWeaknesses,
    ...focusAreas
  ])].filter(Boolean);

  const questionTypeInstruction = targetQuestionTypes.length > 0
    ? `IMPORTANT: Focus on these question types that the student needs practice with: ${targetQuestionTypes.join(', ')}`
    : 'Use a mix of question types appropriate for this part';

  // Build student context for personalization
  const studentContext = [];
  if (previousScores.listening) {
    studentContext.push(`Current listening level: Band ${previousScores.listening}`);
  }
  if (targetBand) {
    studentContext.push(`Target score: Band ${targetBand}`);
  }
  if (allFocusAreas.length > 0) {
    studentContext.push(`Areas needing practice: ${allFocusAreas.join(', ')}`);
  }
  if (recommendations.length > 0) {
    studentContext.push(`Learning recommendations: ${recommendations.slice(0, 2).join('; ')}`);
  }
  if (customNotes) {
    studentContext.push(`Student notes: ${customNotes}`);
  }

  const studentContextStr = studentContext.length > 0
    ? `\n\nSTUDENT PROFILE:\n${studentContext.join('\n')}`
    : '';

  console.log(`\n=== GENERATING LISTENING PART ${partNumber} ===`);
  console.log(`Scenario: ${randomScenario}`);
  console.log(`Effective difficulty: Band ${difficulty} (target: ${targetBand}, previous: ${previousScores.listening || 'N/A'})`);
  console.log(`Focus areas: ${allFocusAreas.join(', ') || 'none specified'}`);
  if (customNotes) console.log(`Custom notes: ${customNotes}`);

  // STEP 1: Generate the script with embedded answer facts
  const scriptPrompt = `You are creating an IELTS Listening Part ${partNumber} audio script.
UNIQUE SESSION: ${randomSeed}

Context: ${partDescriptions[partNumber]}
Speakers: ${speakerFormats[partNumber]}
Difficulty: Band ${difficulty} (${difficulty >= 7 ? 'use complex vocabulary, natural speech pace, some distractors' : difficulty >= 5.5 ? 'use clear vocabulary, moderate pace' : 'use simple vocabulary, slow clear speech'})
${studentContextStr}

Create a UNIQUE, realistic script (2-3 minutes when spoken) that includes these SPECIFIC testable facts:
- 3 proper names (create UNIQUE names, with spellings if unusual)
- 3 numbers (dates, prices, times, phone numbers, addresses - be creative and varied)
- 2 places/locations (use specific, unique place names)
- 2 other specific details (email, website, room numbers, etc)

Format with speaker labels like:
SPEAKER_ROLE:
Dialogue text here...

Return JSON:
{
  "script": "The full conversation script with speaker labels",
  "speakers": ["SPEAKER1", "SPEAKER2"],
  "context": "Brief scenario description",
  "embeddedFacts": [
    {"fact": "the specific answer", "type": "name|date|price|location|etc", "location": "where in conversation", "exactQuote": "exact sentence containing this fact"}
  ]
}

IMPORTANT: Create completely ORIGINAL content. Do not reuse common examples.`;

  console.log('Step 1: Generating script...');
  const scriptResponse = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: scriptPrompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2500
  });

  const scriptData = JSON.parse(scriptResponse.choices[0].message.content);
  console.log(`Script generated with ${scriptData.embeddedFacts?.length || 0} embedded facts`);

  // STEP 2: Generate questions based on the ACTUAL script
  const questionsPrompt = `You are creating IELTS Listening questions based on this EXACT script.

SCRIPT:
${scriptData.script}

AVAILABLE FACTS FROM SCRIPT:
${JSON.stringify(scriptData.embeddedFacts, null, 2)}

${questionTypeInstruction}

Create 10 questions where EVERY answer is taken DIRECTLY from the embeddedFacts above.
The correctAnswer must be EXACTLY as it appears in the script.

Return JSON:
{
  "questions": [
    {
      "questionNumber": ${(partNumber - 1) * 10 + 1},
      "questionText": "The question text with blank ___",
      "questionType": "form-completion|multiple-choice|matching|sentence-completion|note-completion|table-completion",
      "correctAnswer": "EXACT answer from embeddedFacts",
      "factUsed": "Which embeddedFact this answer comes from",
      "exactQuote": "The EXACT sentence from script containing the answer",
      "explanation": "Detailed explanation: where it appears, what to listen for, potential distractors",
      "targetedSkill": "The specific listening skill being tested",
      "options": ["A", "B", "C", "D"] // only for multiple-choice
    }
  ]
}

CRITICAL RULES:
1. correctAnswer MUST appear word-for-word in the script
2. Each question uses ONE fact from embeddedFacts
3. Question numbers start at ${(partNumber - 1) * 10 + 1} and go to ${partNumber * 10}
4. ${targetQuestionTypes.length > 0 ? `Prioritize these question types: ${targetQuestionTypes.join(', ')}` : 'Mix question types appropriately'}`;

  console.log('Step 2: Generating questions from script...');
  const questionsResponse = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: questionsPrompt }],
    response_format: { type: 'json_object' },
    max_tokens: 3000
  });

  const questionsData = JSON.parse(questionsResponse.choices[0].message.content);

  // STEP 3: Validate that answers actually appear in script
  console.log('Step 3: Validating answers against script...');
  const scriptLower = scriptData.script.toLowerCase();
  let validationWarnings = [];

  for (const q of questionsData.questions) {
    const answerLower = q.correctAnswer?.toLowerCase() || '';
    if (!scriptLower.includes(answerLower)) {
      validationWarnings.push(`Q${q.questionNumber}: "${q.correctAnswer}" not found in script`);
      console.warn(`WARNING: Answer "${q.correctAnswer}" not found in script!`);
    } else {
      console.log(`✓ Q${q.questionNumber}: "${q.correctAnswer}" verified in script`);
    }
  }

  if (validationWarnings.length > 0) {
    console.warn('Validation warnings:', validationWarnings);
  }

  console.log(`=== LISTENING PART ${partNumber} COMPLETE ===\n`);

  return {
    audioScript: scriptData.script,
    speakers: scriptData.speakers,
    audioContext: scriptData.context,
    embeddedFacts: scriptData.embeddedFacts,
    questions: questionsData.questions,
    validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
  };
};

// Generate Writing prompts
export const generateWritingPrompt = async (options = {}) => {
  const client = getOpenAIClient();
  const { taskType = 'task2', difficulty = 6, targetWeaknesses = [] } = options;

  // Map weaknesses to specific focus areas
  const writingFocusAreas = [];
  if (targetWeaknesses.includes('Task 2 Discussion Essays')) writingFocusAreas.push('discussion essay format');
  if (targetWeaknesses.includes('Task 2 Opinion Essays')) writingFocusAreas.push('opinion essay format');
  if (targetWeaknesses.includes('Task 2 Problem-Solution')) writingFocusAreas.push('problem-solution essay format');
  if (targetWeaknesses.includes('Task 2 Advantages-Disadvantages')) writingFocusAreas.push('advantages-disadvantages essay format');
  if (targetWeaknesses.includes('Grammar Accuracy') || targetWeaknesses.includes('Grammatical Range')) writingFocusAreas.push('complex grammar structures');
  if (targetWeaknesses.includes('Vocabulary Range')) writingFocusAreas.push('academic vocabulary');
  if (targetWeaknesses.includes('Coherence & Cohesion')) writingFocusAreas.push('linking words and paragraph structure');
  if (targetWeaknesses.includes('Task 1 Data Description')) writingFocusAreas.push('data comparison and trends');

  const focusInstruction = writingFocusAreas.length > 0
    ? `\nSTUDENT WEAKNESSES TO TARGET: The student needs practice with: ${writingFocusAreas.join(', ')}. Design the prompt to help practice these areas.`
    : '';

  if (writingFocusAreas.length > 0) {
    console.log(`Writing ${taskType}: Targeting weaknesses: ${writingFocusAreas.join(', ')}`);
  }

  // Randomly select chart type for variety
  const chartTypes = ['bar', 'line', 'pie'];
  const selectedChartType = chartTypes[Math.floor(Math.random() * chartTypes.length)];

  const prompt = taskType === 'task1'
    ? `You are an expert IELTS exam creator. Generate an IELTS Academic Writing Task 1 prompt with a ${selectedChartType} chart.

You must respond with valid JSON. The chartData must contain actual numeric data that can be rendered as a chart.

For a BAR chart, use this format:
{
  "taskType": "task1",
  "prompt": "The bar chart below shows [topic]. Summarize the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
  "chartType": "bar",
  "chartTitle": "Title of the chart",
  "chartData": {
    "description": "Brief description for accessibility",
    "xAxisLabel": "Categories",
    "yAxisLabel": "Values (%)",
    "data": [
      { "name": "Category A", "value1": 45, "value2": 32 },
      { "name": "Category B", "value1": 67, "value2": 54 },
      { "name": "Category C", "value1": 23, "value2": 41 }
    ],
    "series": [
      { "key": "value1", "name": "2020", "color": "#4F46E5" },
      { "key": "value2", "name": "2023", "color": "#10B981" }
    ]
  },
  "keyPoints": ["Main trend 1", "Main trend 2", "Comparison point"],
  "sampleAnswer": "Sample response here",
  "bandDescriptors": { "taskAchievement": "...", "coherenceCohesion": "...", "lexicalResource": "...", "grammaticalRange": "..." }
}

For a LINE chart, use this format:
{
  "chartType": "line",
  "chartData": {
    "xAxisLabel": "Year",
    "yAxisLabel": "Amount (millions)",
    "data": [
      { "name": "2018", "value1": 120, "value2": 95 },
      { "name": "2019", "value1": 145, "value2": 110 },
      { "name": "2020", "value1": 130, "value2": 125 }
    ],
    "series": [
      { "key": "value1", "name": "Exports", "color": "#4F46E5" },
      { "key": "value2", "name": "Imports", "color": "#EF4444" }
    ]
  }
}

For a PIE chart, use this format:
{
  "chartType": "pie",
  "chartData": {
    "description": "Distribution description",
    "data": [
      { "name": "Segment A", "value": 35, "color": "#4F46E5" },
      { "name": "Segment B", "value": 25, "color": "#10B981" },
      { "name": "Segment C", "value": 20, "color": "#F59E0B" },
      { "name": "Segment D", "value": 20, "color": "#EF4444" }
    ]
  }
}

IMPORTANT:
- Generate a ${selectedChartType.toUpperCase()} chart
- Use realistic data values (percentages 0-100, or realistic numbers)
- Include 4-6 data points for clarity
- Data must be actual numbers, not placeholders
- Topic should be academic (education, environment, economy, health, technology, demographics)${focusInstruction}`
    : `You are an expert IELTS exam creator. Generate an IELTS Academic Writing Task 2 prompt.${focusInstruction}

You must respond with valid JSON in this exact format:
{
  "taskType": "task2",
  "prompt": "Essay question about a contemporary topic. Write at least 250 words.",
  "essayType": "opinion/discussion/problem-solution/advantages-disadvantages",
  "keyPoints": ["Main argument 1", "Main argument 2", "Counter argument"],
  "sampleAnswer": "A band ${difficulty} sample response (300+ words)",
  "bandDescriptors": {
    "taskAchievement": "What's needed for band ${difficulty}",
    "coherenceCohesion": "What's needed for band ${difficulty}",
    "lexicalResource": "What's needed for band ${difficulty}",
    "grammaticalRange": "What's needed for band ${difficulty}"
  }
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2500
  });

  return JSON.parse(response.choices[0].message.content);
};

// Evaluate Writing response
export const evaluateWriting = async (task, userResponse) => {
  const client = getOpenAIClient();

  const prompt = `You are an expert IELTS examiner. Evaluate this Writing ${task.taskType} response.

Task Prompt: ${task.prompt}
Word Count Required: ${task.taskType === 'task1' ? '150' : '250'}+
Student's Response:
${userResponse}

Evaluate using official IELTS criteria. You must respond with valid JSON in this exact format:
{
  "wordCount": 250,
  "scores": {
    "taskAchievement": 6.5,
    "coherenceCohesion": 6.0,
    "lexicalResource": 6.5,
    "grammaticalRange": 6.0
  },
  "overallScore": 6.5,
  "feedback": "Comprehensive evaluation explaining each criterion score",
  "strengths": ["Strength 1 with example", "Strength 2 with example"],
  "improvements": [
    {
      "area": "Area name",
      "issue": "Issue identified",
      "suggestion": "How to improve",
      "example": "Concrete example"
    }
  ],
  "correctedExamples": [
    {
      "original": "Student's sentence",
      "corrected": "Improved version",
      "explanation": "Why this is better"
    }
  ],
  "vocabularyEnhancements": [
    {
      "basic": "Simple word used",
      "advanced": "Better alternative",
      "usage": "Example sentence"
    }
  ],
  "structureSuggestions": "Advice on essay structure",
  "nextSteps": ["Practice recommendation 1", "Practice recommendation 2"]
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 3000
  });

  return JSON.parse(response.choices[0].message.content);
};

// Generate Speaking prompts
export const generateSpeakingPrompt = async (options = {}) => {
  const client = getOpenAIClient();
  const { partNumber = 1, difficulty = 6, targetWeaknesses = [] } = options;

  // Map weaknesses to focus areas for speaking
  const speakingFocusAreas = [];
  if (targetWeaknesses.includes('Fluency')) speakingFocusAreas.push('connected speech and natural flow');
  if (targetWeaknesses.includes('Pronunciation')) speakingFocusAreas.push('clear pronunciation and intonation');
  if (targetWeaknesses.includes('Vocabulary Usage')) speakingFocusAreas.push('topic-specific vocabulary and collocations');
  if (targetWeaknesses.includes('Grammatical Range')) speakingFocusAreas.push('complex sentence structures');
  if (targetWeaknesses.includes('Part 2 Long Turn')) speakingFocusAreas.push('extended speaking with organization');
  if (targetWeaknesses.includes('Part 3 Discussion')) speakingFocusAreas.push('abstract thinking and opinion development');

  const focusInstruction = speakingFocusAreas.length > 0
    ? `\nSTUDENT NEEDS PRACTICE WITH: ${speakingFocusAreas.join(', ')}. Generate questions that specifically help practice these areas.`
    : '';

  if (speakingFocusAreas.length > 0) {
    console.log(`Speaking Part ${partNumber}: Targeting weaknesses: ${speakingFocusAreas.join(', ')}`);
  }

  const partInstructions = {
    1: 'Part 1: Introduction and interview (4-5 minutes). Generate 10-12 questions about familiar topics.',
    2: 'Part 2: Individual long turn (3-4 minutes). Generate a cue card with topic, bullet points, and follow-up questions.',
    3: 'Part 3: Two-way discussion (4-5 minutes). Generate 5-6 abstract questions related to Part 2 topic.'
  };

  const prompt = `Generate IELTS Speaking ${partInstructions[partNumber]}

Difficulty: Band ${difficulty}${focusInstruction}

You must respond with valid JSON in this exact format:
{
  "partNumber": ${partNumber},
  "questions": ["Question 1", "Question 2"],
  ${partNumber === 2 ? `"cueCard": {
    "topic": "Describe a time when...",
    "bulletPoints": ["You should say:", "Point 1", "Point 2", "Point 3"],
    "prepTime": 60,
    "speakingTime": 120,
    "followUpQuestions": ["Question 1", "Question 2"]
  },` : ''}
  "sampleResponses": ["Band ${difficulty} sample answer for question 1"],
  "vocabularyTips": ["Useful vocabulary/phrases for this topic"],
  "grammarFocus": ["Grammar structures to demonstrate"]
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2000
  });

  return JSON.parse(response.choices[0].message.content);
};

// Evaluate Speaking response
export const evaluateSpeaking = async (partNumber, questions, transcription) => {
  const client = getOpenAIClient();

  const prompt = `You are an expert IELTS Speaking examiner. Evaluate this Part ${partNumber} response.

Questions Asked:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Student's Transcribed Response:
${transcription}

Evaluate using official IELTS Speaking criteria and provide VERY DETAILED response in JSON:
{
  "scores": {
    "fluencyCoherence": score_0_to_9,
    "lexicalResource": score_0_to_9,
    "grammaticalRange": score_0_to_9,
    "pronunciation": score_0_to_9
  },
  "overallScore": calculated_band_score,
  "feedback": "A comprehensive 3-4 paragraph evaluation explaining each criterion score in detail, with specific examples from the student's response",
  "strengths": [
    {
      "criterion": "Which criterion this strength relates to",
      "description": "Detailed description of the strength",
      "example": "Quote from student's response demonstrating this"
    }
  ],
  "improvements": [
    {
      "criterion": "Fluency/Vocabulary/Grammar/Pronunciation",
      "issue": "Specific issue identified with quote from response",
      "suggestion": "Detailed actionable advice to improve",
      "practiceExercise": "A specific exercise to practice this skill"
    }
  ],
  "betterResponses": [
    {
      "original": "What student said (exact quote)",
      "improved": "More natural/fluent/accurate way to express it",
      "reason": "Detailed explanation of why this is better",
      "tip": "General tip for similar situations"
    }
  ],
  "vocabularyToLearn": [
    {
      "topic": "Topic-related vocabulary the student should learn",
      "words": ["word1", "word2", "word3"],
      "usageExamples": ["Example sentence 1", "Example sentence 2"]
    }
  ],
  "pronunciationNotes": "Specific notes on pronunciation improvements if applicable",
  "fluencyTips": ["Tip 1 for improving fluency", "Tip 2"],
  "nextSteps": ["Specific practice recommendation 1", "Specific practice recommendation 2"]
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 1500
  });

  return JSON.parse(response.choices[0].message.content);
};

// Generate explanation for any answer
export const generateExplanation = async (question, userAnswer, correctAnswer) => {
  const client = getOpenAIClient();

  const prompt = `You are an expert IELTS tutor. Provide a VERY DETAILED explanation for this IELTS question.

Question: ${question.questionText}
Question Type: ${question.questionType}
User's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
${question.passage ? `Relevant Passage: ${question.passage.substring(0, 500)}...` : ''}

Provide a comprehensive, educational explanation in JSON:
{
  "explanation": "A detailed 2-3 paragraph explanation that: (1) Explains step-by-step why the correct answer is right, (2) Explains specifically why the user's answer is wrong, (3) Shows the reasoning process an expert would use",
  "keyEvidence": "The exact quote or specific evidence from the passage/audio that proves the correct answer",
  "reasoning": "Step-by-step logical reasoning: First... Then... Therefore...",
  "whyUserAnswerWrong": "Specific explanation of why the user's chosen answer is incorrect",
  "commonMistake": "Why students often get this type of question wrong and what trap they fall into",
  "studyTip": "A specific strategy to use for this question type in the future",
  "practiceAdvice": "What the student should practice to improve on this type of question",
  "relatedVocabulary": ["Key vocabulary words from this question that the student should remember"]
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 1500  // Increased for comprehensive feedback
  });

  return JSON.parse(response.choices[0].message.content);
};

// Voice mapping for different speakers
const VOICE_MAP = {
  // Female voices
  'WOMAN': 'nova',
  'SARAH': 'nova',
  'EMMA': 'nova',
  'LISA': 'shimmer',
  'RECEPTIONIST': 'shimmer',
  'ADVISOR': 'nova',
  // Male voices
  'MAN': 'onyx',
  'MIKE': 'onyx',
  'DAVID': 'onyx',
  'JOHN': 'echo',
  'TOM': 'echo',
  'CUSTOMER': 'echo',
  'CLIENT': 'onyx',
  'CALLER': 'echo',
  // Neutral/Authority voices
  'SPEAKER': 'alloy',
  'LECTURER': 'fable',
  'TUTOR': 'fable',
  'PROFESSOR': 'fable',
  'HOST': 'alloy',
  'GUEST': 'echo',
  'INTERVIEWER': 'fable',
  'INTERVIEWEE': 'onyx',
  'AGENT': 'shimmer',
  'STUDENT': 'nova'
};

// Parse script into speaker segments
const parseScriptBySpeaker = (script) => {
  const segments = [];
  const lines = script.split('\n');
  let currentSpeaker = null;
  let currentText = '';

  // Known speaker names to look for
  const knownSpeakers = ['WOMAN', 'MAN', 'SPEAKER', 'LECTURER', 'TUTOR', 'SARAH', 'LISA', 'EMMA', 'MIKE', 'JOHN', 'DAVID', 'TOM', 'RECEPTIONIST', 'CUSTOMER', 'STUDENT', 'PROFESSOR', 'HOST', 'GUEST', 'INTERVIEWER', 'INTERVIEWEE', 'AGENT', 'CLIENT', 'ADVISOR', 'CALLER'];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for various speaker label formats:
    // Format 1: "WOMAN:" on its own line
    // Format 2: "WOMAN: Hello there" inline
    // Format 3: "[WOMAN]" or "(WOMAN)"
    let speakerMatch = trimmedLine.match(/^([A-Z][A-Z\s]*[A-Z]):(.*)$/);

    if (!speakerMatch) {
      // Try format with brackets
      speakerMatch = trimmedLine.match(/^\[([A-Z][A-Z\s]*[A-Z])\]:?(.*)$/);
    }

    if (!speakerMatch) {
      // Try to find known speaker at start of line
      for (const speaker of knownSpeakers) {
        if (trimmedLine.toUpperCase().startsWith(speaker + ':')) {
          const restOfLine = trimmedLine.substring(speaker.length + 1).trim();
          speakerMatch = [null, speaker, restOfLine];
          break;
        }
      }
    }

    if (speakerMatch) {
      // Save previous segment if exists
      if (currentSpeaker && currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = speakerMatch[1].trim().toUpperCase();
      currentText = speakerMatch[2] ? speakerMatch[2].trim() : '';
    } else if (currentSpeaker) {
      // Continue adding to current speaker's text
      currentText += ' ' + trimmedLine;
    }
  }

  // Don't forget the last segment
  if (currentSpeaker && currentText.trim()) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  console.log('Parsed segments:', segments.map(s => ({ speaker: s.speaker, textLength: s.text.length })));

  return segments;
};

// Helper function to concatenate MP3 buffers
const concatenateMP3Buffers = (audioBuffers) => {
  if (audioBuffers.length === 0) return Buffer.alloc(0);
  if (audioBuffers.length === 1) return audioBuffers[0];

  const combinedBuffers = [audioBuffers[0]]; // Keep first buffer as-is

  for (let i = 1; i < audioBuffers.length; i++) {
    const buffer = audioBuffers[i];
    let startOffset = 0;

    // Check for ID3v2 tag at start and skip it
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      const tagSize = ((buffer[6] & 0x7f) << 21) |
                      ((buffer[7] & 0x7f) << 14) |
                      ((buffer[8] & 0x7f) << 7) |
                      (buffer[9] & 0x7f);
      startOffset = 10 + tagSize;
    }

    // Find first MP3 sync byte (0xFF followed by 0xFx)
    while (startOffset < buffer.length - 1) {
      if (buffer[startOffset] === 0xFF && (buffer[startOffset + 1] & 0xF0) === 0xF0) {
        break;
      }
      startOffset++;
    }

    combinedBuffers.push(buffer.slice(startOffset));
  }

  const totalLength = combinedBuffers.reduce((sum, buf) => sum + buf.length, 0);
  return Buffer.concat(combinedBuffers, totalLength);
};

// Generate Text-to-Speech audio
// Uses single voice for reliability - multi-voice concatenation causes playback issues
export const generateAudio = async (script, speakers = []) => {
  const client = getOpenAIClient();

  console.log('=== AUDIO GENERATION START ===');
  console.log('Script length:', script.length);
  console.log('Script preview:', script.substring(0, 500));

  // Parse script to identify speakers for logging
  const segments = parseScriptBySpeaker(script);
  console.log('Total segments found:', segments.length);

  // Determine voice based on primary speaker type
  // Use 'nova' for conversations (natural female), 'onyx' for lectures (authoritative male)
  const speakerNames = segments.map(s => s.speaker.toUpperCase());
  const hasLecturer = speakerNames.some(s => ['LECTURER', 'PROFESSOR', 'SPEAKER', 'HOST'].includes(s));
  const primaryVoice = hasLecturer ? 'onyx' : 'nova';

  console.log(`Using voice: ${primaryVoice} (${hasLecturer ? 'lecture/monologue' : 'conversation'})`);

  // Generate single unified audio for reliability
  const cleanedScript = script
    .replace(/^[A-Z][A-Z\s]*[A-Z]:\s*/gm, '')
    .replace(/\n[A-Z][A-Z\s]*[A-Z]:\s*/g, '\n')
    .replace(/\[.*?\]/g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  console.log('Cleaned script length:', cleanedScript.length);

  const MAX_CHUNK_SIZE = 4000;

  if (cleanedScript.length <= MAX_CHUNK_SIZE) {
    try {
      console.log('Generating single audio chunk...');
      const response = await client.audio.speech.create({
        model: 'tts-1',
        voice: primaryVoice,
        input: cleanedScript,
        speed: 0.92 // Slightly slower for IELTS clarity
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`Audio generated successfully: ${buffer.length} bytes`);
      return buffer;
    } catch (err) {
      console.error('Error generating audio:', err.message);
      throw err;
    }
  }

  // For longer scripts, split at sentence boundaries
  console.log('Script too long, splitting into chunks...');
  const sentences = cleanedScript.match(/[^.!?]+[.!?]+/g) || [cleanedScript];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > MAX_CHUNK_SIZE) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  console.log(`Split into ${chunks.length} chunks`);

  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Generating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    try {
      const response = await client.audio.speech.create({
        model: 'tts-1',
        voice: primaryVoice,
        input: chunks[i],
        speed: 0.92
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      audioBuffers.push(buffer);
      console.log(`  -> Generated ${buffer.length} bytes`);
    } catch (err) {
      console.error(`Error generating chunk ${i + 1}:`, err.message);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('Failed to generate any audio');
  }

  if (audioBuffers.length === 1) {
    return audioBuffers[0];
  }

  // For multiple MP3 buffers, we need to handle them properly
  // Simple concatenation works for MP3 if we skip headers on subsequent files
  // MP3 frame header starts with 0xFF 0xFB (or 0xFF 0xFA, 0xFF 0xF3, 0xFF 0xF2)
  const combinedBuffers = [audioBuffers[0]]; // Keep first buffer as-is

  for (let i = 1; i < audioBuffers.length; i++) {
    const buffer = audioBuffers[i];
    // Find the first MP3 frame (skip ID3 tags if present)
    let startOffset = 0;

    // Check for ID3v2 tag at start
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      // ID3v2 tag found, skip it
      const tagSize = ((buffer[6] & 0x7f) << 21) |
                      ((buffer[7] & 0x7f) << 14) |
                      ((buffer[8] & 0x7f) << 7) |
                      (buffer[9] & 0x7f);
      startOffset = 10 + tagSize;
    }

    // Find first sync byte (0xFF followed by 0xFx)
    while (startOffset < buffer.length - 1) {
      if (buffer[startOffset] === 0xFF && (buffer[startOffset + 1] & 0xF0) === 0xF0) {
        break;
      }
      startOffset++;
    }

    combinedBuffers.push(buffer.slice(startOffset));
  }

  const totalLength = combinedBuffers.reduce((sum, buf) => sum + buf.length, 0);
  const combined = Buffer.concat(combinedBuffers, totalLength);

  console.log(`Combined audio: ${combined.length} bytes from ${audioBuffers.length} chunks`);
  return combined;
};

export default {
  initializeOpenAI,
  getOpenAIClient,
  analyzeWeaknesses,
  generateReadingQuestions,
  generateSingleReadingPassage,
  generateFullReadingTest,
  generateListeningQuestions,
  generateWritingPrompt,
  evaluateWriting,
  generateSpeakingPrompt,
  evaluateSpeaking,
  generateExplanation,
  generateAudio
};
