import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const skeletonVariants = cva("animate-pulse bg-muted", {
  variants: {
    shape: {
      default: "rounded-2xl",
      square: "rounded-none",
    },
  },
  defaultVariants: {
    shape: "default",
  },
});

function Skeleton({
  className,
  shape,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof skeletonVariants>) {
  return (
    <div data-slot="skeleton" className={cn(skeletonVariants({ shape }), className)} {...props} />
  );
}

export { Skeleton };
