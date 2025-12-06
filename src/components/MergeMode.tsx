import React, { useState } from 'react';
import { PDFFile, PDFPage } from '../types/pdf';
import { mergePDFs, downloadPDF } from '../utils/pdfUtils';

interface MergeModeProps {
  pages: PDFPage[];
  files: PDFFile[];
  onPageReorder: (fromIndex: number, toIndex: number) => void;
  onPageRemove: (pageId: string) => void;
  onPageRotate: (pageId: string) => void;
  onPageDuplicate: (pageId: string) => void;
  onClearAll: () => void;
}

export const MergeMode: React.FC<MergeModeProps> = ({
  pages,
  files,
  onPageReorder,
  onPageRemove,
  onPageRotate,
  onPageDuplicate,
  onClearAll,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      onPageReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMerge = async () => {
    if (pages.length === 0) {
      alert('結合するページがありません。PDFファイルをアップロードしてください。');
      return;
    }

    setIsMerging(true);
    try {
      // 各ページに対応するファイルを見つける
      const pageInfos = pages.map((page) => {
        const file = files.find((f) => f.pages.some((p) => p.id === page.id))?.file;
        if (!file) throw new Error(`File not found for page ${page.id}`);
        return {
          file,
          pageNumber: page.pageNumber,
          rotation: page.rotation,
        };
      });

      const mergedBlob = await mergePDFs(pageInfos);
      downloadPDF(mergedBlob, 'merged.pdf');
      alert('PDFの結合が完了しました！');
    } catch (error) {
      console.error('Merge error:', error);
      alert(`PDFの結合中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMerging(false);
    }
  };

  // ファイル名を取得するヘルパー関数
  const getFileName = (pageId: string): string => {
    const file = files.find((f) => f.pages.some((p) => p.id === pageId));
    return file ? file.name : 'Unknown';
  };

  return (
    <div className="work-area">
      <h2>🔗 結合モード</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        ページをドラッグ＆ドロップで並び替えて、結合順を調整できます
      </p>

      {pages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>PDFファイルを読み込んでください</h3>
          <p>左側のエリアからPDFファイルをアップロードしてください</p>
        </div>
      ) : (
        <>
          <div className="page-grid">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`page-card ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
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
                  <br />
                  <small style={{ fontSize: '0.75rem', color: '#718096' }}>
                    {getFileName(page.id)} - P.{page.pageNumber + 1}
                  </small>
                  {page.rotation > 0 && (
                    <span className="rotation-indicator">
                      <br />
                      ↻ {page.rotation}°
                    </span>
                  )}
                </div>
                <div className="page-actions">
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => onPageRotate(page.id)}
                    title="90度回転"
                  >
                    ↻
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => onPageDuplicate(page.id)}
                    title="複製"
                  >
                    📋
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => onPageRemove(page.id)}
                    title="削除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="action-bar">
            <button className="btn btn-secondary" onClick={onClearAll}>
              🗑 すべてクリア
            </button>
            <button
              className="btn btn-primary"
              onClick={handleMerge}
              disabled={isMerging || pages.length === 0}
            >
              {isMerging ? '処理中...' : `⬇️ ${pages.length}ページを結合してダウンロード`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
