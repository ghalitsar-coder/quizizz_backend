import { Server } from "socket.io";
import { logger } from "../config/logger.js";
import { Room } from "../models/Room.js";
import { generateRoomCode, isValidRoomCode } from "../utils/roomCode.js";
import { getQuizById } from "../services/quizService.js";
import { validateUUID } from "../utils/validation.js";

// In-memory store for active rooms
const rooms = new Map();

/**
 * Initialize Socket.io game handlers
 */
export function initializeGameSocket(io) {
  io.on("connection", (socket) => {
    logger.info("Socket connected", { socketId: socket.id });

    // Store room code in socket data
    socket.data.roomCode = null;
    socket.data.isHost = false;

    /**
     * CREATE_ROOM - Guru membuat room baru
     */
    socket.on("create_room", async (data) => {
      try {
        const { quizId, userId } = data;

        // Validate quizId format (must be UUID)
        try {
          validateUUID(quizId, "Quiz ID");
        } catch (validationError) {
          socket.emit("error_message", {
            msg: `Invalid Quiz ID format. ${validationError.message}. Please use a valid UUID.`,
          });
          logger.warn("Invalid quizId format", {
            quizId,
            socketId: socket.id,
            error: validationError.message,
          });
          return;
        }

        // Validate userId format (must be UUID)
        try {
          validateUUID(userId, "User ID");
        } catch (validationError) {
          socket.emit("error_message", {
            msg: `Invalid User ID format. ${validationError.message}. Please use a valid UUID.`,
          });
          logger.warn("Invalid userId format", {
            userId,
            socketId: socket.id,
            error: validationError.message,
          });
          return;
        }

        // Fetch quiz data
        const quizData = await getQuizById(quizId, userId);
        if (!quizData) {
          socket.emit("error_message", { msg: "Quiz not found" });
          return;
        }

        // Generate unique room code
        let roomCode;
        do {
          roomCode = generateRoomCode();
        } while (rooms.has(roomCode));

        // Create room
        const room = new Room(roomCode, quizId, socket.id, quizData);
        rooms.set(roomCode, room);

        socket.data.roomCode = roomCode;
        socket.data.isHost = true;
        socket.join(roomCode);

        logger.info("Room created", { roomCode, quizId, socketId: socket.id });

        socket.emit("room_created", {
          roomCode,
          quizTitle: quizData.title,
          questionCount: quizData.questions.length,
        });
      } catch (error) {
        logger.error("Create room error", {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit("error_message", { msg: "Failed to create room" });
      }
    });

    /**
     * JOIN_ROOM - Siswa join room
     */
    socket.on("join_room", (data) => {
      try {
        const { roomCode, nickname } = data;

        if (!isValidRoomCode(roomCode)) {
          socket.emit("error_message", { msg: "Invalid room code format" });
          return;
        }

        if (!nickname || nickname.trim().length === 0) {
          socket.emit("error_message", { msg: "Nickname is required" });
          return;
        }

        const room = rooms.get(roomCode);
        if (!room) {
          socket.emit("error_message", { msg: "Room tidak ditemukan" });
          return;
        }

        if (room.status !== "WAITING") {
          socket.emit("error_message", { msg: "Game sudah dimulai" });
          return;
        }

        // Add player to room
        try {
          const player = room.addPlayer(socket.id, nickname.trim());
          socket.data.roomCode = roomCode;
          socket.join(roomCode);

          logger.info("Player joined", {
            roomCode,
            nickname,
            socketId: socket.id,
          });

          // Notify student with quiz metadata
          socket.emit("player_joined_success", {
            status: "OK",
            quizTitle: room.quizData.title, // ✅ Added: Show quiz title in lobby
            questionCount: room.quizData.questions.length, // ✅ Added: Show question count
          });

          // Notify host and all players
          io.to(roomCode).emit("player_joined", {
            name: player.name,
            totalPlayers: room.players.length,
            players: room.players.map((p) => p.name),
          });
        } catch (error) {
          socket.emit("error_message", { msg: error.message });
        }
      } catch (error) {
        logger.error("Join room error", {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit("error_message", { msg: "Failed to join room" });
      }
    });

    /**
     * START_GAME - Host mulai game
     */
    socket.on("start_game", (data) => {
      try {
        const { roomCode } = data;
        const room = rooms.get(roomCode);

        if (!room) {
          socket.emit("error_message", { msg: "Room tidak ditemukan" });
          return;
        }

        if (room.hostSocketId !== socket.id) {
          socket.emit("error_message", { msg: "Only host can start the game" });
          return;
        }

        if (room.status !== "WAITING") {
          socket.emit("error_message", { msg: "Game already started" });
          return;
        }

        if (room.players.length === 0) {
          socket.emit("error_message", { msg: "No players in room" });
          return;
        }

        room.startGame(); // This sets currentQuestionIdx to 0 (first question)

        const question = room.getCurrentQuestion();
        if (!question) {
          socket.emit("error_message", { msg: "No questions in quiz" });
          return;
        }

        logger.info("Game started", {
          roomCode,
          questionCount: room.quizData.questions.length,
        });

        // Broadcast game started
        io.to(roomCode).emit("game:started", {
          questionCount: room.quizData.questions.length,
          quizId: room.quizId, // ✅ Added: Frontend can fetch quiz metadata if needed
        });

        // Send first question
        io.to(roomCode).emit("question_start", {
          qIndex: room.currentQuestionIdx,
          qText: question.question_text,
          imageUrl: question.image_url,
          options: question.options,
          duration: question.time_limit || 15,
          points: question.points || 20,
        });

        // Schedule question end timer
        scheduleQuestionEnd(io, room, question.time_limit || 15);
      } catch (error) {
        logger.error("Start game error", {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit("error_message", { msg: "Failed to start game" });
      }
    });

    /**
     * SUBMIT_ANSWER - Siswa submit jawaban
     */
    socket.on("submit_answer", (data) => {
      try {
        const { roomCode, answerIdx, timeElapsed } = data;

        const room = rooms.get(roomCode);
        if (!room) {
          socket.emit("error_message", { msg: "Room tidak ditemukan" });
          return;
        }

        if (room.status !== "ACTIVE") {
          socket.emit("error_message", { msg: "Game is not active" });
          return;
        }

        const question = room.getCurrentQuestion();
        if (!question) {
          socket.emit("error_message", { msg: "No active question" });
          return;
        }

        // Use server-side time calculation for security
        const serverTimeElapsed = room.questionStartTime
          ? (Date.now() - room.questionStartTime) / 1000
          : timeElapsed;

        const result = room.submitAnswer(
          socket.id,
          answerIdx,
          serverTimeElapsed
        );

        if (result.error) {
          socket.emit("error_message", { msg: result.error });
          return;
        }

        logger.debug("Answer submitted", {
          roomCode,
          socketId: socket.id,
          answerIdx,
          isCorrect: result.isCorrect,
        });

        // Send result to individual student
        socket.emit("answer_result", {
          isCorrect: result.isCorrect,
          scoreEarned: result.scoreEarned,
          currentTotal: result.currentTotal,
          correctAnswerIdx: question.correct_idx, // Only send after submission
        });

        // Update live stats for host
        const stats = room.getLiveStats();
        io.to(room.hostSocketId).emit("live_stats", stats);
      } catch (error) {
        logger.error("Submit answer error", {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit("error_message", { msg: "Failed to submit answer" });
      }
    });

    /**
     * GAME_NEXT - Host next question
     */
    socket.on("game:next", (data) => {
      try {
        const { roomCode } = data;
        const room = rooms.get(roomCode);

        if (!room) {
          socket.emit("error_message", { msg: "Room tidak ditemukan" });
          return;
        }

        if (room.hostSocketId !== socket.id) {
          socket.emit("error_message", { msg: "Only host can control game" });
          return;
        }

        const hasNext = room.nextQuestion();
        if (!hasNext) {
          // Game ended
          room.endGame();
          const leaderboard = room.getLeaderboard();

          io.to(roomCode).emit("game:ended", {
            finalLeaderboard: leaderboard,
          });

          // Cleanup after 1 minute
          setTimeout(() => {
            rooms.delete(roomCode);
            logger.info("Room cleaned up", { roomCode });
          }, 60000);
          return;
        }

        const question = room.getCurrentQuestion();

        // Show correct answer before next question
        const currentQuestion =
          room.quizData.questions[room.currentQuestionIdx - 1];
        io.to(roomCode).emit("question_end", {
          correctAnswerIdx: currentQuestion?.correct_idx,
        });

        // Update leaderboard
        const leaderboard = room.getLeaderboard();
        io.to(roomCode).emit("update_leaderboard", { leaderboard });

        // Send next question
        io.to(roomCode).emit("question_start", {
          qIndex: room.currentQuestionIdx,
          qText: question.question_text,
          imageUrl: question.image_url,
          options: question.options,
          duration: question.time_limit || 15,
          points: question.points || 20,
        });

        // Schedule question end timer
        scheduleQuestionEnd(io, room, question.time_limit || 15);
      } catch (error) {
        logger.error("Next question error", {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit("error_message", {
          msg: "Failed to move to next question",
        });
      }
    });

    /**
     * GAME_END - Host end game
     */
    socket.on("game:end", (data) => {
      try {
        const { roomCode } = data;
        const room = rooms.get(roomCode);

        if (!room) {
          socket.emit("error_message", { msg: "Room tidak ditemukan" });
          return;
        }

        if (room.hostSocketId !== socket.id) {
          socket.emit("error_message", { msg: "Only host can end game" });
          return;
        }

        room.endGame();
        const leaderboard = room.getLeaderboard();
        const winner = leaderboard[0] || null;

        io.to(roomCode).emit("final_results", {
          winner: winner ? winner.name : null,
          top3: leaderboard.slice(0, 3),
        });

        // Cleanup after 1 minute
        setTimeout(() => {
          rooms.delete(roomCode);
          logger.info("Room cleaned up", { roomCode });
        }, 60000);
      } catch (error) {
        logger.error("End game error", {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit("error_message", { msg: "Failed to end game" });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on("disconnect", () => {
      logger.info("Socket disconnected", { socketId: socket.id });

      const roomCode = socket.data.roomCode;
      if (roomCode) {
        const room = rooms.get(roomCode);
        if (room) {
          if (room.hostSocketId === socket.id) {
            // Host disconnected - end game and cleanup
            room.endGame();
            io.to(roomCode).emit("error_message", { msg: "Host disconnected" });
            setTimeout(() => {
              rooms.delete(roomCode);
              logger.info("Room cleaned up after host disconnect", {
                roomCode,
              });
            }, 5000);
          } else {
            // Player disconnected
            room.removePlayer(socket.id);
            io.to(roomCode).emit("player_joined", {
              name: "",
              totalPlayers: room.players.length,
              players: room.players.map((p) => p.name),
            });
          }
        }
      }
    });
  });

  // Helper function to schedule question end
  function scheduleQuestionEnd(io, room, timeLimit) {
    setTimeout(() => {
      if (room.status === "ACTIVE" && room.currentQuestionIdx >= 0) {
        const question = room.getCurrentQuestion();
        if (question) {
          // Show correct answer
          io.to(room.roomCode).emit("question_end", {
            correctAnswerIdx: question.correct_idx,
          });

          // Update leaderboard
          const leaderboard = room.getLeaderboard();
          io.to(room.roomCode).emit("update_leaderboard", { leaderboard });
        }
      }
    }, (timeLimit + 2) * 1000); // Add 2 seconds tolerance
  }

  return io;
}

// Export rooms map for monitoring
export { rooms };
