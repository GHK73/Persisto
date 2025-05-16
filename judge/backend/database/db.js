import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DBConnection = async()=>{
    const MONGO_URI = process.env.MONGO_URI;
    try{
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");
    }catch(error){
        console.log("Error while connecting to MongoDB",error.message);
    }
}

export default DBConnection;