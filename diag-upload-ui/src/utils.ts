import goatUrl from "./goatUrl";

export type FileType = {
  id: string;
  fileName: string;
  checksum: string;
  creationDate: string;
};

const basePath = 'http://localhost:8000';

export const fetcher = async (path: string, opts?: RequestInit) => {
  const response = await fetch(`${basePath}${path}`, opts);
  if (response.ok) {
    return response.json();
  }
  throw new Error(await response.text());
};

// Fetch all files metadata from the backend
export const getAllFiles = async (): Promise<FileType[]> => {
  const files = await fetcher('/files/metadata');
  return files;
};

// Upload a file to the backend
export const uploadFile = async (file: File): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${basePath}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    return response.json();
  }
  throw new Error(await response.text());
};

// Update a specific file
export const updateFile = async (fileId: string, file: File): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${basePath}/files/${fileId}`, {
    method: 'PUT',
    body: formData,
  });

  if (response.ok) {
    return response.json();
  }
  throw new Error(await response.text());
};

// Get metadata of a specific file
export const getFileMeta = async (fileId: string): Promise<FileType> => {
  return await fetcher(`/files/${fileId}`);
};

// Delete a specific file
export const deleteFile = async (fileId: string): Promise<{ message: string }> => {
  const response = await fetch(`${basePath}/files/${fileId}`, {
    method: 'DELETE',
  });

  if (response.ok) {
    return response.json();
  }
  throw new Error(await response.text());
};
