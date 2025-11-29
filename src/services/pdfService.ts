
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Handle ESM import variations for pdfjs-dist
// In some browser environments (like JSDelivr +esm), the exports might be wrapped in the default object.
const pdfjs = (pdfjsLib as any).default?.getDocument ? (pdfjsLib as any).default : pdfjsLib;

// Initialize worker
// Dynamically use the version from the imported library to match the worker version.
// This prevents errors like "API version x does not match Worker version y".
const PDFJS_VERSION = pdfjs.version || '3.11.174';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    // Iterate through pages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them
      // pdf.js returns items with 'str' property
      const pageText = textContent.items
        // @ts-ignore - dealing with library types not locally available
        .map((item: any) => item.str)
        .join(' ');
        
      // Add basic page markers for context, useful for the LLM
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF file. Please ensure it is a valid, non-encrypted PDF.");
  }
};

export const generateRedactedPdf = (content: string): Blob => {
  // Create new PDF document
  // Unit: mm, format: a4
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });

  // Configuration
  const fontSize = 10;
  const lineHeight = 5;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxLineWidth = pageWidth - (margin * 2);

  // Use a monospace-style font if available, otherwise standard
  doc.setFont("courier", "normal"); 
  doc.setFontSize(fontSize);

  // Split text into lines that fit the page width
  const lines = doc.splitTextToSize(content, maxLineWidth);

  let cursorY = margin;

  // Iterate and print lines
  for (let i = 0; i < lines.length; i++) {
    // Check if we need a new page
    if (cursorY + lineHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }

    doc.text(lines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  return doc.output('blob');
};
