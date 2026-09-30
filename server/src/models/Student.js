const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  className: {
    type: String,
    required: true,
    trim: true,
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'A',
  },
  academicYear: {
    type: String,
    default: function currentAcademicYear() {
      return String(new Date().getFullYear());
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

studentSchema.index({ className: 1, section: 1 });
studentSchema.virtual('marks', {
  ref: 'Mark',
  localField: '_id',
  foreignField: 'student',
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
