import Redis from 'ioredis';
import Redlock from 'redlock';
const redis = new Redis();
const redlock = new Redlock([redis], {
  driftFactor: 0.01, // time in ms
  retryCount: 10,
  retryDelay: 200, // time in ms
  retryJitter: 200 // time in ms
});

self.onmessage = async (event: MessageEvent) => {
  const {action, file, fileId, apiUrl} = event.data;

  const lockKey = `lock:${fileId}`;
  const versionKey = `version:${fileId}`;

  try {
    const lock = await redlock.acquire([lockKey], 10000); // 10 seconds TTL

    try {
      switch (action) {
        case 'upload':
          try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${apiUrl}/upload`, {
              method: 'POST',
              body: formData
            });

            const result = await response.json();

            // Update version number
            const version = await redis.incr(versionKey);

            self.postMessage({status: 'success', result, version});
          } catch (error) {
            self.postMessage({status: 'error', error});
          }
          break;

        case 'delete':
          try {
            const response = await fetch(`${apiUrl}/delete/${fileId}`, {
              method: 'DELETE'
            });

            const result = await response.json();

            // Update version number
            const version = await redis.incr(versionKey);

            self.postMessage({status: 'success', result, version});
          } catch (error) {
            self.postMessage({status: 'error', error});
          }
          break;

        // Add more CRUD operations as needed

        default:
          self.postMessage({status: 'error', error: 'Unknown action'});
      }
    } finally {
      await lock.release();
    }
  } catch (error) {
    self.postMessage({status: 'error', error: `File ${fileId} is currently locked.`});
  }
};
