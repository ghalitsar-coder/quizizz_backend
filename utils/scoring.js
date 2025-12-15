/**
 * Calculate score based on time-decay algorithm
 * @param {number} tAnswer - Time taken to answer (in seconds)
 * @param {number} baseScore - Base points for the question
 * @param {boolean} isCorrect - Whether the answer is correct
 * @returns {number} Calculated score
 */
export function calculateScore(tAnswer, baseScore, isCorrect) {
  if (!isCorrect) {
    return 0;
  }
  
  // Full points if answered within 5 seconds
  if (tAnswer <= 5) {
    return baseScore;
  }
  // 75% of base score if answered within 10 seconds
  else if (tAnswer <= 10) {
    return Math.floor(baseScore * 0.75);
  }
  // 50% of base score if answered after 10 seconds
  else {
    return Math.floor(baseScore * 0.5);
  }
}

/**
 * Validate if answer submission is within time limit
 * @param {number} timeElapsed - Time elapsed since question started
 * @param {number} timeLimit - Time limit for the question
 * @param {number} tolerance - Tolerance in seconds (default: 2)
 * @returns {boolean} True if submission is valid
 */
export function isSubmissionValid(timeElapsed, timeLimit, tolerance = 2) {
  return timeElapsed <= (timeLimit + tolerance);
}

