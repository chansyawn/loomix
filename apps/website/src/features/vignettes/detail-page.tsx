import { DetailTitleMetadata, type DetailField } from "@/features/detail-page/detail-fields";
import { DetailPage, type DetailSection } from "@/features/detail-page/detail-page";
import { catalogRelationEntry } from "../omnidex/detail-relations";
import { textField, hintField, quantityField } from "../detail-page/field-model";
import { RecordImage } from "@/features/omnidex/record-image";
import { VignetteRequirements } from "./requirements";
import { VignettePlacementRules } from "./placement-reference";
import type { VignetteDetail } from "./view";

export function VignetteDetailPage({ entry }: { entry: VignetteDetail }) {
  const relations: DetailField[] = [];
  if (entry.neighbors.length)
    relations.push({ kind: "neighbors", label: "关联友邻", value: entry.neighbors });
  if (entry.creatures.length)
    relations.push({
      kind: "entries",
      label: "关联生物",
      value: entry.creatures.map(catalogRelationEntry),
      anchor: "related-creatures",
    });
  if (!relations.length) relations.push(hintField("关联条目", "暂无已确认的关联友邻或生物"));
  const sections: DetailSection[] = [
    {
      id: "vignette-requirements",
      title: "布景要求",
      content: (
        <>
          {entry.taskPlacementHints.map((hint) => (
            <p key={hint} className="mb-3 text-sm whitespace-pre-line">
              <span className="font-medium">任务指定地点 · </span>
              {hint}
            </p>
          ))}
          <VignettePlacementRules rules={entry.placementRules} />
          <VignetteRequirements requirements={entry.requirements} />
        </>
      ),
    },
  ];
  return (
    <DetailPage
      image={
        <RecordImage
          key={entry.image}
          image={entry.image}
          name={entry.name}
          inset="none"
          eager
          className="aspect-2/1"
        />
      }
      title={entry.name}
      titleMetadata={
        <DetailTitleMetadata id={entry.id} category="小栖地">
          {entry.stars}
        </DetailTitleMetadata>
      }
      fieldGroups={[
        {
          fields: [
            quantityField("尺寸", entry.size),
            textField("地形", entry.terrain),
            ...relations,
            {
              kind: "hint",
              label: "获取提示",
              value: entry.acquisitionHints.join("\n"),
              fullWidth: true,
            },
          ],
        },
      ]}
      sections={sections}
    />
  );
}
