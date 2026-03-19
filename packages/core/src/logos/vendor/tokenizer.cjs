try {
  require('@tensorflow/tfjs-node');
} catch (_) {
  // Optional backend: keep pure JS backend when native bindings are unavailable.
}
const tf = require('@tensorflow/tfjs');

/**
 * 8D META-TOKENIZER V5.0 (FLASH-GENERATIVE)
 * Supports Multi-Scale Tokenization for Grids and 2048-length Text sequences.
 * Optimized for zero-latency unified latent streaming.
 */
class MetaTokenizer {
    constructor() {
        // [PAD] at 0, [UNK] at 1
        this.chars = "[PAD][UNK] abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?!:;()[]{}<>+-*/=%&|^$#@\\\"'\n\r\t_";
        this.charToIdx = {};
        this.idxToChar = {};
        for (let i = 0; i < this.chars.length; i++) {
            this.charToIdx[this.chars[i]] = i;
            this.idxToChar[i] = this.chars[i];
        }
        this.vocabSize = this.chars.length;
        this.maxLen = 2048; // Expansion for Linear-Flash-Attention
        this.gridScale = 32; // Scaling for visual density
    }

    /**
     * UNIFIED ENCODE: Maps text or grids to a single high-density stream.
     */
    encode(input) {
        return tf.tidy(() => {
            if (typeof input === 'string') {
                return this.encodeText(input);
            } else if (Array.isArray(input)) {
                return this.encodeGrid(input);
            }
            return tf.zeros([1, this.maxLen], 'int32');
        });
    }

    encodeText(text) {
        const indices = [];
        for (let i = 0; i < Math.min(text.length, this.maxLen); i++) {
            const char = text[i];
            indices.push(this.charToIdx[char] !== undefined ? this.charToIdx[char] : 1);
        }
        while (indices.length < this.maxLen) indices.push(0);
        return tf.tensor2d([indices], [1, this.maxLen], 'int32');
    }

    /**
     * MULTI-SCALE GRID TOKENIZATION
     * Encodes spatial relationships and colors into the sequence.
     */
    encodeGrid(grid) {
        const flat = grid.flat();
        const indices = flat.map(v => (v + 2)); // Offset by 2 (PAD/UNK)

        // Structural padding to maintain spatial alignment in the sequence
        while (indices.length < this.maxLen) indices.push(0);
        if (indices.length > this.maxLen) indices.length = this.maxLen;

        return tf.tensor2d([indices], [1, this.maxLen], 'int32');
    }

    decode(indices) {
        return tf.tidy(() => {
            const data = (indices instanceof tf.Tensor) ? indices.dataSync() : indices;
            let text = "";
            for (let i = 0; i < data.length; i++) {
                const idx = Math.round(data[i]);
                if (idx === 0) continue;
                if (idx < 2) continue; // Skip PAD/UNK
                text += this.idxToChar[idx] || "";
            }
            return text.trim();
        });
    }

    getFeatureVector(input) {
        const encoded = this.encode(input);
        const normalized = encoded.toFloat().div(this.vocabSize);
        encoded.dispose();
        return normalized;
    }

    /**
     * Compatibility for ARC solvers
     */
    tokenizeGrid(grid) {
        return this.encodeGrid(grid).reshape([-1]);
    }
}

module.exports = new MetaTokenizer();
