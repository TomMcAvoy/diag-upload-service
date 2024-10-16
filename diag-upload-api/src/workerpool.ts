import { Worker } from 'worker_threads';
import path from 'path';

export class WorkerPool {
  private workers: Worker[];
  private queue: any[];
  private apiUrl: string;

  constructor(workerCount: number, apiUrl: string) {
    this.workers = [];
    this.queue = [];
    this.apiUrl = apiUrl;

    const workerPath = path.resolve(__dirname, './fileWorker.js'); // Ensure the correct file extension

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(workerPath);
      worker.on('message', this.handleWorkerMessage.bind(this));
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(message: any) {
    const { status, result, error } = message;
    const callback = this.queue.shift();
    if (callback) {
      if (status === 'success') {
        callback.resolve(result);
      } else {
        callback.reject(error);
      }
    }
  }

  private getAvailableWorker(): Worker | null {
    return this.workers.find((worker) => worker.threadId === null) || null;
  }

  private enqueueTask(task: any) {
    this.queue.push(task);
    this.processQueue();
  }

  private processQueue() {
    const worker = this.getAvailableWorker();
    if (worker && this.queue.length > 0) {
      const task = this.queue.shift();
      worker.on('message', this.handleWorkerMessage.bind(this));
      worker.postMessage(task);
    }
  }

  public uploadFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      this.enqueueTask({
        action: 'upload',
        file,
        apiUrl: this.apiUrl,
        resolve,
        reject
      });
    });
  }

  public deleteFile(fileId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.enqueueTask({
        action: 'delete',
        fileId,
        apiUrl: this.apiUrl,
        resolve,
        reject
      });
    });
  }
}

