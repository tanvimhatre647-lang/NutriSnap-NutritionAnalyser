const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MongoDB Warning: MONGO_URI not set in environment. Running in offline/guest mode.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected: ' + conn.connection.host);
  } catch (error) {
    console.error('MongoDB Warning: Could not connect to database (' + error.message + '). Server running in offline/guest mode.');
  }
};

module.exports = connectDB;

