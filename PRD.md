# Product Requirement Document (PRD) 03: Integration & Socket Events

**Focus:** Protokol Komunikasi Frontend-Backend  
**Protocol:** WebSocket (Socket.io v4)  
**Namespace:** `/` (Default)

---

## 1. Alur Koneksi & Autentikasi Socket

### Handshake Process
1. **Handshake:** Frontend melakukan koneksi ke Backend
2. **Join Room:**
   - Frontend mengirim event `join_room`
   - Backend memvalidasi Kode Room
   - Jika valid → Socket ID dimasukkan ke Room
   - Jika tidak valid → Backend kirim error event

---

## 2. Kamus Event (Event Dictionary)

### A. Fase Lobby (Persiapan)

| Event Name              | Arah              | Payload (JSON)                                      | Deskripsi                                |
|-------------------------|-------------------|-----------------------------------------------------|------------------------------------------|
| `create_room`           | FE(Guru) → BE     | `{ quizId: "uuid", userId: "uuid" }`                | Guru membuat room baru                   |
| `room_created`          | BE → FE(Guru)     | `{ roomCode: "XY123" }`                             | Server membalas dengan Kode Unik         |
| `join_room`             | FE(Siswa) → BE    | `{ roomCode: "XY123", nickname: "Budi" }`           | Siswa mencoba masuk                      |
| `player_joined`         | BE → FE(Guru)     | `{ name: "Budi", totalPlayers: 1 }`                 | Update list nama di layar Guru           |
| `player_joined_success` | BE → FE(Siswa)    | `{ status: "OK" }`                                  | Konfirmasi siswa berhasil masuk lobby    |

---

### B. Fase Game Loop (Inti Permainan)

| Event Name       | Arah            | Payload (JSON)                                                                      | Deskripsi                                                    |
|------------------|-----------------|------------------------------------------------------------------------------------|--------------------------------------------------------------|
| `start_game`     | FE(Guru) → BE   | `{ roomCode: "XY123" }`                                                            | Guru menekan tombol Start                                    |
| `question_start` | BE → All        | `{ qText: "...", options: ["A","B"..], duration: 15, qIndex: 1 }`                  | **CRITICAL:** Broadcast soal ke semua HP siswa. Timer dimulai di Server |
| `submit_answer`  | FE(Siswa) → BE  | `{ roomCode: "...", answerIdx: 0, timeElapsed: 4.5 }`                              | Siswa mengirim jawaban                                       |
| `answer_result`  | BE → FE(Siswa)  | `{ isCorrect: true, scoreEarned: 20, currentTotal: 100 }`                          | Feedback pribadi ke HP siswa (Private Emit)                  |
| `live_stats`     | BE → FE(Guru)   | `{ a: 5, b: 2, c: 0, d: 1 }`                                                       | Update grafik batang di layar Guru (Realtime)                |

---

### C. Fase Hasil & Leaderboard

| Event Name           | Arah            | Payload (JSON)                                        | Deskripsi                                      |
|----------------------|-----------------|-------------------------------------------------------|------------------------------------------------|
| `question_end`       | BE → All        | `{ correctAnswerIdx: 0 }`                             | Waktu habis. Tampilkan jawaban benar di layar semua orang |
| `update_leaderboard` | BE → All        | `[{name:"Budi", score:100, rank:1}, ...]`             | Kirim array klasemen terbaru                   |
| `game_over`          | FE(Guru) → BE   | `{ roomCode: "XY123" }`                               | Guru mengakhiri sesi                           |
| `final_results`      | BE → All        | `{ winner: "Budi", top3: [...] }`                     | Layar podium akhir                             |

---

## 3. Skenario Integrasi "Leaderboard View"

Untuk menghemat bandwidth dan kinerja rendering, logika tampilan ranking dibagi tugasnya:

### Tugas Backend:
1. Setiap kali soal selesai (`question_end`), Backend melakukan `.sort()` pada array pemain berdasarkan skor (Descending)
2. Backend mengirim SELURUH array (atau maksimal 50 besar) ke Frontend via event `update_leaderboard`

### Tugas Frontend (Siswa):
1. Menerima Array `leaderboard`
2. Mencari index nama sendiri (misal: index 16 = Rank 17)
3. **Rendering Logic:**
   - Render Index 0-4 (Top 5)
   - Jika User Rank > 5, render komponen "Divider" (...) lalu render User Rank di bawahnya
   - Jika User Rank ≤ 5, user sudah terlihat di daftar Top 5, tidak perlu render baris tambahan

### Contoh Implementasi (Pseudocode):
```javascript
function renderLeaderboard(leaderboard, currentUserName) {
  const userIndex = leaderboard.findIndex(p => p.name === currentUserName);
  const userRank = userIndex + 1;
  
  // Always show top 5
  const top5 = leaderboard.slice(0, 5);
  
  // If user is not in top 5, show them separately
  if (userRank > 5) {
    return {
      topPlayers: top5,
      showDivider: true,
      currentUser: {
        ...leaderboard[userIndex],
        rank: userRank
      }
    };
  }
  
  // User is already in top 5
  return {
    topPlayers: top5,
    showDivider: false,
    currentUser: null
  };
}
```

---

## 4. Error Handling Protocol

### Common Error Events

| Error Scenario       | Event Name      | Payload                                  | Frontend Action                      |
|----------------------|-----------------|------------------------------------------|--------------------------------------|
| Room Not Found       | `error_message` | `{ msg: "Room tidak ditemukan" }`        | Tampilkan alert merah                |
| Duplicate Nickname   | `error_message` | `{ msg: "Nama sudah dipakai" }`          | Minta input nama lain                |
| Game Already Started | `error_message` | `{ msg: "Game sudah dimulai" }`          | Redirect ke landing page             |
| Invalid Answer       | `error_message` | `{ msg: "Jawaban tidak valid" }`         | Log error, jangan tampilkan ke user  |
| Connection Lost      | `disconnect`    | -                                        | Tampilkan "Reconnecting..." overlay  |

---

## 5. Connection Lifecycle

### Client-Side Connection Management
```javascript
// Initial Connection
const socket = io('https://api.example.com', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Connection Events
socket.on('connect', () => {
  console.log('Connected with ID:', socket.id);
  // Rejoin room if disconnected during game
  if (currentRoomCode) {
    socket.emit('rejoin_room', { roomCode: currentRoomCode });
  }
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Show reconnecting UI
  showReconnectingOverlay();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Show error message after max attempts
});
```

---

## 6. Rate Limiting & Spam Prevention

### Server-Side Protection

| Action              | Rate Limit        | Consequence              |
|---------------------|-------------------|--------------------------|
| `submit_answer`     | 1 per question    | Ignore subsequent        |
| `join_room`         | 5 per minute      | Temporary IP block       |
| `create_room`       | 10 per hour       | Error response           |

### Client-Side Debouncing

- Disable submit button setelah answer dikirim
- Debounce input fields (300ms) sebelum emit
- Lock UI controls selama waiting for server response

---

## 7. Data Payload Examples

### Complete Flow Example

#### 1. Teacher Creates Room
```json
// Client → Server
{
  "event": "create_room",
  "data": {
    "quizId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "teacher-uuid"
  }
}

// Server → Client
{
  "event": "room_created",
  "data": {
    "roomCode": "ABC123",
    "quizTitle": "Math Quiz Chapter 5",
    "questionCount": 10
  }
}
```

#### 2. Student Joins
```json
// Client → Server
{
  "event": "join_room",
  "data": {
    "roomCode": "ABC123",
    "nickname": "Ahmad"
  }
}

// Server → All in Room
{
  "event": "player_joined",
  "data": {
    "name": "Ahmad",
    "totalPlayers": 5,
    "players": ["Budi", "Citra", "Dini", "Eko", "Ahmad"]
  }
}
```

#### 3. Game Starts
```json
// Server → All
{
  "event": "question_start",
  "data": {
    "qIndex": 1,
    "qText": "Berapakah hasil dari 2 + 2?",
    "imageUrl": null,
    "options": ["3", "4", "5", "6"],
    "duration": 15,
    "points": 20
  }
}
```

#### 4. Student Answers
```json
// Client → Server
{
  "event": "submit_answer",
  "data": {
    "roomCode": "ABC123",
    "answerIdx": 1,
    "timeElapsed": 3.2,
    "clientTimestamp": 1702656789123
  }
}

// Server → Individual Student
{
  "event": "answer_result",
  "data": {
    "isCorrect": true,
    "scoreEarned": 20,
    "currentTotal": 80,
    "correctAnswerIdx": 1
  }
}
```

#### 5. Leaderboard Update
```json
// Server → All
{
  "event": "update_leaderboard",
  "data": {
    "leaderboard": [
      { "name": "Ahmad", "score": 80, "rank": 1 },
      { "name": "Budi", "score": 75, "rank": 2 },
      { "name": "Citra", "score": 70, "rank": 3 },
      { "name": "Dini", "score": 65, "rank": 4 },
      { "name": "Eko", "score": 60, "rank": 5 }
    ]
  }
}
```

---

## 8. Testing Checklist

### Unit Tests
- ✅ Room creation and validation
- ✅ Player join logic
- ✅ Answer validation and scoring
- ✅ Leaderboard sorting

### Integration Tests
- ✅ Complete game flow (lobby → game → results)
- ✅ Multiple simultaneous rooms
- ✅ Disconnection and reconnection
- ✅ Edge cases (empty answers, late submissions)

### Load Tests
- ✅ 100 concurrent players in single room
- ✅ 10 simultaneous rooms
- ✅ Network latency simulation (100ms, 500ms, 1000ms)

---

## 9. Monitoring & Debugging

### Server-Side Logging
```javascript
// Log all socket events with metadata
socket.onAny((eventName, ...args) => {
  logger.info({
    event: eventName,
    socketId: socket.id,
    roomCode: socket.roomCode,
    timestamp: Date.now(),
    data: args
  });
});
```

### Client-Side Debugging
```javascript
// Enable debug mode for Socket.io
localStorage.debug = 'socket.io-client:*';

// Custom event logger
socket.onAny((event, data) => {
  console.log(`[Socket Event] ${event}:`, data);
});
```

---

## Catatan Implementasi

### Best Practices
1. **Always validate room codes** sebelum emit events
2. **Use TypeScript interfaces** untuk payload validation
3. **Implement exponential backoff** untuk reconnection
4. **Cache leaderboard data** untuk mengurangi re-renders
5. **Sanitize user input** (nicknames) untuk mencegah XSS

### Common Pitfalls
- ❌ Mengirim jawaban benar ke client sebelum question_end
- ❌ Tidak handle disconnection saat game berlangsung
- ❌ Re-render entire leaderboard setiap update
- ❌ Tidak validate answer index range (0-3)
- ❌ Hardcode room codes untuk testing di production

---

**Last Updated:** December 2024  
**Document Version:** 1.0