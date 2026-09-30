const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createStudent,
  getStudents,
  getReportCard,
  getTopStudents,
  getStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

const router = express.Router();
const studentId = param('id').isMongoId().withMessage('Invalid student id');
const optionalEmail = body('email')
  .optional({ values: 'falsy' })
  .isEmail()
  .withMessage('Email must be valid');

router.use(protect);

router.post(
  '/',
  authorize('teacher'),
  [
    body('rollNo').exists({ checkFalsy: true }).withMessage('Roll number is required').trim(),
    body('name').exists({ checkFalsy: true }).withMessage('Name is required').trim().isLength({ max: 60 }).withMessage('Name cannot exceed 60 characters'),
    body('className').exists({ checkFalsy: true }).withMessage('Class name is required').trim(),
    optionalEmail,
    body('section').optional().trim(),
    body('academicYear').optional().trim(),
  ],
  validate,
  createStudent,
);

router.get('/', getStudents);

// Express matches routes top to bottom, so /top must precede /:id.
router.get('/top', authorize('teacher'), getTopStudents);

// Express matches routes top to bottom, so report-card must precede /:id.
router.get('/:id/report-card', [studentId, validate], getReportCard);

router.get('/:id', [studentId, validate], getStudent);

router.put(
  '/:id',
  authorize('teacher'),
  [
    studentId,
    body('rollNo').optional({ values: 'falsy' }).trim(),
    body('name').optional({ values: 'falsy' }).trim().isLength({ max: 60 }).withMessage('Name cannot exceed 60 characters'),
    body('className').optional({ values: 'falsy' }).trim(),
    optionalEmail,
    body('section').optional().trim(),
    body('academicYear').optional().trim(),
  ],
  validate,
  updateStudent,
);

router.delete('/:id', authorize('teacher'), [studentId, validate], deleteStudent);

module.exports = router;
