import express, { Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { Kafka } from 'kafkajs';
import { MongoClient, Db } from 'mongodb';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 8000;

const server = http.createServer(app);
const io = new Server(server);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const kafka = new Kafka({ clientId: 'my-app', brokers: ['kafka:9092'] });
const producer = kafka.producer();

let db: Db;

const mongoClient = new MongoClient('mongodb://localhost:27017');
mongoClient.connect().then((client) => {
  db = client.db('fileUploadService');
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('start-upload', (data: { fileName: string; fileSize: number }) => {
    const { fileName, fileSize } = data;
    const fileId = uuidv4();
    const filePath = path.join(uploadDir, fileId);

    socket.emit('upload-id', { fileId });

    socket.on(`upload-chunk-${fileId}`, (chunk: Buffer) => {
      fs.appendFileSync(filePath, chunk);
      socket.emit(`chunk-received-${fileId}`);
    });

    socket.on(`upload-complete-${fileId}`, async () => {
      console.log(`File upload complete: ${filePath}`);

      // Send file to Kafka
      try {
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('data', (chunk) => {
          const payloads = [{ topic: 'file-uploads', messages: chunk.toString('base64'), key: fileId }];
          producer.send(payloads, (err, data) => {
            if (err) {
              console.error('Error sending file to Kafka:', err);
              socket.emit(`upload-error-${fileId}`, 'Error uploading file');
            } else {
              console.log('File chunk sent to Kafka:', data);
            }
          });
        });

        fileStream.on('end', () => {
          socket.emit(`upload-success-${fileId}`);
        });
      } catch (error) {
        console.error('Error sending file to Kafka:', error);
        socket.emit(`upload-error-${fileId}`, 'Error uploading file');
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.use(fileUpload());

app.post('/upload', async (req: Request, res: Response) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const file = req.files.file as UploadedFile;
  const filePath = path.join(uploadDir, file.name);

  file.mv(filePath, async (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    await db.collection('fileStatuses').insertOne({ fileId: file.name, status: 'Uploaded to Kafka' });

    res.send('File uploaded!');
  });
});

app.post('/status-update', async (req: Request, res: Response) => {
  const { status, fileId } = req.body;

  await db.collection('fileStatuses').updateOne({ fileId }, { $set: { status } });

  res.json({ message: 'Status update received' });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
