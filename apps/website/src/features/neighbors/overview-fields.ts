import { hintField, textField, type DetailField } from "../detail-page/field-model";
import type { DetailResourceState } from "../detail-page/use-detail-resource";
import type { neighborEncounterIslets } from "../starsea/view";
import type { neighborVignettes } from "../vignettes/view";
import type { NeighborDetail } from "./view";

export function neighborProfileFields({ profile, stars }: NeighborDetail): DetailField[] {
  const galaxies = stars.flatMap(({ name, galaxy }) => {
    if (!galaxy) return [];
    return stars.length > 1 ? `${name} · ${galaxy}星系` : `${galaxy}星系`;
  });
  return [
    textField("昵称", profile.nickname),
    textField("英文名", profile.englishName),
    textField("生日", profile.birthday),
    textField("所属星球", stars.map((star) => star.name).join("、")),
    textField("所属星系", galaxies.join("\n")),
  ];
}

function placeField<Value>(
  label: string,
  state: DetailResourceState<Value> | undefined,
  describe: (value: Value) => DetailField,
): DetailField {
  if (state?.status === "ready") return describe(state.value);
  if (state?.status === "error")
    return { kind: "hint", label, value: "暂时无法加载", retry: state.retry };
  return { kind: "hint", label, value: "正在加载", live: true };
}

export function neighborPlaceFields(
  islets: DetailResourceState<ReturnType<typeof neighborEncounterIslets>> | undefined,
  vignettes: DetailResourceState<ReturnType<typeof neighborVignettes>> | undefined,
): DetailField[] {
  const isletLabel = "邂逅候选星屿";
  const vignetteLabel = "关联小栖地";
  return [
    placeField(isletLabel, islets, ({ islets: candidates, unconfirmedRegions }) => {
      const note = unconfirmedRegions.length
        ? `${unconfirmedRegions.join("、")}的候选星屿未确认`
        : undefined;
      if (!candidates.length) return hintField(isletLabel, note ?? null);
      return {
        kind: "entries",
        label: isletLabel,
        note,
        value: candidates.map(({ id, name, image, regions, anchor }) => ({
          key: id,
          name,
          image,
          note: regions.join("、"),
          destination: {
            to: "/starsea/islets/$id",
            params: { id: String(id) },
            hash: anchor,
          },
        })),
      };
    }),
    placeField(vignetteLabel, vignettes, (templates) => ({
      kind: "entries",
      label: vignetteLabel,
      value: templates.map(({ id, name, image }) => ({
        key: id,
        name,
        image,
        destination: {
          to: "/vignettes/$id",
          params: { id: String(id) },
          hash: "related-neighbors",
        },
      })),
    })),
  ];
}
