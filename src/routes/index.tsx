import { createFileRoute } from "@tanstack/react-router";
import { RidgeCrawl } from "@/components/crawl/RidgeCrawl";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RidgeCrawl />;
}
