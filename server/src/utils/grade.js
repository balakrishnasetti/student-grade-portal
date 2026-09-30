const PASS_PERCENTAGE = 35;

function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 35) return 'E';
  return 'F';
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

module.exports = { getGrade, round2, PASS_PERCENTAGE };
