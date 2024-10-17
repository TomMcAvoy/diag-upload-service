import React, { useEffect, useState } from 'react';
import { getAllFiles, uploadFile, deleteFile, FileType } from './utils'; // Import the functions and FileType

  const App: React.FC = () => {
  const [items, setItems] = useState<FileType[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch items from the server
    fetchItems();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files ? event.target.files[0] : null);
  };

  const handleFileUpload = async () => {
    if (file) {
      try {
        const result = await uploadFile(file);
        setUploadMessage(result.message);
        fetchItems(); // Refresh the file list after upload
      } catch (error) {
        setUploadMessage('File upload failed');
      }
    } else {
      setUploadMessage('No file selected for upload.');
    }
  };

  const fetchItems = async () => {
    try {
      const data = await getAllFiles();
      setItems(data);
    } catch (error) {
      setError('Failed to fetch items');
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      fetchItems(); // Refresh the file list after deletion
    } catch (error) {
      setError('Failed to delete file');
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all files?')) {
      fetch('http://localhost:8000/files/all', {
        method: 'DELETE',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to delete all files');
          }
          return response.json();
        })
        .then(() => {
          setItems([]);
        })
        .catch(error => {
          setError('Failed to delete all files');
        });
    }
  };

  const handleCheckboxChange = (fileId: string) => {
    setSelectedItems(prevSelectedItems => {
      const newSelectedItems = new Set(prevSelectedItems);
      if (newSelectedItems.has(fileId)) {
        newSelectedItems.delete(fileId);
      } else {
        newSelectedItems.add(fileId);
      }
      return newSelectedItems;
    });
  };

  const handleRowClick = (fileId: string) => {
    setSelectedItems(new Set([fileId]));
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <header style={{ textAlign: 'center' }}>
        <iframe
          src="https://services.whitestartups.com"
          title="White Startups Services"
          style={{
            width: '80%',
            height: '150px',
            border: 'none',
            marginBottom: '20px',
          }}
        ></iframe>
      </header>
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
      <button onClick={handleDeleteAll}>Delete All</button>
      <h2>Uploaded Files</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}></th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>File Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Checksum</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Creation Date</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              onClick={() => handleRowClick(item.id)}
              style={{
                backgroundColor: selectedItems.has(item.id)
                  ? '#d3d3d3'
                  : index % 2 === 0
                  ? '#f9f9f9'
                  : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleCheckboxChange(item.id)}
                />
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.fileName}</td>
              <td style={{ border: '1px solid #ddd', paddingRight: '8px' }}>{item.checksum}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(item.creationDate).toLocaleString()}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
