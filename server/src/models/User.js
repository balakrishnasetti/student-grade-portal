const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 60,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['teacher', 'student'],
    default: 'teacher',
  },
  studentProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
  },
}, { timestamps: true });

userSchema.index(
  { studentProfile: 1 },
  { unique: true, partialFilterExpression: { studentProfile: { $type: 'objectId' } } },
);

// Regular function syntax preserves the document-bound `this` value in the hook.
userSchema.pre('save', async function passwordHash(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Regular function syntax preserves the document-bound `this` value for password comparison.
userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
