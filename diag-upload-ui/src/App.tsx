import React, { useState, useEffect } from 'react';
import { fetcher, uploadFile, getAllFiles, getFileMeta, deleteFile, FileType } from './utils';
import './App.css';

enum APIStatus {
  Online = 'Online',
  Offline = 'Offline',
}

const App: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<APIStatus>(APIStatus.Offline);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [files, setFiles] = useState<FileType[]>([]);

  const getApiStatus = async () => {
    try {
      await fetcher('/');
      setApiStatus(APIStatus.Online);
    } catch (error) {
      console.error('Api status error', error);
      setApiStatus(APIStatus.Offline);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files ? event.target.files[0] : null);
  };

  const handleFileUpload = async () => {
    if (file) {
      try {
        const response = await uploadFile(file);
        setUploadMessage(response.message);
        fetchFiles(); // Refresh the file list after upload
      } catch (error) {
        console.error('File upload error', error);
        setUploadMessage('File upload failed: ' + error.message);
      }
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const response = await deleteFile(fileId);
      setUploadMessage(response.message);
      fetchFiles(); // Refresh the file list after deletion
    } catch (error) {
      console.error('File delete error', error);
      setUploadMessage('File delete failed: ' + error.message);
    }
  };

  const fetchFiles = async () => {
    try {
      const files = await getAllFiles();
      setFiles(files);
    } catch (error) {
      console.error('Error fetching files', error);
    }
  };

  useEffect(() => {
    getApiStatus();
    fetchFiles();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cribl's Diag Upload Service</h1>
        <p>
          API Status is: <span id="api-status" className="App-link">{apiStatus}</span>
        </p>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload File</button>
        {uploadMessage && <p>{uploadMessage}</p>}
        <h2>Uploaded Files</h2>
        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">{file.name}</a>
              <button onClick={() => handleFileDelete(file.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </header>
    </div>
  );
};

export default App;
