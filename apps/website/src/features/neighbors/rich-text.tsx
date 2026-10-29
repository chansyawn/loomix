import { createElement, type ReactNode } from "react";

type TextFrame = { tag: "i" | "b" | null; children: ReactNode[] };
export function StoryText({ text }: { text: string }) {
  const root: TextFrame = { tag: null, children: [] };
  const stack = [root];
  let key = 0;
  for (const token of text.split(/(<\/?[ib]>)/g)) {
    const current = stack.at(-1)!;
    if (token === "<i>" || token === "<b>") {
      stack.push({ tag: token === "<i>" ? "i" : "b", children: [] });
    } else if ((token === "</i>" || token === "</b>") && current.tag === token.slice(2, -1)) {
      stack.pop();
      stack.at(-1)!.children.push(createElement(current.tag, { key: key++ }, current.children));
    } else {
      current.children.push(token);
    }
  }
  while (stack.length > 1) {
    const frame = stack.pop()!;
    stack.at(-1)!.children.push(`<${frame.tag}>`, ...frame.children);
  }
  return <p className="leading-8 wrap-anywhere whitespace-pre-wrap">{root.children}</p>;
}
