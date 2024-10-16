import { KafkaClient, Consumer } from 'kafka-node';
import fs from 'fs';
import path from 'path';

const client = new KafkaClient({ kafkaHost: 'localhost:9092' });
const consumer = new Consumer(
  client,
  [{ topic: 'file-uploads', partition: 0 }],
  { autoCommit: true }
);

consumer.on('message', (message) => {
  const fileData = Buffer.from(message.value as string, 'base64');
  const fileId = message.key as string;
  const filePath = path.join(__dirname, 'uploads', fileId);

  fs.writeFile(filePath, fileData, (err) => {
    if (err) {
      console.error('Error saving file:', err);
    } else {
      console.log(`File saved: ${filePath}`);
    }
  });
});

consumer.on('error', (error) => {
  console.error('Error in Kafka Consumer:', error);
});
