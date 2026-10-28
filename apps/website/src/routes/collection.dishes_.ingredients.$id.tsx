import { createFileRoute } from "@tanstack/react-router";
import { loadIngredientCategoryDetail } from "@/features/ingredients/detail";
import {
  IngredientCategoryError,
  IngredientCategoryLoading,
  IngredientCategoryNotFound,
  IngredientCategoryPage,
} from "@/features/ingredients/detail-page";

export const Route = createFileRoute("/collection/dishes_/ingredients/$id")({
  ssr: false,
  loader: ({ params }) => loadIngredientCategoryDetail(params.id),
  pendingComponent: IngredientCategoryLoading,
  errorComponent: IngredientCategoryError,
  notFoundComponent: IngredientCategoryNotFound,
  component: IngredientCategoryRoute,
});

function IngredientCategoryRoute() {
  return <IngredientCategoryPage key={Route.useParams().id} detail={Route.useLoaderData()} />;
}
