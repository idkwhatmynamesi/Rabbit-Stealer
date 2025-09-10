'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  User,
  FileArchive,
  Upload,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  details?: any;
  timestamp: string;
  status: 'success' | 'failure' | 'warning';
  ipAddress?: string;
}

interface ActivityStats {
  total: number;
  success: number;
  failure: number;
  warning: number;
  uniqueUsers: number;
  commonActions: Array<{ action: string; count: number }>;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivityLogs();
    const interval = setInterval(fetchActivityLogs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter, timeRange]);

  const fetchActivityLogs = async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('action', filter);
      params.append('limit', '100');
      params.append('quick', 'true'); // Use fast cache mode

      const response = await fetch(`/api/activity?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('upload')) return <Upload className="h-4 w-4" />;
    if (action.includes('download')) return <Download className="h-4 w-4" />;
    if (action.includes('delete')) return <AlertTriangle className="h-4 w-4" />;
    if (action.includes('login')) return <User className="h-4 w-4" />;
    if (action.includes('analyze')) return <Activity className="h-4 w-4" />;
    return <FileArchive className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failure': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return format(date, 'MMM dd, HH:mm');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Activity Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor system activity and user actions in real-time
          </p>
        </div>
        <Button
          onClick={fetchActivityLogs}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.total}</span>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                </span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Failures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-red-600">{stats.failure}</span>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-yellow-600">{stats.warning}</span>
                <Shield className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.uniqueUsers}</span>
                <User className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Common Actions */}
      {stats && stats.commonActions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Common Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {stats.commonActions.map((action) => (
                <div key={action.action} className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {action.action}
                  </Badge>
                  <span className="text-sm text-gray-500">{action.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="upload">Uploads</SelectItem>
            <SelectItem value="download">Downloads</SelectItem>
            <SelectItem value="delete">Deletions</SelectItem>
            <SelectItem value="login">Logins</SelectItem>
            <SelectItem value="analyze">Analysis</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Real-time system activity and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(log.status)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.action}</span>
                      {log.resource && (
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {log.resource}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        User: {log.userId}
                      </span>
                      {log.ipAddress && (
                        <span className="text-xs text-gray-500">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      log.status === 'success' ? 'default' :
                      log.status === 'failure' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {log.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(log.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No activity logs found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
