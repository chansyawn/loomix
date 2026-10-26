// @vitest-environment happy-dom
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { NeighborStories, NeighborTravel } from "./reading";
import { NeighborImage } from "./image";
import { StoryText } from "./rich-text";
import { neighborFixture } from "./fixture";
import { toNeighborsView } from "./data";

const fixture = neighborFixture();
const neighbor = toNeighborsView(fixture.database, fixture.mapping).neighbors[0]!;
afterEach(cleanup);

test("chapters start collapsed, mount images on demand and expand independently", async () => {
  const user = userEvent.setup();
  render(<NeighborStories neighbor={neighbor} />);
  const first = screen.getByRole("button", { name: "第 1 章 · 启程" });
  const second = screen.getByRole("button", { name: "第 2 章 · 归来" });
  expect(first).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  await user.click(first);
  expect(screen.getByRole("img", { name: "启程 · 插图 1" })).toBeVisible();
  expect(screen.getByText("第二行").tagName).toBe("B");
  await user.click(second);
  expect(first).toHaveAttribute("aria-expanded", "true");
  expect(second).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("img", { name: "归来 · 插图 1" })).toBeVisible();
  expect(screen.queryByText("null")).not.toBeInTheDocument();
});

test("renders only safe inline formatting and escapes unknown or malformed tags", () => {
  const { rerender } = render(
    <StoryText text={"<i>斜体<b>粗体</b></i><img src=x onerror=alert(1)><script>bad()</script>"} />,
  );
  expect(screen.getByText("粗体").tagName).toBe("B");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText(/<img src=x/)).toBeVisible();
  rerender(<StoryText text="<i>没有闭合</b>" />);
  expect(screen.getByText("<i>没有闭合</b>")).toBeVisible();
});

test("missing and failed images show local placeholders without affecting other content", () => {
  const { rerender } = render(<NeighborImage image={neighbor.image} name="插画" />);
  fireEvent.error(screen.getByRole("img", { name: "插画" }));
  expect(screen.getByRole("img", { name: "插画：暂无图片" })).toBeVisible();
  rerender(<NeighborImage image={null} name="缺图" />);
  expect(screen.getByRole("img", { name: "缺图：暂无图片" })).toBeVisible();
});

test("travel events expose all dialogue and raw parameters without inferred preferences", async () => {
  render(<NeighborTravel neighbor={neighbor} />);
  await userEvent.click(screen.getByRole("button", { name: "友邻在旅行中获得物品（1 条）" }));
  expect(screen.getByText("旅行真开心！")).toBeVisible();
  expect(screen.getByText("原始触发参数 · 阈值：4 · 资源类别：6 · 次级阈值：2")).toBeVisible();
});

test("empty stories and dialogue describe missing records, not absent game features", () => {
  render(
    <>
      <NeighborStories neighbor={{ ...neighbor, stories: [] }} />
      <NeighborTravel neighbor={{ ...neighbor, travel: [] }} />
    </>,
  );
  expect(screen.getByText("当前资料暂未收录友邻故事")).toBeVisible();
  expect(screen.getByText("当前资料暂未收录角色专属旅行台词")).toBeVisible();
});
