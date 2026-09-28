# Audio engine

The browser creates sound only after the listener presses Play or a channel-check control. `AudioEngine` lives outside React and should be kept in a stable provider during in-app navigation. The mix contract is `src/lib/mix.ts`; the master level is separate, defaults to 0.3, and is never loaded from a preset or shared URL.

A stereo channel merger sends `carrier - beat/2` to the left input and `carrier + beat/2` to the right input. Each oscillator has its own path until the merger. The default waveform is sine. Frequency, gain, and master changes ramp on the audio timeline. Switching waveform crossfades two oscillator pairs. The optional channel check plays a quiet 440 Hz tone in one selected channel for about 0.8 seconds. It does not detect headphones, and a mono device may defeat the intended separation.

The five environmental recordings are fetched only when enabled. They are self-hosted under `/builds/builds/linosbinaural/audio/`; `manifest.json` records each source, creator, license, processing step, excerpt, hash, and size. Each decoded recording is rebuilt into a loop buffer whose 1.5-second head is blended into its tail; only then is the buffer source looped. The decoded cache holds at most three items and 64 MiB. Obsolete fetches are aborted, and a generation token discards stale decodes. If one file fails, the active tone and other layers continue and `failedLayers` reports the affected ID. White, pink, and brown noise are generated continuously in an AudioWorklet at the context's actual sample rate.

Each ear's tone bus is capped at 0.18 before master gain. Each of eight ambience buses is capped at 0.08. Even a full-scale nine-layer sum is at most 0.82 before the separately clamped master. A final AudioWorklet also bounds each output sample to ±0.92 if an unexpected transient reaches it. This digital sample bound is not a hearing-safety estimate; device amplification and listening conditions are outside the app's control. The guard is a final sample clamp, not a claim that a compressor provides brick-wall limiting.

A finite session schedules its end fade on `AudioContext.currentTime`. A JavaScript ticker updates the display and closes the silent context after the scheduled endpoint; a throttled ticker cannot prolong audible output. Pause suspends the context, freezing its audio timeline; resume continues from there. Changing the duration while playing starts a new interval from the current audio time. Hiding the tab does not pause audio. Browser-imposed suspension is surfaced as an interruption; mobile locked-screen continuity is browser-dependent. Media Session play, pause, and stop handlers are installed where supported.

The curated clips are excerpts, not synthetic substitutes. Ocean is adapted from Luftrum's [shore recording](https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg) under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); the source and license must stay visible in credits. [Rain](https://opengameart.org/content/rain-on-window-loop), [café](https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg), [forest](https://opengameart.org/content/park-ambiences), and [fireplace](https://opengameart.org/content/fireplace-sound-loop) are CC0 as identified on their source pages. The café excerpt attenuates the speech band to make chatter indistinct. `scripts/audio-acquire.py` reproduces the processed assets using a Python `imageio-ffmpeg` wheel; distributed assets and hashes are in `public/audio/manifest.json`.

Verification commands: `pnpm.cmd exec vitest run tests/audio/dsp.test.ts`, `pnpm.cmd exec tsc --noEmit`, and `node scripts/audio-browser-check.mjs`. The Chromium runner performs OfflineAudioContext signal checks at 44.1, 48, and 96 kHz, checks real worklet output bounds and colored-noise correlation, then exercises the real engine's play, pause, resume, recording load/failure, and repeated cleanup. A short accelerated duration fixture checks the same stop path without waiting a full UI-valid minute. The optional `--soak` run held all eight layers for 60.18 seconds at 48 kHz: cache size remained three, no layer failed, and stop cleared all layers, cached buffers, requests, and the context. Browser signal measurements do not substitute for a human listening review of timbre, comfort, speech audibility, or asset quality; that review remains unrun.

## Asset integrity and size

The five distributed MP3 files total 1,555,497 bytes (about 1.48 MiB); the largest is 360,915 bytes. Rain is a 10-second excerpt and the other four are 30 seconds. The acquisition script encodes stereo, 44.1 kHz MP3 at 96 kbit/s. Each manifest entry records an HTTPS source page and original-file URL, creator, license and license link, processing, excerpt bounds, byte length, and SHA-256. A local check on this checkout confirmed that all five file sizes and SHA-256 hashes match the manifest. This checks the distributed files against recorded provenance; it does not re-query the source sites for later license changes.

Recordings download only when their layer is enabled. The decoded cache is bounded by both three buffers and 64 MiB. That limit excludes active layer buffers, in-progress decodes, and browser-internal audio memory. Decoded sizes depend on the AudioContext sample rate, so the item limit is not a total process-memory bound. The previously run 60.18-second, 48 kHz Chromium soak kept all eight ambience layers active with at most three cached buffers and no layer failures. Stop released the layers, requests, cache, and audio context. This was a resource-lifecycle observation, not a CPU, battery, network-latency, or process-memory benchmark.

## Reproduction

From the repository root on Windows, install the same Python wrapper version used for acquisition, then regenerate from the source URLs in the script:

    python -m pip install imageio-ffmpeg==0.6.0
    python scripts/audio-acquire.py

The script writes five MP3s and refreshes public/audio/manifest.json. It caches downloaded originals in the Git-ignored tmp/audio-source/ directory outside public assets; those raw files are not packaged. Compare the regenerated manifest's provenance and license fields with the checked-in version. An ffmpeg binary built for a different platform may produce different MP3 bytes and therefore different hashes.

To verify the checked-in assets without downloading anything, compare the output of this PowerShell command with each manifest SHA-256 and byte length:

    Get-FileHash public/audio/*.mp3 -Algorithm SHA256
    Get-Item public/audio/*.mp3 | Select-Object Name,Length

Run focused code and browser checks from the repository root:

    pnpm.cmd exec vitest run tests/audio/dsp.test.ts
    pnpm.cmd exec tsc --noEmit
    node scripts/audio-browser-check.mjs

The standalone browser runner starts its own local fixture server and uses real Chromium AudioWorklet and OfflineAudioContext processing at 44.1, 48, and 96 kHz. Its accelerated duration fixture exercises engine stop without waiting the shortest UI-valid minute. Run node scripts/audio-browser-check.mjs --soak only when a fresh minute-long resource check is needed.

## Checks requiring people and devices

A human listening review remains unrun: assess timbre, comfort at several device volumes, loop seams, speech intelligibility in the café recording, and the quality of each environment. Real hardware checks also remain unrun for stereo-headphone left/right isolation, mono-speaker fallback, Bluetooth routing, mobile screen-lock interruption and recovery, and device-volume safety. Digital output bounds and browser signal measurements cannot establish a safe sound-pressure level at the ear.
