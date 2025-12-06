import React, { useState } from 'react';
import { PDFFile, PDFPage, OutputPage } from '../types/pdf';
import { mergePDFs, downloadPDF } from '../utils/pdfUtils';

interface MergeModeProps {
  files: PDFFile[];
}

export const MergeMode: React.FC<MergeModeProps> = ({ files }) => {
  const [outputPages, setOutputPages] = useState<OutputPage[]>([]);
  const [draggedPage, setDraggedPage] = useState<PDFPage | null>(null);

  const handleDragStart = (page: PDFPage) => {
    setDraggedPage(page);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToOutput = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedPage) {
      const newPage: OutputPage = {
        ...draggedPage,
        order: outputPages.length,
      };
      setOutputPages([...outputPages, newPage]);
      setDraggedPage(null);
    }
  };

  const handleRemovePage = (index: number) => {
    setOutputPages(outputPages.filter((_, i) => i !== index));
  };

  const handleRotatePage = (index: number) => {
    const newPages = [...outputPages];
    newPages[index] = {
      ...newPages[index],
      rotation: (newPages[index].rotation + 90) % 360,
    };
    setOutputPages(newPages);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newPages = [...outputPages];
    const [removed] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, removed);
    setOutputPages(newPages);
  };

  const handleMerge = async () => {
    if (outputPages.length === 0) {
      alert('結合するページを追加してください');
      return;
    }

    try {
      const pageInfos = outputPages.map((page) => {
        const file = files.find((f) => f.id === page.fileId)?.file;
        if (!file) throw new Error('File not found');
        return {
          file,
          pageNumber: page.pageNumber,
          rotation: page.rotation,
        };
      });

      const mergedBlob = await mergePDFs(pageInfos);
      downloadPDF(mergedBlob, 'merged.pdf');
    } catch (error) {
      console.error('Merge error:', error);
      alert('PDFの結合中にエラーが発生しました');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('すべてのページをクリアしますか？')) {
      setOutputPages([]);
    }
  };

  return (
    <div className="work-area">
      <h2>📄 結合モード</h2>

      {files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>PDFファイルを読み込んでください</h3>
          <p>左側のエリアからPDFファイルをアップロードしてください</p>
        </div>
      ) : (
        <>
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#4a5568' }}>
              入力PDFのページ一覧
            </h3>
            <div className="page-grid">
              {files.flatMap((file) =>
                file.pages.map((page) => (
                  <div
                    key={page.id}
                    className="page-card"
                    draggable
                    onDragStart={() => handleDragStart(page)}
                  >
                    <img
                      src={page.thumbnail}
                      alt={`Page ${page.pageNumber + 1}`}
                      className="page-thumbnail"
                    />
                    <div className="page-info">
                      {file.name} - P.{page.pageNumber + 1}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{ marginTop: '2rem' }}
            onDragOver={handleDragOver}
            onDrop={handleDropToOutput}
          >
            <h3 style={{ marginBottom: '1rem', color: '#4a5568' }}>
              📋 出力タイムライン（ドラッグ＆ドロップでページを追加）
            </h3>

            {outputPages.length === 0 ? (
              <div
                style={{
                  border: '3px dashed #cbd5e0',
                  borderRadius: '12px',
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#718096',
                  background: '#f7fafc',
                }}
              >
                <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  ⬆️ ここにページをドロップ
                </p>
                <small>上のページをドラッグ＆ドロップで追加できます</small>
              </div>
            ) : (
              <div className="page-grid">
                {outputPages.map((page, index) => (
                  <div
                    key={`output-${page.id}-${index}`}
                    className="page-card"
                    draggable
                    onDragStart={() => setDraggedPage(page)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedPage) {
                        const fromIndex = outputPages.findIndex(
                          (p) => p.id === draggedPage.id
                        );
                        if (fromIndex !== -1 && fromIndex !== index) {
                          handleReorder(fromIndex, index);
                        }
                      }
                    }}
                  >
                    <img
                      src={page.thumbnail}
                      alt={`Page ${page.pageNumber + 1}`}
                      className="page-thumbnail"
                      style={{
                        transform: `rotate(${page.rotation}deg)`,
                      }}
                    />
                    <div className="page-info">
                      順序: {index + 1}
                      {page.rotation > 0 && (
                        <span className="rotation-indicator">
                          ↻ {page.rotation}°
                        </span>
                      )}
                    </div>
                    <div className="page-actions">
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleRotatePage(index)}
                        title="90度回転"
                      >
                        ↻ 回転
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleRemovePage(index)}
                        title="削除"
                      >
                        🗑 削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="action-bar">
            <button className="btn btn-secondary" onClick={handleClearAll}>
              🗑 すべてクリア
            </button>
            <button
              className="btn btn-primary"
              onClick={handleMerge}
              disabled={outputPages.length === 0}
            >
              ⬇️ PDFを結合してダウンロード
            </button>
          </div>
        </>
      )}
    </div>
  );
};
