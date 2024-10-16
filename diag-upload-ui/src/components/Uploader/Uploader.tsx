import React from 'react';

interface UploaderProps {
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleFileUpload: () => Promise<void>;
}

const Uploader: React.FC<UploaderProps> = ({ setFile, handleFileUpload }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files ? event.target.files[0] : null);
  };

  return (
    <div>
      <div
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          setFile(files[0]);
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
    </div>
  );
};

export default Uploader;
