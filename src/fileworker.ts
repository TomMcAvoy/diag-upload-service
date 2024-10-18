import Redis from 'ioredis';
import Redlock from 'redlock';

// Initialize Redis client
const redis = new Redis();

// Initialize Redlock with Redis client
const redlock = new Redlock([redis as any], {
  driftFactor: 0.01, // time in ms
  retryCount: 10,
  retryDelay: 200, // time in ms
  retryJitter: 200 // time in ms
});

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent) => {
  const { action, file, fileId, apiUrl } = event.data;

  const lockKey = `lock:${fileId}`;
  const versionKey = `version:${fileId}`;

  try {
    // Acquire a lock with a 10-second TTL
    const lock = await redlock.acquire([lockKey], 10000);

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

            self.postMessage({ status: 'success', result, version });
          } catch (error) {
            if (error instanceof Error) {
              self.postMessage({ status: 'error', error: error.message });
            } else {
              self.postMessage({ status: 'error', error: 'An unknown error occurred' });
            }
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

            self.postMessage({ status: 'success', result, version });
          } catch (error) {
            if (error instanceof Error) {
              self.postMessage({ status: 'error', error: error.message });
            } else {
              self.postMessage({ status: 'error', error: 'An unknown error occurred' });
            }
          }
          break;

        // Add more CRUD operations as needed

        default:
          self.postMessage({ status: 'error', error: 'Unknown action' });
      }
    } finally {
      // Release the lock
      await redlock.unlock(lock);
    }
  } catch (error) {
    self.postMessage({ status: 'error', error: `File ${fileId} is currently locked.` });
  }
};
