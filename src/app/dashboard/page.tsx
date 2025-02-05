import { getTasks } from "@/app/actions/tasks";
import { DashboardClient } from "./components/DashboardClient";

export default async function Dashboard() {
  const tasks = await getTasks();
  console.log("tasks", tasks);

  return <DashboardClient initialTasks={tasks} />;
}
