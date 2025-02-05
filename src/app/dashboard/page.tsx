import { getTasks } from "@/app/actions/tasks";
import { DashboardClient } from "./components/DashboardClient";

export default async function Dashboard() {
  const tasks = await getTasks();

  return <DashboardClient initialTasks={tasks} />;
}
