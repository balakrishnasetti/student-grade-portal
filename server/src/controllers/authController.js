const User = require('../models/User');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

function publicUser(user) {
  const source = typeof user.toObject === 'function' ? user.toObject() : user;
  return {
    _id: source._id,
    name: source.name,
    email: source.email,
    role: source.role,
    studentProfile: source.studentProfile || null,
  };
}

const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;
  const role = req.body.role === 'student' ? 'student' : 'teacher';

  let studentProfile = null;
  if (role === 'teacher') {
    if (!process.env.TEACHER_REGISTRATION_CODE
      || req.body.teacherRegistrationCode !== process.env.TEACHER_REGISTRATION_CODE) {
      return next(new ApiError(403, 'A valid teacher registration code is required'));
    }
  } else {
    const matchingStudents = await Student.find({ email }).select('_id').limit(2).lean();
    if (matchingStudents.length !== 1) {
      return next(new ApiError(403, 'Ask your teacher to add your email before registering'));
    }

    const existingStudentAccount = await User.findOne({ studentProfile: matchingStudents[0]._id });
    if (existingStudentAccount) {
      return next(new ApiError(409, 'This student already has an account'));
    }
    studentProfile = matchingStudents[0]._id;
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(409, 'Email is already registered'));
  }

  try {
    const user = await User.create({ name, email, password, role, studentProfile });
    return res.status(201).json({
      success: true,
      data: {
        user: publicUser(user),
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.studentProfile) {
        return next(new ApiError(409, 'This student already has an account'));
      }
      return next(new ApiError(409, 'Email is already registered'));
    }
    return next(error);
  }
});

const login = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  const passwordMatches = user ? await user.matchPassword(req.body.password) : false;

  if (!user || !passwordMatches) {
    return next(new ApiError(401, 'Invalid email or password'));
  }

  return res.json({
    success: true,
    data: {
      user: publicUser(user),
      token: generateToken(user._id),
    },
  });
});

const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('studentProfile', 'name rollNo className section');

  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  return res.json({
    success: true,
    data: { user: publicUser(user) },
  });
});

module.exports = { publicUser, register, login, getMe };
