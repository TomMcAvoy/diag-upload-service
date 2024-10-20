import { Space, Table } from 'antd';
import type { ColumnsType } from 'antd/lib/table';
import React, {useState, useEffect} from 'react';
import { Link } from 'react-router-dom';
import { getAllFiles } from '../../utils';

type FileType = {
  id: string;
  name: string;
  downloadUrl: string;
}

const columns: ColumnsType<FileType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: text => <p style={{ minWidth: 500}}>{text}</p>,
  },
  {
    title: '',
    key: 'action',
    render: (_, record) => (
      <Space
        size="middle"
        style={{ display: 'flex', justifyContent: 'space-between',}}
      >
        <Link to={`/${record.id}`}>View</Link>
        <a href={record.downloadUrl} target='_blank' rel="noreferrer">Download</a>
      </Space>
    ),
  },
];


const Files = ({appState}: {appState: string}) => {
  const [files, setFiles] = useState<FileType[]>([]);

  useEffect(() => {
    getAllFiles()
    .then((allFiles: FileType[]) => {
      setFiles([...allFiles])
    })
  }, [appState])
  return (
    <Table
      rowKey={({id}) => id}
      columns={columns}
      dataSource={files}
      pagination={false}
    />
  );
}

export default Files;