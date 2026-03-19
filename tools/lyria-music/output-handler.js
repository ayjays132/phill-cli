/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Simple WAV header generator for PCM 16-bit 48kHz Stereo
function writeWavHeader(sampleRate, numChannels, dataLength) {
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * 2, 28); // ByteRate
    buffer.writeUInt16LE(numChannels * 2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    return buffer;
}
export class OutputHandler {
    speaker = null;
    buffer = [];
    intent;
    totalBytes = 0;
    constructor(intent) {
        this.intent = intent;
        if (intent.outputFormat === 'stream' || intent.previewFirst) {
            this.initSpeaker();
        }
    }
    initSpeaker() {
        try {
            // Dynamic require to avoid crashing if not installed
            const Speaker = require('speaker');
            this.speaker = new Speaker({
                channels: 2,
                bitDepth: 16,
                sampleRate: 48000,
            });
        }
        catch {
            console.warn("[OutputHandler] 'speaker' package not found. Streaming playback disabled.");
        }
    }
    handleChunk(chunk) {
        // buffer data for export regardless of play mode
        this.buffer.push(chunk);
        this.totalBytes += chunk.length;
        // If streaming, pipe to speaker
        if (this.speaker &&
            (this.intent.outputFormat === 'stream' || this.intent.previewFirst)) {
            this.speaker.write(chunk);
        }
    }
    async finalize() {
        if (this.speaker) {
            this.speaker.end();
        }
        if (!this.intent.exportPath && this.intent.outputFormat === 'stream') {
            return null; // Just streaming, done
        }
        const fullData = Buffer.concat(this.buffer);
        const wavHeader = writeWavHeader(48000, 2, fullData.length);
        const wavFile = Buffer.concat([wavHeader, fullData]);
        const exportPath = this.intent.exportPath || `./output-${Date.now()}.wav`;
        const dir = path.dirname(exportPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        if (this.intent.outputFormat === 'mp3' ||
            this.intent.outputFormat === 'ogg') {
            console.log(`[OutputHandler] Converting to ${this.intent.outputFormat}...`);
            // Here we would spawn ffmpeg. For MVP, just save WAV and warn.
            // Or implement basic spawn:
            return this.convertToFormat(wavFile, exportPath);
        }
        else {
            fs.writeFileSync(exportPath, wavFile);
            console.log(`[OutputHandler] Exported to ${exportPath}`);
            return exportPath;
        }
    }
    convertToFormat(wavBuffer, targetPath) {
        return new Promise((resolve, reject) => {
            // Create temp wav
            const tempWav = targetPath + '.temp.wav';
            fs.writeFileSync(tempWav, wavBuffer);
            const ffmpeg = spawn('ffmpeg', ['-y', '-i', tempWav, targetPath]);
            ffmpeg.on('close', (code) => {
                fs.unlinkSync(tempWav);
                if (code === 0) {
                    console.log(`[OutputHandler] Converted to ${targetPath}`);
                    resolve(targetPath);
                }
                else {
                    console.error(`[OutputHandler] ffmpeg failed with code ${code}`);
                    // Fallback: leave temp wav? No, reject.
                    reject(new Error(`ffmpeg failed with code ${code}`));
                }
            });
        });
    }
}
//# sourceMappingURL=output-handler.js.map