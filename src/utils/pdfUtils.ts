import { PDFDocument, degrees } from 'pdf-lib';
import { PDFFile, PDFPage } from '../types/pdf';

export async function loadPDFFile(file: File): Promise<PDFFile> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  const pages: PDFPage[] = [];

  for (let i = 0; i < pageCount; i++) {
    const thumbnail = await generateThumbnail(arrayBuffer, i);
    pages.push({
      id: `${file.name}-page-${i}`,
      fileId: file.name,
      pageNumber: i,
      thumbnail,
      rotation: 0,
    });
  }

  return {
    id: file.name + '-' + Date.now(),
    name: file.name,
    file,
    pageCount,
    pages,
  };
}

async function generateThumbnail(pdfArrayBuffer: ArrayBuffer, pageIndex: number): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();

    // Create a simple data URL for thumbnail
    // For production, you might want to use PDF.js for better rendering
    const canvas = document.createElement('canvas');
    const scale = 200 / Math.max(width, height);
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Draw page number
      ctx.fillStyle = '#666666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Page ${pageIndex + 1}`, canvas.width / 2, canvas.height / 2);
    }

    return canvas.toDataURL();
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return '';
  }
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
