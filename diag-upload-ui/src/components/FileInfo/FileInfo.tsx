import { message, Button, Descriptions } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileType, getFileMeta, deleteFile } from '../../utils';

const File = ({ appState }: { appState: string }) => {
  const { fileId } = useParams();
  const [file, setFile] = useState<FileType>();
  const navigate = useNavigate();

  const getFile = useCallback(async () => {
    if (!fileId) return;
    try {
      const fileMeta = await getFileMeta(fileId);
      setFile(fileMeta);
    } catch (error) {
      message.error('File not found');
    }
  }, [fileId]);

  const handleDelete = async () => {
    if (!file) return;
    try {
      await deleteFile(file.fileId);
      navigate('/');
    } catch (error) {
      message.error('Cannot delete file');
    }
  };

  useEffect(() => {
    getFile();
  }, [getFile, appState]);

  if (!file) return null;
  return (
    <Descriptions title="File Data" column={1} bordered>
      <Descriptions.Item label="fileId">{file.fileId}</Descriptions.Item>
      <Descriptions.Item label="File Name">{file.fileName}</Descriptions.Item>
      <Descriptions.Item label="Checksum">{file.checksum}</Descriptions.Item>
      <Descriptions.Item label="Creation Date">
        {new Date(file.creationDate).toLocaleString()}
      </Descriptions.Item>
      <Descriptions.Item label="Danger" labelStyle={{ color: 'red' }}>
        <Button onClick={handleDelete}>Delete File</Button>
      </Descriptions.Item>
    </Descriptions>
  );
};

export default File;
