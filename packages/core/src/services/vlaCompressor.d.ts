/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * VLA (Visual-Language-Action) Compressor
 *
 * Implements a symbolic Variational Autoencoder (VAE) approach to compress
 * high-dimensional browser state (DOM/Accessibility Trees) into a low-bandwidth
 * "latent" representation suitable for real-time streaming to the Phillbook Plaza.
 *
 * Architecture:
 * 1. Input: Accessibility Tree (JSON) + Optional Visual Hash
 * 2. Encoder: Minification + GZIP Compression + Base64 Encoding
 * 3. Latent Space: A dense string representation ("vla_tensor_...")
 * 4. Decoder (Client-side): Base64 Decoding + Gunzip -> Reconstructed Tree
 */
export declare class VLACompressor {
    private static instance;
    private constructor();
    static getInstance(): VLACompressor;
    /**
     * Encodes the raw browser state into a compressed VLA latent vector.
     *
     * @param axTree The raw accessibility tree from the browser automation layer.
     * @param visualHash Optional blurhash or visual signature of the viewport.
     * @returns A compact "latent" string ready for transmission.
     */
    encode(axTree: any, visualHash?: string): Promise<string>;
    /**
     * Minifies the AXTree to reduce entropy before compression.
     * This acts as the "feature extraction" layer.
     */
    private minifyTree;
}
