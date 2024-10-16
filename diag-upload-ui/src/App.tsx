import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Link
} from "react-router-dom";
import './App.css';
import FileInfo from './components/FileInfo';
import Files from './components/Files';
import Uploader from './components/Uploader';
import { fetcher, uploadFile, getAllFiles, deleteFile, FileType } from './utils';

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
        if (error instanceof Error) {
          setUploadMessage('File upload failed: ' + error.message);
        } else {
          setUploadMessage('File upload failed: An unknown error occurred');
        }
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
      if (error instanceof Error) {
        setUploadMessage('File delete failed: ' + error.message);
      } else {
        setUploadMessage('File delete failed: An unknown error occurred');
      }
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
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Cribl's Diag Upload Service</h1>
          <p>
            API Status is: <span id="api-status" className="App-link">{apiStatus}</span>
          </p>
        </header>
        <main style={{ maxWidth: 760, margin: '0 auto', minHeight: '80vh', padding: 20 }}>
          <Link to='/'>{'< Home'}</Link>
          <div
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                setFile(files[0]);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: '2px dashed #ccc',
              borderRadius: '4px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            Drag and drop files here, or click to select files
            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
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
          <Outlet />
        </main>
      </div>
    </Router>
  );
};

export default App;
