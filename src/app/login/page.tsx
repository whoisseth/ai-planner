import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Button asChild variant="outline">
              <Link href="/api/auth/github">
                Continue with GitHub
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/api/auth/google">
                Continue with Google
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 