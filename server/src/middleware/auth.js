const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = authorization.slice(7).trim();
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired, please log in again'));
    }
    return next(new ApiError(401, 'Invalid token'));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError(401, 'User no longer exists'));
  }

  if (user.role === 'student' && !user.studentProfile) {
    const matchingStudents = await Student.find({ email: user.email }).select('_id').limit(2).lean();
    if (matchingStudents.length === 1) {
      const linkedAccount = await User.findOne({
        studentProfile: matchingStudents[0]._id,
        _id: { $ne: user._id },
      }).select('_id').lean();
      if (!linkedAccount) {
        user.studentProfile = matchingStudents[0]._id;
        try {
          await user.save();
        } catch (error) {
          if (error.code !== 11000) throw error;
          user.studentProfile = null;
        }
      }
    }
  }

  req.user = user;
  next();
});

function authorize(...roles) {
  return function authorizeRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      const role = req.user ? req.user.role : 'unauthenticated';
      return next(new ApiError(403, `Role '${role}' is not authorized`));
    }
    next();
  };
}

module.exports = { protect, authorize };
