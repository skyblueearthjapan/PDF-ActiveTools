import { useState } from 'react';
import { AppMode, PDFFile } from './types/pdf';
import { loadPDFFile } from './utils/pdfUtils';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { MergeMode } from './components/MergeMode';
import { SplitMode } from './components/SplitMode';
import './App.css';

function App() {
  const [mode, setMode] = useState<AppMode>('merge');
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilesAdded = async (newFiles: File[]) => {
    setIsLoading(true);
    try {
      const loadedFiles = await Promise.all(
        newFiles.map((file) => loadPDFFile(file))
      );
      setFiles([...files, ...loadedFiles]);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('PDFファイルの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDelete = (fileId: string) => {
    setFiles(files.filter((f) => f.id !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>📄 PDF Active Tools</h1>
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'merge' ? 'active' : ''}`}
              onClick={() => setMode('merge')}
            >
              🔗 Merge（結合）
            </button>
            <button
              className={`mode-tab ${mode === 'split' ? 'active' : ''}`}
              onClick={() => setMode('split')}
            >
              ✂️ Split（分割）
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="workspace">
          <aside className="sidebar">
            <h2>📁 PDFファイル</h2>
            <FileUpload onFilesAdded={handleFilesAdded} />
            {isLoading && (
              <div style={{ textAlign: 'center', color: '#667eea', margin: '1rem 0' }}>
                読み込み中...
              </div>
            )}
            <FileList
              files={files}
              selectedFileId={selectedFileId}
              onFileSelect={setSelectedFileId}
              onFileDelete={handleFileDelete}
            />
          </aside>

          {mode === 'merge' ? (
            <MergeMode files={files} />
          ) : (
            <SplitMode files={files} selectedFileId={selectedFileId} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
