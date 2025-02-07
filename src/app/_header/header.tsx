import Link from "next/link";
import { Suspense, cache } from "react";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, Lightbulb, Loader2Icon, LogOut } from "lucide-react";
import { getUserProfileUseCase } from "@/use-cases/users";
import { ModeToggle } from "./mode-toggle";
import { MenuButton } from "./menu-button";
import { UserId } from "@/types";
import { Logo } from "@/components/Logo";

const profilerLoader = cache(getUserProfileUseCase);

export async function Header() {
  const user = await getCurrentUser();

  return (
    <div className="fixed top-0 z-50 w-full bg-transparent">
      <div className="absolute inset-0 backdrop-blur-md" />
      <div className="container relative mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />

            <nav className="flex items-center gap-4">
              {user && (
                <Button
                  variant="ghost"
                  asChild
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                </Button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Suspense
              fallback={
                <div className="flex h-9 w-9 items-center justify-center">
                  <Loader2Icon className="h-4 w-4 animate-spin text-white/70" />
                </div>
              }
            >
              <HeaderActions />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

async function ProfileAvatar({ userId }: { userId: UserId }) {
  const profile = await profilerLoader(userId);

  return (
    <Avatar>
      <AvatarImage src={"/next.svg"} />
      <AvatarFallback>
        {profile.displayName?.substring(0, 2).toUpperCase() ?? "AA"}
      </AvatarFallback>
    </Avatar>
  );
}

async function HeaderActions() {
  const user = await getCurrentUser();
  const isSignedIn = !!user;

  return (
    <>
      {isSignedIn ? (
        <div className="flex items-center gap-3">
          <div className="hidden md:block">{/* <ModeToggle /> */}</div>
          {user && <ProfileDropdown userId={user.id} />}
          <div className="md:hidden">
            <MenuButton />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* <ModeToggle /> */}
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="h-9 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      )}
    </>
  );
}

async function ProfileDropdown({ userId }: { userId: UserId }) {
  const profile = await profilerLoader(userId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus-visible:outline-none">
        <Suspense
          fallback={
            <div className="flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-white/10">
              <Loader2Icon className="h-4 w-4 animate-spin text-white/70" />
            </div>
          }
        >
          <ProfileAvatar userId={userId} />
        </Suspense>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 border-white/10 bg-gray-900/95 text-white backdrop-blur-lg"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{profile.displayName}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
          <Link
            className="flex w-full items-center text-white/90 hover:text-white"
            href="/api/sign-out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
