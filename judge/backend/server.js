import express from 'express';
import cors from 'cors';
import router from './routes/router.js';
import DBConnection from './database/db.js';
import dotenv from 'dotenv';
import questionRoutes from './routes/questionRoutes.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/',router);

DBConnection();

app.listen(8000,()=>{
    console.log("Server is running on port 8000!");
});

app.use('/questions',questionRoutes);