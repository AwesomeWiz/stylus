import { ErrorExperience } from "@/components/errors/error-experience";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return <ErrorExperience kind="missing" />;
}
