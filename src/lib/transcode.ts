import "server-only";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

// The web target. Mirrors the export preset documented in the README, so a
// file that arrives already conforming comes out essentially unchanged.
const HEIGHT = 1080;
const MAX_KBPS = 5500;

// ffmpeg is CPU-bound and these are short films, but a pathological input
// must not sit there until the platform kills the function mid-write.
const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;

export type TranscodeOutput = {
  video: Buffer;
  mobile: Buffer | null;
  poster: Buffer | null;
};

/**
 * Re-encode an uploaded master into the web target, server-side.
 *
 * This runs in `onUploadCompleted`, which Vercel calls after the browser has
 * finished uploading — so it keeps working once the person has closed the tab.
 * That is the whole point: the browser used to do this, badly, and only while
 * someone watched it.
 *
 * Returns null if ffmpeg is unavailable, so the caller can leave the original
 * in place rather than lose the upload.
 */
export async function transcodeToWeb(
  sourceUrl: string
): Promise<TranscodeOutput | null> {
  // Copied to a local so it stays narrowed inside the closure below.
  const bin = ffmpegPath;
  if (!bin) return null;

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lucid-"));
  const input = path.join(dir, "in");
  const out = path.join(dir, "out.mp4");
  const mobileOut = path.join(dir, "mobile.mp4");
  const posterOut = path.join(dir, "poster.jpg");

  try {
    // Stream to disk rather than buffering: /tmp is small, and holding a
    // master in memory alongside ffmpeg's own usage is how this runs out.
    const res = await fetch(sourceUrl);
    if (!res.ok || !res.body) throw new Error(`fetch ${res.status}`);
    await pipeline(
      Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(input)
    );

    const ff = (args: string[]) =>
      run(bin, ["-v", "error", "-y", ...args], {
        timeout: FFMPEG_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      });

    // Main: capped bitrate rather than pure CRF, so a grainy grade cannot
    // quietly produce a 30 MB file the way the masters did.
    await ff([
      "-i", input,
      "-vf", `scale=-2:'min(${HEIGHT},ih)'`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-maxrate", `${MAX_KBPS}k`,
      "-bufsize", `${MAX_KBPS * 2}k`,
      "-pix_fmt", "yuv420p",
      "-an", // the carousel is muted by design; audio would be dead weight
      "-movflags", "+faststart",
      out,
    ]);

    // Portrait crop for phones — best-effort, like the poster.
    let mobile: Buffer | null = null;
    try {
      await ff([
        "-i", out,
        "-vf", "crop=min(iw\\,ih*9/16):ih,scale=-2:720",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "26",
        "-pix_fmt", "yuv420p",
        "-an",
        "-movflags", "+faststart",
        mobileOut,
      ]);
      mobile = await fs.readFile(mobileOut);
    } catch {
      mobile = null;
    }

    let poster: Buffer | null = null;
    try {
      await ff(["-ss", "1", "-i", out, "-frames:v", "1", "-q:v", "3", posterOut]);
      poster = await fs.readFile(posterOut);
    } catch {
      poster = null;
    }

    return { video: await fs.readFile(out), mobile, poster };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
