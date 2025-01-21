'use client';

import NProgress from 'nprogress';
import { signOutAction } from "@/actions/sign-out";



export function SignOutButton({ buttonText = "Sign Out" }) {
  const handleSignOut = async () => {
    NProgress.start();
    try {
      await signOutAction();
    } finally {
      NProgress.done();
    }
  };

  return <button onClick={handleSignOut}>{buttonText}</button>;
} 