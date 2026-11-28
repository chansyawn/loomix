import { resourceUrl } from "@/infrastructure/resources";
import { cn } from "@/ui/lib/utils";

export function RecipeItemImage({
  background,
  image,
  className,
}: {
  background: string;
  image: string | null;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
    >
      <img
        src={resourceUrl(background)}
        alt=""
        className="absolute h-[88%] w-auto rotate-15 object-contain"
      />
      {image && (
        <img src={resourceUrl(image)} alt="" className="relative size-2/3 object-contain" />
      )}
    </span>
  );
}
