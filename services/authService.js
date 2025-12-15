import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { logger } from '../config/logger.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Register a new user (teacher/admin)
 */
export async function registerUser(email, password, role = 'TEACHER') {
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        role: role.toUpperCase()
      })
      .select()
      .single();

    if (error) {
      logger.error('Database error during registration', { error: error.message });
      throw new Error('Registration failed');
    }

    // Generate JWT
    const token = jwt.sign(
      { id: data.id, email: data.email, role: data.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: data.id,
        email: data.email,
        role: data.role
      },
      token
    };
  } catch (err) {
    logger.error('Registration error', { error: err.message, email });
    throw err;
  }
}

/**
 * Login user
 */
export async function loginUser(email, password) {
  try {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      token
    };
  } catch (err) {
    logger.error('Login error', { error: err.message, email });
    throw err;
  }
}

