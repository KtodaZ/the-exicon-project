import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { auth } from '@/lib/auth';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

interface AdminPageProps {
  hasAccess: boolean;
}

export default function AdminPage({ hasAccess }: AdminPageProps) {
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();

  if (isPending || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You must be logged in to access the admin panel.</p>
          <a
            href="/auth/sign-in"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (!permissions?.canListUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - The Exicon Project</title>
        <meta name="description" content="Administration panel for The Exicon Project" />
      </Head>
      
      <AdminDashboard />
    </>
  );
}

// Server-side authentication and permission check
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Convert Next.js headers to Web API Headers format
    const headers = new Headers();
    Object.entries(context.req.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    });

    // Get session from server
    const session = await auth.api.getSession({
      headers,
    });

    // If no session, allow client to handle redirect
    if (!session?.user) {
      return {
        props: {
          hasAccess: false,
        },
      };
    }

    // Check if user has admin permissions server-side
    const hasPermissionResult = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permissions: {
          user: ["list"],
        },
      },
    });

    console.log('getServerSideProps - hasPermissionResult:', hasPermissionResult);

    return {
      props: {
        hasAccess: !!(hasPermissionResult?.success && !hasPermissionResult?.error),
      },
    };
  } catch (error) {
    console.error('Error in admin page getServerSideProps:', error);
    return {
      props: {
        hasAccess: false,
      },
    };
  }
}; 