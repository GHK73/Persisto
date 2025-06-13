// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import DBConnection from './database/db.js';

// Route imports
import authRoutes from './routes/router.js';           // Authentication routes
import questionRoutes from './routes/questionRoutes.js';
import codeRoutes from './routes/code.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files (like images, question files)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Route setup
app.use('/users', userRoutes);         // e.g., /users/:handle/profile-pic
app.use('/admin', adminRoutes);        // Admin actions
app.use('/questions', questionRoutes); // Questions CRUD
app.use('/code', codeRoutes);          // Code execution/submission
app.use('/', authRoutes);              // Auth & protected routes (e.g., /signup, /signin, /check-auth)

// DB connection
DBConnection();

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
