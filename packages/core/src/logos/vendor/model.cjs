/* eslint-disable no-console */
/* eslint-disable no-undef */
try {
  require('@tensorflow/tfjs-node');
} catch (_) {
  // Optional backend: keep pure JS backend when native bindings are unavailable.
}
const tf = require('@tensorflow/tfjs');
const soul = require('./soul.cjs');
const fs = require('fs');
const path = require('path');

/**
 * LINEAR FLASH ATTENTION LAYER (V5.4)
 * Uses built-in layers to ensure gradient stability and correct shapes.
 */
class LinearAttentionLayer extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.units = config.units;
  }

  build(inputShape) {
    this.q_proj = tf.layers.dense({
      units: this.units,
      activation: 'relu',
      name: this.name + '_q',
    });
    this.k_proj = tf.layers.dense({
      units: this.units,
      activation: 'relu',
      name: this.name + '_k',
    });
    this.v_proj = tf.layers.dense({
      units: this.units,
      name: this.name + '_v',
    });

    // Build projections to initialize weights
    this.q_proj.build(inputShape);
    this.k_proj.build(inputShape);
    this.v_proj.build(inputShape);

    this.built = true;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], inputShape[1], this.units];
  }

  call(inputs) {
    return tf.tidy(() => {
      const x = inputs[0];
      const d_k = tf.scalar(Math.sqrt(this.units));

      const q = this.q_proj.apply(x);
      const k = this.k_proj.apply(x);
      const v = this.v_proj.apply(x);

      // Q * (K.T * V)
      const kt = k.transpose([0, 2, 1]);
      const kv = tf.matMul(kt, v);
      const att = tf.matMul(q, kv);

      return att.div(d_k);
    });
  }

  static get className() {
    return 'LinearAttentionLayer';
  }
}
tf.serialization.registerClass(LinearAttentionLayer);

/**
 * 8D STABLE SINGULARITY ENGINE (V5.4)
 */
class VAELatentEngine {
  constructor(inputDim = 2048, latentDim = 8, vocabSize = 100) {
    this.inputDim = inputDim;
    this.latentDim = latentDim;
    this.vocabSize = vocabSize;
    this.buildModel();

    // Attempt to load stable weights if they exist in the bundle
    this.tryLoadStableWeights();
  }

  buildModel() {
    // --- ENCODER ---
    const encoderInput = tf.input({ shape: [this.inputDim] });
    let emb = tf.layers
      .embedding({
        inputDim: this.vocabSize,
        outputDim: 64,
        name: 'manifold_embedding_v54',
      })
      .apply(encoderInput);

    let att = new LinearAttentionLayer({
      units: 64,
      name: 'encoder_att',
    }).apply(emb);
    att = tf.layers.dense({ units: 128, activation: 'relu' }).apply(att);

    const flat = tf.layers.globalAveragePooling1d().apply(att);
    const zMean = tf.layers
      .dense({ units: this.latentDim, name: 'z_mean' })
      .apply(flat);

    this.encoder = tf.model({ inputs: encoderInput, outputs: zMean });

    // --- DECODER ---
    const decoderInput = tf.input({ shape: [this.latentDim] });
    const repeat = tf.layers
      .repeatVector({ n: this.inputDim })
      .apply(decoderInput);

    let d_att = new LinearAttentionLayer({
      units: 128,
      name: 'decoder_att',
    }).apply(repeat);
    d_att = tf.layers.dense({ units: 128, activation: 'relu' }).apply(d_att);

    const decoderOutput = tf.layers
      .timeDistributed({
        layer: tf.layers.dense({
          units: this.vocabSize,
          activation: 'softmax',
        }),
      })
      .apply(d_att);

    this.decoder = tf.model({ inputs: decoderInput, outputs: decoderOutput });

    this.autoencoder = tf.model({
      inputs: this.encoder.inputs,
      outputs: this.decoder.apply(this.encoder.outputs[0]),
    });

    this.autoencoder.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy'],
    });
  }

  loadWeights(dir) {
    const encoderPath = dir
      ? path.join(dir, 'encoder_stable.json')
      : path.join(
          __dirname,
          'models',
          'SINGULARITY_8D_STABLE',
          'encoder_stable.json',
        );
    const decoderPath = dir
      ? path.join(dir, 'decoder_stable.json')
      : path.join(
          __dirname,
          'models',
          'SINGULARITY_8D_STABLE',
          'decoder_stable.json',
        );

    if (fs.existsSync(encoderPath) && fs.existsSync(decoderPath)) {
      try {
        const encoderWeights = JSON.parse(fs.readFileSync(encoderPath, 'utf8'));
        const decoderWeights = JSON.parse(fs.readFileSync(decoderPath, 'utf8'));

        this.encoder.setWeights(encoderWeights.map((w) => tf.tensor(w)));
        this.decoder.setWeights(decoderWeights.map((w) => tf.tensor(w)));
        console.log(`[LOGOS] Weights loaded successfully from ${encoderPath}`);
      } catch (e) {
        console.warn('[LOGOS] Failed to load weights:', e.message);
      }
    }
  }

  tryLoadStableWeights() {
    this.loadWeights();
  }

  async train(inputs, targets, epochs = 1) {
    tf.engine().startScope();
    const x = inputs.toInt();
    const y = targets.toFloat().expandDims(-1);

    const history = await this.autoencoder.fit(x, y, {
      epochs: epochs,
      verbose: 0,
    });

    const loss = history.history.loss[0];
    const acc = history.history.accuracy ? history.history.accuracy[0] : 0;
    console.log(`[VAE V5.4] Loss: ${loss.toFixed(4)} | Acc: ${acc.toFixed(4)}`);

    tf.engine().endScope();
    return history;
  }

  encode(indices) {
    return tf.tidy(() => {
      let flat = indices.reshape([-1]);
      const currentSize = flat.size;
      let target =
        currentSize < this.inputDim
          ? flat.pad([[0, this.inputDim - currentSize]])
          : flat.slice([0], [this.inputDim]);
      return this.encoder.predict(target.toInt().expandDims(0));
    });
  }

  decode(latent) {
    return tf.tidy(() => {
      let refinedLatent = latent;
      for (let i = 0; i < 3; i++) {
        const audit = soul.auditLatent(refinedLatent);
        if (!audit.isDissonant) break;
        const logos = soul.getLogosAlignment();
        refinedLatent = refinedLatent.add(logos.mul(0.1));
      }
      return this.decoder.predict(refinedLatent);
    });
  }

  refine(latent, iterations = 10) {
    return tf.tidy(() => {
      let refinedLatent = latent;
      for (let i = 0; i < iterations; i++) {
        const audit = soul.auditLatent(refinedLatent);
        if (!audit.isDissonant && i > 3) break;
        const logos = soul.getLogosAlignment();
        // Shift towards logos alignment based on dissonance
        const drift = 1.0 - audit.score;
        refinedLatent = refinedLatent.add(logos.mul(drift * 0.2));
      }
      return refinedLatent;
    });
  }

  generateIndices(latent) {
    return tf.tidy(() => {
      const probs = this.decode(latent);
      return probs.argMax(-1);
    });
  }

  encodeSequence(sequence) {
    return tf.tidy(() => {
      if (sequence.length === 0)
        return this.encode(tf.zeros([1, this.inputDim], 'int32'));
      const latents = sequence.map((tensor) => this.encode(tensor));
      const batch = tf.concat(latents);
      const hyperState = batch.mean(0).expandDims(0);
      return hyperState;
    });
  }

  saveWeights(dir) {
    const targetDir =
      dir || path.join(__dirname, 'models', 'SINGULARITY_8D_STABLE');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const encoderWeights = this.encoder
      .getWeights()
      .map((w) => Array.from(w.dataSync()));
    const decoderWeights = this.decoder
      .getWeights()
      .map((w) => Array.from(w.dataSync()));

    fs.writeFileSync(
      path.join(targetDir, 'encoder_stable.json'),
      JSON.stringify(encoderWeights),
    );
    fs.writeFileSync(
      path.join(targetDir, 'decoder_stable.json'),
      JSON.stringify(decoderWeights),
    );
    console.log(`[LOGOS] Weights saved successfully to ${targetDir}`);
  }
}

const tokenizer = require('./tokenizer.cjs');
module.exports = new VAELatentEngine(2048, 8, tokenizer.vocabSize);
