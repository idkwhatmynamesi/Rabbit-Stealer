'use client';

import { cn } from '@/lib/utils';
import {
  FileArchive,
  Home,
  Search,
  FileText,
  Upload,
  LogOut,
  User,
  BarChart3,
  Cookie,
  Settings,
  Shield,
  Zap,
  Activity,
  Link as LinkIcon,
  GitCompare,
  MessageCircle,
  Wrench
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const navigation = [
  { name: 'Main', href: '/', icon: Home },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Parse', href: '/parse', icon: FileText },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
  { name: 'Analyzer', href: '/analyzer', icon: Search },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Integrations', href: '/integrations', icon: LinkIcon },
  { name: 'Cookies', href: '/cookies', icon: Cookie },
  { name: 'Features', href: '/features', icon: Zap },
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Tools', href: '/tools', icon: Settings },
  { name: 'Live Chat', href: '/chat', icon: MessageCircle },
  { name: 'Builder', href: '/builder', icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <Image 
          src="/rabbit.png" 
          alt="Rabbit Logo" 
          width={32} 
          height={32} 
          className="h-8 w-8"
        />
        <span className="ml-3 text-xl font-semibold text-white">Rabbit</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
              )}
            >
              <item.icon
                className={cn(
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                  'mr-3 h-5 w-5 flex-shrink-0'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4 space-y-4">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.name}</p>
                <p className="text-gray-400 text-xs truncate">{user.email}</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        )}
        <div className="text-xs text-gray-400">
          <p>© 2024 Rabbit</p>
          <p className="mt-1">Version 2.0.0</p>
        </div>
      </div>
    </div>
  );
}