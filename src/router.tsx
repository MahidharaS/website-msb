import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: ({ error }) => (
      <div role="alert" className="p-8 text-foreground">
        {error instanceof Error ? error.message : "Something went wrong."}
      </div>
    ),
    scrollRestoration: true,
    // soft cross-fade between pages where the browser supports view transitions
    defaultViewTransition: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
