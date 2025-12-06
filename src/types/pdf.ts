export interface PDFFile {
  id: string;
  name: string;
  file: File;
  pageCount: number;
  pages: PDFPage[];
}

export interface PDFPage {
  id: string;
  fileId: string;
  pageNumber: number;
  thumbnail: string;
  rotation: number; // 0, 90, 180, 270
}

export interface OutputPage extends PDFPage {
  order: number;
}

export type AppMode = 'merge' | 'split';

export interface SplitRange {
  start: number;
  end: number;
}
