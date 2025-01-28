import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates | AI Task Planner",
  description: "Create and manage task templates",
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 