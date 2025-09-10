import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { triggerIntegrationWebhook } from '@/lib/webhook-integrations';

const WEBHOOKS_FILE = path.join(process.cwd(), 'data', 'webhooks.json');

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  userId: string;
  active: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  headers?: Record<string, string>;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
}

const WEBHOOK_EVENTS = [
  'file.uploaded',
  'file.deleted',
  'file.analyzed',
  'file.shared',
  'file.downloaded',
  'compression.completed',
  'analysis.completed',
  'user.login',
  'user.logout',
  'api_key.created',
  'api_key.revoked'
];

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadWebhooks(): Map<string, Webhook> {
  ensureDataDir();
  if (fs.existsSync(WEBHOOKS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(WEBHOOKS_FILE, 'utf-8'));
      const webhooksMap = new Map<string, Webhook>();
      data.forEach((webhook: Webhook) => {
        webhooksMap.set(webhook.id, webhook);
      });
      return webhooksMap;
    } catch {
      return new Map();
    }
  }
  return new Map();
}

function saveWebhooks(webhooks: Map<string, Webhook>) {
  ensureDataDir();
  const webhooksArray = Array.from(webhooks.values());
  fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooksArray, null, 2));
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function triggerWebhooks(event: string, data: any) {
  const webhooks = loadWebhooks();
  const activeWebhooks = Array.from(webhooks.values()).filter(
    w => w.active && w.events.includes(event)
  );

  for (const webhook of activeWebhooks) {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    const payloadString = JSON.stringify(payload);

    if (webhook.secret) {
      payload.signature = signPayload(payloadString, webhook.secret);
    }

    // Trigger webhook asynchronously
    triggerWebhook(webhook, payload);
  }
}

async function triggerWebhook(webhook: Webhook, payload: WebhookPayload, retryCount = 0) {
  try {
    const headers: Record<string, string> = {
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      ...webhook.headers
    };

    if (payload.signature) {
      headers['X-Webhook-Signature'] = payload.signature;
    }

    // Use our integration helper for better service support
    const success = await triggerIntegrationWebhook(webhook.url, payload, headers);

    const webhooks = loadWebhooks();
    const updatedWebhook = webhooks.get(webhook.id);

    if (updatedWebhook) {
      updatedWebhook.lastTriggered = new Date().toISOString();

      if (success) {
        updatedWebhook.successCount++;
      } else {
        updatedWebhook.failureCount++;

        // Retry logic
        if (webhook.retryOnFailure && retryCount < webhook.maxRetries) {
          setTimeout(() => {
            triggerWebhook(webhook, payload, retryCount + 1);
          }, Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }

      webhooks.set(webhook.id, updatedWebhook);
      saveWebhooks(webhooks);
    }
  } catch (error) {
    console.error(`Webhook trigger error for ${webhook.name}:`, error);

    const webhooks = loadWebhooks();
    const updatedWebhook = webhooks.get(webhook.id);

    if (updatedWebhook) {
      updatedWebhook.failureCount++;
      webhooks.set(webhook.id, updatedWebhook);
      saveWebhooks(webhooks);
    }

    // Retry on network errors
    if (webhook.retryOnFailure && retryCount < webhook.maxRetries) {
      setTimeout(() => {
        triggerWebhook(webhook, payload, retryCount + 1);
      }, Math.pow(2, retryCount) * 1000);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const {
      name,
      url,
      events,
      retryOnFailure = true,
      maxRetries = 3,
      headers
    } = await request.json();

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Name, URL, and events are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Validate events
    const invalidEvents = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { success: false, message: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    const webhooks = loadWebhooks();

    // Check webhook limit
    const userWebhooks = Array.from(webhooks.values()).filter(w => w.userId === payload.userId);
    if (userWebhooks.length >= 10) {
      return NextResponse.json(
        { success: false, message: 'Maximum webhooks limit reached (10)' },
        { status: 400 }
      );
    }

    const newWebhook: Webhook = {
      id: crypto.randomBytes(8).toString('hex'),
      name,
      url,
      secret: generateWebhookSecret(),
      events,
      userId: payload.userId,
      active: true,
      retryOnFailure,
      maxRetries,
      headers,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date().toISOString()
    };

    webhooks.set(newWebhook.id, newWebhook);
    saveWebhooks(webhooks);

    // Test webhook with a ping event
    triggerWebhook(newWebhook, {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Webhook configured successfully' }
    });

    return NextResponse.json({
      success: true,
      webhook: {
        ...newWebhook,
        secret: undefined // Don't return secret in response
      },
      secret: newWebhook.secret, // Return secret separately for user to save
      message: 'Webhook created successfully. Save the secret for signature verification.'
    });
  } catch (error) {
    console.error('Webhook creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const webhooks = loadWebhooks();
    const userWebhooks = Array.from(webhooks.values())
      .filter(w => w.userId === payload.userId)
      .map(w => ({
        ...w,
        secret: undefined // Don't expose secret
      }));

    return NextResponse.json({
      success: true,
      webhooks: userWebhooks,
      availableEvents: WEBHOOK_EVENTS
    });
  } catch (error) {
    console.error('Webhook retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve webhooks' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { webhookId, active } = await request.json();

    const webhooks = loadWebhooks();
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      return NextResponse.json(
        { success: false, message: 'Webhook not found' },
        { status: 404 }
      );
    }

    webhook.active = active;
    webhooks.set(webhookId, webhook);
    saveWebhooks(webhooks);

    return NextResponse.json({
      success: true,
      message: `Webhook ${active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Webhook update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    const payload = verifyToken(token!);
    if (!token || !payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { webhookId } = await request.json();

    const webhooks = loadWebhooks();
    const webhook = webhooks.get(webhookId);

    if (!webhook || webhook.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, message: 'Webhook not found' },
        { status: 404 }
      );
    }

    webhooks.delete(webhookId);
    saveWebhooks(webhooks);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Webhook deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
