# Socket.io Backend URL Configuration

## URL untuk Development (Local)

**Socket.io URL:** `http://localhost:3001`

### Contoh Penggunaan di Frontend:

#### JavaScript/TypeScript (Browser)

```javascript
import io from "socket.io-client";

// Development
const socket = io("http://localhost:3001", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on("connect", () => {
  console.log("Connected to Socket.io server:", socket.id);
});
```

#### React Hook Example

```javascript
import { useEffect, useState } from "react";
import io from "socket.io-client";

function useSocket(url) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io(url, {
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("Connected:", socketInstance.id);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [url]);

  return socket;
}

// Usage
function App() {
  const socket = useSocket("http://localhost:3001");

  useEffect(() => {
    if (socket) {
      socket.emit("create_room", {
        quizId: "your-quiz-id",
        userId: "your-user-id",
      });
    }
  }, [socket]);
}
```

## URL untuk Production

Setelah deploy ke Render/Railway, URL akan menjadi:

### Render

- URL: `https://your-app-name.onrender.com`
- Contoh: `https://quizizz-backend.onrender.com`

### Railway

- URL: `https://your-app-name.up.railway.app`
- Contoh: `https://quizizz-backend.up.railway.app`

### Dynamic URL Configuration

```javascript
// config.js
const isDevelopment = process.env.NODE_ENV === "development";

export const SOCKET_URL = isDevelopment
  ? "http://localhost:3001"
  : process.env.REACT_APP_SOCKET_URL || "https://your-backend-url.com";

// Usage
import io from "socket.io-client";
import { SOCKET_URL } from "./config";

const socket = io(SOCKET_URL);
```

## Environment Variables

Untuk frontend, buat file `.env`:

```env
# Development
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_API_URL=http://localhost:3001/api

# Production (setelah deploy)
# REACT_APP_SOCKET_URL=https://your-backend-url.com
# REACT_APP_API_URL=https://your-backend-url.com/api
```

Kemudian gunakan di code:

```javascript
const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:3001");
```

## Test Koneksi Socket.io

### Via Browser Console

1. Buka browser console (F12)
2. Pastikan Socket.io client library sudah di-load
3. Test koneksi:

```javascript
// Test basic connection
const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("✅ Connected! Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection failed:", error);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

### Via Node.js Script

Buat file `test-socket.js`:

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3001", {
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  // Test create room
  socket.emit("create_room", {
    quizId: "test-quiz-id",
    userId: "test-user-id",
  });
});

socket.on("room_created", (data) => {
  console.log("✅ Room created:", data);
});

socket.on("connect_error", (error) => {
  console.error("❌ Error:", error.message);
});

socket.on("error_message", (data) => {
  console.error("❌ Server error:", data.msg);
});
```

Jalankan:

```bash
node test-socket.js
```

## Checklist

- [x] Backend server berjalan di port 3001
- [x] Socket.io sudah di-configure
- [x] CORS sudah di-set untuk frontend URL
- [ ] Frontend bisa connect ke `http://localhost:3001`
- [ ] Test semua Socket.io events (create_room, join_room, dll)
- [ ] Deploy ke production (Render/Railway)
- [ ] Update frontend URL untuk production

## Current Configuration

- **Development URL:** `http://localhost:3001`
- **CORS Origin:** `http://localhost:3000` (dari .env)
- **Transports:** websocket, polling
- **Reconnection:** Enabled

---

## 📚 Complete Use Cases - Frontend Implementation

### 🎓 Use Case 1: Host/Teacher - Create Room & Start Game

```javascript
import { useEffect, useState } from "react";
import io from "socket.io-client";

function TeacherGameRoom({ quizId, userId }) {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [liveStats, setLiveStats] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    // Connect to Socket.io
    const socketInstance = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    // Connection events
    socketInstance.on("connect", () => {
      console.log("✅ Connected:", socketInstance.id);

      // Create room after connection
      socketInstance.emit("create_room", {
        quizId: quizId, // UUID from API
        userId: userId, // UUID from login
      });
    });

    // Room created
    socketInstance.on("room_created", (data) => {
      console.log("Room created:", data);
      setRoomCode(data.roomCode);
    });

    // Player joined (update player list)
    socketInstance.on("player_joined", (data) => {
      console.log("Player joined:", data);
      setPlayers(data.players);
    });

    // Game started
    socketInstance.on("game:started", (data) => {
      console.log("Game started:", data);
      setGameStarted(true);
    });

    // Question started
    socketInstance.on("question_start", (data) => {
      console.log("Question started:", data);
      setCurrentQuestion(data);
      setLiveStats({ a: 0, b: 0, c: 0, d: 0 }); // Reset stats
    });

    // Live stats update (for host only)
    socketInstance.on("live_stats", (stats) => {
      console.log("Live stats:", stats);
      setLiveStats(stats);
    });

    // Question ended
    socketInstance.on("question_end", (data) => {
      console.log("Question ended, correct answer:", data.correctAnswerIdx);
      // Show correct answer to all
    });

    // Leaderboard update
    socketInstance.on("update_leaderboard", (data) => {
      console.log("Leaderboard updated:", data.leaderboard);
      setLeaderboard(data.leaderboard);
    });

    // Game ended
    socketInstance.on("game:ended", (data) => {
      console.log("Game ended:", data);
      setGameStarted(false);
    });

    // Error handling
    socketInstance.on("error_message", (data) => {
      console.error("Error:", data.msg);
      alert(data.msg);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [quizId, userId]);

  // Start game
  const handleStartGame = () => {
    if (socket && roomCode) {
      socket.emit("start_game", { roomCode });
    }
  };

  // Next question
  const handleNextQuestion = () => {
    if (socket && roomCode) {
      socket.emit("game:next", { roomCode });
    }
  };

  // End game
  const handleEndGame = () => {
    if (socket && roomCode) {
      socket.emit("game:end", { roomCode });
    }
  };

  return (
    <div>
      {roomCode && (
        <div>
          <h2>Room Code: {roomCode}</h2>
          <p>
            Share this code with students: <strong>{roomCode}</strong>
          </p>
        </div>
      )}

      <div>
        <h3>Players ({players.length})</h3>
        <ul>
          {players.map((player, idx) => (
            <li key={idx}>{player}</li>
          ))}
        </ul>
      </div>

      {!gameStarted && (
        <button onClick={handleStartGame} disabled={players.length === 0}>
          Start Game
        </button>
      )}

      {gameStarted && currentQuestion && (
        <div>
          <h3>Question {currentQuestion.qIndex + 1}</h3>
          <p>{currentQuestion.qText}</p>

          {/* Live Stats Chart */}
          <div>
            <h4>Live Stats</h4>
            <div>A: {liveStats.a}</div>
            <div>B: {liveStats.b}</div>
            <div>C: {liveStats.c}</div>
            <div>D: {liveStats.d}</div>
          </div>

          <button onClick={handleNextQuestion}>Next Question</button>
          <button onClick={handleEndGame}>End Game</button>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div>
          <h3>Leaderboard</h3>
          <ol>
            {leaderboard.map((player, idx) => (
              <li key={idx}>
                {player.name}: {player.score} points (Rank {player.rank})
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

---

### 🎮 Use Case 2: Student - Join Room & Play Game

```javascript
import { useEffect, useState } from "react";
import io from "socket.io-client";

function StudentGameRoom({ roomCode, nickname }) {
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    // Connect to Socket.io
    const socketInstance = io("http://localhost:3001", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Connected:", socketInstance.id);

      // Join room after connection
      socketInstance.emit("join_room", {
        roomCode: roomCode,
        nickname: nickname,
      });
    });

    // Joined successfully
    socketInstance.on("player_joined_success", (data) => {
      console.log("Joined room successfully");
      setJoined(true);
    });

    // Game started
    socketInstance.on("game:started", (data) => {
      console.log("Game started:", data);
      setGameStarted(true);
    });

    // Question started
    socketInstance.on("question_start", (data) => {
      console.log("Question started:", data);
      setCurrentQuestion(data);
      setAnswerResult(null);
      setQuestionTimer(data.duration);

      // Start countdown timer
      let timeLeft = data.duration;
      const timer = setInterval(() => {
        timeLeft--;
        setQuestionTimer(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    });

    // Answer result (private to student)
    socketInstance.on("answer_result", (data) => {
      console.log("Answer result:", data);
      setAnswerResult(data);
      setScore(data.currentTotal);
    });

    // Question ended (show correct answer)
    socketInstance.on("question_end", (data) => {
      console.log("Question ended, correct answer:", data.correctAnswerIdx);
      // Highlight correct answer
    });

    // Leaderboard update
    socketInstance.on("update_leaderboard", (data) => {
      console.log("Leaderboard updated:", data.leaderboard);
      setLeaderboard(data.leaderboard);
    });

    // Game ended
    socketInstance.on("game:ended", (data) => {
      console.log("Game ended:", data);
      setGameStarted(false);
    });

    // Final results
    socketInstance.on("final_results", (data) => {
      console.log("Final results:", data);
      // Show podium/winner
    });

    // Error handling
    socketInstance.on("error_message", (data) => {
      console.error("Error:", data.msg);
      alert(data.msg);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [roomCode, nickname]);

  // Submit answer
  const handleSubmitAnswer = (answerIdx) => {
    if (socket && roomCode && currentQuestion) {
      const timeElapsed = currentQuestion.duration - questionTimer;

      socket.emit("submit_answer", {
        roomCode: roomCode,
        answerIdx: answerIdx,
        timeElapsed: timeElapsed,
      });
    }
  };

  // Render leaderboard with user position
  const renderLeaderboard = () => {
    const userIndex = leaderboard.findIndex((p) => p.name === nickname);
    const userRank = userIndex + 1;
    const top5 = leaderboard.slice(0, 5);

    return (
      <div>
        <h3>Leaderboard</h3>
        <ol>
          {top5.map((player, idx) => (
            <li
              key={idx}
              style={{
                fontWeight: player.name === nickname ? "bold" : "normal",
              }}
            >
              {player.name}: {player.score} points
            </li>
          ))}
        </ol>

        {userRank > 5 && (
          <>
            <div>...</div>
            <div style={{ fontWeight: "bold" }}>
              {userRank}. {nickname}: {leaderboard[userIndex]?.score} points
            </div>
          </>
        )}
      </div>
    );
  };

  if (!joined) {
    return <div>Joining room...</div>;
  }

  return (
    <div>
      <h2>Your Score: {score}</h2>

      {gameStarted && currentQuestion && (
        <div>
          <h3>Question {currentQuestion.qIndex + 1}</h3>
          <p>Time: {questionTimer}s</p>
          <p>{currentQuestion.qText}</p>

          {currentQuestion.imageUrl && (
            <img src={currentQuestion.imageUrl} alt="Question" />
          )}

          <div>
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmitAnswer(idx)}
                disabled={answerResult !== null || questionTimer <= 0}
              >
                {option}
              </button>
            ))}
          </div>

          {answerResult && (
            <div>
              {answerResult.isCorrect ? (
                <p>✅ Correct! +{answerResult.scoreEarned} points</p>
              ) : (
                <p>❌ Wrong answer</p>
              )}
            </div>
          )}
        </div>
      )}

      {leaderboard.length > 0 && renderLeaderboard()}
    </div>
  );
}
```

---

### 🔧 Custom React Hooks untuk Socket.io

#### Hook untuk Host/Teacher

```javascript
// hooks/useTeacherSocket.js
import { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";

export function useTeacherSocket(quizId, userId) {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState("waiting"); // waiting, active, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [liveStats, setLiveStats] = useState({ a: 0, b: 0, c: 0, d: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.REACT_APP_SOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
      }
    );

    socketInstance.on("connect", () => {
      socketInstance.emit("create_room", { quizId, userId });
    });

    socketInstance.on("room_created", (data) => {
      setRoomCode(data.roomCode);
    });

    socketInstance.on("player_joined", (data) => {
      setPlayers(data.players);
    });

    socketInstance.on("game:started", () => {
      setGameState("active");
    });

    socketInstance.on("question_start", (data) => {
      setCurrentQuestion(data);
      setLiveStats({ a: 0, b: 0, c: 0, d: 0 });
    });

    socketInstance.on("live_stats", (stats) => {
      setLiveStats(stats);
    });

    socketInstance.on("update_leaderboard", (data) => {
      setLeaderboard(data.leaderboard);
    });

    socketInstance.on("game:ended", () => {
      setGameState("ended");
    });

    socketInstance.on("error_message", (data) => {
      setError(data.msg);
    });

    setSocket(socketInstance);

    return () => socketInstance.close();
  }, [quizId, userId]);

  const startGame = useCallback(() => {
    if (socket && roomCode) {
      socket.emit("start_game", { roomCode });
    }
  }, [socket, roomCode]);

  const nextQuestion = useCallback(() => {
    if (socket && roomCode) {
      socket.emit("game:next", { roomCode });
    }
  }, [socket, roomCode]);

  const endGame = useCallback(() => {
    if (socket && roomCode) {
      socket.emit("game:end", { roomCode });
    }
  }, [socket, roomCode]);

  return {
    socket,
    roomCode,
    players,
    gameState,
    currentQuestion,
    liveStats,
    leaderboard,
    error,
    startGame,
    nextQuestion,
    endGame,
  };
}
```

#### Hook untuk Student

```javascript
// hooks/useStudentSocket.js
import { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";

export function useStudentSocket(roomCode, nickname) {
  const [socket, setSocket] = useState(null);
  const [joined, setJoined] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.REACT_APP_SOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
      }
    );

    socketInstance.on("connect", () => {
      socketInstance.emit("join_room", { roomCode, nickname });
    });

    socketInstance.on("player_joined_success", () => {
      setJoined(true);
    });

    socketInstance.on("game:started", () => {
      setGameStarted(true);
    });

    socketInstance.on("question_start", (data) => {
      setCurrentQuestion(data);
      setAnswerResult(null);
      setTimeRemaining(data.duration);
    });

    socketInstance.on("answer_result", (data) => {
      setAnswerResult(data);
      setScore(data.currentTotal);
    });

    socketInstance.on("update_leaderboard", (data) => {
      setLeaderboard(data.leaderboard);
    });

    socketInstance.on("error_message", (data) => {
      setError(data.msg);
    });

    setSocket(socketInstance);

    return () => socketInstance.close();
  }, [roomCode, nickname]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && gameStarted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, gameStarted]);

  const submitAnswer = useCallback(
    (answerIdx) => {
      if (socket && roomCode && currentQuestion) {
        const timeElapsed = currentQuestion.duration - timeRemaining;
        socket.emit("submit_answer", {
          roomCode,
          answerIdx,
          timeElapsed,
        });
      }
    },
    [socket, roomCode, currentQuestion, timeRemaining]
  );

  return {
    socket,
    joined,
    currentQuestion,
    answerResult,
    score,
    leaderboard,
    timeRemaining,
    gameStarted,
    error,
    submitAnswer,
  };
}
```

---

### 📋 Complete Event Reference

#### Client → Server Events

| Event           | Payload                                                        | Usage                         |
| --------------- | -------------------------------------------------------------- | ----------------------------- |
| `create_room`   | `{ quizId: UUID, userId: UUID }`                               | Teacher creates new room      |
| `join_room`     | `{ roomCode: string, nickname: string }`                       | Student joins room            |
| `start_game`    | `{ roomCode: string }`                                         | Teacher starts game           |
| `submit_answer` | `{ roomCode: string, answerIdx: number, timeElapsed: number }` | Student submits answer        |
| `game:next`     | `{ roomCode: string }`                                         | Teacher goes to next question |
| `game:end`      | `{ roomCode: string }`                                         | Teacher ends game             |

#### Server → Client Events

| Event                   | Payload                                                      | Handler                     |
| ----------------------- | ------------------------------------------------------------ | --------------------------- |
| `room_created`          | `{ roomCode, quizTitle, questionCount }`                     | Show room code to teacher   |
| `player_joined`         | `{ name, totalPlayers, players: [] }`                        | Update player list (all)    |
| `player_joined_success` | `{ status: "OK" }`                                           | Confirm student joined      |
| `game:started`          | `{ questionCount: number }`                                  | Start game UI (all)         |
| `question_start`        | `{ qIndex, qText, imageUrl, options, duration, points }`     | Show question (all)         |
| `answer_result`         | `{ isCorrect, scoreEarned, currentTotal, correctAnswerIdx }` | Show result (student only)  |
| `live_stats`            | `{ a, b, c, d }`                                             | Update chart (teacher only) |
| `question_end`          | `{ correctAnswerIdx }`                                       | Show correct answer (all)   |
| `update_leaderboard`    | `{ leaderboard: [{name, score, rank}] }`                     | Update ranking (all)        |
| `game:ended`            | `{ finalLeaderboard: [] }`                                   | Show final results          |
| `final_results`         | `{ winner, top3: [] }`                                       | Show podium                 |
| `error_message`         | `{ msg: string }`                                            | Show error                  |
| `disconnect`            | -                                                            | Handle disconnection        |

---

### 🛡️ Error Handling Best Practices

```javascript
// Complete error handling example
socket.on("error_message", (data) => {
  switch (data.msg) {
    case "Room tidak ditemukan":
      // Redirect to join page
      navigate("/join");
      break;
    case "Game sudah dimulai":
      // Show message and redirect
      alert("Game sudah dimulai");
      navigate("/");
      break;
    case "Nama sudah dipakai":
      // Prompt for new nickname
      setNickname("");
      alert("Nama sudah digunakan, silakan pilih nama lain");
      break;
    default:
      // Show generic error
      alert(data.msg);
  }
});

// Connection error handling
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  // Show reconnecting UI
  setConnectionStatus("reconnecting");
});

socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    // Server disconnected, need to reconnect manually
    socket.connect();
  }
  // Show disconnected UI
  setConnectionStatus("disconnected");
});
```

---

### 🔄 Reconnection Strategy

```javascript
const socket = io("http://localhost:3001", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 20000,
});

// Store room code for reconnection
let currentRoomCode = null;
let isHost = false;

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  // Rejoin room if was in one
  if (currentRoomCode) {
    if (isHost) {
      // Host can't rejoin, need to recreate room
      console.warn("Host disconnected, room may be closed");
    } else {
      socket.emit("join_room", {
        roomCode: currentRoomCode,
        nickname: savedNickname,
      });
    }
  }
});
```

---

## 🎯 Quick Start Template

```javascript
// Complete template untuk copy-paste
import { useEffect, useState } from "react";
import io from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

function GameComponent() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    // Setup all event listeners here
    socketInstance.on("connect", () => {
      console.log("Connected");
    });

    socketInstance.on("error_message", (data) => {
      console.error("Error:", data.msg);
    });

    setSocket(socketInstance);

    return () => socketInstance.close();
  }, []);

  // Your component logic here
  return <div>Game Component</div>;
}
```
