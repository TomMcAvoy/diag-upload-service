import React, { useEffect, useState } from 'react';

interface Item {
  fileId: string;
  fileName: string;
  checksum: string;
}

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  useEffect(() => {
    // Fetch items from the server
    fetch('http://localhost:8000/files')
      .then(response => response.json())
      .then(data => setItems(data))
      .catch(error => console.error('Error fetching items:', error));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files ? event.target.files[0] : null);
  };

  const handleFileUpload = async () => {
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        setUploadMessage(result.message);
        fetchItems(); // Refresh the file list after upload
      } catch (error) {
        console.error('File upload error', error);
        setUploadMessage('File upload failed');
      }
    } else {
      setUploadMessage('No file selected for upload.');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:8000/files');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/files/${fileId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      setUploadMessage(result.message);
      fetchItems(); // Refresh the file list after deletion
    } catch (error) {
      console.error('File delete error', error);
      setUploadMessage('File delete failed');
    }
  };

  return (
    <div>
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
        {items.map((item) => (
          <li key={item.fileId}>
            <strong>{item.fileName}</strong> (UUID: {item.fileId}, Checksum: {item.checksum})
            <button onClick={() => handleFileDelete(item.fileId)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
