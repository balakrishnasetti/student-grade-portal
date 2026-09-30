const jwt = require('jsonwebtoken');

function generateToken(id) {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

module.exports = generateToken;
