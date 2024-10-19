import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pipeline } from 'stream/promises';
import payload from 'payload';
import dotenv from 'dotenv';
import next from 'next';

console.log('server.ts is being executed');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const app = express();
const PORT = process.env.PORT || 8000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

nextApp.prepare().then(() => {
  app.use(cors({ origin: 'http://localhost:3000' }));
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });

  app.use(limiter);

  async function init() {
    await payload.init({
      secret: process.env.PAYLOAD_SECRET || 'default_secret',
      express: app,
    });

    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await fs.mkdir(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        } catch (err) {
          cb(err as Error, UPLOADS_DIR);
        }
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    });

    const upload = multer({ storage });

    let db: Db;
    const mongoClient = new MongoClient(MONGO_URI);
    mongoClient.connect().then((client) => {
      db = client.db('fileUploadService');
      console.log('Connected to MongoDB');
      synchronizeDatabaseWithUploads();
    }).catch(err => {
      console.error('Failed to connect to MongoDB:', err);
    });

    const redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    const synchronizeDatabaseWithUploads = async () => {
      try {
        const filesInDirectory = await fs.readdir(UPLOADS_DIR);

        for (const fileName of filesInDirectory) {
          const filePath = path.join(UPLOADS_DIR, fileName);
          const fileStats = await fs.stat(filePath);
          const creationDate = new Date(fileStats.birthtime).toISOString();

          const hash = crypto.createHash('md5');
          const fileStream = createReadStream(filePath);

          await pipeline(fileStream, async (source) => {
            for await (const chunk of source) {
              hash.update(chunk);
            }
          });

          const checksum = hash.digest('hex');

          const existingFile = await db.collection('fileStatuses').findOne({ fileName, checksum });
          if (!existingFile) {
            const fileId = uuidv4();
            await db.collection('fileStatuses').insertOne({ fileId, fileName, checksum, creationDate, status: 'Uploaded' });
          } else {
            await db.collection('fileStatuses').updateOne(
              { fileName, checksum },
              { $set: { creationDate } }
            );
          }
        }

        const metadataEntries = await db.collection('fileStatuses').find().toArray();
        for (const entry of metadataEntries) {
          if (!filesInDirectory.includes(entry.fileName)) {
            await db.collection('fileStatuses').deleteOne({ fileName: entry.fileName });
          }
        }
      } catch (error) {
        console.error('Error synchronizing database with uploads:', error);
      }
    };

    app.post('/upload', upload.single('file'), async (req, res) => {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      try {
        const fileId = uuidv4();
        const fileName = file.originalname;
        const fileStats = await fs.stat(file.path);
        const creationDate = new Date(fileStats.birthtime).toISOString();

        const hash = crypto.createHash('md5');
        const fileStream = createReadStream(file.path);

        await pipeline(fileStream, async (source) => {
          for await (const chunk of source) {
            hash.update(chunk);
          }
        });

        const checksum = hash.digest('hex');

        const existingFile = await db.collection('fileStatuses').findOne({ fileName, checksum });

        if (existingFile) {
          return res.json({ message: 'File already exists', fileId: existingFile.fileId, fileName, checksum, creationDate });
        }

        await db.collection('fileStatuses').insertOne({ fileId, fileName, checksum, creationDate, status: 'Uploaded' });

        return res.json({ message: 'File uploaded successfully', fileId, fileName, checksum, creationDate });
      } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({ message: 'Error uploading file' });
      }
    });

    app.get('/files/metadata', async (req, res) => {
      try {
        const files = await db.collection('fileStatuses').find({}, { projection: { _id: 0, fileId: 1, fileName: 1, checksum: 1, creationDate: 1 } }).toArray();
        return res.json(files);
      } catch (error) {
        console.error('Error fetching files metadata:', error);
        return res.status(500).json({ message: 'Error fetching files metadata' });
      }
    });

    app.delete('/files/:fileId', async (req, res) => {
      const { fileId } = req.params;
      try {
        const fileMetadata = await db.collection('fileStatuses').findOne({ fileId });

        if (!fileMetadata) {
          return res.status(404).json({ message: 'File not found' });
        }

        const filePath = path.join(UPLOADS_DIR, fileMetadata.fileName);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          return res.status(404).json({ message: 'File not found on filesystem' });
        }

        await db.collection('fileStatuses').deleteOne({ fileId });

        return res.status(200).json({ message: 'File deleted successfully' });
      } catch (error) {
        console.error('Error deleting file:', error);
        return res.status(500).json({ message: 'Error deleting file' });
      }
    });

    app.delete('/files/all', async (req, res) => {
      try {
        const files = await fs.readdir(UPLOADS_DIR);

        for (const file of files) {
          try {
            await fs.unlink(path.join(UPLOADS_DIR, file));
          } catch (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ message: 'Error deleting file from filesystem', error: (err as Error).message });
          }
        }

        await db.collection('fileStatuses').deleteMany({});

        return res.json({ message: 'All files deleted successfully' });
      } catch (error) {
        console.error('Error deleting all files:', error);
        return res.status(500).json({ message: 'Error deleting all files', error: (error as Error).message });
      }
    });

    app.get('/status', (req, res) => {
      return res.json({ status: 'Server is running' });
    });

    const server = http.createServer(app);
    const io = new Server(server);

    io.on('connection', (socket) => {
      console.log('A user connected');
      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }

  init().catch(error => {
    console.error('Failed to initialize server:', error);
  });

  app.all('*', (req, res) => {
    return handle(req, res);
  });
});
