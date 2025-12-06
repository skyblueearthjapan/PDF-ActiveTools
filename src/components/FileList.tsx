import React from 'react';
import { PDFFile } from '../types/pdf';

interface FileListProps {
  files: PDFFile[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileId,
  onFileSelect,
  onFileDelete,
}) => {
  return (
    <div className="file-list">
      {files.map((file) => (
        <div
          key={file.id}
          className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`}
          onClick={() => onFileSelect(file.id)}
        >
          <div className="file-item-header">
            <h3>{file.name}</h3>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`"${file.name}" を削除しますか？`)) {
                  onFileDelete(file.id);
                }
              }}
            >
              🗑
            </button>
          </div>
          <div className="file-item-info">{file.pageCount} ページ</div>
        </div>
      ))}
    </div>
  );
};
