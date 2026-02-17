import { Config } from '../config/config.js';
import { Buffer } from 'node:buffer';
export declare class VisionService {
    private static instance;
    private config;
    private moondreamService;
    private constructor();
    static getInstance(config: Config): VisionService;
    private getMoondreamService;
    describeImage(imageBuffer: Buffer, prompt?: string): Promise<string>;
}
