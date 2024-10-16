import { Worker } from 'worker_threads';
import path from 'path';

describe('fileWorker', () => {
  let worker: Worker;

  beforeEach(() => {
    worker = new Worker(path.resolve(__dirname, './fileWorker.ts'));
  });

  afterEach(() => {
    worker.terminate();
  });

  it('should handle file upload successfully', (done) => {
    const mockFile = new Blob(['file content'], { type: 'text/plain' });
    const mockApiUrl = 'http://localhost:8000';

    worker.on('message', (message) => {
      expect(message.status).toBe('success');
      expect(message.result).toBeDefined();
      done();
    });

    worker.on('error', (error) => {
      done(error);
    });

    worker.postMessage({
      action: 'upload',
      file: mockFile,
      apiUrl: mockApiUrl,
    });
  });

  it('should handle file upload error', (done) => {
    const mockFile = new Blob(['file content'], { type: 'text/plain' });
    const mockApiUrl = 'http://invalid-url';

    worker.on('message', (message) => {
      expect(message.status).toBe('error');
      expect(message.error).toBeDefined();
      done();
    });

    worker.on('error', (error) => {
      done(error);
    });

    worker.postMessage({
      action: 'upload',
      file: mockFile,
      apiUrl: mockApiUrl,
    });
  });

  it('should handle file delete successfully', (done) => {
    const mockFileId = 'some-file-id';
    const mockApiUrl = 'http://localhost:8000';

    worker.on('message', (message) => {
      expect(message.status).toBe('success');
      expect(message.result).toBeDefined();
      done();
    });

    worker.on('error', (error) => {
      done(error);
    });

    worker.postMessage({
      action: 'delete',
      fileId: mockFileId,
      apiUrl: mockApiUrl,
    });
  });

  it('should handle file delete error', (done) => {
    const mockFileId = 'some-file-id';
    const mockApiUrl = 'http://invalid-url';

    worker.on('message', (message) => {
      expect(message.status).toBe('error');
      expect(message.error).toBeDefined();
      done();
    });

    worker.on('error', (error) => {
      done(error);
    });

    worker.postMessage({
      action: 'delete',
      fileId: mockFileId,
      apiUrl: mockApiUrl,
    });
  });
});
