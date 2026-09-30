const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('name')
      .exists({ checkFalsy: true })
      .withMessage('Name is required')
      .bail()
      .isLength({ min: 2, max: 60 })
      .withMessage('Name must be between 2 and 60 characters')
      .trim(),
    body('email')
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['teacher', 'student'])
      .withMessage('Role must be teacher or student'),
  ],
  validate,
  register,
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  login,
);

router.get('/me', protect, getMe);

module.exports = router;
