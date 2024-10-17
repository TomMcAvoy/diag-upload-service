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
const UPLOADS_DIR = path.join(__dirname, 'uploads');

/**
 * Enable CORS for all routes
 */
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

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
  const filesInDirectory = fs.readdirSync(UPLOADS_DIR);

  // Ensure all files in the directory have corresponding metadata in the database
  for (const fileName of filesInDirectory) {
    const filePath = path.join(UPLOADS_DIR, fileName);
    const fileStats = fs.statSync(filePath);
    const creationDate = new Date(fileStats.birthtime).toISOString(); // Convert to ISO string

    const hash = crypto.createHash('md5');
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('data', (data) => hash.update(data));
    const checksum = await new Promise<string>((resolve, reject) => {
      fileStream.on('end', () => resolve(hash.digest('hex')));
      fileStream.on('error', reject);
    });

    const existingFile = await db.collection('fileStatuses').findOne({ fileName, checksum });
    if (!existingFile) {
      const fileId = uuidv4();
      await db.collection('fileStatuses').insertOne({ fileId, fileName, checksum, creationDate, status: 'Uploaded' });
    } else {
      // Update the creation date for existing files
      await db.collection('fileStatuses').updateOne(
        { fileName, checksum },
        { $set: { creationDate } }
      );
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
  const fileStats = fs.statSync(file.path);
  const creationDate = new Date(fileStats.birthtime).toISOString(); // Convert to ISO string

  const hash = crypto.createHash('md5');
  const fileStream = fs.createReadStream(file.path);
  fileStream.on('data', (data) => hash.update(data));
  const checksum = await new Promise<string>((resolve, reject) => {
    fileStream.on('end', () => resolve(hash.digest('hex')));
    fileStream.on('error', reject);
  });

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
app.get('/files/metadata', async (req, res) => {
  try {
    const files = await db.collection('fileStatuses').find({}, { projection: { _id: 0, fileId: 1, fileName: 1, checksum: 1, creationDate: 1 } }).toArray();
    res.json(files);
  } catch (error) {
    res.status(500).send('Error fetching files metadata');
  }
});

// Endpoint to delete a specific file
app.delete('/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  try {
    const fileMetadata = await db.collection('fileStatuses').findOne({ fileId });

    if (!fileMetadata) {
      return res.status(404).send('File not found');
    }

    const filePath = path.join(UPLOADS_DIR, fileMetadata.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      return res.status(404).send('File not found on filesystem');
    }

    await db.collection('fileStatuses').deleteOne({ fileId });

    res.status(200).send('File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send('Error deleting file');
  }
});

// Endpoint to delete all files
app.delete('/files/all', async (req, res) => {
  try {
    // Delete all files from the filesystem
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file));
    }

    // Delete all file metadata from the database
    await db.collection('fileStatuses').deleteMany({});

    res.json({ message: 'All files deleted successfully' });
  } catch (error) {
    console.error('Error deleting all files:', error);
    res.status(500).send('Error deleting all files');
  }
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
