"""Build the eight case videos from project covers and licensed Pexels photos.

Requirements: Pillow and imageio-ffmpeg (build-time only, not app dependencies).
Run from the repository root: python scripts/build-case-videos.py
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MEDIA_DIR = ROOT / "public" / "media" / "cases"
MANIFEST_PATH = MEDIA_DIR / "sources.json"
FRAME_SIZE = (1408, 792)
VIDEO_SIZE = "1280x720"
FPS = 24
FRAMES_PER_IMAGE = 72


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "msyhbd.ttc" if bold else "msyh.ttc"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int = 30):
    size = start_size
    while size > 20:
        current = font(size, bold=True)
        if draw.textbbox((0, 0), text, font=current)[2] <= max_width:
            return current
        size -= 1
    return font(20, bold=True)


def prepare_frame(source: Path, destination: Path, case: dict, frame: dict, index: int) -> None:
    image = Image.open(source).convert("RGB")
    image = ImageOps.fit(image, FRAME_SIZE, method=Image.Resampling.LANCZOS)
    image = ImageEnhance.Color(image).enhance(1.05)
    image = ImageEnhance.Contrast(image).enhance(1.06)

    # A restrained teal treatment keeps the original cover and the photos visually coherent.
    tint = Image.new("RGB", FRAME_SIZE, "#063f46")
    image = Image.blend(image, tint, 0.10 if frame["kind"] == "cover" else 0.035).convert("RGBA")

    overlay = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = FRAME_SIZE
    for y in range(height - 230, height):
        alpha = round(190 * (y - (height - 230)) / 230)
        draw.line((0, y, width, y), fill=(4, 14, 22, alpha))
    if case.get("badgePosition") == "right":
        badge_right = width - 42
        badge_left = badge_right - 188
    else:
        badge_left = 42
        badge_right = badge_left + 188
    draw.rounded_rectangle((badge_left, 38, badge_right, 82), radius=20, fill=(4, 25, 32, 150))
    draw.text((badge_left + 18, 47), f"案例 {case['caseId']:02d} · 仿生观察", font=font(20), fill="#e6fff9")
    if case.get("titleOverlay", True):
        draw.text((48, height - 142), case["title"], font=font(24, bold=True), fill="#8cebd5")
    caption_font = fit_text(draw, frame["caption"], width - 100)
    draw.text((48, height - 100), frame["caption"], font=caption_font, fill="#ffffff")

    credit = frame.get("credit") or f"Pexels · {frame['author']}"
    credit_font = font(17)
    credit_width = draw.textbbox((0, 0), credit, font=credit_font)[2]
    draw.text((width - credit_width - 42, height - 40), credit, font=credit_font, fill="#d4e3e5")
    result = Image.alpha_composite(image, overlay).convert("RGB")
    result.save(destination, quality=91, optimize=True)


def probe_duration(ffmpeg: str, path: Path) -> float:
    """读取视频时长（秒）。"""
    probe = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(path)], capture_output=True, text=True
    )
    match = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", probe.stdout + probe.stderr)
    if not match:
        raise RuntimeError(f"无法读取视频时长: {path}")
    hours, minutes, seconds = (float(part) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def build_video(case: dict, segments: list[dict], output: Path) -> None:
    """segments: [{type: image|footage, path, duration}]，相邻段 0.5s 交叉淡化。"""
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    filters = []
    durations = []
    for index, segment in enumerate(segments):
        if segment["type"] == "image":
            if index == 0:
                x_expr = "(iw-iw/zoom)/2"
            else:
                x_expr = f"(iw-iw/zoom)*(on/{FRAMES_PER_IMAGE - 1})"
            filters.append(
                f"[{index}:v]scale={FRAME_SIZE[0]}:{FRAME_SIZE[1]},"
                f"zoompan=z='min(1.02+on*0.00055,1.06)':x='{x_expr}':"
                f"y='(ih-ih/zoom)/2':d={FRAMES_PER_IMAGE}:s={VIDEO_SIZE}:fps={FPS},"
                f"setsar=1[v{index}]"
            )
            durations.append(3.0)
        else:
            filters.append(
                f"[{index}:v]scale={VIDEO_SIZE.replace('x', ':')}:"
                f"force_original_aspect_ratio=increase,crop={VIDEO_SIZE.replace('x', ':')},"
                f"fps={FPS},setsar=1[v{index}]"
            )
            durations.append(segment["duration"])

    # 相邻段交叉淡化：偏移 = 前面各段累计时长 - 0.5
    total = sum(durations) - 0.5 * (len(segments) - 1)
    previous = "[v0]"
    elapsed = durations[0]
    for index in range(1, len(segments)):
        label = f"[x{index}]" if index < len(segments) - 1 else "[xfinal]"
        filters.append(
            f"{previous}[v{index}]xfade=transition=fade:duration=0.5:offset={max(elapsed - 0.5, 0):.3f}{label}"
        )
        previous = label
        elapsed += durations[index] - 0.5

    filters.append(
        f"{previous}fade=t=in:st=0:d=0.25,fade=t=out:st={max(total - 0.35, 0):.3f}:d=0.35,format=yuv420p[v]"
    )

    command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error"]
    for segment in segments:
        if segment["type"] == "image":
            command.extend(["-loop", "1", "-t", "3", "-i", str(segment["path"])])
        else:
            command.extend(["-i", str(segment["path"])])
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[v]",
            "-t",
            f"{total:.3f}",
            "-r",
            str(FPS),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "22",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", dest="slug", help="Only build one case by slug")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"ffmpeg: {ffmpeg}")

    with tempfile.TemporaryDirectory(prefix="aimech-case-frames-") as temp_dir:
        temp = Path(temp_dir)
        for case in manifest["cases"]:
            if args.slug and case["slug"] != args.slug:
                continue
            segments = []
            for index, frame in enumerate(case["frames"], 1):
                if frame["kind"] == "footage":
                    # 实拍源文件按仓库根目录解析（不放 public，避免原片被公开分发）
                    footage = ROOT / frame["path"] if "/" in frame["path"] else MEDIA_DIR / frame["path"]
                    if not footage.exists():
                        raise FileNotFoundError(f"Missing footage: {footage}")
                    segments.append(
                        {
                            "type": "footage",
                            "path": footage,
                            "duration": probe_duration(ffmpeg, footage),
                        }
                    )
                    continue
                source = (
                    ROOT / "public" / frame["image"].lstrip("/")
                    if frame["kind"] == "cover"
                    else MEDIA_DIR / "stills" / f"{case['slug']}-{index:02d}.jpg"
                )
                if not source.exists():
                    raise FileNotFoundError(f"Missing source image: {source}")
                destination = temp / f"{case['slug']}-{index:02d}.jpg"
                prepare_frame(source, destination, case, frame, index)
                segments.append({"type": "image", "path": destination})
            output = MEDIA_DIR / f"{case['slug']}.mp4"
            build_video(case, segments, output)
            print(f"built {output.name} ({output.stat().st_size / 1024:.0f} KiB)")


if __name__ == "__main__":
    main()
