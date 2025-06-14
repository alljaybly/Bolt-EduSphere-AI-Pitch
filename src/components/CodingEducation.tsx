import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Play, RotateCcw, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const CodingEducation: React.FC = () => {
  const { currentGrade } = useAppStore();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [direction, setDirection] = useState<'forward' | 'left' | 'right' | null>(null);
  const [robotPosition, setRobotPosition] = useState({ x: 50, y: 50, rotation: 0 });
  
  const runCode = () => {
    if (!currentGrade) return;
    
    try {
      if (currentGrade === 'kindergarten') {
        // Simple simulation for kindergarten
        setOutput('Robot is moving!');
      } else if (currentGrade === 'grade1-6') {
        // Simple drawing simulation
        setOutput('Drawing a shape...');
      } else {
        // For older grades, evaluate simple code
        if (code.includes('print') || code.includes('console.log')) {
          const match = code.match(/'([^']*)'|"([^"]*)"/);
          if (match) {
            const printed = match[1] || match[2] || 'Hello, World!';
            setOutput(`Output: ${printed}`);
          } else {
            setOutput('Output: (your code ran successfully)');
          }
        } else {
          setOutput('Hint: Try using print() or console.log() to output something');
        }
      }
    } catch (error) {
      setOutput(`Error: ${error}`);
    }
  };
  
  const moveRobot = (direction: 'forward' | 'left' | 'right') => {
    setDirection(direction);
    
    let newPosition = { ...robotPosition };
    
    if (direction === 'forward') {
      // Move in the direction the robot is facing
      const radians = robotPosition.rotation * Math.PI / 180;
      newPosition.x += Math.cos(radians) * 30;
      newPosition.y += Math.sin(radians) * 30;
      
      // Keep within bounds
      newPosition.x = Math.max(20, Math.min(newPosition.x, 180));
      newPosition.y = Math.max(20, Math.min(newPosition.y, 180));
    } else if (direction === 'left') {
      newPosition.rotation = (robotPosition.rotation - 90) % 360;
    } else if (direction === 'right') {
      newPosition.rotation = (robotPosition.rotation + 90) % 360;
    }
    
    setRobotPosition(newPosition);
    setTimeout(() => setDirection(null), 500); // Reset direction after animation
  };
  
  const resetRobot = () => {
    setRobotPosition({ x: 50, y: 50, rotation: 0 });
  };
  
  // Render appropriate content based on grade level
  if (currentGrade === 'kindergarten') {
    return (
      <motion.div
        className="coding-education bg-white/80 rounded-lg p-6 shadow-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center mb-4">
          <Code size={20} className="text-primary-600 mr-2" />
          <h2 className="font-serif text-xl text-book-leather">Robot Programming</h2>
        </div>
        
        <p className="text-sm text-secondary-700 mb-4">
          Help the robot move around by giving it commands!
        </p>
        
        <div className="robot-playground bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-4 h-52 relative">
          <motion.div
            className="robot absolute w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center"
            animate={{
              x: robotPosition.x,
              y: robotPosition.y,
              rotate: robotPosition.rotation,
              scale: direction ? 1.1 : 1
            }}
            transition={{ type: 'spring', damping: 10 }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <div className="w-4 h-6 bg-white rounded-t-full absolute top-0"></div>
          </motion.div>
        </div>
        
        <div className="command-buttons grid grid-cols-3 gap-2 mb-4">
          <motion.button
            onClick={() => moveRobot('forward')}
            className="p-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Forward
          </motion.button>
          
          <motion.button
            onClick={() => moveRobot('left')}
            className="p-3 bg-accent-600 text-white rounded-md hover:bg-accent-700"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Turn Left
          </motion.button>
          
          <motion.button
            onClick={() => moveRobot('right')}
            className="p-3 bg-secondary-600 text-white rounded-md hover:bg-secondary-700"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Turn Right
          </motion.button>
        </div>
        
        <motion.button
          onClick={resetRobot}
          className="w-full p-2 bg-secondary-100 text-secondary-800 rounded-md hover:bg-secondary-200 flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw size={16} className="mr-2" />
          <span>Reset Robot</span>
        </motion.button>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      className="coding-education bg-white/80 rounded-lg p-6 shadow-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center mb-4">
        <Code size={20} className="text-primary-600 mr-2" />
        <h2 className="font-serif text-xl text-book-leather">
          {currentGrade === 'grade1-6' 
            ? 'Turtle Graphics' 
            : 'Coding Challenge'}
        </h2>
      </div>
      
      <div className="challenge-description bg-secondary-50 p-3 rounded-md mb-4 border border-secondary-200">
        <p className="text-sm text-book-leather">
          {currentGrade === 'grade1-6' && "Draw a square by giving commands to the turtle! Use commands like 'forward(100)' and 'right(90)'."}
          {currentGrade === 'grade7-9' && "Create a function to calculate the area of a rectangle. Use function calculateArea(width, height) { return width * height; }"}
          {(currentGrade === 'grade10-12' || currentGrade === 'matric') && "Create a function to find the sum of all even numbers in an array. Test it with [1, 2, 3, 4, 5, 6]."}
        </p>
      </div>
      
      <div className="code-editor mb-4">
        <label htmlFor="code" className="block text-sm font-serif text-book-leather mb-1">
          Your Code:
        </label>
        <textarea
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-40 p-3 bg-gray-800 text-white font-mono text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder={currentGrade === 'grade1-6' 
            ? "forward(100)\nright(90)\nforward(100)\n..." 
            : "function myCode() {\n  // Write your code here\n  \n}"}
        ></textarea>
      </div>
      
      <motion.button
        onClick={runCode}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center mb-4"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Play size={16} className="mr-2" />
        <span>Run Code</span>
      </motion.button>
      
      <div className="output-container bg-gray-100 p-3 rounded-md border border-secondary-200">
        <p className="text-sm font-mono">
          {output || "// Output will appear here when you run your code"}
        </p>
      </div>
    </motion.div>
  );
};

export default CodingEducation;