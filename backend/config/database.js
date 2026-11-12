// ===== Database connection =====
const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/penworld';

  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection;
  db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  db.on('connected', () => {
    console.log('Connected to MongoDB');
  });

  db.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
  });

  return mongoose.connection;
};

module.exports = connectDB;
