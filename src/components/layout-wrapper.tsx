'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Sidebar } from '@/components/sidebar';
import { useEffect } from 'react';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Pages that don't need authentication
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      // Redirect to login if not authenticated and trying to access protected route
      router.push('/login');
    } else if (!loading && user && isPublicPath) {
      // Redirect to dashboard if authenticated and trying to access login/register
      router.push('/');
    }
  }, [user, loading, pathname, isPublicPath, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show public pages (login/register) without sidebar
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Show protected pages with sidebar (only if user is authenticated)
  if (user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Return nothing while redirecting
  return null;
}