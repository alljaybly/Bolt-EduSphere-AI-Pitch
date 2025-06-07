exports.handler = async (event) => {
  const subjects = {
    'Mathematics': {
      '1-4': { slides: ['🔢 Count to 10', '➕ Addition Basics'], questions: ['1 + 1 = ?', '2 + 3 = ?'] },
      '5-7': { questions: ['Solve: 5 × 3', 'Solve: 12 ÷ 4'] },
      '8-10': { questions: ['Solve for x: 2x + 3 = 7', 'Factorize: x² + 5x + 6'] },
      '11-12': { questions: ['Integrate: ∫(2x + 1)dx', 'Solve: 3x² + 2x - 1 = 0'] }
    },
    'Coding': {
      '1-4': { blocks: ['Move Forward', 'Turn Right'], output: 'Move a character!' },
      '5-7': { blocks: ['Loop 3 Times', 'Jump'], output: 'Create a simple game!' }
    },
    // Add more subjects similarly
  };

  const { subject, grade } = event.queryStringParameters || {};
  if (!subject || !grade) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Subject and grade required' }) };
  }

  const content = subjects[subject]?.[grade] || { slides: [], questions: [], blocks: [], output: '' };
  return { statusCode: 200, body: JSON.stringify(content) };
};