const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dbUri = process.env.DB_URI;

if (!dbUri) {
  console.error("CRITICAL ERROR: DB_URI is missing from Netlify Environment Variables!");
}

let isConnected = false;

const connectDB = async () => {
    mongoose.set('strictQuery', true);
    if (isConnected) {
        return;
    }

    try {
        const db = await mongoose.connect(dbUri);
        isConnected = db.connections[0].readyState;
        console.log('✔ Production Database Connected Successfully');
    } catch (error) {
        console.error('✘ Production Database Error:', error.message);
        throw error;
    }
};

module.exports = connectDB;