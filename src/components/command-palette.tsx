'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  FileArchive,
  Upload,
  Search,
  BarChart3,
  Cookie,
  Settings,
  Shield,
  Zap,
  LogOut,
  User,
  FileText,
  Download,
  Share2,
  Hash,
  Clock
} from 'lucide-react';
import { useAuth } from './auth-provider';

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // Quick shortcuts
      if ((e.metaKey || e.ctrlKey) && !open) {
        switch(e.key) {
          case 'u':
            e.preventDefault();
            router.push('/upload');
            break;
          case 's':
            e.preventDefault();
            router.push('/stats');
            break;
          case 'a':
            e.preventDefault();
            router.push('/analyzer');
            break;
          case '/':
            e.preventDefault();
            setOpen(true);
            break;
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [router, open]);

  const commands: Command[] = [
    // Navigation
    {
      id: 'home',
      title: 'Go to Home',
      icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 7.261C18 4.157 15.643 1.8 12.539 1.8c-1.87 0-3.532.915-4.539 2.322C7.085 3.567 6.268 3.3 5.4 3.3 3.522 3.3 2 4.822 2 6.7c0 1.878 1.522 3.4 3.4 3.4.2 0 .398-.017.593-.05C6.81 11.8 8.5 13 10.5 13c.276 0 .5.224.5.5s-.224.5-.5.5c-1.105 0-2-.895-2-2 0-.276-.224-.5-.5-.5S7.5 11.224 7.5 12c0 1.657 1.343 3 3 3s3-1.343 3-3c0-.276.224-.5.5-.5s.5.224.5.5c0 .276.224.5.5.5s.5-.224.5-.5c0-1.105-.895-2-2-2-.276 0-.5-.224-.5-.5s.224-.5.5-.5c2 0 3.69-1.2 4.507-2.95.195.033.393.05.593.05 1.878 0 3.4-1.522 3.4-3.4z"/>
          <circle cx="8" cy="6" r="1.5"/>
          <circle cx="16" cy="6" r="1.5"/>
          <path d="M12 15c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4c0-1.1-.9-2-2-2z"/>
        </svg>
      ),
      action: () => { router.push('/'); setOpen(false); },
      category: 'Navigation',
      keywords: ['main', 'dashboard', 'files']
    },
    {
      id: 'upload',
      title: 'Upload Files',
      icon: Upload,
      action: () => { router.push('/upload'); setOpen(false); },
      category: 'Navigation',
      keywords: ['new', 'add', 'zip']
    },
    {
      id: 'stats',
      title: 'View Statistics',
      icon: BarChart3,
      action: () => { router.push('/stats'); setOpen(false); },
      category: 'Navigation',
      keywords: ['compression', 'analysis']
    },
    {
      id: 'analyzer',
      title: 'Analyze Files',
      icon: Search,
      action: () => { router.push('/analyzer'); setOpen(false); },
      category: 'Navigation',
      keywords: ['search', 'find', 'scan']
    },
    {
      id: 'cookies',
      title: 'Cookie Converter',
      icon: Cookie,
      action: () => { router.push('/cookies'); setOpen(false); },
      category: 'Navigation',
      keywords: ['netscape', 'convert']
    },
    {
      id: 'features',
      title: 'Feature Settings',
      icon: Zap,
      action: () => { router.push('/features'); setOpen(false); },
      category: 'Navigation',
      keywords: ['config', 'settings', 'flags']
    },
    {
      id: 'security',
      title: 'Security Center',
      icon: Shield,
      action: () => { router.push('/security'); setOpen(false); },
      category: 'Navigation',
      keywords: ['protection', 'safety']
    },
    {
      id: 'tools',
      title: 'Developer Tools',
      icon: Settings,
      action: () => { router.push('/tools'); setOpen(false); },
      category: 'Navigation',
      keywords: ['utilities', 'helpers']
    },

    // Actions
    {
      id: 'share-file',
      title: 'Share File',
      description: 'Create a public share link',
      icon: Share2,
      action: () => {
        // Open share modal
        const event = new CustomEvent('openShareModal');
        window.dispatchEvent(event);
        setOpen(false);
      },
      category: 'Actions',
      keywords: ['public', 'link', 'url']
    },
    {
      id: 'search-files',
      title: 'Search in Files',
      description: 'Search content inside ZIP files',
      icon: Search,
      action: () => {
        const event = new CustomEvent('openSearchModal');
        window.dispatchEvent(event);
        setOpen(false);
      },
      category: 'Actions',
      keywords: ['find', 'content', 'inside']
    },
    {
      id: 'bulk-select',
      title: 'Bulk Select',
      description: 'Select multiple files',
      icon: FileText,
      action: () => {
        const event = new CustomEvent('enableBulkSelect');
        window.dispatchEvent(event);
        setOpen(false);
      },
      category: 'Actions',
      keywords: ['multiple', 'batch', 'mass']
    },
    {
      id: 'download-all',
      title: 'Download All',
      description: 'Download all files',
      icon: Download,
      action: () => {
        const event = new CustomEvent('downloadAll');
        window.dispatchEvent(event);
        setOpen(false);
      },
      category: 'Actions',
      keywords: ['export', 'save', 'backup']
    },

    // Tools
    {
      id: 'generate-hash',
      title: 'Generate Hash',
      description: 'SHA-256 hash generator',
      icon: Hash,
      action: () => {
        router.push('/tools');
        setOpen(false);
      },
      category: 'Tools',
      keywords: ['sha', 'md5', 'checksum']
    },
    {
      id: 'timestamp',
      title: 'Timestamp Converter',
      icon: Clock,
      action: () => {
        router.push('/tools');
        setOpen(false);
      },
      category: 'Tools',
      keywords: ['unix', 'date', 'time']
    },

    // User
    {
      id: 'profile',
      title: 'View Profile',
      icon: User,
      action: () => {
        const event = new CustomEvent('openProfile');
        window.dispatchEvent(event);
        setOpen(false);
      },
      category: 'User',
      keywords: ['account', 'settings']
    },
    {
      id: 'logout',
      title: 'Sign Out',
      icon: LogOut,
      action: () => {
        logout();
        setOpen(false);
      },
      category: 'User',
      keywords: ['exit', 'leave']
    },
  ];

  const filteredCommands = commands.filter(cmd => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(searchLower)) ||
      cmd.category.toLowerCase().includes(searchLower)
    );
  });

  const groupedCommands = filteredCommands.reduce((groups, cmd) => {
    if (!groups[cmd.category]) {
      groups[cmd.category] = [];
    }
    groups[cmd.category].push(cmd);
    return groups;
  }, {} as Record<string, Command[]>);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command or search..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {Object.entries(groupedCommands).map(([category, items]) => (
            <div key={category}>
              <CommandGroup heading={category}>
                {items.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <CommandItem
                      key={cmd.id}
                      onSelect={cmd.action}
                      className="cursor-pointer"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{cmd.title}</div>
                        {cmd.description && (
                          <div className="text-xs text-gray-500">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </div>
          ))}

          <div className="px-2 py-1.5 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Quick access</span>
              <span className="text-gray-400">Press ⌘K to open</span>
            </div>
          </div>
        </CommandList>
      </CommandDialog>

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg hover:shadow-xl transition-all text-sm font-medium"
      >
        <Search className="h-4 w-4" />
        <span>⌘K</span>
      </button>
    </>
  );
}
