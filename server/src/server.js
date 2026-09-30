require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error.message);
    server.close(() => {
      mongoose.connection.close(false).finally(() => process.exit(1));
    });
  });
}

startServer();
