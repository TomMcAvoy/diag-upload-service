import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis'; // Using 'ioredis' package

const app = express();
const PORT = 8000;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Serve uploaded files
app.use('/files', express.static(path.join(__dirname, 'uploads')));

// MongoDB setup
let db: Db;
const mongoClient = new MongoClient('mongodb://localhost:27017');
mongoClient.connect().then((client) => {
  db = client.db('fileUploadService');
  console.log('Connected to MongoDB');

  // Synchronize the database with the uploads directory on startup
  synchronizeDatabaseWithUploads();
});

// Redis setup
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Function to synchronize the database with the uploads directory
const synchronizeDatabaseWithUploads = async () => {
  const uploadPath = path.join(__dirname, 'uploads');
  const filesInDirectory = fs.readdirSync(uploadPath);

  // Ensure all files in the directory have corresponding metadata in the database
  for (const fileName of filesInDirectory) {
    const filePath = path.join(uploadPath, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileStats = fs.statSync(filePath);
    const creationDate = fileStats.birthtime.toISOString(); // Convert to ISO string

    const existingFile = await db.collection('fileStatuses').findOne({ fileName, checksum });
    if (!existingFile) {
      const fileId = uuidv4();
      await db.collection('fileStatuses').insertOne({ fileId, fileName, checksum, creationDate, status: 'Uploaded' });
    }
  }

  // Remove any metadata entries that do not have corresponding files in the directory
  const metadataEntries = await db.collection('fileStatuses').find().toArray();
  for (const entry of metadataEntries) {
    if (!filesInDirectory.includes(entry.fileName)) {
      await db.collection('fileStatuses').deleteOne({ fileName: entry.fileName });
    }
  }
};

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileId = uuidv4();
  const fileName = file.originalname;
  const fileBuffer = fs.readFileSync(file.path);
  const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
  const fileStats = fs.statSync(file.path);
  const creationDate = fileStats.birthtime.toISOString(); // Convert to ISO string

  // Check if the file with the same name and checksum already exists
  const existingFile = await db.collection('fileStatuses').findOne({ fileName, checksum });

  if (existingFile) {
    return res.json({ message: 'File already exists', fileId: existingFile.fileId, fileName, checksum, creationDate });
  }

  // Store the file ID, name, checksum, and creation date in the database
  await db.collection('fileStatuses').insertOne({ fileId, fileName, checksum, creationDate, status: 'Uploaded' });

  res.json({ message: 'File uploaded successfully', fileId, fileName, checksum, creationDate });
});

// Endpoint to get metadata for all uploaded files
app.get('/files', async (req, res) => {
  const files = await db.collection('fileStatuses').find({}, { projection: { _id: 0, fileId: 1, fileName: 1, checksum: 1, creationDate: 1 } }).toArray();
  res.json(files);
});

// Endpoint to delete a specific file
app.delete('/files/:fileName', async (req, res) => {
  const { fileName } = req.params;

  // Decode the file name
  const decodedFileName = decodeURIComponent(fileName);

  // Find the file metadata in the database
  const fileMetadata = await db.collection('fileStatuses').findOne({ fileName: decodedFileName });

  if (!fileMetadata) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Delete the file from the filesystem
  const filePath = path.join(__dirname, 'uploads', decodedFileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete the file metadata from the database
  await db.collection('fileStatuses').deleteOne({ fileName: decodedFileName });

  // Retrieve the updated metadata list
  const updatedFiles = await db.collection('fileStatuses').find({}, { projection: { _id: 0, fileId: 1, fileName: 1, checksum: 1, creationDate: 1 } }).toArray();

  res.json({ message: 'File deleted successfully', files: updatedFiles });
});

// Endpoint to delete all files
app.delete('/files/all', async (req, res) => {
  // Delete all files from the filesystem
  const uploadPath = path.join(__dirname, 'uploads');
  fs.readdir(uploadPath, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(uploadPath, file), err => {
        if (err) throw err;
      });
    }
  });

  // Delete all file metadata from the database
  await db.collection('fileStatuses').deleteMany({});

  res.json({ message: 'All files deleted successfully' });
});

// Status endpoint to return API status
app.get('/status', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Create HTTP server and integrate with socket.io
const server = http.createServer(app);
const io = new Server(server);

// Handle socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
