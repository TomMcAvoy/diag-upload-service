import { Space, Table } from 'antd';
import type { ColumnsType } from 'antd/lib/table';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllFiles, FileType } from '../../utils'; // Import the updated FileType

const columns: ColumnsType<FileType> = [
  {
    title: 'Name',
    dataIndex: 'fileName', // Ensure this matches your API
    key: 'fileName',
    render: text => <p style={{ minWidth: 500 }}>{text}</p>,
  },
  {
    title: '',
    key: 'action',
    render: (_, record) => (
      <Space
        size="middle"
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <Link to={`/${record.id}`}>View</Link>
      </Space>
    ),
  },
];

const Files = ({ appState }: { appState: string }) => {
  const [files, setFiles] = useState<FileType[]>([]);

  useEffect(() => {
    getAllFiles()
      .then((allFiles: FileType[]) => {
        setFiles([...allFiles]);
      })
      .catch((error) => {
        console.error('Error fetching files:', error);
      });
  }, [appState]);

  return (
    <Table
      rowKey={({ id }) => id}
      columns={columns}
      dataSource={files}
      pagination={false}
    />
  );
};

export default Files;
