"""Build Stillwater's bundled narration locally from the checked-in reflection text."""

import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from kokoro import KModel, KPipeline
import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[1]
VOICE = "am_michael"
MODEL = "hexgrad/Kokoro-82M"
SAMPLE_RATE = 24_000


def word_key(text):
    return "".join(c for c in text.casefold() if c.isalnum())


def words_with_timing(tokens, offset):
    text = ""
    start = end = None
    for token in tokens:
        text += token.text
        if word_key(token.text) and token.start_ts is not None and token.end_ts is not None:
            start = token.start_ts if start is None else start
            end = token.end_ts
        if token.whitespace:
            if word_key(text):
                if start is None or end is None:
                    raise ValueError(f"No narration timing for {text!r}")
                yield word_key(text), start + offset, end + offset
            text = ""
            start = end = None
    if word_key(text):
        if start is None or end is None:
            raise ValueError(f"No narration timing for {text!r}")
        yield word_key(text), start + offset, end + offset


def add_reflection_pause(audio, marks, after_word, target=.46):
    """Lengthen an existing quiet gap after the opening thought."""
    left, right = marks[after_word][1], marks[after_word + 1][0]
    gap = right - left
    if not .16 < gap < target:
        return audio, marks
    center = round((left + gap / 2) * SAMPLE_RATE)
    radius = round(.035 * SAMPLE_RATE)
    window = round(.008 * SAMPLE_RATE)
    if np.max(np.abs(audio[center - radius:center + radius])) > .022:
        return audio, marks
    count = round((target - gap) * SAMPLE_RATE)
    audio[center - window:center] *= np.linspace(1, 0, window)
    audio[center:center + window] *= np.linspace(0, 1, window)
    audio = np.concatenate((audio[:center], np.zeros(count, dtype=np.float32), audio[center:]))
    shift = count / SAMPLE_RATE
    return audio, marks[:after_word + 1] + [
        (start + shift, end + shift) for start, end in marks[after_word + 1:]
    ]


def render(pipeline, text, voice_file, speed):
    audio_parts = []
    offset = 0
    aligned = []
    for result in pipeline(text, voice=str(voice_file), speed=speed):
        audio = result.audio.numpy()
        aligned.extend(words_with_timing(result.tokens, offset))
        audio_parts.append(audio)
        offset += len(audio) / SAMPLE_RATE

    words = re.findall(r"\S+", text)
    actual = [word for word, _, _ in aligned]
    if actual != [word_key(word) for word in words]:
        raise ValueError(f"Narration alignment mismatch\n{words}\n{actual}")

    audio = np.concatenate(audio_parts)
    marks = [(start, end) for _, start, end in aligned]
    opening = next((i for i, word in enumerate(words[:-1]) if word.endswith(".")), None)
    if opening is not None:
        audio, marks = add_reflection_pause(audio, marks, opening)

    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio ** 2)))
    if not np.isfinite(peak) or rms < .005:
        raise ValueError("Empty or invalid narration")
    audio *= min(.89 / peak, .102 / rms)
    fade = round(.015 * SAMPLE_RATE)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    lead = .065
    audio = np.pad(audio, (round(lead * SAMPLE_RATE), round(.18 * SAMPLE_RATE)))
    times = [[round((start + lead) * 1000), round((end + lead) * 1000)] for start, end in marks]
    checked = [time for time, _ in times]
    if checked != sorted(set(checked)) or any(end <= start for start, end in times):
        raise ValueError("Invalid narration timestamps")
    return audio, times


def encode(audio, destination, ffmpeg):
    pcm = np.round(audio * 32767).astype("<i2")
    subprocess.run([
        ffmpeg, "-v", "error", "-y", "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1",
        "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "64k", destination,
    ], input=pcm.tobytes(), check=True)


def pipeline_for(model_dir, voice):
    model = KModel(
        repo_id=MODEL,
        config=str(model_dir / "config.json"),
        model=str(model_dir / "kokoro-v1_0.pth"),
    ).eval()
    return KPipeline(lang_code=voice[0], repo_id=MODEL, model=model)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model_dir", type=Path, help="Directory containing Kokoro weights, config.json, and the stock voice file")
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"), help="FFmpeg executable with libmp3lame")
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("Install FFmpeg or provide its executable with --ffmpeg.")
    model_dir = args.model_dir.resolve()
    torch.set_num_threads(4)
    torch.manual_seed(19)
    pipeline = pipeline_for(model_dir, VOICE)
    scripts = json.loads((ROOT / "src/reflection/narration.json").read_text())
    tracks = []

    with tempfile.TemporaryDirectory() as directory:
        scratch = Path(directory)
        for topic, passages in scripts.items():
            for kind, text in passages.items():
                name = topic if kind == "reply" else topic + "-followup"
                speed = .94 if kind == "reply" else .97
                try:
                    audio, timings = render(pipeline, text, model_dir / f"{VOICE}.pt", speed)
                except ValueError as error:
                    raise ValueError(f"{name}: {error}") from error
                clip = f"{name}.mp3"
                encode(audio, scratch / clip, args.ffmpeg)
                tracks.append({"clip": clip, "text": text, "words": timings})
                print(f"{clip}: {len(audio) / SAMPLE_RATE:.2f}s, {len(timings)} words", flush=True)
        output = ROOT / "public/voices"
        output.mkdir(parents=True, exist_ok=True)
        for track in tracks:
            shutil.copyfile(scratch / track["clip"], output / track["clip"])
        manifest = ",\n".join("  " + json.dumps(track, ensure_ascii=False, separators=(",", ":")) for track in tracks)
        (ROOT / "src/speech/recordings.json").write_text("[\n" + manifest + "\n]\n")


if __name__ == "__main__":
    main()
