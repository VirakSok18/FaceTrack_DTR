import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database.js';
import employeeRoutes from './routes/employeeRoutes.js';
import dtrRoutes from './routes/dtrRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/uploads', express.static('uploads'));

connectDB();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export { io };

app.use('/api/employees', employeeRoutes);
app.use('/api/dtr', dtrRoutes);


app.get('/', (req, res) => {
  res.json({ message: 'Employee DTR System API' });
});

// Global Error Handler - Ensures JSON response even for unexpected errors
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[v2.1] Server running on port ${PORT}`);
});