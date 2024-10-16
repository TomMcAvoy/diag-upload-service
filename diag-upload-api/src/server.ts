import express, {Request, Response} from 'express';
import fileUpload, {UploadedFile} from 'express-fileupload';
import {Kafka} from 'kafkajs';
import {MongoClient, Db} from 'mongodb';
import {Server} from 'socket.io';
import http from 'http';
import path from 'path';
import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import Redis from 'ioredis'; // Using 'ioredis' package
import cors from 'cors'; // Import cors package

const app = express();
const port = 8000;

const diagDir = path.join(__dirname, '../diags');
app.use(fileUpload());
app.use(express.static(diagDir))

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000'
}));

const server = http.createServer(app);
const io = new Server(server);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const kafka = new Kafka({clientId: 'my-app', brokers: ['localhost:9092']});
const producer = kafka.producer();

let db: Db; // Explicitly define the type of `db`

// Create a Redis connection pool
const redisClient = new Redis({
  host: 'localhost', // Redis server host
  port: 6379, // Redis server port
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const redisSubscriber = new Redis({
  host: 'localhost', // Redis server host
  port: 6379, // Redis server port
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Example of subscribing to a channel
redisSubscriber.subscribe('example-channel', (err, count) => {
  if (err) {
    console.error('Failed to subscribe: %s', err.message);
  } else {
    console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
  }
});

redisSubscriber.on('message', (channel, message) => {
  console.log(`Received message from ${channel}: ${message}`);
});

// Example of publishing to a channel
redisClient.publish('example-channel', 'Hello, Redis!');

const mongoClient = new MongoClient('mongodb://localhost:27017');
mongoClient.connect().then((client) => {
  db = client.db('fileUploadService');
  console.log('Connected to MongoDB');
  // Start the server only after the database connection is established
  server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('start-upload', (data: {fileName: string; fileSize: number}) => {
    const {fileName, fileSize} = data;
    const fileId = uuidv4();
    const filePath = path.join(uploadDir, fileId);

    socket.emit('upload-id', {fileId});

    socket.on(`upload-chunk-${fileId}`, (chunk: Buffer) => {
      fs.appendFileSync(filePath, chunk);
      socket.emit(`chunk-received-${fileId}`);
    });

    socket.on(`upload-complete-${fileId}`, async () => {
      console.log(`File upload complete: ${filePath}`);

      // Send file to Kafka
      try {
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('data', async (chunk) => {
          await producer.send({
            topic: 'file-uploads',
            messages: [{key: fileId, value: chunk.toString('base64')}]
          });
          console.log('File chunk sent to Kafka');
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

    await db.collection('fileStatuses').insertOne({fileId: file.name, status: 'Uploaded to Kafka'});

    res.send('File uploaded!');
  });
});

app.post('/status-update', async (req: Request, res: Response) => {
  const {status, fileId} = req.body;

  // Update status in database
  await db.collection('fileStatuses').updateOne({fileId}, {$set: {status}});

  // Publish status update to Redis
  const channel = `file-status-${fileId}`;
  redisClient.publish(channel, JSON.stringify({fileId, status}));

  res.json({message: 'Status update received'});
});

// Define the /files endpoint
app.get('/files', (req: Request, res: Response) => {
  const files = fs.readdirSync(uploadDir);
  res.json(files);
});

app.get('/', (_req, res) => {
  res.json({message: 'Diag Service', status: 'Online'});
});

// Define the root endpoint
 app.get('/status', (_req, res) => {
    res.json({message: 'Diag Service', status: 'Online'})
});


export default app;
