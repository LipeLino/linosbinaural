/* Final sample bound. Normal operation stays below this ceiling by gain design. */
class LinoOutputGuard extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    for (let channel = 0; channel < output.length; channel++) {
      const inChannel = input[channel];
      const outChannel = output[channel];
      for (let i = 0; i < outChannel.length; i++) {
        const value = inChannel ? inChannel[i] : 0;
        outChannel[i] = Number.isFinite(value)
          ? Math.max(-0.92, Math.min(0.92, value))
          : 0;
      }
    }
    return true;
  }
}

registerProcessor("lino-output-guard", LinoOutputGuard);
