"""Turn the live browser recording into a narrated, subtitled submission video.

Install optional recording dependencies with:
    python -m pip install edge-tts pydub imageio-ffmpeg
"""

import asyncio
import json
import re
import shutil
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from pydub import AudioSegment
from pydub.effects import normalize


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp"
DOCS = ROOT / "docs"
PUBLIC = ROOT / "public"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "en-US-AvaNeural"
AudioSegment.converter = FFMPEG


def decoded_audio(source: Path) -> AudioSegment:
    wave = source.with_suffix(".wav")
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-ac", "2", "-ar", "48000", str(wave)],
        check=True,
    )
    return AudioSegment.from_wav(wave)


def media_duration_ms(source: Path) -> int:
    result = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(source)],
        capture_output=True,
        text=True,
        check=False,
    )
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", result.stderr)
    if not match:
        raise RuntimeError(f"Could not read video duration: {result.stderr[-600:]}")
    hours, minutes, seconds = match.groups()
    return round((int(hours) * 3600 + int(minutes) * 60 + float(seconds)) * 1000)


async def synthesize(index: int, cue: dict) -> tuple[Path, list[dict]]:
    audio_path = TMP / f"narration-{index:02d}.mp3"
    words = []
    voice = edge_tts.Communicate(cue["text"], voice=VOICE, boundary="WordBoundary")
    with audio_path.open("wb") as output:
        async for chunk in voice.stream():
            if chunk["type"] == "audio":
                output.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append(
                    {
                        "text": chunk["text"],
                        "startMs": chunk["offset"] / 10000,
                        "endMs": (chunk["offset"] + chunk["duration"]) / 10000,
                    }
                )
    if audio_path.stat().st_size < 1000:
        raise RuntimeError(f"Narration clip {index} is empty")
    return audio_path, words


def srt_time(ms: float) -> str:
    total = max(0, round(ms))
    hours, remainder = divmod(total, 3600000)
    minutes, remainder = divmod(remainder, 60000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def ass_time(ms: float) -> str:
    centis = max(0, round(ms / 10))
    hours, remainder = divmod(centis, 360000)
    minutes, remainder = divmod(remainder, 6000)
    seconds, cents = divmod(remainder, 100)
    return f"{hours}:{minutes:02}:{seconds:02}.{cents:02}"


def subtitle_groups(words: list[dict], start_ms: float, speed: float) -> list[dict]:
    groups = []
    current = []
    for word in words:
        candidate = " ".join([item["text"] for item in current] + [word["text"]])
        if current and (len(candidate) > 48 or word["startMs"] - current[0]["startMs"] > 2800):
            groups.append(current)
            current = []
        current.append(word)
    if current:
        groups.append(current)
    return [
        {
            "text": " ".join(word["text"] for word in group),
            "startMs": start_ms + group[0]["startMs"] / speed - 100,
            "endMs": start_ms + group[-1]["endMs"] / speed + 250,
        }
        for group in groups
    ]


def write_subtitles(subtitles: list[dict], cues: list[dict]) -> None:
    # TTS word boundaries omit punctuation. Restore the authored words where
    # token counts match, and ensure adjacent subtitle cards never overlap.
    for index, cue in enumerate(cues):
        next_start = cues[index + 1]["startMs"] if index + 1 < len(cues) else float("inf")
        cards = [item for item in subtitles if cue["startMs"] <= item["startMs"] < next_start]
        original = cue["text"].split()
        if len(original) == sum(len(item["text"].split()) for item in cards):
            cursor = 0
            for item in cards:
                count = len(item["text"].split())
                item["text"] = " ".join(original[cursor:cursor + count])
                cursor += count
    subtitles.sort(key=lambda item: item["startMs"])
    for index, item in enumerate(subtitles[:-1]):
        item["endMs"] = min(item["endMs"], subtitles[index + 1]["startMs"] - 40)

    srt = []
    vtt = ["WEBVTT", ""]
    ass = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1440",
        "PlayResY: 1010",
        "WrapStyle: 2",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Narration,Segoe UI Semibold,31,&H00FFFFFF,&H00FFFFFF,&H000C1B2C,&H000C1B2C,-1,0,0,0,100,100,0,0,1,2,0,2,60,60,31,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for index, item in enumerate(subtitles, 1):
        text = item["text"].strip().replace("{", "(").replace("}", ")")
        if not text:
            continue
        start = item["startMs"]
        end = max(start + 500, item["endMs"])
        srt.append(f"{index}\n{srt_time(start)} --> {srt_time(end)}\n{text}\n")
        vtt.append(
            f"{srt_time(start).replace(',', '.')} --> {srt_time(end).replace(',', '.')}\n{text}\n"
        )
        ass.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Narration,,0,0,0,,{text}")
    (DOCS / "demo.srt").write_text("\n".join(srt), encoding="utf-8")
    (PUBLIC / "demo.vtt").write_text("\n".join(vtt), encoding="utf-8")
    (TMP / "demo.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")


async def main() -> None:
    timeline = json.loads((TMP / "demo-cues.json").read_text(encoding="utf-8"))
    source = TMP / "demo-raw.webm"
    source_ms = media_duration_ms(source)
    video_ms = source_ms + 8000  # Hold the final comparison view for the closing line.
    if not 180000 <= video_ms <= 300000:
        raise RuntimeError(f"Demo must be 3–5 minutes; recorded {video_ms / 1000:.1f}s")
    cues = timeline["cues"]
    audio = AudioSegment.silent(duration=video_ms + 300, frame_rate=48000).set_channels(2)
    subtitles = []
    for index, cue in enumerate(cues):
        clip_path, words = await synthesize(index, cue)
        clip = normalize(decoded_audio(clip_path)).apply_gain(-2)
        start_ms = cue["startMs"] + 250
        next_ms = cues[index + 1]["startMs"] if index + 1 < len(cues) else video_ms
        available_ms = next_ms - start_ms - 250
        if available_ms < 1500:
            raise RuntimeError(f"Narration cue {index} has no room for speech")
        speed = 1.0
        if len(clip) > available_ms:
            speed = len(clip) / available_ms
            adjusted = TMP / f"narration-fit-{index:02d}.mp3"
            subprocess.run(
                [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", str(clip_path), "-filter:a", f"atempo={speed:.5f}", str(adjusted)],
                check=True,
            )
            clip = normalize(decoded_audio(adjusted)).apply_gain(-2)
        audio = audio.overlay(clip.set_channels(2), position=round(start_ms))
        if words:
            subtitles.extend(subtitle_groups(words, start_ms, speed))
        else:
            subtitles.append({"text": cue["text"], "startMs": start_ms, "endMs": start_ms + len(clip)})
        print(f"Cue {index + 1:02}/{len(cues)}: {len(clip) / 1000:.1f}s voice in {available_ms / 1000:.1f}s slot")

    write_subtitles(subtitles, cues)
    wave = TMP / "narration.wav"
    audio.export(wave, format="wav")
    output = DOCS / "demo.mp4"
    subprocess.run(
        [
            FFMPEG, "-hide_banner", "-loglevel", "error", "-y",
            "-i", "demo-raw.webm", "-i", "narration.wav",
            "-filter_complex", "[0:v]tpad=stop_mode=clone:stop_duration=8,pad=iw:ih+110:0:0:color=0x0c1b2c,ass=demo.ass[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest",
            str(output),
        ],
        cwd=TMP,
        check=True,
    )
    shutil.copyfile(output, PUBLIC / "demo.mp4")
    print(f"Rendered {output} ({video_ms / 1000:.2f}s, {output.stat().st_size / 1048576:.1f} MiB)")


if __name__ == "__main__":
    asyncio.run(main())
