const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  examType: {
    type: String,
    enum: ['unit-test', 'midterm', 'final'],
    default: 'final',
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  maxScore: {
    type: Number,
    default: 100,
    min: 1,
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

markSchema.index({ student: 1, subject: 1, examType: 1 }, { unique: true });

// Regular function syntax preserves document access while Mongoose validates the score.
markSchema.pre('validate', function scoreCannotExceedMaximum(next) {
  if (this.score > this.maxScore) {
    this.invalidate('score', 'Score cannot exceed maxScore');
  }
  next();
});

markSchema.virtual('percentage').get(function percentage() {
  return Math.round((this.score / this.maxScore) * 10000) / 100;
});

module.exports = mongoose.models.Mark || mongoose.model('Mark', markSchema);
