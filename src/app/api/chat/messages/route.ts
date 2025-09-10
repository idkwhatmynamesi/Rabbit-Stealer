import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getUserById } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const MESSAGES_FILE = path.join(process.cwd(), 'data', 'chat-messages.json');

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  encrypted: boolean;
}

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load messages from file
function loadMessages(): ChatMessage[] {
  ensureDataDir();
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }
  return [];
}

// Save messages to file
function saveMessages(messages: ChatMessage[]) {
  ensureDataDir();
  // Keep only last 100 messages to prevent file from growing too large
  const recentMessages = messages.slice(-100);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(recentMessages, null, 2));
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
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

    const messages = loadMessages();
    
    // Filter messages from last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = messages.filter(msg => 
      new Date(msg.timestamp) > dayAgo
    );

    return NextResponse.json({
      success: true,
      messages: recentMessages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
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

    const user = getUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { content } = await request.json();
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    const messages = loadMessages();
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      encrypted: true
    };

    messages.push(newMessage);
    saveMessages(messages);

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}