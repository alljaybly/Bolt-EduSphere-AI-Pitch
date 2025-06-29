import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/**
 * Bolt.new Badge Component
 * Displays a prominent badge highlighting that the app was built with Bolt.new
 */
const BoltBadge: React.FC = () => {
  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <motion.a
        href="https://bolt.new"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="mr-2"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Zap size={16} />
        </motion.div>
        <span className="text-sm font-semibold">Built with Bolt.new</span>
        <motion.div
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ x: -10 }}
          whileHover={{ x: 0 }}
        >
          ⚡
        </motion.div>
      </motion.a>
    </motion.div>
  );
};

export default BoltBadge;