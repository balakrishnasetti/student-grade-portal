require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');
const Mark = require('./models/Mark');

const subjects = ['Mathematics', 'Science', 'English', 'History', 'Computer Science'];
const scoreSets = [
  [96, 91, 88, 94, 97],
  [84, 79, 73, 81, 86],
  [72, 68, 64, 70, 76],
  [61, 58, 49, 64, 67],
  [45, 52, 38, 42, 56],
  [33, 41, 29, 47, 35],
  [89, 93, 91, 85, 90],
  [77, 83, 69, 74, 80],
  [54, 47, 62, 58, 51],
  [39, 35, 44, 31, 48],
];

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be set before running the seed script');
  }

  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Mark.deleteMany({}),
  ]);

  const teacher = await User.create({
    name: 'School Teacher',
    email: 'teacher@school.com',
    password: 'secret123',
    role: 'teacher',
  });

  const students = await Student.insertMany([
    ['Aarav Sharma', '10A01', '10', 'A'],
    ['Diya Patel', '10A02', '10', 'A'],
    ['Kabir Rao', '10A03', '10', 'A'],
    ['Meera Nair', '10A04', '10', 'A'],
    ['Rohan Singh', '10A05', '10', 'A'],
    ['Anaya Gupta', '12S01', '12', 'B'],
    ['Ishaan Reddy', '12S02', '12', 'B'],
    ['Sara Khan', '12S03', '12', 'B'],
    ['Vikram Das', '12S04', '12', 'B'],
    ['Nisha Thomas', '12S05', '12', 'B'],
  ].map(([name, rollNo, className, section]) => ({
    name,
    rollNo,
    className,
    section,
    createdBy: teacher._id,
  })));

  const marks = students.flatMap((student, studentIndex) => subjects.map((subject, subjectIndex) => ({
    student: student._id,
    subject,
    examType: 'final',
    score: scoreSets[studentIndex][subjectIndex],
    maxScore: 100,
    createdBy: teacher._id,
  })));
  await Mark.insertMany(marks);

  console.log(`Seed complete: ${1} user, ${students.length} students, ${marks.length} marks.`);
}

seed()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
