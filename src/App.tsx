import { useState, useEffect } from 'react';
import { AppMode, PDFFile, PDFPage } from './types/pdf';
import { loadPDFFile } from './utils/pdfUtils';
import { FileUpload } from './components/FileUpload';
import { MergeMode } from './components/MergeMode';
import { SplitMode } from './components/SplitMode';
import './App.css';

function App() {
  const [mode, setMode] = useState<AppMode>('merge');
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // filesが変更されたら、全ページを抽出してpages配列を更新
  useEffect(() => {
    const allPages = files.flatMap((file) => file.pages);
    setPages(allPages);
  }, [files]);

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

  const handleClearAll = () => {
    if (window.confirm('すべてのファイルとページをクリアしますか？')) {
      setFiles([]);
      setPages([]);
    }
  };

  const handlePageReorder = (fromIndex: number, toIndex: number) => {
    const newPages = [...pages];
    const [removed] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, removed);
    setPages(newPages);
  };

  const handlePageRemove = (pageId: string) => {
    setPages(pages.filter((p) => p.id !== pageId));
  };

  const handlePageRotate = (pageId: string) => {
    setPages(
      pages.map((p) =>
        p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const handlePageDuplicate = (pageId: string) => {
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    if (pageIndex !== -1) {
      const originalPage = pages[pageIndex];
      const duplicatedPage = {
        ...originalPage,
        id: `${originalPage.id}-copy-${Date.now()}`,
      };
      const newPages = [...pages];
      newPages.splice(pageIndex + 1, 0, duplicatedPage);
      setPages(newPages);
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
            <div style={{ marginTop: '1rem' }}>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {files.length} ファイル読み込み済み
              </p>
              <p style={{ color: '#718096', fontSize: '0.85rem' }}>
                {pages.length} ページ
              </p>
            </div>
          </aside>

          {mode === 'merge' ? (
            <MergeMode
              pages={pages}
              files={files}
              onPageReorder={handlePageReorder}
              onPageRemove={handlePageRemove}
              onPageRotate={handlePageRotate}
              onPageDuplicate={handlePageDuplicate}
              onClearAll={handleClearAll}
            />
          ) : (
            <SplitMode
              pages={pages}
              files={files}
              onClearAll={handleClearAll}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
