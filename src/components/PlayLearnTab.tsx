import React, { useEffect, useState } from 'react';

const PlayLearnTab = () => {
  const [problem, setProblem] = useState(null);
  useEffect(() => {
    async function fetchProblem() {
      try {
        const response = await fetch('/.netlify/functions/getProblems?grade=kindergarten');
        const data = await response.json();
        setProblem(data);
      } catch (error) {
        console.error('Error fetching problem:', error);
      }
    }
    fetchProblem();
  }, []);
  return (
    <div>
      <h2>Play & Learn</h2>
      {problem ? (
        <p>{problem.content} (Subject: {problem.subject}, Grade: {problem.grade})</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};
export default PlayLearnTab;