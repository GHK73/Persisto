import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import DBConnection from './database/db.js';
import router from './routes/router.js';             // your other routes
import questionRoutes from './routes/questionRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount /questions routes first
app.use('/questions', questionRoutes);

// Mount other routes
app.use('/', router);

DBConnection();

app.listen(8000, () => {
  console.log('Server is running on port 8000!');
});
