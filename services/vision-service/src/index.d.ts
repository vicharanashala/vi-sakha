import type { OCRResult, CaptionResult, VisionAnalysis } from "@visakha/shared-types";
export declare class VisionService {
    private config;
    performOCR(imageBase64: string): Promise<OCRResult>;
    generateCaption(imageBase64: string): Promise<CaptionResult>;
    analyzeImage(imageBase64: string): Promise<VisionAnalysis>;
}
export declare const visionService: VisionService;
