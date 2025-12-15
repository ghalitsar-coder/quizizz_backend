# Backend Changes Summary - Frontend Integration Updates

**Date:** December 15, 2025  
**Status:** ✅ Implemented Critical Changes

---

## ✅ Changes Implemented

### 1. Added `quizId` to `game:started` Event

**File:** `socket/gameHandler.js` line 200-202

**Before:**

```javascript
io.to(roomCode).emit("game:started", {
  questionCount: room.quizData.questions.length,
});
```

**After:**

```javascript
io.to(roomCode).emit("game:started", {
  questionCount: room.quizData.questions.length,
  quizId: room.quizId, // ✅ Added
});
```

**Impact:**

- Frontend can now fetch quiz metadata if needed
- Enables offline/caching strategies
- Backward compatible (frontend can ignore if not needed)

---

### 2. Added Quiz Metadata to `player_joined_success` Event

**File:** `socket/gameHandler.js` line 137

**Before:**

```javascript
socket.emit("player_joined_success", { status: "OK" });
```

**After:**

```javascript
socket.emit("player_joined_success", {
  status: "OK",
  quizTitle: room.quizData.title, // ✅ Added
  questionCount: room.quizData.questions.length, // ✅ Added
});
```

**Impact:**

- Students can see quiz title and question count in lobby
- Better UX - no need to wait until game starts
- Frontend can display quiz info immediately

---

## 📋 Documented Answers (No Code Changes Needed)

### 3. Answer Submission Timing - **Clarified**

**Finding:**

- ✅ Backend uses **server-side time calculation** for security
- ✅ Validates `timeElapsed <= duration + 2s`
- ✅ Returns error `"Submission too late"` if exceeded
- ✅ Server recalculates time from `questionStartTime`

**Location:** `models/Room.js` line 99-102

**No changes needed** - implementation is correct and secure.

---

### 4. Host Disconnect Behavior - **Documented**

**Current Implementation:**

- Room auto-closes 5 seconds after host disconnect
- Game ends immediately
- All players receive `error_message: "Host disconnected"`
- Room is deleted after 5 seconds

**Location:** `socket/gameHandler.js` line 415-424

**No changes needed** - behavior is intentional.

---

### 5. Timer Synchronization - **Documented**

**Current Implementation:**

- Backend schedules `question_end` event via `setTimeout`
- Emitted after `duration + 2` seconds
- Frontend should listen to `question_end` to stop timer

**Location:** `socket/gameHandler.js` line 440-456

**Frontend Action Required:**

- Listen to `question_end` event
- Force timer to 0 when received
- Disable answer submission

**No backend changes needed** - current implementation is correct.

---

### 6. Live Stats Update Frequency - **Documented**

**Current Implementation:**

- Emitted after each answer submission
- Sent to host only (`room.hostSocketId`)
- Not throttled (can be up to 50 events per question for 50 students)

**Location:** `socket/gameHandler.js` line 281-282

**Performance Note:**

- Works fine for <50 students
- Consider throttling for larger rooms (future enhancement)

**No immediate changes needed** - acceptable for current scale.

---

## 📚 Complete Error Messages Documentation

All error messages that can be emitted by backend:

### Room Errors

- `"Room tidak ditemukan"` - Room not found
- `"Invalid room code format"` - Room code not 6 alphanumeric characters
- `"Game sudah dimulai"` - Game already started, cannot join

### Player Errors

- `"Nickname is required"` - Empty nickname
- `"Nama sudah dipakai"` - Duplicate nickname (from Room.addPlayer)

### Quiz Errors

- `"Quiz not found"` - Quiz ID not found in database
- `"Invalid Quiz ID format. ... Please use a valid UUID."` - Non-UUID quizId
- `"Invalid User ID format. ... Please use a valid UUID."` - Non-UUID userId
- `"No questions in quiz"` - Quiz has no questions

### Game Control Errors

- `"Only host can start the game"` - Non-host tries to start
- `"Game already started"` - Attempt to start already active game
- `"No players in room"` - Start game with 0 players
- `"Only host can control game"` - Non-host tries game:next
- `"Only host can end game"` - Non-host tries game:end

### Answer Submission Errors

- `"Game is not active"` - Submit when game not active
- `"No active question"` - Submit between questions
- `"Answer already submitted for this question"` - Double submission
- `"Invalid answer index"` - answerIdx out of range
- `"Submission too late"` - timeElapsed > duration + 2s

### Connection Errors

- `"Host disconnected"` - Host socket disconnected (broadcast to all)

### Generic Errors

- `"Failed to create room"` - Server error during room creation
- `"Failed to join room"` - Server error during join
- `"Failed to start game"` - Server error during game start
- `"Failed to submit answer"` - Server error during answer submission
- `"Failed to move to next question"` - Server error during next question
- `"Failed to end game"` - Server error during game end

---

## 🔄 Event Payload Changes

### Updated Events

#### `game:started`

```typescript
// Before
{ questionCount: number }

// After
{
  questionCount: number,
  quizId: string  // ✅ NEW
}
```

#### `player_joined_success`

```typescript
// Before
{ status: "OK" }

// After
{
  status: "OK",
  quizTitle: string,      // ✅ NEW
  questionCount: number   // ✅ NEW
}
```

### Unchanged Events (Confirmed Working)

- `room_created` - ✅ No changes
- `player_joined` - ✅ No changes
- `question_start` - ✅ No changes
- `answer_result` - ✅ No changes
- `live_stats` - ✅ No changes
- `question_end` - ✅ No changes
- `update_leaderboard` - ✅ No changes
- `game:ended` - ✅ No changes
- `final_results` - ✅ No changes

---

## 🧪 Testing Checklist

### Test Cases for New Features

1. **Test `game:started` with quizId**

   - [ ] Verify `quizId` is included in payload
   - [ ] Verify `quizId` matches actual quiz ID
   - [ ] Verify frontend can use `quizId` to fetch metadata

2. **Test `player_joined_success` with metadata**

   - [ ] Verify `quizTitle` is included
   - [ ] Verify `questionCount` is correct
   - [ ] Verify frontend displays quiz info in lobby

3. **Test Error Messages**
   - [ ] Verify all error messages are properly formatted
   - [ ] Verify error messages are user-friendly
   - [ ] Verify frontend can handle all error cases

---

## 📖 Frontend Integration Guide

### Required Frontend Updates

#### 1. Update `game:started` Handler

```typescript
socket.on("game:started", (data) => {
  // data now includes quizId
  console.log("Game started:", data.questionCount, "questions");
  console.log("Quiz ID:", data.quizId); // ✅ Available now

  // Optional: Fetch quiz metadata if needed
  // fetchQuizMetadata(data.quizId);
});
```

#### 2. Update `player_joined_success` Handler

```typescript
socket.on("player_joined_success", (data) => {
  // data now includes quizTitle and questionCount
  setJoined(true);
  setQuizTitle(data.quizTitle); // ✅ Available now
  setQuestionCount(data.questionCount); // ✅ Available now

  // Display in lobby UI
});
```

#### 3. Use `question_end` for Timer Sync

```typescript
socket.on("question_end", (data) => {
  // Force timer to 0 when server says time is up
  setQuestionTimer(0);
  disableAnswerSubmission();
  highlightCorrectAnswer(data.correctAnswerIdx);
});
```

---

## 🔮 Future Enhancements (Not Implemented)

### Low Priority

1. **Rejoin Support**

   - Allow students to rejoin mid-game
   - Send current game state on rejoin
   - Track missed questions

2. **Live Stats Throttling**

   - Throttle to max 3 updates per second
   - Batch updates for smoother UI

3. **Periodic Time Sync**

   - Send `time_sync` event every 5 seconds
   - Sync client timer with server

4. **REST Endpoint for Room Info**
   - `GET /api/rooms/:roomCode`
   - Public quiz info without joining

---

## 📝 Migration Notes

### Breaking Changes

- ❌ **None** - All changes are backward compatible
- All new fields are additions, not replacements

### Compatibility

- ✅ Frontend using old payload structure will still work
- ✅ Frontend can ignore new fields if not needed
- ✅ Gradual migration possible

### Deprecation

- None at this time
- All current events remain supported

---

**Last Updated:** December 15, 2025  
**Version:** 1.1.0
