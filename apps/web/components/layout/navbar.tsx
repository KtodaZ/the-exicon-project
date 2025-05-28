import { useState } from 'react';
import { LoadingDots } from '@/components/icons';
import Image from 'next/image';
import { MenuIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { useSession, authClient } from '@/lib/auth-client';
import { useRouter } from 'next/router';

export default function Navbar({
  setSidebarOpen
}: {
  setSidebarOpen: (open: boolean) => void;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/auth/sign-in');
  };

  return (
    <nav
      className="absolute right-0 w-full flex items-center justify-between md:justify-end px-4 h-16"
      aria-label="Navbar"
    >
      <button
        type="button"
        className="inline-flex md:hidden items-center justify-center rounded-md text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-0"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-6 w-6" aria-hidden="true" />
      </button>
      {!isPending &&
        (session?.user ? (
          <Link href={`/${session.user.name || 'profile'}`} className="w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={
                session.user.image ||
                `https://avatar.tobi.sh/${session.user.name}`
              }
              alt={session.user.name || 'User'}
              width={300}
              height={300}
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2PYsGHDfwAHNAMQumvbogAAAABJRU5ErkJggg=="
            />
          </Link>
        ) : (
          <button
            onClick={handleSignIn}
            className="bg-black hover:bg-white border-black w-36 h-8 py-1 text-white hover:text-black border rounded-md text-sm transition-all"
          >
            Sign In
          </button>
        ))}
    </nav>
  );
}
