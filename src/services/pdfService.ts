
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Handle ESM import variations for pdfjs-dist
const pdfjs = (pdfjsLib as any).default?.getDocument ? (pdfjsLib as any).default : pdfjsLib;

// Use a version known to work or the one reported by the lib
const PDFJS_VERSION = pdfjs.version || '5.4.449';

// In pdfjs-dist v5+, the worker is an ESM module by default in many builds.
// Using the .mjs extension or the specific mjs path on jsdelivr is usually more reliable.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document
    const loadingTask = pdfjs.getDocument({ 
      data: arrayBuffer,
      // Setting this explicitly can sometimes help in sandbox environments
      useWorkerFetch: true 
    });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    // Iterate through pages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    // Fallback attempt with a different worker URL if the first one fails
    throw new Error("Failed to extract text from PDF file. This is often due to PDF worker loading issues in the browser. Please try a text or JSON file if this persists.");
  }
};

export const generateRedactedPdf = (content: string): Blob => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });

  const fontSize = 10;
  const lineHeight = 5;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxLineWidth = pageWidth - (margin * 2);

  doc.setFont("courier", "normal"); 
  doc.setFontSize(fontSize);

  const lines = doc.splitTextToSize(content, maxLineWidth);

  let cursorY = margin;

  for (let i = 0; i < lines.length; i++) {
    if (cursorY + lineHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.text(lines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  return doc.output('blob');
};
