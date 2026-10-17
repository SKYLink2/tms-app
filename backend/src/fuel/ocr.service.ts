import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs';

export interface ExtractedReceiptData {
  gallons?: number;
  receiptAmount?: number;
  merchantName?: string;
  receiptTimestamp?: Date;
  rawText?: string;
}

@Injectable()
export class OcrService {
  async processReceipt(imagePath: string): Promise<ExtractedReceiptData> {
    if (!fs.existsSync(imagePath)) {
      throw new Error('Receipt image file not found on disk.');
    }

    // Initialize Tesseract worker for English (v5 syntax)
    const worker = await createWorker('eng');
    
    try {
      const { data: { text } } = await worker.recognize(imagePath);
      await worker.terminate();

      return this.parseReceiptText(text);
    } catch (error: any) {
      await worker.terminate();
      throw new Error(`OCR Processing failed: ${error.message}`);
    }
  }

  private parseReceiptText(text: string): ExtractedReceiptData {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    let gallons: number | undefined;
    let receiptAmount: number | undefined;
    let merchantName = lines[0] || 'Unknown Station';

    const amountRegex = /\b\$?\s*(\d+\.\d{2})\b/g;
    const gallonRegex = /\b(\d+\.\d{2,3})\s*(?:gal|gals|gallons)?\b/i;

    const amounts: number[] = [];
    
    for (const line of lines) {
      const galMatch = line.match(gallonRegex);
      if (galMatch && !gallons) {
        const parsedGal = parseFloat(galMatch[1]);
        if (parsedGal > 1 && parsedGal < 300) {
          gallons = parsedGal;
        }
      }

      let match;
      while ((match = amountRegex.exec(line)) !== null) {
        amounts.push(parseFloat(match[1]));
      }
    }

    if (amounts.length > 0) {
      receiptAmount = Math.max(...amounts);
    }

    return {
      gallons,
      receiptAmount,
      merchantName,
      receiptTimestamp: new Date(),
      rawText: text,
    };
  }
}