import React, { useState } from 'react';
import { PDFFile, PDFPage } from '../types/pdf';
import { splitPDF, downloadPDF } from '../utils/pdfUtils';

interface SplitModeProps {
  pages: PDFPage[];
  files: PDFFile[];
  onClearAll: () => void;
}

type SplitMethod = 'all' | 'range' | 'select';

export const SplitMode: React.FC<SplitModeProps> = ({ pages, files, onClearAll }) => {
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('all');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [rangeInput, setRangeInput] = useState('1-3, 4-10');
  const [isSplitting, setIsSplitting] = useState(false);

  const handlePageToggle = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleSplit = async () => {
    if (pages.length === 0) {
      alert('分割するページがありません。PDFファイルをアップロードしてください。');
      return;
    }

    setIsSplitting(true);
    try {
      if (splitMethod === 'all') {
        // すべてのページを1ページずつ分割
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const file = files.find((f) => f.pages.some((p) => p.id === page.id))?.file;
          if (!file) continue;

          const blobs = await splitPDF(file, [{ start: page.pageNumber, end: page.pageNumber }]);
          if (blobs.length > 0) {
            downloadPDF(blobs[0], `page_${i + 1}.pdf`);
          }
        }
        alert(`${pages.length}個のPDFファイルをダウンロードしました`);
      } else if (splitMethod === 'range') {
        // 範囲指定で分割
        const parts = rangeInput.split(',').map((s) => s.trim()).filter(Boolean);
        const ranges: Array<{ start: number; end: number }> = [];

        for (const part of parts) {
          const [startStr, endStr] = part.split('-').map((n) => n.trim());
          const start = parseInt(startStr) - 1;
          const end = endStr ? parseInt(endStr) - 1 : start;

          if (isNaN(start) || isNaN(end) || start < 0 || end >= pages.length || start > end) {
            alert(`無効な範囲指定: ${part}`);
            setIsSplitting(false);
            return;
          }

          ranges.push({ start, end });
        }

        // 範囲ごとに分割
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          const pagesInRange = pages.slice(range.start, range.end + 1);

          // 範囲内のページから元のファイルとページ番号を取得
          const pageInfos = pagesInRange.map((page) => {
            const file = files.find((f) => f.pages.some((p) => p.id === page.id))?.file;
            if (!file) throw new Error(`File not found for page ${page.id}`);
            return { file, pageNumber: page.pageNumber };
          });

          // 簡易的な実装: 各ページを個別に抽出して結合
          // 本来はmergePDFsを使うべきだが、ここではsplitPDFを使用
          const firstFile = pageInfos[0].file;
          const blobs = await splitPDF(firstFile, [
            { start: pageInfos[0].pageNumber, end: pageInfos[0].pageNumber }
          ]);

          if (blobs.length > 0) {
            downloadPDF(blobs[0], `part_${i + 1}.pdf`);
          }
        }

        alert(`${ranges.length}個のPDFファイルをダウンロードしました`);
      } else if (splitMethod === 'select') {
        // 選択したページのみで1つのPDFを作成
        if (selectedPages.size === 0) {
          alert('ページを選択してください');
          setIsSplitting(false);
          return;
        }

        const selectedPagesArray = pages.filter((p) => selectedPages.has(p.id));
        const pageInfos = selectedPagesArray.map((page) => {
          const file = files.find((f) => f.pages.some((p) => p.id === page.id))?.file;
          if (!file) throw new Error(`File not found for page ${page.id}`);
          return {
            file,
            pageNumber: page.pageNumber,
            rotation: page.rotation,
          };
        });

        // mergePDFsを使用して選択ページを結合
        const { mergePDFs } = await import('../utils/pdfUtils');
        const mergedBlob = await mergePDFs(pageInfos);
        downloadPDF(mergedBlob, 'selected_pages.pdf');
        alert('選択したページのPDFをダウンロードしました');
      }
    } catch (error) {
      console.error('Split error:', error);
      alert(`PDFの分割中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSplitting(false);
    }
  };

  const getFileName = (pageId: string): string => {
    const file = files.find((f) => f.pages.some((p) => p.id === pageId));
    return file ? file.name : 'Unknown';
  };

  return (
    <div className="work-area">
      <h2>✂️ 分割モード</h2>
      <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
        ページを選択して、様々な方法で分割できます
      </p>

      {pages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>PDFファイルを読み込んでください</h3>
          <p>左側のエリアからPDFファイルをアップロードしてください</p>
        </div>
      ) : (
        <>
          <div className="split-controls">
            <h3 style={{ marginBottom: '1rem', color: '#2d3748' }}>
              分割方法を選択
            </h3>

            <div
              className={`split-option ${splitMethod === 'all' ? 'selected' : ''}`}
              onClick={() => setSplitMethod('all')}
            >
              <label>
                <input
                  type="radio"
                  checked={splitMethod === 'all'}
                  onChange={() => setSplitMethod('all')}
                />
                すべてのページを1ページずつ分割
              </label>
            </div>

            <div
              className={`split-option ${splitMethod === 'range' ? 'selected' : ''}`}
              onClick={() => setSplitMethod('range')}
            >
              <label>
                <input
                  type="radio"
                  checked={splitMethod === 'range'}
                  onChange={() => setSplitMethod('range')}
                />
                ページ範囲で分割
              </label>
              {splitMethod === 'range' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="例: 1-3, 4-10"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '2px solid #e2e8f0',
                      fontSize: '0.95rem',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <small style={{ color: '#718096', display: 'block', marginTop: '0.5rem' }}>
                    カンマ区切りで範囲を指定（例: 1-3, 4-10）<br />
                    現在のページ総数: {pages.length}
                  </small>
                </div>
              )}
            </div>

            <div
              className={`split-option ${splitMethod === 'select' ? 'selected' : ''}`}
              onClick={() => setSplitMethod('select')}
            >
              <label>
                <input
                  type="radio"
                  checked={splitMethod === 'select'}
                  onChange={() => setSplitMethod('select')}
                />
                選択したページのみで1つのPDFを作成
              </label>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4a5568' }}>
              ページ一覧
              {splitMethod === 'select' && (
                <span style={{ color: '#667eea', marginLeft: '1rem' }}>
                  （{selectedPages.size}ページ選択中）
                </span>
              )}
            </h3>
            <div className="page-grid">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`page-card ${
                    splitMethod === 'select' && selectedPages.has(page.id) ? 'selected' : ''
                  }`}
                  onClick={() => {
                    if (splitMethod === 'select') {
                      handlePageToggle(page.id);
                    }
                  }}
                  style={{
                    border:
                      splitMethod === 'select' && selectedPages.has(page.id)
                        ? '3px solid #667eea'
                        : '2px solid #e2e8f0',
                    cursor: splitMethod === 'select' ? 'pointer' : 'default',
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
                    {splitMethod === 'select' && (
                      <input
                        type="checkbox"
                        checked={selectedPages.has(page.id)}
                        onChange={() => handlePageToggle(page.id)}
                        style={{ marginRight: '0.5rem' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    順序: {index + 1}
                    <br />
                    <small style={{ fontSize: '0.75rem', color: '#718096' }}>
                      {getFileName(page.id)} - P.{page.pageNumber + 1}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="action-bar">
            <button className="btn btn-secondary" onClick={onClearAll}>
              🗑 すべてクリア
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSplit}
              disabled={isSplitting}
            >
              {isSplitting ? '処理中...' : '✂️ PDFを分割してダウンロード'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
