// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import DBConnection from './database/db.js';
import authRoutes from './routes/router.js';
import questionRoutes from './routes/questionRoutes.js';
import codeRoutes from './routes/code.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/user.js';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/users', userRoutes); // contains /:userId/profile-pic and /:userId/stats
app.use('/admin', adminRoutes);
app.use('/questions', questionRoutes);
app.use('/code', codeRoutes);
app.use('/', authRoutes);

// Connect DB
DBConnection();

app.listen(8000, () => {
  console.log('Server is running on port 8000!');
});
