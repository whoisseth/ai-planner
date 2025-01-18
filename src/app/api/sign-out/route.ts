import { redirect } from "next/navigation";
import { signOutAction } from "@/actions/sign-out";

export async function GET() {
  try {
    await signOutAction();
    redirect("/signed-out");
  } catch (error) {
    redirect("/sign-in");
  }
}
