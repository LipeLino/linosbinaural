/* Independently generated, bounded stereo noise at the context's real sample rate. */
class LinoNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.color = options.processorOptions?.color || "white";
    this.pink = Array.from({ length: 2 }, () => new Float64Array(7));
    this.brown = new Float64Array(2);
    this.port.onmessage = (event) => {
      if (event.data?.type === "color") this.color = event.data.color;
    };
  }

  process(_inputs, outputs) {
    const channels = outputs[0];
    for (let channel = 0; channel < channels.length; channel++) {
      const output = channels[channel];
      const p = this.pink[channel];
      for (let i = 0; i < output.length; i++) {
        const white = Math.random() * 2 - 1;
        let sample;
        if (this.color === "pink") {
          p[0] = 0.99886 * p[0] + white * 0.0555179;
          p[1] = 0.99332 * p[1] + white * 0.0750759;
          p[2] = 0.969 * p[2] + white * 0.153852;
          p[3] = 0.8665 * p[3] + white * 0.3104856;
          p[4] = 0.55 * p[4] + white * 0.5329522;
          p[5] = -0.7616 * p[5] - white * 0.016898;
          sample = (p[0] + p[1] + p[2] + p[3] + p[4] + p[5] + p[6] + white * 0.5362) * 0.11;
          p[6] = white * 0.115926;
        } else if (this.color === "brown") {
          // The pole is scaled to the actual sample rate, so its approximate
          // low-frequency corner remains stable at 44.1, 48, or 96 kHz.
          const pole = Math.exp(-2 * Math.PI * 25 / sampleRate);
          this.brown[channel] = pole * this.brown[channel] + (1 - pole) * white;
          sample = this.brown[channel] * 3.2;
        } else {
          sample = white;
        }
        output[i] = Math.max(-1, Math.min(1, sample));
      }
    }
    return true;
  }
}

registerProcessor("lino-noise", LinoNoiseProcessor);
