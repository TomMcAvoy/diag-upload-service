import React, { useEffect, useState } from 'react';

interface Item {
  fileId: string;
  fileName: string;
  checksum: string;
  creationDate: string; // Add creationDate to the Item interface
}

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        console.log('Upload result:', result); // Debug: Output upload result
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
      const response = await fetch('http://localhost:8000/files/metadata');
      const data = await response.json();
      console.log('Fetched items:', data); // Debug: Output fetched items
      data.forEach((item: Item) => {
        console.log('Fetched creationDate:', item.creationDate); // Debug: Output each creationDate
      });
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to fetch items');
    }
  };

  const handleDelete = (fileName: string) => {
    fetch(`http://localhost:8000/files/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('File delete error');
        }
        return response.json();
      })
      .then(data => {
        console.log('Delete result:', data); // Debug: Output delete result
        setItems(data.files);
      })
      .catch(error => {
        console.error('File delete error', error);
        setError('Failed to delete file');
      });
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
          console.log('All files deleted'); // Debug: Output delete all result
          setItems([]);
        })
        .catch(error => {
          console.error('Failed to delete all files', error);
          setError('Failed to delete all files');
        });
    }
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
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>File Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Checksum</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Creation Date</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.fileId}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.fileName}</td>
              <td style={{ border: '1px solid #ddd', paddingRight: '8px' }}>{item.checksum}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(item.creationDate).toLocaleString()}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                <button onClick={() => handleDelete(item.fileName)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
