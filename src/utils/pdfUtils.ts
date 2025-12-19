import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFFile, PDFPage } from '../types/pdf';

// PDF.js worker設定（Viteのbase pathを考慮）
const baseUrl = import.meta.env.BASE_URL || '/';
pdfjsLib.GlobalWorkerOptions.workerSrc = `${baseUrl}assets/pdf.worker.min.mjs`;

export async function loadPDFFile(file: File): Promise<PDFFile> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  const pages: PDFPage[] = [];

  // PDF.jsドキュメントを一度だけロード
  let pdfJsDoc = null;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfJsDoc = await loadingTask.promise;

    for (let i = 0; i < pageCount; i++) {
      const thumbnail = await generateThumbnail(pdfJsDoc, i);
      pages.push({
        id: `${file.name}-page-${i}`,
        fileId: file.name,
        pageNumber: i,
        thumbnail,
        rotation: 0,
      });
    }
  } catch (error) {
    console.error('Error loading PDF with PDF.js:', error);
    // フォールバック: PDF.jsが失敗した場合、簡易サムネイルを使用
    for (let i = 0; i < pageCount; i++) {
      const thumbnail = generateFallbackThumbnail(i);
      pages.push({
        id: `${file.name}-page-${i}`,
        fileId: file.name,
        pageNumber: i,
        thumbnail,
        rotation: 0,
      });
    }
  } finally {
    // PDFドキュメントをクリーンアップ
    if (pdfJsDoc) {
      pdfJsDoc.cleanup();
      pdfJsDoc.destroy();
    }
  }

  return {
    id: file.name + '-' + Date.now(),
    name: file.name,
    file,
    pageCount,
    pages,
  };
}

async function generateThumbnail(pdfDoc: any, pageIndex: number): Promise<string> {
  try {
    const page = await pdfDoc.getPage(pageIndex + 1); // PDF.jsは1始まり

    // サムネイルのスケールを設定（最大幅200px）
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = 200 / Math.max(viewport.width, viewport.height);
    const scaledViewport = page.getViewport({ scale });

    // Canvasを作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Canvasのサイズを設定
    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);

    // PDFページをCanvasに描画
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    };

    await page.render(renderContext as any).promise;

    // ページをクリーンアップ
    page.cleanup();

    // CanvasをData URLに変換
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error(`Error generating thumbnail for page ${pageIndex + 1}:`, error);
    return generateFallbackThumbnail(pageIndex);
  }
}

function generateFallbackThumbnail(pageIndex: number): string {
  // エラー時はフォールバック用の簡易サムネイルを生成
  const canvas = document.createElement('canvas');
  canvas.width = 150;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cccccc';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageIndex + 1}`, canvas.width / 2, canvas.height / 2);
  }

  return canvas.toDataURL();
}

export async function mergePDFs(
  pages: Array<{ file: File; pageNumber: number; rotation: number }>
): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const pageInfo of pages) {
    const arrayBuffer = await pageInfo.file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const [copiedPage] = await mergedPdf.copyPages(pdf, [pageInfo.pageNumber]);

    if (pageInfo.rotation !== 0) {
      copiedPage.setRotation(degrees(pageInfo.rotation));
    }

    mergedPdf.addPage(copiedPage);
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
}

export async function splitPDF(
  file: File,
  ranges: Array<{ start: number; end: number }>
): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const results: Blob[] = [];

  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const pageIndices = [];

    for (let i = range.start; i <= range.end; i++) {
      pageIndices.push(i);
    }

    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => {
      newPdf.addPage(page);
    });

    const pdfBytes = await newPdf.save();
    results.push(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }));
  }

  return results;
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
