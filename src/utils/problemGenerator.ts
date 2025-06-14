import { SubjectType, GradeType, Problem } from '../types';

const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Avoid division by zero
const getRandomNonZero = (min: number, max: number): number => {
  let num;
  do {
    num = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (num === 0);
  return num;
};

// Generate math problems based on grade level
const generateMathProblem = (grade: GradeType): Problem => {
  let question = '';
  let answer = '';
  
  switch (grade) {
    case 'kindergarten':
      // Simple counting or addition
      const num1 = Math.floor(Math.random() * 5) + 1;
      const num2 = Math.floor(Math.random() * 5) + 1;
      question = `${num1} + ${num2} = ?`;
      answer = (num1 + num2).toString();
      break;
      
    case 'grade1-6':
      // Basic operations
      const operations = ['+', '-', '*'];
      const op = operations[Math.floor(Math.random() * operations.length)];
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      
      question = `${a} ${op} ${b} = ?`;
      // Use eval carefully (controlled inputs)
      answer = eval(`${a} ${op} ${b}`).toString();
      break;
      
    case 'grade7-9':
      // Fractions, decimals, percentages
      const problemTypes = ['fraction', 'decimal', 'percentage'];
      const type = problemTypes[Math.floor(Math.random() * problemTypes.length)];
      
      if (type === 'fraction') {
        const numerator = Math.floor(Math.random() * 10) + 1;
        const denominator = getRandomNonZero(2, 10);
        question = `What is ${numerator}/${denominator} as a decimal? (Round to 2 decimal places)`;
        answer = (numerator / denominator).toFixed(2);
      } else if (type === 'decimal') {
        const decimal = (Math.random() * 10).toFixed(2);
        question = `What is ${decimal} as a percentage?`;
        answer = (parseFloat(decimal) * 100).toFixed(0);
      } else {
        const percentage = Math.floor(Math.random() * 100) + 1;
        const value = Math.floor(Math.random() * 200) + 50;
        question = `What is ${percentage}% of ${value}?`;
        answer = ((percentage / 100) * value).toFixed(2);
      }
      break;
      
    case 'grade10-12':
    case 'matric':
      // Algebra, geometry, trigonometry
      const advancedTypes = ['quadratic', 'linear', 'area', 'trigonometry'];
      const advType = advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
      
      if (advType === 'quadratic') {
        const a = getRandomNonZero(1, 5);
        const b = Math.floor(Math.random() * 10) - 5;
        const c = Math.floor(Math.random() * 10) - 5;
        question = `Solve the quadratic equation: ${a}x² + ${b}x + ${c} = 0. If there are two solutions, give the larger one.`;
        
        // Calculate discriminant
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) {
          question = `Solve the quadratic equation: ${a}x² + ${b}x + ${c} = 0. Express in terms of i.`;
          answer = `(${-b}±${Math.sqrt(-discriminant)}i)/${2*a}`;
        } else {
          const solution1 = (-b + Math.sqrt(discriminant)) / (2 * a);
          const solution2 = (-b - Math.sqrt(discriminant)) / (2 * a);
          answer = Math.max(solution1, solution2).toFixed(2);
        }
      } else if (advType === 'linear') {
        const m = getRandomNonZero(1, 5);
        const c = Math.floor(Math.random() * 10) - 5;
        const x = Math.floor(Math.random() * 10) - 5;
        question = `If f(x) = ${m}x + ${c}, what is f(${x})?`;
        answer = (m * x + c).toString();
      } else if (advType === 'area') {
        const radius = Math.floor(Math.random() * 10) + 1;
        question = `What is the area of a circle with radius ${radius} units? (Use π = 3.14, round to 2 decimal places)`;
        answer = (3.14 * radius * radius).toFixed(2);
      } else {
        const angle = [30, 45, 60][Math.floor(Math.random() * 3)];
        question = `What is the sine of ${angle} degrees? (Round to 2 decimal places)`;
        answer = Math.sin(angle * Math.PI / 180).toFixed(2);
      }
      break;
  }
  
  return {
    id: generateUniqueId(),
    question,
    answer,
    hint: getMathHint(grade),
  };
};

// Generate physics problems based on grade level
const generatePhysicsProblem = (grade: GradeType): Problem => {
  let question = '';
  let answer = '';
  
  // Skip kindergarten for physics
  if (grade === 'kindergarten') {
    question = "What makes things fall to the ground?";
    answer = "gravity";
    return {
      id: generateUniqueId(),
      question,
      answer,
      hint: "Think about what pulls you down when you jump!",
    };
  }
  
  switch (grade) {
    case 'grade1-6':
      // Simple physics concepts
      const concepts = ["gravity", "magnets", "light", "sound"];
      const concept = concepts[Math.floor(Math.random() * concepts.length)];
      
      if (concept === "gravity") {
        question = "If you drop a rock and a feather at the same time on Earth, which will hit the ground first?";
        answer = "rock";
      } else if (concept === "magnets") {
        question = "What poles of magnets attract each other?";
        answer = "opposite poles";
      } else if (concept === "light") {
        question = "What color is created when all colors of light mix together?";
        answer = "white";
      } else {
        question = "Does sound travel faster in air or water?";
        answer = "water";
      }
      break;
      
    case 'grade7-9':
      // Basic physics calculations
      const basicTypes = ["speed", "force", "energy"];
      const basicType = basicTypes[Math.floor(Math.random() * basicTypes.length)];
      
      if (basicType === "speed") {
        const distance = Math.floor(Math.random() * 100) + 50;
        const time = getRandomNonZero(5, 20);
        question = `If a car travels ${distance} meters in ${time} seconds, what is its average speed in m/s?`;
        answer = (distance / time).toFixed(2);
      } else if (basicType === "force") {
        const mass = Math.floor(Math.random() * 10) + 1;
        const acceleration = Math.floor(Math.random() * 10) + 1;
        question = `If a ${mass} kg object accelerates at ${acceleration} m/s², what is the force applied (in Newtons)?`;
        answer = (mass * acceleration).toFixed(2);
      } else {
        const mass = Math.floor(Math.random() * 10) + 1;
        const height = Math.floor(Math.random() * 20) + 5;
        question = `What is the potential energy of a ${mass} kg object at a height of ${height} meters? (Use g = 9.8 m/s², round to 2 decimal places)`;
        answer = (mass * 9.8 * height).toFixed(2);
      }
      break;
      
    case 'grade10-12':
    case 'matric':
      // Advanced physics
      const advancedTypes = ["kinematics", "electricity", "waves", "thermodynamics"];
      const advType = advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
      
      if (advType === "kinematics") {
        const initialVelocity = Math.floor(Math.random() * 20);
        const acceleration = getRandomNonZero(1, 5);
        const time = getRandomNonZero(2, 10);
        question = `If an object starts with an initial velocity of ${initialVelocity} m/s and accelerates at ${acceleration} m/s², how far will it travel in ${time} seconds?`;
        answer = (initialVelocity * time + 0.5 * acceleration * time * time).toFixed(2);
      } else if (advType === "electricity") {
        const voltage = getRandomNonZero(5, 20);
        const resistance = getRandomNonZero(2, 10);
        question = `What current will flow through a ${resistance} Ω resistor connected to a ${voltage} V battery? (in Amperes)`;
        answer = (voltage / resistance).toFixed(2);
      } else if (advType === "waves") {
        const frequency = getRandomNonZero(10, 100);
        question = `If a wave has a frequency of ${frequency} Hz and travels at 340 m/s (speed of sound in air), what is its wavelength in meters?`;
        answer = (340 / frequency).toFixed(2);
      } else {
        const mass = getRandomNonZero(1, 5);
        const tempChange = getRandomNonZero(10, 50);
        question = `How much heat energy is required to raise the temperature of ${mass} kg of water by ${tempChange}°C? (Specific heat capacity of water = 4184 J/kg°C)`;
        answer = (mass * 4184 * tempChange).toFixed(2);
      }
      break;
  }
  
  return {
    id: generateUniqueId(),
    question,
    answer,
    hint: getPhysicsHint(grade),
  };
};

// Generate English problems
const generateEnglishProblem = (grade: GradeType): Problem => {
  let question = '';
  let answer = '';
  let options: string[] = [];
  
  switch (grade) {
    case 'kindergarten':
      // Letter recognition or simple word completion
      const words = [
        {word: "cat", missing: "c__", answer: "a"},
        {word: "dog", missing: "__g", answer: "do"},
        {word: "sun", missing: "s__", answer: "un"},
        {word: "hat", missing: "_at", answer: "h"},
        {word: "pen", missing: "p__", answer: "en"}
      ];
      
      const selectedWord = words[Math.floor(Math.random() * words.length)];
      question = `Fill in the missing letter(s) to complete the word: ${selectedWord.missing}`;
      answer = selectedWord.answer;
      break;
      
    case 'grade1-6':
      // Grammar, spelling, vocabulary
      const grammarProblems = [
        {
          q: "Choose the correct word: She ___ to school every day.",
          options: ["go", "goes", "going", "gone"],
          a: "goes"
        },
        {
          q: "Which word is spelled correctly?",
          options: ["recieve", "receive", "receve", "reciave"],
          a: "receive"
        },
        {
          q: "What is the plural of 'child'?",
          options: ["childs", "childen", "children", "childrens"],
          a: "children"
        }
      ];
      
      const grammarProblem = grammarProblems[Math.floor(Math.random() * grammarProblems.length)];
      question = grammarProblem.q;
      options = grammarProblem.options;
      answer = grammarProblem.a;
      break;
      
    case 'grade7-9':
      // Comprehension, advanced grammar
      const comprehensionProblems = [
        {
          q: "Identify the part of speech for the underlined word: She spoke _very_ softly.",
          options: ["noun", "verb", "adjective", "adverb"],
          a: "adverb"
        },
        {
          q: "What literary device is used in: 'The wind whispered through the trees'?",
          options: ["simile", "metaphor", "personification", "hyperbole"],
          a: "personification"
        },
        {
          q: "Choose the correct form: If I ___ earlier, I would have caught the bus.",
          options: ["leave", "left", "had left", "would leave"],
          a: "had left"
        }
      ];
      
      const compProblem = comprehensionProblems[Math.floor(Math.random() * comprehensionProblems.length)];
      question = compProblem.q;
      options = compProblem.options;
      answer = compProblem.a;
      break;
      
    case 'grade10-12':
    case 'matric':
      // Literature, essays, complex language
      const advancedProblems = [
        {
          q: "Which of these is an example of dramatic irony?",
          options: [
            "A character making a joke", 
            "The audience knows something a character doesn't", 
            "A surprising plot twist", 
            "A coincidence in the story"
          ],
          a: "The audience knows something a character doesn't"
        },
        {
          q: "Identify the rhetorical device: 'Ask not what your country can do for you, ask what you can do for your country.'",
          options: ["anaphora", "chiasmus", "parallelism", "antithesis"],
          a: "chiasmus"
        },
        {
          q: "Which sentence uses the subjunctive mood correctly?",
          options: [
            "I wish I was taller", 
            "I wish I were taller", 
            "I wish I would be taller", 
            "I wish I am taller"
          ],
          a: "I wish I were taller"
        }
      ];
      
      const advProblem = advancedProblems[Math.floor(Math.random() * advancedProblems.length)];
      question = advProblem.q;
      options = advProblem.options;
      answer = advProblem.a;
      break;
  }
  
  return {
    id: generateUniqueId(),
    question,
    answer,
    options,
    hint: getEnglishHint(grade),
  };
};

// Generate coding problems
const generateCodingProblem = (grade: GradeType): Problem => {
  let question = '';
  let answer = '';
  
  switch (grade) {
    case 'kindergarten':
      // Simple logic/sequencing
      const directions = [
        {q: "Which block would make the robot move forward?", a: "Forward"},
        {q: "To make the robot turn right, which block should you use?", a: "Turn Right"},
        {q: "If you want the robot to pick up an object, which command should you use?", a: "Grab"}
      ];
      
      const direction = directions[Math.floor(Math.random() * directions.length)];
      question = direction.q;
      answer = direction.a;
      break;
      
    case 'grade1-6':
      // Basic loops and conditions
      const basicCoding = [
        {
          q: "What would this code do? repeat 4 times { move forward, turn right }",
          a: "Draw a square"
        },
        {
          q: "How many times would 'Hello' be printed? repeat 3 times { print 'Hello' }",
          a: "3"
        },
        {
          q: "To repeat an action 10 times, what kind of structure should you use?",
          a: "loop"
        }
      ];
      
      const basicProblem = basicCoding[Math.floor(Math.random() * basicCoding.length)];
      question = basicProblem.q;
      answer = basicProblem.a;
      break;
      
    case 'grade7-9':
      // Variables and functions
      const intermediateCoding = [
        {
          q: "What value is in the variable 'x' after this code runs?\nx = 5\nx = x * 2\nx = x + 3",
          a: "13"
        },
        {
          q: "What's wrong with this code?\nfunction calculateArea(width, height) {\n  return width + height\n}",
          a: "It adds instead of multiplying"
        },
        {
          q: "What will this return?\nfunction mystery(n) {\n  if (n <= 1) return n;\n  return mystery(n-1) + mystery(n-2);\n}\nmystery(4)",
          a: "3"
        }
      ];
      
      const intermediateProblem = intermediateCoding[Math.floor(Math.random() * intermediateCoding.length)];
      question = intermediateProblem.q;
      answer = intermediateProblem.a;
      break;
      
    case 'grade10-12':
    case 'matric':
      // Advanced algorithms and data structures
      const advancedCoding = [
        {
          q: "What's the time complexity of searching an element in a balanced binary search tree?",
          a: "O(log n)"
        },
        {
          q: "What will this Python code output?\ndef recursive_sum(n):\n  if n <= 1:\n    return n\n  else:\n    return n + recursive_sum(n-1)\n\nprint(recursive_sum(5))",
          a: "15"
        },
        {
          q: "In JavaScript, what does the following code return?\n[1, 2, 3, 4, 5].filter(num => num % 2 === 0).map(num => num * 2)",
          a: "[4, 8]"
        }
      ];
      
      const advancedProblem = advancedCoding[Math.floor(Math.random() * advancedCoding.length)];
      question = advancedProblem.q;
      answer = advancedProblem.a;
      break;
  }
  
  return {
    id: generateUniqueId(),
    question,
    answer,
    hint: getCodingHint(grade),
  };
};

// Generate history problems
const generateHistoryProblem = (grade: GradeType): Problem => {
  let question = '';
  let answer = '';
  let options: string[] = [];
  
  switch (grade) {
    case 'kindergarten':
      // Very basic historical concepts
      const basicHistory = [
        {q: "Which holiday celebrates independence?", a: "Independence Day", options: ["Independence Day", "Halloween", "Valentine's Day", "Easter"]},
        {q: "What do we call people who lived a long time ago?", a: "ancestors", options: ["ancestors", "neighbors", "friends", "teachers"]},
        {q: "What color was the first American flag?", a: "red, white, and blue", options: ["red, white, and blue", "green and yellow", "purple and pink", "black and white"]}
      ];
      
      const basicQ = basicHistory[Math.floor(Math.random() * basicHistory.length)];
      question = basicQ.q;
      answer = basicQ.a;
      options = basicQ.options;
      break;
      
    case 'grade1-6':
      // Important historical figures and events
      const elementaryHistory = [
        {q: "Who was the first president of the United States?", a: "George Washington", options: ["George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams"]},
        {q: "What was the name of the ship that brought the Pilgrims to America?", a: "Mayflower", options: ["Mayflower", "Santa Maria", "Titanic", "Queen Elizabeth"]},
        {q: "Which war was fought between the North and South in the United States?", a: "Civil War", options: ["Civil War", "World War I", "Revolutionary War", "War of 1812"]}
      ];
      
      const elemQ = elementaryHistory[Math.floor(Math.random() * elementaryHistory.length)];
      question = elemQ.q;
      answer = elemQ.a;
      options = elemQ.options;
      break;
      
    case 'grade7-9':
      // World history, civilizations
      const middleHistory = [
        {q: "Which ancient civilization built the pyramids in Egypt?", a: "Ancient Egyptians", options: ["Ancient Egyptians", "Romans", "Greeks", "Persians"]},
        {q: "What was the main cause of World War I?", a: "Assassination of Archduke Franz Ferdinand", options: ["Assassination of Archduke Franz Ferdinand", "The Great Depression", "Colonial disputes", "Religious conflicts"]},
        {q: "Which empire was ruled by Genghis Khan?", a: "Mongol Empire", options: ["Mongol Empire", "Roman Empire", "Ottoman Empire", "Byzantine Empire"]}
      ];
      
      const middleQ = middleHistory[Math.floor(Math.random() * middleHistory.length)];
      question = middleQ.q;
      answer = middleQ.a;
      options = middleQ.options;
      break;
      
    case 'grade10-12':
    case 'matric':
      // Complex historical analysis
      const highHistory = [
        {q: "What ideology was at the center of the Cold War conflict?", a: "Communism vs. Capitalism", options: ["Communism vs. Capitalism", "Democracy vs. Monarchy", "Fascism vs. Liberalism", "Imperialism vs. Nationalism"]},
        {q: "Which agreement ended World War I?", a: "Treaty of Versailles", options: ["Treaty of Versailles", "Congress of Vienna", "Treaty of Westphalia", "Peace of Augsburg"]},
        {q: "What was a major effect of the Industrial Revolution?", a: "Urbanization", options: ["Urbanization", "Decrease in population", "Decline in technology", "Reduced international trade"]}
      ];
      
      const highQ = highHistory[Math.floor(Math.random() * highHistory.length)];
      question = highQ.q;
      answer = highQ.a;
      options = highQ.options;
      break;
  }
  
  return {
    id: generateUniqueId(),
    question,
    answer,
    options,
    hint: getHistoryHint(grade),
  };
};

// Generate other subject problems (simplified for brevity, can be expanded later)
const generateScienceProblem = (grade: GradeType): Problem => {
  const questions = [
    {q: "What is the closest planet to the sun?", a: "Mercury"},
    {q: "What is the chemical symbol for water?", a: "H2O"},
    {q: "What type of cell contains chloroplasts?", a: "Plant cell"}
  ];
  
  const problem = questions[Math.floor(Math.random() * questions.length)];
  return {
    id: generateUniqueId(),
    question: problem.q,
    answer: problem.a,
    hint: "Think about the solar system structure.",
  };
};

const generateGeographyProblem = (grade: GradeType): Problem => {
  const questions = [
    {q: "What is the capital of France?", a: "Paris"},
    {q: "Which continent is Egypt in?", a: "Africa"},
    {q: "What is the longest river in the world?", a: "Nile"}
  ];
  
  const problem = questions[Math.floor(Math.random() * questions.length)];
  return {
    id: generateUniqueId(),
    question: problem.q,
    answer: problem.a,
    hint: "Look at a map of the world.",
  };
};

// Get hints based on subject and grade
const getMathHint = (grade: GradeType): string => {
  switch (grade) {
    case 'kindergarten':
      return "Count carefully using your fingers!";
    case 'grade1-6':
      return "Remember the order of operations: multiply and divide before add and subtract.";
    case 'grade7-9':
      return "For fractions to decimals, divide the numerator by the denominator.";
    case 'grade10-12':
    case 'matric':
      return "For quadratic equations, use the formula: x = (-b ± √(b² - 4ac)) / 2a";
    default:
      return "Think step by step.";
  }
};

const getPhysicsHint = (grade: GradeType): string => {
  switch (grade) {
    case 'kindergarten':
      return "Think about what pulls things down!";
    case 'grade1-6':
      return "Remember, opposite poles attract in magnets.";
    case 'grade7-9':
      return "Speed = Distance ÷ Time";
    case 'grade10-12':
    case 'matric':
      return "For motion problems, remember: d = vᵢt + ½at²";
    default:
      return "Consider the laws of physics.";
  }
};

const getEnglishHint = (grade: GradeType): string => {
  switch (grade) {
    case 'kindergarten':
      return "Try saying the word out loud and listen for the missing sound.";
    case 'grade1-6':
      return "Remember the 'i before e except after c' rule for spelling.";
    case 'grade7-9':
      return "Adverbs often end in -ly and describe verbs.";
    case 'grade10-12':
    case 'matric':
      return "In dramatic irony, the audience knows something the characters don't.";
    default:
      return "Consider the context and grammar rules.";
  }
};

const getCodingHint = (grade: GradeType): string => {
  switch (grade) {
    case 'kindergarten':
      return "Think about which direction the robot needs to move!";
    case 'grade1-6':
      return "A loop repeats the same actions multiple times.";
    case 'grade7-9':
      return "Variables store values that can change during the program.";
    case 'grade10-12':
    case 'matric':
      return "Remember that time complexity measures how the runtime increases with input size.";
    default:
      return "Break down the problem into smaller steps.";
  }
};

const getHistoryHint = (grade: GradeType): string => {
  switch (grade) {
    case 'kindergarten':
      return "Think about special days we celebrate!";
    case 'grade1-6':
      return "Presidents are leaders of a country.";
    case 'grade7-9':
      return "The pyramids were tombs for Egyptian pharaohs.";
    case 'grade10-12':
    case 'matric':
      return "The Cold War was an ideological conflict between the US and USSR.";
    default:
      return "Consider important historical events and their impacts.";
  }
};

// Main function to generate problems based on subject and grade
export const generateProblem = (subject: SubjectType, grade: GradeType): Problem => {
  switch (subject) {
    case 'math':
      return generateMathProblem(grade);
    case 'physics':
      return generatePhysicsProblem(grade);
    case 'english':
      return generateEnglishProblem(grade);
    case 'coding':
      return generateCodingProblem(grade);
    case 'history':
      return generateHistoryProblem(grade);
    case 'science':
      return generateScienceProblem(grade);
    case 'geography':
      return generateGeographyProblem(grade);
    default:
      return {
        id: generateUniqueId(),
        question: "Default question",
        answer: "Default answer",
      };
  }
};