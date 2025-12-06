import React, { useState } from 'react';
import { PDFFile } from '../types/pdf';
import { splitPDF, downloadPDF } from '../utils/pdfUtils';

interface SplitModeProps {
  files: PDFFile[];
  selectedFileId: string | null;
}

type SplitMethod = 'all' | 'range' | 'select';

export const SplitMode: React.FC<SplitModeProps> = ({ files, selectedFileId }) => {
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('all');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('1-3, 4-10');

  const selectedFile = files.find((f) => f.id === selectedFileId);

  const handlePageToggle = (pageNumber: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNumber)) {
      newSelected.delete(pageNumber);
    } else {
      newSelected.add(pageNumber);
    }
    setSelectedPages(newSelected);
  };

  const handleSplit = async () => {
    if (!selectedFile) {
      alert('分割するPDFファイルを選択してください');
      return;
    }

    try {
      let ranges: Array<{ start: number; end: number }> = [];

      if (splitMethod === 'all') {
        ranges = Array.from({ length: selectedFile.pageCount }, (_, i) => ({
          start: i,
          end: i,
        }));
      } else if (splitMethod === 'range') {
        // Parse range input like "1-3, 4-10"
        const parts = rangeInput.split(',').map((s) => s.trim());
        ranges = parts.map((part) => {
          const [start, end] = part.split('-').map((n) => parseInt(n.trim()) - 1);
          return { start, end: end !== undefined ? end : start };
        });
      } else if (splitMethod === 'select') {
        if (selectedPages.size === 0) {
          alert('ページを選択してください');
          return;
        }
        const pages = Array.from(selectedPages).sort((a, b) => a - b);
        ranges = [{ start: pages[0], end: pages[pages.length - 1] }];
      }

      const blobs = await splitPDF(selectedFile.file, ranges);
      blobs.forEach((blob, index) => {
        const filename = `${selectedFile.name.replace('.pdf', '')}_part${
          index + 1
        }.pdf`;
        downloadPDF(blob, filename);
      });

      alert(`${blobs.length}個のPDFファイルをダウンロードしました`);
    } catch (error) {
      console.error('Split error:', error);
      alert('PDFの分割中にエラーが発生しました');
    }
  };

  return (
    <div className="work-area">
      <h2>✂️ 分割モード</h2>

      {!selectedFile ? (
        <div className="empty-state">
          <div className="empty-state-icon">👈</div>
          <h3>PDFファイルを選択してください</h3>
          <p>左側のリストから分割したいPDFをクリックしてください</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#4a5568' }}>
              選択中: {selectedFile.name} ({selectedFile.pageCount} ページ)
            </h3>
          </div>

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
              className={`split-option ${
                splitMethod === 'range' ? 'selected' : ''
              }`}
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
                  <small style={{ color: '#718096', marginTop: '0.5rem' }}>
                    カンマ区切りで範囲を指定（例: 1-3, 4-10）
                  </small>
                </div>
              )}
            </div>

            <div
              className={`split-option ${
                splitMethod === 'select' ? 'selected' : ''
              }`}
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

          {splitMethod === 'select' && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#4a5568' }}>
                ページを選択
              </h3>
              <div className="page-grid">
                {selectedFile.pages.map((page) => (
                  <div
                    key={page.id}
                    className={`page-card ${
                      selectedPages.has(page.pageNumber) ? 'selected' : ''
                    }`}
                    onClick={() => handlePageToggle(page.pageNumber)}
                    style={{
                      border: selectedPages.has(page.pageNumber)
                        ? '3px solid #667eea'
                        : '2px solid transparent',
                    }}
                  >
                    <img
                      src={page.thumbnail}
                      alt={`Page ${page.pageNumber + 1}`}
                      className="page-thumbnail"
                    />
                    <div className="page-info">
                      <input
                        type="checkbox"
                        checked={selectedPages.has(page.pageNumber)}
                        onChange={() => handlePageToggle(page.pageNumber)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      ページ {page.pageNumber + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-bar">
            <button className="btn btn-primary" onClick={handleSplit}>
              ✂️ PDFを分割してダウンロード
            </button>
          </div>
        </>
      )}
    </div>
  );
};
