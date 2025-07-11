// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import DBConnection from './database/db.js';

import authRoutes from './routes/router.js';
import questionRoutes from './routes/questionRoutes.js';
import codeRoutes from './routes/code.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/users', userRoutes);        
app.use('/admin', adminRoutes);        
app.use('/questions', questionRoutes); 
app.use('/code', codeRoutes);          
app.use('/', authRoutes);              

DBConnection();

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
