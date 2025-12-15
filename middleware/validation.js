import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Login validation
export const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Register validation
export const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'TEACHER'])
    .withMessage('Role must be ADMIN or TEACHER'),
  handleValidationErrors
];

// Quiz validation
export const validateQuiz = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('questions.*.question_text').notEmpty().withMessage('Question text is required'),
  body('questions.*.options').isArray({ min: 2, max: 4 }).withMessage('Options must be 2-4 items'),
  body('questions.*.correct_idx').isInt({ min: 0, max: 3 }).withMessage('Correct index must be 0-3'),
  body('questions.*.time_limit').optional().isInt({ min: 5, max: 60 }),
  body('questions.*.points').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
];

