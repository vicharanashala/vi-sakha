export interface OCRResult {
    text: string;
    confidence: number;
    language: string;
    metadata?: {
        lines: string[];
    };
}
export interface CaptionResult {
    caption: string;
    confidence: number;
    tags?: string[];
}
export interface VisionAnalysis {
    ocr: OCRResult;
    caption: CaptionResult;
    isDocument: boolean;
    timestamp: Date;
}
