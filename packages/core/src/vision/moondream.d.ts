import { Buffer } from 'node:buffer';
import { Config } from '../config/config.js';
export declare class MoondreamService {
    private static instance;
    private model;
    private processor;
    private tokenizer;
    private classifier;
    private classifierProcessor;
    private modelsPath;
    private modelId;
    private classifierId;
    private constructor();
    static getInstance(config: Config): MoondreamService;
    initialize(): Promise<void>;
    describeImage(imageBuffer: Buffer, prompt?: string): Promise<string>;
}
