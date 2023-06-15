import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload } from 'antd';
import React from 'react';
import { useParams } from 'react-router-dom';
import { updateFile, uploadFile } from '../../utils';

const { Dragger } = Upload;
const props: UploadProps = {
  name: 'file',
  multiple: false,
  showUploadList: false,
};

const Uploader = ({setAppState}: {setAppState: (s: string) => void}) => {
  const {id} = useParams();
  props.customRequest = async ({file}) => {
    const castedfile = file as File;
    try {
      if (id) {
        await updateFile(id, castedfile);
        setAppState(`File Updated - ${id}_${castedfile.name}`);
      } else {
        await uploadFile(castedfile);
        setAppState(`File Uploaded - ${castedfile.name}`);
      }
      message.success(`${castedfile.name} file uploaded successfully.`);
    } catch (_e) {
      message.error(`${castedfile.name} file upload failed.`);
    }
  }
  return (
    <Dragger {...props}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag file to this area to {id ? 'update file' : 'upload'}</p>
      <p className="ant-upload-hint">
        Support for a single upload. Strictly prohibit from uploading company data or other
        band files
      </p>
    </Dragger>
  );
}

export default Uploader;