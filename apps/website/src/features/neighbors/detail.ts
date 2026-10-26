import { notFound } from "@tanstack/react-router";
import { loadNeighbors } from "./data";

export async function loadNeighborDetail(id: string) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw notFound();
  const data = await loadNeighbors();
  const neighbor = data.neighbors.find((entry) => entry.id === Number(id));
  if (!neighbor) throw notFound();
  return neighbor;
}
