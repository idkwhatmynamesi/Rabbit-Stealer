import crypto from 'crypto';

interface WebhookData {
  event: string;
  timestamp: string;
  data: any;
}

// Discord Webhook Integration
export async function sendDiscordWebhook(webhookUrl: string, data: WebhookData) {
  try {
    // Format message for Discord
    const embed = {
      title: `🔔 Event: ${data.event}`,
      description: formatEventDescription(data.event, data.data),
      color: getEventColor(data.event),
      fields: formatDataFields(data.data),
      timestamp: data.timestamp,
      footer: {
        text: 'Rabbit Panel Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Rabbit Panel',
        embeds: [embed]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

// Slack Webhook Integration
export async function sendSlackWebhook(webhookUrl: string, data: WebhookData) {
  try {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Event: ${data.event}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formatEventDescription(data.event, data.data)
        }
      },
      {
        type: 'section',
        fields: formatSlackFields(data.data)
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Timestamp:* ${new Date(data.timestamp).toLocaleString()}`
          }
        ]
      }
    ];

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New event: ${data.event}`,
        blocks
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Slack webhook error:', error);
    return false;
  }
}

// Telegram Bot Integration
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  data: WebhookData
) {
  try {
    const message = formatTelegramMessage(data);
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }
    );

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Telegram notification error:', error);
    return false;
  }
}

// Email Notification (using SendGrid or similar)
export async function sendEmailNotification(
  apiKey: string,
  to: string,
  from: string,
  data: WebhookData
) {
  try {
    // This is a placeholder - implement with actual email service
    // For example, using SendGrid:
    const sgMail = {
      to,
      from,
      subject: `Rabbit Panel: ${data.event}`,
      text: formatEmailText(data),
      html: formatEmailHtml(data)
    };

    // Actual implementation would use SendGrid API or similar
    console.log('Email notification would be sent:', sgMail);
    return true;
  } catch (error) {
    console.error('Email notification error:', error);
    return false;
  }
}

// Helper functions
function formatEventDescription(event: string, data: any): string {
  switch (event) {
    case 'file.uploaded':
      return `New file uploaded: **${data.filename || 'Unknown'}**\nSize: ${formatFileSize(data.size || 0)}`;
    case 'file.deleted':
      return `File deleted: **${data.filename || 'Unknown'}**`;
    case 'file.analyzed':
      return `File analysis completed: **${data.filename || 'Unknown'}**\nRisk Level: ${data.riskLevel || 'Unknown'}`;
    case 'user.login':
      return `User logged in: **${data.email || 'Unknown'}**\nIP: ${data.ip || 'Unknown'}`;
    case 'user.logout':
      return `User logged out: **${data.email || 'Unknown'}**`;
    case 'compression.completed':
      return `Compression completed: **${data.filename || 'Unknown'}**\nOriginal: ${formatFileSize(data.originalSize || 0)} → Compressed: ${formatFileSize(data.compressedSize || 0)}`;
    default:
      return `Event triggered: ${event}`;
  }
}

function getEventColor(event: string): number {
  const colors: Record<string, number> = {
    'file.uploaded': 0x00ff00,     // Green
    'file.deleted': 0xff0000,      // Red
    'file.analyzed': 0x0099ff,     // Blue
    'user.login': 0x00ff99,        // Cyan
    'user.logout': 0xff9900,       // Orange
    'compression.completed': 0x9900ff, // Purple
    'webhook.test': 0xffff00       // Yellow
  };
  return colors[event] || 0x808080;  // Default gray
}

function formatDataFields(data: any): any[] {
  const fields = [];
  const excludeKeys = ['filename', 'email']; // Already in description
  
  for (const [key, value] of Object.entries(data)) {
    if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
      fields.push({
        name: formatFieldName(key),
        value: String(value).substring(0, 1024),
        inline: true
      });
    }
  }
  
  return fields;
}

function formatSlackFields(data: any): any[] {
  const fields = [];
  const excludeKeys = ['filename', 'email'];
  
  for (const [key, value] of Object.entries(data)) {
    if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
      fields.push({
        type: 'mrkdwn',
        text: `*${formatFieldName(key)}:*\n${String(value).substring(0, 500)}`
      });
    }
  }
  
  return fields;
}

function formatTelegramMessage(data: WebhookData): string {
  let message = `<b>🔔 ${data.event}</b>\n\n`;
  message += `${formatEventDescription(data.event, data.data).replace(/\*\*/g, '')}\n\n`;
  
  const excludeKeys = ['filename', 'email'];
  for (const [key, value] of Object.entries(data.data)) {
    if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
      message += `<b>${formatFieldName(key)}:</b> ${String(value).substring(0, 500)}\n`;
    }
  }
  
  message += `\n<i>Time: ${new Date(data.timestamp).toLocaleString()}</i>`;
  return message;
}

function formatEmailText(data: WebhookData): string {
  let text = `Event: ${data.event}\n\n`;
  text += `${formatEventDescription(data.event, data.data).replace(/\*\*/g, '')}\n\n`;
  
  for (const [key, value] of Object.entries(data.data)) {
    if (value !== null && value !== undefined) {
      text += `${formatFieldName(key)}: ${String(value)}\n`;
    }
  }
  
  text += `\nTimestamp: ${new Date(data.timestamp).toLocaleString()}`;
  return text;
}

function formatEmailHtml(data: WebhookData): string {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">🔔 ${data.event}</h2>
      <p style="color: #666;">${formatEventDescription(data.event, data.data).replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>')}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  `;
  
  for (const [key, value] of Object.entries(data.data)) {
    if (value !== null && value !== undefined) {
      html += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; font-weight: bold; width: 30%;">${formatFieldName(key)}</td>
          <td style="padding: 10px;">${String(value)}</td>
        </tr>
      `;
    }
  }
  
  html += `
      </table>
      <p style="color: #999; font-size: 12px;">Timestamp: ${new Date(data.timestamp).toLocaleString()}</p>
    </div>
  `;
  
  return html;
}

function formatFieldName(key: string): string {
  return key
    .split(/(?=[A-Z])|_/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Main webhook trigger function that detects and uses the appropriate service
export async function triggerIntegrationWebhook(
  url: string,
  data: WebhookData,
  headers?: Record<string, string>
): Promise<boolean> {
  try {
    // Detect webhook type by URL pattern
    if (url.includes('discord.com/api/webhooks') || url.includes('discordapp.com/api/webhooks')) {
      return await sendDiscordWebhook(url, data);
    } else if (url.includes('hooks.slack.com')) {
      return await sendSlackWebhook(url, data);
    } else {
      // Generic webhook
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data)
      });
      return response.ok;
    }
  } catch (error) {
    console.error('Integration webhook error:', error);
    return false;
  }
}