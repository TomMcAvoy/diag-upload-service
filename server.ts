import express from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';
import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';
import http from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

const app = express();
const port = 8000;

const diagDir = path.join(__dirname, '../diags');
app.use(fileUpload());
app.use(express.static(diagDir));

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'file-upload-service',
  brokers: ['localhost:9092']
});
const producer = kafka.producer();

const runProducer = async () => {
  await producer.connect();
};

runProducer().catch(console.error);

// Initialize MongoDB client
const mongoClient = new MongoClient('mongodb://localhost:27017');
let db;
mongoClient.connect().then(client => {
  db = client.db('fileUploadService');
});

// Initialize WebSocket server
const server = http.createServer(app);
const io = new Server(server);

// Initialize Redis
const redis = new Redis();

io.on('connection', (socket) => {
  console.log('A user connected');

  // Subscribe to Redis channels
  socket.on('subscribe', (fileId) => {
    const channel = `file-status-${fileId}`;
    redis.subscribe(channel, (err, count) => {
      if (err) {
        console.error('Failed to subscribe: %s', err.message);
      } else {
        console.log(`Subscribed to ${channel}. Now subscribed to ${count} channel(s).`);
      }
    });

    redis.on('message', (channel, message) => {
      socket.emit('statusUpdate', JSON.parse(message));
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.post('/upload', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const file = req.files.file as UploadedFile;

  try {
    // Send file data to Kafka
    await producer.send({
      topic: 'file-uploads',
      messages: [
        { key: file.name, value: file.data.toString('base64') }
      ],
    });

    // Store initial status in database
    await db.collection('fileStatuses').insertOne({ fileId: file.name, status: 'Uploaded to Kafka' });

    // Respond with success notification
    res.json({ message: 'File uploaded successfully and sent to Kafka' });
  } catch (error) {
    console.error('Error sending file to Kafka:', error);
    res.status(500).send('Error uploading file');
  }
});

app.post('/status-update', async (req, res) => {
  const { status, fileId } = req.body;

  // Update status in database
  await db.collection('fileStatuses').updateOne({ fileId }, { $set: { status } });

  // Publish status update to Redis
  const channel = `file-status-${fileId}`;
  redis.publish(channel, JSON.stringify({ fileId, status }));

  res.json({ message: 'Status update received' });
});

server.listen(port, () => {
  console.log(`App is listening on port ${port}!`);
});
