import { PassThrough } from "node:stream";
import { expect, test } from "vite-plus/test";
import { createUploadProgress } from "../src/progress.ts";
import type { UploadProgress } from "../src/publish.ts";

const initial: UploadProgress = {
  phase: "images",
  completed: 0,
  total: 100,
  completedBytes: 0,
  totalBytes: 1_000_000,
};

function output(isTTY: boolean) {
  const stream = Object.assign(new PassThrough(), { isTTY, columns: 160 });
  let text = "";
  stream.on("data", (data: Buffer) => {
    text += data.toString();
  });
  return { stream, text: () => text };
}

test("non-TTY progress prints percentage milestones without ANSI control codes", () => {
  const target = output(false);
  const reporter = createUploadProgress(target.stream);
  for (const completed of [0, 1, 4, 5, 6, 50, 100]) {
    reporter.update({ ...initial, completed, completedBytes: completed * 10_000 });
  }
  expect(target.text().split("\n").filter(Boolean)).toHaveLength(4);
  expect(target.text()).toContain("上传图片 50% | 50/100 张 | 0.50/1.00 MB");
  expect(target.text()).not.toContain("\u001b");
  expect(target.text()).not.toContain("发布成功");
  reporter.update({ ...initial, phase: "finalizing" });
  expect(target.text()).toContain("正在发布内容与完成标记");
  reporter.update({ ...initial, phase: "complete" });
  expect(target.text()).toContain("资源版本发布成功");
});

test("TTY progress renders a cli-progress bar and restores the cursor on failure", () => {
  const target = output(true);
  const reporter = createUploadProgress(target.stream);
  try {
    reporter.update(initial);
    reporter.update({ ...initial, completed: 25, completedBytes: 250_000 });
  } finally {
    reporter.fail();
  }
  expect(target.text()).toContain("上传图片 [");
  expect(target.text()).toContain("25/100 张 | 0.25/1.00 MB");
  expect(target.text()).toContain("\u001b[?25h");
  expect(target.text()).not.toContain("100%");
  expect(target.text()).toContain("资源版本发布失败");
  const stopped = target.text();
  reporter.update({ ...initial, phase: "complete" });
  reporter.fail();
  expect(target.text()).toBe(stopped);
});

test("zero-image releases finalize without starting a terminal animation", () => {
  const target = output(true);
  const reporter = createUploadProgress(target.stream);
  reporter.update({ ...initial, total: 0, totalBytes: 0 });
  reporter.update({ ...initial, phase: "finalizing", total: 0, totalBytes: 0 });
  reporter.update({ ...initial, phase: "complete", total: 0, totalBytes: 0 });
  expect(target.text()).toContain("0/0 张 | 0.00/0.00 MB");
  expect(target.text()).not.toContain("\u001b");
  expect(target.text()).toContain("资源版本发布成功");
});

test("completion stops the TTY bar before reporting publication success", () => {
  const target = output(true);
  const reporter = createUploadProgress(target.stream);
  try {
    reporter.update(initial);
    reporter.update({ ...initial, completed: 100, completedBytes: initial.totalBytes });
    reporter.update({ ...initial, phase: "finalizing" });
    expect(target.text()).toContain("100/100 张");
    expect(target.text()).not.toContain("发布成功");
    reporter.update({ ...initial, phase: "complete" });
    expect(target.text()).toContain("资源版本发布成功");
  } finally {
    reporter.fail();
  }
});
