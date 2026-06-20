import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
