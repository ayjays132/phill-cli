/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

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
export class VLACompressor {
  private static instance: VLACompressor;

  private constructor() {}

  public static getInstance(): VLACompressor {
    if (!VLACompressor.instance) {
      VLACompressor.instance = new VLACompressor();
    }
    return VLACompressor.instance;
  }

  /**
   * Encodes the raw browser state into a compressed VLA latent vector.
   * 
   * @param axTree The raw accessibility tree from the browser automation layer.
   * @param visualHash Optional blurhash or visual signature of the viewport.
   * @returns A compact "latent" string ready for transmission.
   */
  async encode(axTree: any, visualHash?: string): Promise<string> {
    if (!axTree) return '';

    // 1. Structural Minification (Symbolic Reduction)
    // Remove redundant nulls, empty arrays, and generic metadata to sparsify the input.
    const minimalTree = this.minifyTree(axTree);

    // 2. Payload Construction
    const payload = JSON.stringify({
      t: Date.now(),
      v: visualHash || null, // Visual Component
      s: minimalTree         // Structural Component
    });

    // 3. Latent Compression (The "Encoder")
    const buffer = await gzip(payload);
    
    // 4. Latent Vector Serialization
    return `vla_latent_${buffer.toString('base64')}`;
  }

  /**
   * Minifies the AXTree to reduce entropy before compression.
   * This acts as the "feature extraction" layer.
   */
  private minifyTree(node: any): any {
    if (!node) return null;
    if (typeof node !== 'object') return node;

    // Prune generic/empty containers
    if (Array.isArray(node)) {
        return node.map(n => this.minifyTree(n)).filter(n => n !== null);
    }

    const { 
        role, name, value, description, 
        children, childIds
    } = node;

    // Only keep semantic nodes
    if (!role && !name && (!children || children.length === 0)) {
        return null; 
    }

    const compact: any = {};
    if (role) compact.r = role; // r = role
    if (name) compact.n = name; // n = name
    if (value) compact.v = value; // v = value
    if (description) compact.d = description; // d = description
    
    // Recursive minimization of children
    if (children && children.length > 0) {
        compact.c = this.minifyTree(children); // c = children
    } else if (childIds && childIds.length > 0) {
        // Handle flattened trees if present
        compact.c = childIds; 
    }

    return compact;
  }
}
