'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Key,
  Webhook,
  Link,
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rateLimit: number;
  expiresAt?: string;
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  status: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  successCount: number;
  failureCount: number;
  lastTriggered?: string;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('api-keys');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [keyPermissions, setKeyPermissions] = useState<string[]>(['read']);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      if (data.success) {
        setWebhooks(data.webhooks);
        setAvailableEvents(data.availableEvents || []);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName) return;

    setCreatingKey(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          permissions: keyPermissions,
          rateLimit: 100,
          expiresIn: 365
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowNewKey(data.apiKey.key);
        setNewKeyName('');
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId })
      });
      fetchApiKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const createWebhook = async () => {
    if (!newWebhookName || !newWebhookUrl || webhookEvents.length === 0) return;

    setCreatingWebhook(true);
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName,
          url: newWebhookUrl,
          events: webhookEvents,
          retryOnFailure: true,
          maxRetries: 3
        })
      });

      const data = await response.json();
      if (data.success) {
        setWebhookSecret(data.secret);
        setNewWebhookName('');
        setNewWebhookUrl('');
        setWebhookEvents([]);
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Error creating webhook:', error);
    } finally {
      setCreatingWebhook(false);
    }
  };

  const toggleWebhook = async (webhookId: string, active: boolean) => {
    try {
      await fetch('/api/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId, active })
      });
      fetchWebhooks();
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId })
      });
      fetchWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 ">Integrations</h1>
        <p className="mt-2 text-gray-600 ">
          Manage API keys, webhooks, and external service connections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New API Key</CardTitle>
              <CardDescription>
                Generate API keys for programmatic access to your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="flex gap-2 mt-2">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={keyPermissions.includes('read')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setKeyPermissions([...keyPermissions, 'read']);
                          } else {
                            setKeyPermissions(keyPermissions.filter(p => p !== 'read'));
                          }
                        }}
                      />
                      <span className="text-sm">Read</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={keyPermissions.includes('write')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setKeyPermissions([...keyPermissions, 'write']);
                          } else {
                            setKeyPermissions(keyPermissions.filter(p => p !== 'write'));
                          }
                        }}
                      />
                      <span className="text-sm">Write</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={keyPermissions.includes('delete')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setKeyPermissions([...keyPermissions, 'delete']);
                          } else {
                            setKeyPermissions(keyPermissions.filter(p => p !== 'delete'));
                          }
                        }}
                      />
                      <span className="text-sm">Delete</span>
                    </label>
                  </div>
                </div>
              </div>
              <Button
                onClick={createApiKey}
                disabled={!newKeyName || creatingKey}
              >
                {creatingKey ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create API Key
              </Button>

              {showNewKey && (
                <div className="p-4 bg-green-50  rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800 ">
                      New API Key Created
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(showNewKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <code className="text-xs bg-white  p-2 rounded block break-all">
                    {showNewKey}
                  </code>
                  <p className="text-xs text-green-600  mt-2">
                    Save this key securely. It won't be shown again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active API Keys</CardTitle>
              <CardDescription>
                Manage your existing API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Key className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-gray-100  px-2 py-1 rounded">
                            {key.key}
                          </code>
                          {key.permissions.map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Used {key.usageCount} times
                          {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                        {key.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeApiKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                {apiKeys.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No API keys created yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Webhook</CardTitle>
              <CardDescription>
                Set up webhooks to receive real-time notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="webhook-name">Webhook Name</Label>
                  <Input
                    id="webhook-name"
                    placeholder="Production Webhook"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="webhook-url">Endpoint URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://example.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Events to Subscribe</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {availableEvents.map(event => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebhookEvents([...webhookEvents, event]);
                          } else {
                            setWebhookEvents(webhookEvents.filter(e => e !== event));
                          }
                        }}
                      />
                      <span>{event.replace('.', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={createWebhook}
                disabled={!newWebhookName || !newWebhookUrl || webhookEvents.length === 0 || creatingWebhook}
              >
                {creatingWebhook ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Webhook className="h-4 w-4 mr-2" />
                )}
                Create Webhook
              </Button>

              {webhookSecret && (
                <div className="p-4 bg-green-50  rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800 ">
                      Webhook Secret (for signature verification)
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(webhookSecret)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <code className="text-xs bg-white  p-2 rounded block break-all">
                    {webhookSecret}
                  </code>
                  <p className="text-xs text-green-600  mt-2">
                    Save this secret for validating webhook signatures.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Webhooks</CardTitle>
              <CardDescription>
                Monitor and manage your webhook endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Webhook className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{webhook.name}</p>
                          <p className="text-sm text-gray-500">{webhook.url}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {webhook.events.slice(0, 3).map(event => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                            {webhook.events.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{webhook.events.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{webhook.successCount}</span>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm">{webhook.failureCount}</span>
                          </div>
                          {webhook.lastTriggered && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last: {new Date(webhook.lastTriggered).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={webhook.active}
                          onCheckedChange={(active) => toggleWebhook(webhook.id, active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {webhooks.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No webhooks configured yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* External Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Cloud Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <img src="https://www.google.com/drive/static/images/drive_2020q4_logo_drive_32dp.png" className="h-5 w-5 mr-2" alt="Google Drive" />
                  Connect Google Drive
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-5 w-5 mr-2 text-blue-600" />
                  Connect Dropbox
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="h-5 w-5 mr-2 text-orange-600" />
                  Connect AWS S3
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Productivity Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Connect Slack
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Connect Discord
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Connect Microsoft Teams
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
