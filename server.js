// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import Admin from './models/Admin.js';

dotenv.config();

const port = process.env.PORT || 5002;

connectDB();


const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Replace with your frontend URL
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());






const createFirstAdmin = async () => {
  await connectDB();

  try {
    const adminExists = await Admin.findOne({ email: 'admin@company.com' });

    if (adminExists) {
      console.log('Admin already exists.');
      process.exit();
    }

    const admin = new Admin({
      name: 'Main Admin',
      email: 'admin@company.com',
      password: 'StrongPassword123', // Change this!
    });

    await admin.save();
    console.log('Admin created successfully!');
    process.exit();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

//createFirstAdmin();









// Routes
app.use('/api/admin', adminRoutes);
// You can add employee routes later: app.use('/api/employee', employeeRoutes);

app.get('/', (req, res) => {
  res.send('HR Portal API is running...');
});


app.listen(port, () => console.log(`Server running on port ${port}`));