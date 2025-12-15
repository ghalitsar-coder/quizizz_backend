/**
 * Room Model - In-Memory Store
 * Represents an active game room
 */
export class Room {
  constructor(roomCode, quizId, hostSocketId, quizData) {
    this.roomCode = roomCode;
    this.quizId = quizId;
    this.hostSocketId = hostSocketId;
    this.quizData = quizData; // Full quiz data with questions
    this.currentQuestionIdx = -1;
    this.players = []; // Array of { id, name, score, socketId }
    this.status = 'WAITING'; // 'WAITING' | 'ACTIVE' | 'ENDED'
    this.questionStartTime = null;
    this.answerSubmissions = new Map(); // socketId -> { answerIdx, timestamp }
  }

  /**
   * Add a player to the room
   */
  addPlayer(socketId, nickname) {
    // Check for duplicate nickname
    if (this.players.some(p => p.name.toLowerCase() === nickname.toLowerCase())) {
      throw new Error('Nickname already taken');
    }

    const player = {
      id: socketId, // Using socketId as temporary ID
      name: nickname,
      score: 0,
      socketId: socketId
    };

    this.players.push(player);
    return player;
  }

  /**
   * Remove a player from the room
   */
  removePlayer(socketId) {
    this.players = this.players.filter(p => p.socketId !== socketId);
  }

  /**
   * Start the game
   */
  startGame() {
    if (this.status !== 'WAITING') {
      throw new Error('Game already started or ended');
    }
    this.status = 'ACTIVE';
    this.currentQuestionIdx = 0;
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    if (this.currentQuestionIdx >= this.quizData.questions.length - 1) {
      this.status = 'ENDED';
      return false;
    }
    this.currentQuestionIdx++;
    this.questionStartTime = Date.now();
    this.answerSubmissions.clear();
    return true;
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    if (this.currentQuestionIdx < 0 || this.currentQuestionIdx >= this.quizData.questions.length) {
      return null;
    }
    return this.quizData.questions[this.currentQuestionIdx];
  }

  /**
   * Submit answer for a player
   */
  submitAnswer(socketId, answerIdx, timeElapsed) {
    // Check if already submitted for this question
    if (this.answerSubmissions.has(socketId)) {
      return { error: 'Answer already submitted for this question' };
    }

    // Validate answer index
    const question = this.getCurrentQuestion();
    if (!question) {
      return { error: 'No active question' };
    }

    if (answerIdx < 0 || answerIdx >= question.options.length) {
      return { error: 'Invalid answer index' };
    }

    // Check if submission is within time limit
    const timeLimit = question.time_limit || 15;
    if (timeElapsed > timeLimit + 2) { // 2 seconds tolerance
      return { error: 'Submission too late' };
    }

    // Store submission
    this.answerSubmissions.set(socketId, {
      answerIdx,
      timestamp: Date.now(),
      timeElapsed
    });

    // Calculate score
    const isCorrect = answerIdx === question.correct_idx;
    const baseScore = question.points || 20;
    
    let scoreEarned = 0;
    if (isCorrect) {
      // Use server-side time calculation
      const serverTimeElapsed = (Date.now() - this.questionStartTime) / 1000;
      scoreEarned = this.calculateScore(serverTimeElapsed, baseScore, true);
      
      // Update player score
      const player = this.players.find(p => p.socketId === socketId);
      if (player) {
        player.score += scoreEarned;
      }
    }

    return {
      success: true,
      isCorrect,
      scoreEarned,
      currentTotal: this.players.find(p => p.socketId === socketId)?.score || 0
    };
  }

  /**
   * Calculate score (imported from utils)
   */
  calculateScore(tAnswer, baseScore, isCorrect) {
    if (!isCorrect) return 0;
    if (tAnswer <= 5) return baseScore;
    if (tAnswer <= 10) return Math.floor(baseScore * 0.75);
    return Math.floor(baseScore * 0.5);
  }

  /**
   * Get leaderboard (sorted by score descending)
   */
  getLeaderboard() {
    return this.players
      .map((player, index) => ({
        name: player.name,
        score: player.score,
        rank: 0 // Will be set after sorting
      }))
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
  }

  /**
   * Get live stats (answer distribution for current question)
   */
  getLiveStats() {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    const stats = {
      a: 0, b: 0, c: 0, d: 0
    };

    this.answerSubmissions.forEach((submission) => {
      const idx = submission.answerIdx;
      if (idx >= 0 && idx < 4) {
        const key = ['a', 'b', 'c', 'd'][idx];
        stats[key]++;
      }
    });

    return stats;
  }

  /**
   * End the game
   */
  endGame() {
    this.status = 'ENDED';
  }
}

