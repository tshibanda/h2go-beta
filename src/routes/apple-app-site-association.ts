import { createFileRoute } from "@tanstack/react-router";

const AASA_CONTENT = {
  applinks: {
    apps: [],
    details: [
      {
        appID: "64WRGLMF42.com.h2go.app",
        paths: ["*"],
      },
    ],
  },
};

export const Route = createFileRoute("/apple-app-site-association")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(AASA_CONTENT), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
    },
  },
});