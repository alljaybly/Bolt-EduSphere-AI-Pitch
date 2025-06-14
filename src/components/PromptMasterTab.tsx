import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Zap, Award, Sparkles } from 'lucide-react';

const PromptMasterTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const promptTips = [
    "Be specific and clear in your requests",
    "Provide context and background information",
    "Break complex requests into smaller parts",
    "Specify the desired format for the response",
    "Include examples of what you're looking for"
  ];
  
  const evaluatePrompt = () => {
    // Simple prompt evaluation logic
    let score = 0;
    let feedbackText = '';
    
    if (prompt.length < 10) {
      feedbackText = "Your prompt is too short. Try to be more specific about what you want.";
    } else if (prompt.length > 15) {
      score += 1;
      feedbackText = "Good start! ";
      
      // Check for context
      if (prompt.includes("because") || prompt.includes("as") || prompt.includes("for")) {
        score += 1;
        feedbackText += "You've provided some context which is helpful. ";
      } else {
        feedbackText += "Consider adding more context about why you need this information. ";
      }
      
      // Check for specific request
      if (prompt.includes("explain") || prompt.includes("how to") || prompt.includes("what is")) {
        score += 1;
        feedbackText += "Your request is clear. ";
      } else {
        feedbackText += "Make your request more specific. ";
      }
      
      // Check for format specification
      if (prompt.includes("list") || prompt.includes("steps") || prompt.includes("example")) {
        score += 1;
        feedbackText += "Good job specifying the format! ";
      } else {
        feedbackText += "Consider specifying what format you want the answer in. ";
      }
      
      // Add final rating
      if (score <= 1) {
        feedbackText += "Overall: Needs improvement.";
      } else if (score === 2) {
        feedbackText += "Overall: Getting better!";
      } else if (score === 3) {
        feedbackText += "Overall: Good prompt!";
      } else {
        feedbackText += "Overall: Excellent prompt!";
      }
    }
    
    setFeedback(feedbackText);
  };
  
  const promptExamples = [
    {
      age: "Ages 5-7",
      example: "Show me a picture of a dog",
      improved: "Show me 3 different types of friendly dogs that are good with children"
    },
    {
      age: "Ages 8-12",
      example: "Tell me about dinosaurs",
      improved: "Tell me 5 interesting facts about T-Rex with simple explanations I can understand"
    },
    {
      age: "Teenagers",
      example: "Help with math homework",
      improved: "I'm working on quadratic equations. Can you explain how to solve x² + 5x + 6 = 0 step by step?"
    }
  ];
  
  return (
    <motion.div
      className="prompt-master bg-white/80 rounded-lg p-6 shadow-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center justify-center mb-4">
        <Sparkles size={24} className="text-book-gold mr-2" />
        <h2 className="font-serif text-2xl text-book-leather text-center">
          PromptMaster AI
        </h2>
      </div>
      
      <p className="text-sm text-secondary-700 mb-4 text-center">
        Learn to create effective prompts that get you the best responses from AI!
      </p>
      
      <div className="mb-6">
        <div className="bg-secondary-50 p-4 rounded-lg mb-4">
          <div className="flex items-center mb-2">
            <Zap size={18} className="text-book-gold mr-2" />
            <h3 className="font-serif text-lg text-book-leather">Prompting Tips</h3>
          </div>
          <ul className="space-y-1 list-disc list-inside text-sm text-secondary-700">
            {promptTips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
        
        <div className="prompt-practice mb-4">
          <label htmlFor="prompt-input" className="block font-serif text-lg text-book-leather mb-2">
            Practice Your Prompting:
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 border border-secondary-300 rounded-lg h-24 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Type your prompt here..."
          ></textarea>
          
          <motion.button
            onClick={evaluatePrompt}
            className="mt-2 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={prompt.length === 0}
          >
            Evaluate My Prompt
          </motion.button>
        </div>
        
        {feedback && (
          <motion.div 
            className="bg-accent-50 p-3 rounded-lg border border-accent-200 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start">
              <MessageSquare size={18} className="text-accent-600 mr-2 mt-1" />
              <div>
                <h4 className="font-serif text-accent-800 text-sm font-medium">AI Feedback:</h4>
                <p className="text-sm text-secondary-700 mt-1">{feedback}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      <div className="prompt-examples">
        <div className="flex items-center mb-3">
          <Award size={18} className="text-book-gold mr-2" />
          <h3 className="font-serif text-lg text-book-leather">Example Prompts by Age</h3>
        </div>
        
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {promptExamples.map((example, index) => (
            <motion.div 
              key={index}
              className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <h4 className="font-serif text-book-leather text-sm font-medium">{example.age}</h4>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <div className="bg-red-50 p-2 rounded-md">
                  <p className="text-xs text-red-700 font-medium">Basic Prompt:</p>
                  <p className="text-sm">{example.example}</p>
                </div>
                <div className="bg-green-50 p-2 rounded-md">
                  <p className="text-xs text-green-700 font-medium">Improved Prompt:</p>
                  <p className="text-sm">{example.improved}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PromptMasterTab;