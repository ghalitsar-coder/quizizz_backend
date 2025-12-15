# API Testing Guide dengan cURL

Panduan lengkap untuk test semua API endpoints menggunakan cURL.

## Prerequisites

- cURL installed
- Server berjalan di `http://localhost:3001`
- User sudah register (atau akan register)

---

## 1. Authentication Endpoints

### 1.1 Register User

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123",
    "role": "TEACHER"
  }'
```

**Response Sukses (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "teacher@example.com",
    "role": "TEACHER"
  },
  "token": "jwt-token-here"
}
```

**Simpan token untuk request berikutnya!**

**Error (400) - Email sudah terdaftar:**
```json
{
  "error": "Email already registered"
}
```

---

### 1.2 Login User

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

**Response Sukses (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "teacher@example.com",
    "role": "TEACHER"
  },
  "token": "jwt-token-here"
}
```

**Error (401) - Credentials salah:**
```json
{
  "error": "Invalid email or password"
}
```

---

## 2. Quiz Management Endpoints

**Catatan:** Semua endpoint di bawah ini memerlukan Authentication token di header.

**Format header:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### 2.1 Get All Quizzes

**Endpoint:** `GET /api/quizzes`

```bash
# Ganti YOUR_TOKEN dengan token yang didapat dari login/register
curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Sukses (200):**
```json
[
  {
    "id": "quiz-uuid-1",
    "title": "Math Quiz Chapter 5",
    "description": "Quiz tentang aljabar",
    "created_at": "2024-12-01T10:00:00Z",
    "questions": [
      {
        "id": "question-uuid-1",
        "question_text": "Berapakah hasil dari 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "time_limit": 15,
        "points": 20
      }
    ]
  }
]
```

**Error (401) - Unauthorized:**
```json
{
  "error": "Access token required"
}
```

---

### 2.2 Get Quiz by ID

**Endpoint:** `GET /api/quizzes/:id`

```bash
# Ganti QUIZ_ID dengan ID quiz yang ingin dilihat
curl -X GET http://localhost:3001/api/quizzes/QUIZ_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Sukses (200):**
```json
{
  "id": "quiz-uuid",
  "title": "Math Quiz Chapter 5",
  "description": "Quiz tentang aljabar",
  "teacher_id": "teacher-uuid",
  "created_at": "2024-12-01T10:00:00Z",
  "questions": [
    {
      "id": "question-uuid-1",
      "question_text": "Berapakah hasil dari 2 + 2?",
      "image_url": null,
      "options": ["3", "4", "5", "6"],
      "correct_idx": 1,
      "time_limit": 15,
      "points": 20
    },
    {
      "id": "question-uuid-2",
      "question_text": "Berapakah hasil dari 5 * 3?",
      "image_url": null,
      "options": ["10", "15", "20", "25"],
      "correct_idx": 1,
      "time_limit": 20,
      "points": 25
    }
  ]
}
```

**Error (404) - Quiz tidak ditemukan:**
```json
{
  "error": "Quiz not found"
}
```

---

### 2.3 Create New Quiz

**Endpoint:** `POST /api/quizzes`

```bash
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Math Quiz Chapter 5",
    "description": "Quiz tentang aljabar dasar",
    "questions": [
      {
        "question_text": "Berapakah hasil dari 2 + 2?",
        "image_url": null,
        "options": ["3", "4", "5", "6"],
        "correct_idx": 1,
        "time_limit": 15,
        "points": 20
      },
      {
        "question_text": "Berapakah hasil dari 5 * 3?",
        "image_url": null,
        "options": ["10", "15", "20", "25"],
        "correct_idx": 1,
        "time_limit": 20,
        "points": 25
      },
      {
        "question_text": "Apa hasil dari 10 / 2?",
        "image_url": null,
        "options": ["3", "4", "5", "6"],
        "correct_idx": 2,
        "time_limit": 15,
        "points": 20
      }
    ]
  }'
```

**Response Sukses (201):**
```json
{
  "id": "new-quiz-uuid",
  "teacher_id": "teacher-uuid",
  "title": "Math Quiz Chapter 5",
  "description": "Quiz tentang aljabar dasar",
  "created_at": "2024-12-01T10:00:00Z",
  "questions": [
    {
      "id": "new-question-uuid-1",
      "quiz_id": "new-quiz-uuid",
      "question_text": "Berapakah hasil dari 2 + 2?",
      "image_url": null,
      "options": ["3", "4", "5", "6"],
      "correct_idx": 1,
      "time_limit": 15,
      "points": 20
    }
    // ... more questions
  ]
}
```

**Error (400) - Validation Error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Title is required",
      "param": "title",
      "location": "body"
    }
  ]
}
```

---

## 3. Complete Testing Flow

Berikut adalah script lengkap untuk test semua endpoints secara berurutan:

### Step 1: Register User

```bash
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_teacher@example.com",
    "password": "password123",
    "role": "TEACHER"
  }')

echo "Register Response: $REGISTER_RESPONSE"

# Extract token (requires jq or manual extraction)
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"
```

### Step 2: Create Quiz

```bash
CREATE_QUIZ_RESPONSE=$(curl -s -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Quiz",
    "description": "Quiz untuk testing API",
    "questions": [
      {
        "question_text": "Test Question 1?",
        "options": ["A", "B", "C", "D"],
        "correct_idx": 0,
        "time_limit": 15,
        "points": 20
      }
    ]
  }')

echo "Create Quiz Response: $CREATE_QUIZ_RESPONSE"

# Extract quiz ID
QUIZ_ID=$(echo $CREATE_QUIZ_RESPONSE | jq -r '.id')
echo "Quiz ID: $QUIZ_ID"
```

### Step 3: Get All Quizzes

```bash
curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Step 4: Get Quiz by ID

```bash
curl -X GET http://localhost:3001/api/quizzes/$QUIZ_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 4. Error Testing

### Test Invalid Token

```bash
curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response (403):**
```json
{
  "error": "Invalid or expired token"
}
```

### Test Missing Token

```bash
curl -X GET http://localhost:3001/api/quizzes
```

**Expected Response (401):**
```json
{
  "error": "Access token required"
}
```

### Test Validation Error

```bash
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "",
    "questions": []
  }'
```

**Expected Response (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Title is required",
      "param": "title",
      "location": "body"
    },
    {
      "msg": "At least one question is required",
      "param": "questions",
      "location": "body"
    }
  ]
}
```

---

## 5. Health Check

**Endpoint:** `GET /health`

```bash
curl -X GET http://localhost:3001/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T10:00:00.000Z"
}
```

---

## 6. Tips & Tricks

### 1. Pretty Print JSON Response

Install `jq` untuk format JSON yang lebih rapi:
```bash
curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 2. Save Response ke File

```bash
curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer $TOKEN" > response.json
```

### 3. Verbose Mode (lihat request details)

```bash
curl -v -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test dengan File JSON

Buat file `quiz.json`:
```json
{
  "title": "Test Quiz",
  "description": "Quiz untuk testing",
  "questions": [
    {
      "question_text": "Test Question?",
      "options": ["A", "B", "C", "D"],
      "correct_idx": 0,
      "time_limit": 15,
      "points": 20
    }
  ]
}
```

Kemudian:
```bash
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @quiz.json
```

---

## 7. Testing Socket.io Events

**Catatan:** Socket.io tidak bisa di-test langsung dengan cURL karena menggunakan WebSocket protocol.

**Alternatif untuk test Socket.io:**

1. **Gunakan Postman** (Support WebSocket)
2. **Gunakan Socket.io Client di Node.js:**
   ```javascript
   import io from 'socket.io-client';
   
   const socket = io('http://localhost:3001');
   
   socket.on('connect', () => {
     console.log('Connected:', socket.id);
     
     socket.emit('create_room', {
       quizId: 'your-quiz-id',
       userId: 'your-user-id'
     });
   });
   
   socket.on('room_created', (data) => {
     console.log('Room created:', data);
   });
   ```

3. **Gunakan Browser Console:**
   ```javascript
   const socket = io('http://localhost:3001');
   socket.on('connect', () => console.log('Connected'));
   socket.emit('create_room', { quizId: 'xxx', userId: 'yyy' });
   ```

---

## 8. Quick Test Script

Buat file `test_api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
EMAIL="test@example.com"
PASSWORD="password123"

echo "=== 1. Register User ==="
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"TEACHER\"}")

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

echo -e "\n=== 2. Create Quiz ==="
QUIZ_RESPONSE=$(curl -s -X POST $BASE_URL/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Quiz",
    "questions": [{
      "question_text": "Test?",
      "options": ["A", "B", "C", "D"],
      "correct_idx": 0
    }]
  }')

QUIZ_ID=$(echo $QUIZ_RESPONSE | jq -r '.id')
echo "Quiz ID: $QUIZ_ID"

echo -e "\n=== 3. Get All Quizzes ==="
curl -s -X GET $BASE_URL/api/quizzes \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== 4. Get Quiz by ID ==="
curl -s -X GET $BASE_URL/api/quizzes/$QUIZ_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== Test Complete ==="
```

Jalankan:
```bash
chmod +x test_api.sh
./test_api.sh
```

---

## Summary

✅ **Bisa di-test dengan cURL:**
- ✅ POST /api/auth/register
- ✅ POST /api/auth/login
- ✅ GET /api/quizzes
- ✅ GET /api/quizzes/:id
- ✅ POST /api/quizzes
- ✅ GET /health

❌ **Tidak bisa di-test dengan cURL (perlu WebSocket client):**
- ❌ Socket.io events (create_room, join_room, start_game, dll)

Untuk test Socket.io, gunakan Postman, browser console, atau Socket.io client library.

