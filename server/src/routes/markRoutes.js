const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createMark,
  getMarks,
  getSubjectAverage,
  getClassSummary,
  getMark,
  updateMark,
  deleteMark,
} = require('../controllers/markController');

const router = express.Router();
const markId = param('id').isMongoId().withMessage('Invalid mark id');
const markFields = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 50 })
    .withMessage('Subject cannot exceed 50 characters'),
  body('score')
    .isFloat({ min: 0 })
    .withMessage('Score must be a number greater than or equal to 0')
    .toFloat(),
  body('maxScore')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('maxScore must be at least 1')
    .toFloat(),
  body('examType')
    .optional()
    .isIn(['unit-test', 'midterm', 'final'])
    .withMessage('Invalid exam type'),
];
const updateMarkFields = [
  body('subject')
    .optional({ values: 'falsy' })
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Subject cannot exceed 50 characters'),
  body('score')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Score must be a number greater than or equal to 0')
    .toFloat(),
  body('maxScore')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('maxScore must be at least 1')
    .toFloat(),
  body('examType')
    .optional()
    .isIn(['unit-test', 'midterm', 'final'])
    .withMessage('Invalid exam type'),
];

router.use(protect);

router.post(
  '/',
  authorize('teacher'),
  [body('student').isMongoId().withMessage('Invalid student id'), ...markFields],
  validate,
  createMark,
);

router.get('/', getMarks);

// Express matches routes top to bottom, so class-summary must precede /:id.
router.get('/class-summary', authorize('teacher'), getClassSummary);

// Express matches routes top to bottom, so subject/:id/average must precede /:id.
router.get('/subject/:id/average', authorize('teacher'), getSubjectAverage);

router.get('/:id', [markId, validate], getMark);

router.put(
  '/:id',
  authorize('teacher'),
  [markId, ...updateMarkFields],
  validate,
  updateMark,
);

router.delete('/:id', authorize('teacher'), [markId, validate], deleteMark);

module.exports = router;
