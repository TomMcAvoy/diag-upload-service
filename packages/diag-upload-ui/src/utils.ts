import goatUrl from "./goatUrl";

export const basePath = 'http://localhost:8000';

export const fetcher = async (path: string, opts?: RequestInit) => {
    const response = await fetch(`${basePath}${path}`, opts);
    if (response.ok) {
      return response.json();
    }
    throw new Error(await response.text())
};

export type FileType = {
  id: string;
  name: string;
  downloadUrl: string;
}

const sampleFiles = [
  { id: 'file-1', name: 'File One', downloadUrl: goatUrl},
  { id: 'file-2', name: 'File Two', downloadUrl: goatUrl},
  { id: 'file-3', name: 'File Three', downloadUrl: goatUrl},
  { id: 'file-4', name: 'File Four', downloadUrl: goatUrl},
  { id: 'file-5', name: 'File Five', downloadUrl: goatUrl},
];

export const getAllFiles = async () => {
  // Replace the below sample data with fetch to diag-upload-api
  return sampleFiles;
}

export const uploadFile = async (file: File) => {
  sampleFiles.unshift({
    id: `file-${sampleFiles.length + 1}`,
    name: file?.name ?? `Sample filename ${sampleFiles.length + 1}`,
    downloadUrl: goatUrl
  });
  return {message: 'Successfully uploaded'};
}

export const getFileMeta = async (fileId: string) => {
  const file = sampleFiles.find(({id}) => id === fileId);
  if (!file) throw new Error('File not found');
  return file;
}

export const updateFile = async (fileId: string, file: File) => {
  const fileIdx = sampleFiles.findIndex(({id}) => id === fileId);
  if (!fileIdx) throw new Error('File not found');
  sampleFiles[fileIdx] = {
    ...sampleFiles[fileIdx],
    name: file?.name ?? `Updated filename ${sampleFiles.length + 1}`,
    downloadUrl: goatUrl
  }
  return file;
}

export const deleteFile = async (fileId: string) => {
  const id = sampleFiles.findIndex(({id}) => id === fileId);
  sampleFiles.splice(id, 1);
}