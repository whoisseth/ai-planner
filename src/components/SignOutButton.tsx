'use client';

import NProgress from 'nprogress';
import { signOutAction } from "@/actions/sign-out";

export function SignOutButton() {
  const handleSignOut = async () => {
    NProgress.start();
    try {
      await signOutAction();
    } finally {
      NProgress.done();
    }
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
} 