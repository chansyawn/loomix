import { SingleBar } from "cli-progress";
import type { Writable } from "node:stream";
import type { UploadProgress } from "./publish.ts";

type ProgressOutput = Writable & { isTTY?: boolean };

export function createUploadProgress(output: ProgressOutput = process.stderr) {
  let bar: SingleBar | undefined;
  let lastBucket = -1;
  let finished = false;
  let imagesFinished = false;

  function stopBar(): void {
    bar?.stop();
    bar = undefined;
  }

  function update(progress: UploadProgress): void {
    if (finished) return;
    if (progress.phase === "complete") {
      stopBar();
      finished = true;
      output.write("资源版本发布成功\n");
      return;
    }
    if (progress.phase === "finalizing") {
      if (!imagesFinished) {
        imagesFinished = true;
        stopBar();
        output.write("正在发布内容与完成标记…\n");
      }
      return;
    }
    if (imagesFinished) return;
    const bytes = (progress.completedBytes / 1_000_000).toFixed(2);
    const totalBytes = (progress.totalBytes / 1_000_000).toFixed(2);
    if (output.isTTY && progress.total > 0) {
      if (!bar) {
        bar = new SingleBar({
          stream: output,
          format: "上传图片 [{bar}] {percentage}% | {value}/{total} 张 | {bytes}/{totalBytes} MB",
          barsize: 20,
          fps: 10,
          hideCursor: true,
          stopOnComplete: false,
        });
        bar.start(progress.total, 0, { bytes: "0.00", totalBytes });
      }
      bar.update(progress.completed, { bytes, totalBytes });
      return;
    }
    const percentage = progress.total
      ? Math.floor((progress.completed * 100) / progress.total)
      : 100;
    const bucket = Math.floor(percentage / 5);
    if (bucket > lastBucket) {
      lastBucket = bucket;
      output.write(
        `上传图片 ${percentage}% | ${progress.completed}/${progress.total} 张 | ${bytes}/${totalBytes} MB\n`,
      );
    }
  }

  function fail(): void {
    if (finished) return;
    stopBar();
    finished = true;
    output.write("资源版本发布失败\n");
  }

  return { update, fail };
}
