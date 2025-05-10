const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DBConnection = async () => {
    const MONGO_URI = process.env.MONGODB_URL;
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log("DB connection established");
    } catch (error) {
        console.log("Error while connecting to MongoDB", error);
    }
};

// MongoDB Connection Event Listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from DB');
});

module.exports = { DBConnection };
