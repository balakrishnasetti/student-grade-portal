const Student = require('../models/Student');
const Mark = require('../models/Mark');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildMeta } = require('../utils/paginate');
const { getGrade, round2, PASS_PERCENTAGE } = require('../utils/grade');

const studentFields = ['rollNo', 'name', 'email', 'className', 'section', 'academicYear'];
const sortMap = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  roll: { rollNo: 1 },
};

function pickStudentFields(source) {
  return Object.fromEntries(
    studentFields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
}

const createStudent = asyncHandler(async (req, res, next) => {
  const data = pickStudentFields(req.body);
  data.createdBy = req.user._id;

  const existingStudent = await Student.findOne({
    rollNo: String(data.rollNo).toUpperCase(),
  });
  if (existingStudent) {
    return next(new ApiError(409, 'Roll number already exists'));
  }

  try {
    const student = await Student.create(data);
    return res.status(201).json({ success: true, data: student });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'Roll number already exists'));
    }
    return next(error);
  }
});

const getStudents = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);
  const query = {};

  if (req.user.role === 'student') {
    if (!req.user.studentProfile) {
      return next(new ApiError(403, 'Student account is not linked to a student record'));
    }
    query._id = req.user.studentProfile;
  }

  if (req.query.className) query.className = req.query.className;
  if (req.query.section) query.section = req.query.section.toUpperCase();
  if (req.query.search) {
    const search = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [{ name: search }, { rollNo: search }];
  }

  const sort = sortMap[req.query.sort] || sortMap.newest;
  const [data, total] = await Promise.all([
    Student.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Student.countDocuments(query),
  ]);

  return res.json({
    success: true,
    count: data.length,
    meta: buildMeta(total, page, limit),
    data,
  });
});

const getReportCard = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'student' && !req.user.studentProfile) {
    return next(new ApiError(403, 'Student account is not linked to a student record'));
  }
  if (req.user.role === 'student'
    && String(req.params.id) !== String(req.user.studentProfile)) {
    return next(new ApiError(404, 'Student not found'));
  }
  const student = await Student.findById(req.params.id).lean();
  if (!student) {
    return next(new ApiError(404, 'Student not found'));
  }

  const markMatch = { student: student._id };
  if (req.query.examType) markMatch.examType = req.query.examType;

  // Weight the overall result by total marks because different maxScore values must not count equally.
  const [subjects, summaryRows] = await Promise.all([
    Mark.aggregate([
      { $match: markMatch },
      {
        $project: {
          _id: 1,
          subject: 1,
          examType: 1,
          score: 1,
          maxScore: 1,
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] }, 2],
          },
        },
      },
      { $sort: { subject: 1 } },
    ]),
    Mark.aggregate([
      { $match: markMatch },
      {
        $group: {
          _id: null,
          subjectCount: { $sum: 1 },
          obtainedMarks: { $sum: '$score' },
          totalMarks: { $sum: '$maxScore' },
          failedSubjects: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] },
                    PASS_PERCENTAGE,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          subjectCount: 1,
          obtainedMarks: 1,
          totalMarks: 1,
          failedSubjects: 1,
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$obtainedMarks', '$totalMarks'] }, 100] }, 2],
          },
        },
      },
    ]),
  ]);

  const aggregateSummary = summaryRows[0];
  const hasMarks = Boolean(aggregateSummary);
  const percentage = hasMarks ? aggregateSummary.percentage : 0;
  const summary = {
    subjectCount: hasMarks ? aggregateSummary.subjectCount : 0,
    obtainedMarks: hasMarks ? aggregateSummary.obtainedMarks : 0,
    totalMarks: hasMarks ? aggregateSummary.totalMarks : 0,
    percentage,
    grade: hasMarks ? getGrade(percentage) : 'N/A',
    result: !hasMarks ? 'NO DATA' : aggregateSummary.failedSubjects === 0 ? 'PASS' : 'FAIL',
    rank: null,
    outOf: 0,
  };

  if (hasMarks) {
    const rankMatch = { 'student.className': student.className };
    if (req.query.examType) rankMatch.examType = req.query.examType;
    const rankedStudents = await Mark.aggregate([
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $match: rankMatch },
      {
        $group: {
          _id: '$student._id',
          obtainedMarks: { $sum: '$score' },
          totalMarks: { $sum: '$maxScore' },
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
      { $sort: { percentage: -1, obtainedMarks: -1 } },
    ]);
    const rankIndex = rankedStudents.findIndex((row) => String(row._id) === String(student._id));
    summary.rank = rankIndex === -1 ? null : rankIndex + 1;
    summary.outOf = rankedStudents.length;
  }

  return res.json({
    success: true,
    data: {
      student: {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        className: student.className,
        section: student.section,
        academicYear: student.academicYear,
      },
      subjects: subjects.map((subject) => ({
        ...subject,
        percentage: round2(subject.percentage),
        grade: getGrade(subject.percentage),
      })),
      summary,
      generatedAt: new Date().toISOString(),
    },
  });
});

const getTopStudents = asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 50)
    : 10;
  const pipeline = [
    // `$lookup.from` uses the physical collection name, "students", not the model name.
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
  ];
  if (req.query.className) {
    pipeline.push({ $match: { 'student.className': req.query.className } });
  }
  pipeline.push(
    {
      $group: {
        _id: '$student._id',
        subjectCount: { $sum: 1 },
        obtainedMarks: { $sum: '$score' },
        totalMarks: { $sum: '$maxScore' },
        name: { $first: '$student.name' },
        rollNo: { $first: '$student.rollNo' },
        className: { $first: '$student.className' },
        section: { $first: '$student.section' },
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
    { $sort: { percentage: -1, obtainedMarks: -1, name: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        name: 1,
        rollNo: 1,
        className: 1,
        section: 1,
        subjectCount: 1,
        obtainedMarks: 1,
        totalMarks: 1,
        percentage: { $round: ['$percentage', 2] },
      },
    },
  );

  const rows = await Mark.aggregate(pipeline);
  const totalRows = await Mark.aggregate([
    ...pipeline.slice(0, -2),
    { $count: 'total' },
  ]);
  const total = totalRows[0]?.total || 0;
  return res.json({
    success: true,
    count: rows.length,
    meta: buildMeta(total, 1, limit),
    data: rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      grade: getGrade(row.percentage),
    })),
  });
});

const getStudent = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'student' && !req.user.studentProfile) {
    return next(new ApiError(403, 'Student account is not linked to a student record'));
  }
  if (req.user.role === 'student'
    && String(req.params.id) !== String(req.user.studentProfile)) {
    return next(new ApiError(404, 'Student not found'));
  }
  const student = await Student.findById(req.params.id).lean();
  if (!student) {
    return next(new ApiError(404, 'Student not found'));
  }
  return res.json({ success: true, data: student });
});

const updateStudent = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return next(new ApiError(404, 'Student not found'));
  }

  const updates = pickStudentFields(req.body);
  if (updates.rollNo !== undefined) {
    const normalizedRollNo = String(updates.rollNo).toUpperCase();
    if (normalizedRollNo !== student.rollNo) {
      const clash = await Student.findOne({
        rollNo: normalizedRollNo,
        _id: { $ne: student._id },
      });
      if (clash) {
        return next(new ApiError(409, 'Roll number already exists'));
      }
    }
  }

  Object.keys(updates).forEach((field) => {
    student[field] = updates[field];
  });

  try {
    await student.save();
    return res.json({ success: true, data: student });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, 'Roll number already exists'));
    }
    return next(error);
  }
});

const deleteStudent = asyncHandler(async (req, res, next) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) {
    return next(new ApiError(404, 'Student not found'));
  }

  // Orphaned marks would corrupt every later aggregation, so remove them with the student.
  const removedMarks = await Mark.deleteMany({ student: student._id });
  const removedAccounts = await User.deleteMany({ studentProfile: student._id });
  return res.json({
    success: true,
    message: 'Student, linked account, and marks deleted',
    data: {
      removedMarks: removedMarks.deletedCount,
      removedStudentAccounts: removedAccounts.deletedCount,
    },
  });
});

module.exports = {
  createStudent,
  getStudents,
  getReportCard,
  getTopStudents,
  getStudent,
  updateStudent,
  deleteStudent,
};
