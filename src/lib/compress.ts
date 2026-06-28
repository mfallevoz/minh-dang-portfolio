"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Single-thread core (no special COOP/COEP headers required).
const CORE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegPromise: Promise<FFmpeg> | null = null;

// Abandon any current (possibly stuck) ffmpeg instance so the next call
// recreates a fresh one. Used when a compression times out.
export function resetFFmpeg(): void {
  if (ffmpegPromise) {
    ffmpegPromise
      .then((f) => {
        try {
          f.terminate();
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    ffmpegPromise = null;
  }
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => console.debug("[ffmpeg]", message));
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export type CompressResult = {
  video: Blob;
  poster: Blob | null;
};

/**
 * Compress a video in the browser, matching the project's web preset:
 * 1080p, H.264, CRF 24, audio stripped, +faststart. Also extracts a poster.
 *
 * `onProgress` receives 0..1 (best-effort — ffmpeg.wasm's progress is not
 * reliable). Throws if ffmpeg.wasm can't run (caller falls back to the original).
 */
export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<CompressResult> {
  const ffmpeg = await getFFmpeg();

  const handler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, progress)));
  };
  ffmpeg.on("progress", handler);

  try {
    await ffmpeg.writeFile("input", await fetchFile(file));

    await ffmpeg.exec([
      "-i", "input",
      "-vf", "scale=-2:1080",
      "-c:v", "libx264",
      "-crf", "24",
      "-preset", "veryfast",
      "-an",
      "-movflags", "+faststart",
      "out.mp4",
    ]);
    const videoData = await ffmpeg.readFile("out.mp4");
    const video = new Blob([videoData as unknown as BlobPart], { type: "video/mp4" });

    let poster: Blob | null = null;
    try {
      await ffmpeg.exec(["-ss", "1", "-i", "out.mp4", "-frames:v", "1", "-q:v", "3", "poster.jpg"]);
      const posterData = await ffmpeg.readFile("poster.jpg");
      poster = new Blob([posterData as unknown as BlobPart], { type: "image/jpeg" });
    } catch {
      poster = null;
    }

    return { video, poster };
  } finally {
    ffmpeg.off("progress", handler);
    // Free the wasm FS so memory doesn't grow across multiple files.
    for (const f of ["input", "out.mp4", "poster.jpg"]) {
      try {
        await ffmpeg.deleteFile(f);
      } catch {
        /* not written */
      }
    }
  }
}

/**
 * Grab a poster (first ~1s frame) from a video file using a <video> + <canvas>
 * — cheap, no ffmpeg needed. Used for files we don't recompress.
 */
export function posterFromVideo(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || !canvas.width) return fail();
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (b) => {
            cleanup();
            resolve(b);
          },
          "image/jpeg",
          0.82
        );
      } catch {
        fail();
      }
    };
    video.onerror = fail;
  });
}
