import express from "express";
import { registerUser, loginUser } from "../services/authService.js";
import { validateLogin, validateRegister } from "../middleware/validation.js";
import { logger } from "../config/logger.js";

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new teacher/admin
 */
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const result = await registerUser(email, password, role);
    
    // Set token as HTTP-only cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Also send in response body (for clients that prefer it)
    res.status(201).json(result);
  } catch (error) {
    logger.error("Register endpoint error", { error: error.message });
    if (error.message === "Email already registered") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    
    // Set token as HTTP-only cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Also send in response body (for clients that prefer it)
    res.json(result);
  } catch (error) {
    logger.error("Login endpoint error", { error: error.message });
    if (error.message === "Invalid email or password") {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (clear cookie)
 */
router.post("/logout", (req, res) => {
  // Clear auth_token cookie
  res.cookie('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // Immediately expire
  });
  
  res.json({ message: 'Logged out successfully' });
});

export default router;
