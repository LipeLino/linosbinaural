"""Rebuild curated ambience clips from the recorded source URLs."""
from pathlib import Path
import hashlib
import json
import subprocess
import urllib.request
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"
SOURCE = ROOT / "tmp" / "audio-source"
SOURCE.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SOURCES = {
    "rain": {
        "url": "https://opengameart.org/sites/default/files/rain_on_window_loop.wav",
        "page": "https://opengameart.org/content/rain-on-window-loop",
        "creator": "alxl", "license": "CC0 1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "start": 0, "seconds": 10,
        "note": "Window rain recording; trimmed and encoded to MP3.",
    },
    "ocean": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/f/f1/Oceanwavescrushing.ogg",
        "page": "https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg",
        "creator": "Luftrum", "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
        "start": 15, "seconds": 30,
        "note": "Stereo shore recording; excerpted and encoded to MP3. Adaptation credited under CC BY 3.0.",
    },
    "cafe": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/5/54/Cafe_ambiance.ogg",
        "page": "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
        "creator": "Marble Toast", "license": "CC0 1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "start": 240, "seconds": 30,
        "note": "Cafe field recording; excerpted, speech-range attenuated for indistinct chatter, encoded to MP3.",
        "filter": "[0:a]asplit=2[a][b];[a]lowpass=f=250[l];[b]highpass=f=4000[h];[l][h]amix=inputs=2:normalize=1[out]",
    },
    "forest": {
        "url": "https://opengameart.org/sites/default/files/park_ambience_birds.wav",
        "page": "https://opengameart.org/content/park-ambiences",
        "creator": "Thimras", "license": "CC0 1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "start": 20, "seconds": 30,
        "note": "Public park trees and birds field recording; excerpted and encoded to MP3.",
    },
    "fireplace": {
        "url": "https://opengameart.org/sites/default/files/fire.wav",
        "page": "https://opengameart.org/content/fireplace-sound-loop",
        "creator": "PagDev", "license": "CC0 1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "start": 0, "seconds": 30,
        "note": "Wood-burning fireplace recording; excerpted and encoded to MP3.",
    },
}
manifest = {"version": 1, "loopProcessing": "At decode, the engine overlaps the first 1.5 seconds with the tail and loops the resulting buffer.", "assets": {}}
for name, data in SOURCES.items():
    raw = SOURCE / (name + Path(data["url"]).suffix)
    if not raw.exists():
        req = urllib.request.Request(data["url"], headers={"User-Agent": "LinosBinauralAssetBuilder/1.0 (curated licensed audio)"})
        with urllib.request.urlopen(req, timeout=90) as response, raw.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
    final = OUT / (name + ".mp3")
    command = [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-ss", str(data["start"]), "-t", str(data["seconds"]), "-i", str(raw)]
    if "filter" in data:
        command += ["-filter_complex", data["filter"], "-map", "[out]"]
    command += ["-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", str(final)]
    subprocess.run(command, check=True)
    digest = hashlib.sha256(final.read_bytes()).hexdigest()
    manifest["assets"][name] = {
        "file": final.name, "source": data["page"], "originalFile": data["url"],
        "creator": data["creator"], "license": data["license"],
        "licenseUrl": data["licenseUrl"], "processing": data["note"],
        "excerptStartSeconds": data["start"], "excerptDurationSeconds": data["seconds"],
        "sha256": digest, "bytes": final.stat().st_size,
    }
    print(name, final.stat().st_size, digest[:12], flush=True)
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
