import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const ONLINE_USERS_FILE = path.join(process.cwd(), 'data', 'online-users.json');

interface OnlineUser {
  userId: string;
  userName: string;
  lastSeen: string;
}

// Load all users
function loadAllUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }
  return [];
}

// Load online users
function loadOnlineUsers(): OnlineUser[] {
  if (fs.existsSync(ONLINE_USERS_FILE)) {
    try {
      const data = fs.readFileSync(ONLINE_USERS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading online users:', error);
      return [];
    }
  }
  return [];
}

// Save online users
function saveOnlineUsers(onlineUsers: OnlineUser[]) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Remove users who haven't been seen in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const activeUsers = onlineUsers.filter(user => 
    new Date(user.lastSeen) > fiveMinutesAgo
  );
  
  fs.writeFileSync(ONLINE_USERS_FILE, JSON.stringify(activeUsers, null, 2));
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

    const allUsers = loadAllUsers();
    const currentUser = allUsers.find((u: any) => u.id === payload.userId);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const onlineUsers = loadOnlineUsers();
    
    // Update current user's last seen
    const existingUserIndex = onlineUsers.findIndex(u => u.userId === payload.userId);
    const currentUserOnline: OnlineUser = {
      userId: payload.userId,
      userName: currentUser.name,
      lastSeen: new Date().toISOString()
    };
    
    if (existingUserIndex >= 0) {
      onlineUsers[existingUserIndex] = currentUserOnline;
    } else {
      onlineUsers.push(currentUserOnline);
    }
    
    saveOnlineUsers(onlineUsers);

    // Return updated online users list
    const updatedOnlineUsers = loadOnlineUsers();
    
    return NextResponse.json({
      success: true,
      onlineUsers: updatedOnlineUsers.map(u => u.userName)
    });
  } catch (error) {
    console.error('Get online users error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get online users' },
      { status: 500 }
    );
  }
}