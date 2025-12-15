import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { validateQuiz } from "../middleware/validation.js";
import {
  getQuizzesByTeacher,
  getQuizById,
  createQuiz,
} from "../services/quizService.js";
import { logger } from "../config/logger.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireRole("TEACHER", "ADMIN"));

/**
 * GET /api/quizzes
 * Get all quizzes for the authenticated teacher
 */
router.get("/", async (req, res) => {
  try {
    const quizzes = await getQuizzesByTeacher(req.user.id);
    res.json(quizzes);
  } catch (error) {
    logger.error("Get quizzes endpoint error", {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});

/**
 * GET /api/quizzes/:id
 * Get quiz details by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const quiz = await getQuizById(req.params.id, req.user.id);
    res.json(quiz);
  } catch (error) {
    logger.error("Get quiz endpoint error", {
      error: error.message,
      quizId: req.params.id,
    });
    if (error.message === "Quiz not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
});

/**
 * POST /api/quizzes
 * Create a new quiz with questions
 */
router.post("/", validateQuiz, async (req, res) => {
  try {
    const quiz = await createQuiz(req.user.id, req.body);
    res.status(201).json(quiz);
  } catch (error) {
    logger.error("Create quiz endpoint error", {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

export default router;
