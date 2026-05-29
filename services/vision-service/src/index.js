"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visionService = exports.VisionService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("@visakha/config");
const shared_utils_1 = require("@visakha/shared-utils");
const log = (0, shared_utils_1.createLogger)("vision-service");
class VisionService {
    constructor() {
        this.config = (0, config_1.loadPlatformConfig)();
    }
    async performOCR(imageBase64) {
        log.info("Performing OCR on image");
        try {
            const response = await (0, shared_utils_1.withRetry)(() => axios_1.default.post(`${this.config.embedding.sidecarUrl}/vision/ocr`, {
                image_base64: imageBase64
            }), { retryIf: shared_utils_1.RetryPredicates.isTransient });
            return {
                text: response.data.text,
                confidence: 0.9,
                language: 'en',
                metadata: { lines: response.data.lines }
            };
        }
        catch (error) {
            log.error("OCR failed", { error: error.message });
            throw error;
        }
    }
    async generateCaption(imageBase64) {
        log.info("Generating caption for image");
        try {
            const response = await (0, shared_utils_1.withRetry)(() => axios_1.default.post(`${this.config.embedding.sidecarUrl}/vision/caption`, {
                image_base64: imageBase64
            }), { retryIf: shared_utils_1.RetryPredicates.isTransient });
            return {
                caption: response.data.caption,
                confidence: 0.8,
                tags: []
            };
        }
        catch (error) {
            log.error("Captioning failed", { error: error.message });
            throw error;
        }
    }
    async analyzeImage(imageBase64) {
        log.info("Starting full image analysis");
        const [ocr, caption] = await Promise.all([
            this.performOCR(imageBase64).catch(() => ({ text: "", confidence: 0, language: 'en', metadata: { lines: [] } })),
            this.generateCaption(imageBase64).catch(() => ({ caption: "Failed to generate caption", confidence: 0, tags: [] }))
        ]);
        return {
            ocr: ocr,
            caption: caption,
            isDocument: ocr.text.length > 50,
            timestamp: new Date()
        };
    }
}
exports.VisionService = VisionService;
exports.visionService = new VisionService();
//# sourceMappingURL=index.js.map