import { createFileRoute } from "@tanstack/react-router";
import { PlaysHome } from "@/components/plays-home";

export const Route = createFileRoute("/")({ component: PlaysHome });
