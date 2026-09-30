const mongoose = require('mongoose');
const Mark = require('../models/Mark');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildMeta } = require('../utils/paginate');
const { getGrade, round2, PASS_PERCENTAGE } = require('../utils/grade');

const markFields = ['subject', 'score', 'maxScore', 'examType'];

function subjectPattern(subject) {
  return new RegExp(`^${escapeRegex(subject)}$`, 'i');
}

function pickMarkFields(source) {
  return Object.fromEntries(
    markFields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
}

function populateStudent(query) {
  return query.populate('student', 'name rollNo className section');
}

const createMark = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.body.student);
  if (!student) {
    return next(new ApiError(404, 'Student not found'));
  }

  const duplicate = await Mark.findOne({
    student: student._id,
    subject: subjectPattern(req.body.subject),
    examType: req.body.examType || 'final',
  });
  if (duplicate) {
    return next(new ApiError(409, 'A mark for this student, subject and exam already exists'));
  }

  const data = pickMarkFields(req.body);
  data.student = student._id;
  data.createdBy = req.user._id;

  try {
    const mark = await Mark.create(data);
    const populatedMark = await Mark.findById(mark._id).populate(
      'student',
      'name rollNo className section',
    );
    return res.status(201).json({ success: true, data: populatedMark });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'A mark for this student, subject and exam already exists'));
    }
    return next(error);
  }
});

const getMarks = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const query = {};

  if (req.query.student) {
    if (!mongoose.isValidObjectId(req.query.student)) {
      return next(new ApiError(400, 'Invalid student id'));
    }
    query.student = req.query.student;
  }
  if (req.query.subject) {
    query.subject = new RegExp(escapeRegex(req.query.subject), 'i');
  }
  if (req.query.examType) query.examType = req.query.examType;

  if (req.query.className) {
    const students = await Student.find({ className: req.query.className })
      .select('_id')
      .lean();
    const studentIds = students.map((student) => student._id);
    query.student = query.student
      ? { $in: studentIds.filter((studentId) => String(studentId) === String(req.query.student)) }
      : { $in: studentIds };
  }

  if (req.user.role === 'student') {
    if (!req.user.studentProfile) {
      return next(new ApiError(403, 'Student account is not linked to a student record'));
    }
    query.student = req.user.studentProfile;
  }

  const [data, total] = await Promise.all([
    populateStudent(Mark.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Mark.countDocuments(query),
  ]);

  return res.json({
    success: true,
    count: data.length,
    meta: buildMeta(total, page, limit),
    data,
  });
});

const getSubjectAverage = asyncHandler(async (req, res) => {
  const subject = decodeURIComponent(req.params.id);
  const match = { subject: new RegExp(`^${escapeRegex(subject)}$`, 'i') };
  if (req.query.examType) match.examType = req.query.examType;

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
  ];
  if (req.query.className) {
    pipeline.push({ $match: { 'student.className': req.query.className } });
  }
  pipeline.push({
    $facet: {
      metrics: [
        {
          $group: {
            _id: null,
            studentCount: { $sum: 1 },
            obtainedMarks: { $sum: '$score' },
            totalMarks: { $sum: '$maxScore' },
            averageScore: { $avg: '$score' },
            averagePercentage: {
              $avg: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] },
            },
            highestScore: { $max: '$score' },
            lowestScore: { $min: '$score' },
          },
        },
      ],
      passes: [
        {
          $match: {
            // `$expr` applies the pass threshold to each row's own maxScore.
            $expr: {
              $gte: [
                { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] },
                PASS_PERCENTAGE,
              ],
            },
          },
        },
        { $count: 'count' },
      ],
    },
  });

  const [result] = await Mark.aggregate(pipeline);
  const metrics = result.metrics[0];
  const studentCount = metrics ? metrics.studentCount : 0;
  const passCount = result.passes[0] ? result.passes[0].count : 0;
  const averagePercentage = metrics ? round2(metrics.averagePercentage) : 0;

  return res.json({
    success: true,
    data: {
      subject,
      examType: req.query.examType || 'all',
      className: req.query.className || 'all',
      studentCount,
      obtainedMarks: metrics ? metrics.obtainedMarks : 0,
      totalMarks: metrics ? metrics.totalMarks : 0,
      averageScore: metrics ? round2(metrics.averageScore) : 0,
      averagePercentage,
      highestScore: metrics ? metrics.highestScore : 0,
      lowestScore: metrics ? metrics.lowestScore : 0,
      passCount,
      failCount: studentCount - passCount,
      passPercentage: studentCount ? round2((passCount / studentCount) * 100) : 0,
      grade: metrics ? getGrade(averagePercentage) : 'N/A',
    },
  });
});

const getClassSummary = asyncHandler(async (req, res) => {
  const pipeline = [
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
  ];
  if (req.query.className) {
    pipeline.push({ $match: { 'student.className': req.query.className } });
  }

  pipeline.push(
    // Grouping raw marks directly would weight students with more subjects more heavily.
    {
      $group: {
        _id: { className: '$student.className', studentId: '$student._id' },
        obtainedMarks: { $sum: '$score' },
        totalMarks: { $sum: '$maxScore' },
        totalSubjectEntries: { $sum: 1 },
      },
    },
    {
      $addFields: {
        percentage: {
          $cond: [
            { $gt: ['$totalMarks', 0] },
            { $multiply: [{ $divide: ['$obtainedMarks', '$totalMarks'] }, 100] },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$_id.className',
        studentCount: { $sum: 1 },
        totalSubjectEntries: { $sum: '$totalSubjectEntries' },
        averagePercentage: { $avg: '$percentage' },
        highestPercentage: { $max: '$percentage' },
        lowestPercentage: { $min: '$percentage' },
        passCount: {
          $sum: { $cond: [{ $gte: ['$percentage', PASS_PERCENTAGE] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  );

  const rows = await Mark.aggregate(pipeline);
  return res.json({
    success: true,
    count: rows.length,
    meta: buildMeta(rows.length, 1, rows.length || 10),
    data: rows.map((row) => {
      const averagePercentage = round2(row.averagePercentage);
      return {
        className: row._id,
        studentCount: row.studentCount,
        totalSubjectEntries: row.totalSubjectEntries,
        averagePercentage,
        highestPercentage: round2(row.highestPercentage),
        lowestPercentage: round2(row.lowestPercentage),
        passCount: row.passCount,
        failCount: row.studentCount - row.passCount,
        passPercentage: round2((row.passCount / row.studentCount) * 100),
        averageGrade: getGrade(averagePercentage),
      };
    }),
  });
});

const getMark = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'student' && !req.user.studentProfile) {
    return next(new ApiError(403, 'Student account is not linked to a student record'));
  }
  const markQuery = { _id: req.params.id };
  if (req.user.role === 'student') markQuery.student = req.user.studentProfile;
  const mark = await populateStudent(Mark.findOne(markQuery));
  if (!mark) {
    return next(new ApiError(404, 'Mark not found'));
  }
  return res.json({ success: true, data: mark });
});

const updateMark = asyncHandler(async (req, res, next) => {
  const mark = await Mark.findById(req.params.id);
  if (!mark) {
    return next(new ApiError(404, 'Mark not found'));
  }

  const updates = pickMarkFields(req.body);
  const nextSubject = updates.subject === undefined ? mark.subject : updates.subject;
  const nextExamType = updates.examType === undefined ? mark.examType : updates.examType;
  const duplicate = await Mark.findOne({
    _id: { $ne: mark._id },
    student: mark.student,
    subject: subjectPattern(nextSubject),
    examType: nextExamType,
  });
  if (duplicate) {
    return next(new ApiError(409, 'A mark for this student, subject and exam already exists'));
  }

  Object.keys(updates).forEach((field) => {
    mark[field] = updates[field];
  });

  try {
    await mark.save();
    const populatedMark = await populateStudent(Mark.findById(mark._id));
    return res.json({ success: true, data: populatedMark });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'A mark for this student, subject and exam already exists'));
    }
    return next(error);
  }
});

const deleteMark = asyncHandler(async (req, res, next) => {
  const mark = await Mark.findByIdAndDelete(req.params.id);
  if (!mark) {
    return next(new ApiError(404, 'Mark not found'));
  }
  return res.json({ success: true, message: 'Mark deleted', data: mark });
});

module.exports = {
  createMark,
  getMarks,
  getSubjectAverage,
  getClassSummary,
  getMark,
  updateMark,
  deleteMark,
};
