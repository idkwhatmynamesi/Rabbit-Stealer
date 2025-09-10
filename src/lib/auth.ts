import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import speakeasy from 'speakeasy';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Path to store users data
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
}

export interface TokenPayload {
  userId: string;
  email: string;
}

interface StoredUser extends User {
  password: string;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
}

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load users from file
function loadUsers(): Map<string, StoredUser> {
  ensureDataDir();
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const usersArray = JSON.parse(data);
      const usersMap = new Map<string, StoredUser>();
      usersArray.forEach((user: StoredUser) => {
        usersMap.set(user.id, {
          ...user,
          createdAt: new Date(user.createdAt)
        });
      });
      return usersMap;
    } catch (error) {
      console.error('Error loading users:', error);
      return new Map();
    }
  }
  return new Map();
}

// Save users to file
function saveUsers(users: Map<string, StoredUser>) {
  ensureDataDir();
  const usersArray = Array.from(users.values());
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
}

// In-memory cache
let users: Map<string, StoredUser> = loadUsers();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// No auto-initialization - users must register

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  } catch {
    return null;
  }
}

export async function createUser(email: string, password: string, name: string): Promise<User | null> {
  // Reload users to get latest data
  users = loadUsers();

  // Check if user already exists
  const existingUser = Array.from(users.values()).find(u => u.email === email);
  if (existingUser) {
    return null;
  }

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomBytes(16).toString('hex');

  const newUser: StoredUser = {
    id: userId,
    email,
    password: hashedPassword,
    name,
    createdAt: new Date()
  };

  users.set(userId, newUser);
  saveUsers(users);

  return {
    id: userId,
    email,
    name,
    createdAt: newUser.createdAt,
    twoFactorEnabled: false,
    twoFactorSecret: undefined,
    twoFactorBackupCodes: []
  };
}

export async function validateUser(email: string, password: string): Promise<User | null> {
  // Demo credentials check - REPLACE WITH REAL DATABASE AUTHENTICATION
  if (email === 'admin@example.com' && password === 'demo-password-123') {
    return {
      id: 'demo-user-001',
      email: 'admin@example.com',
      name: 'Demo Admin',
      createdAt: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: []
    };
  }

  return null;
}

export function getUserById(userId: string): User | null {
  // Check for hardcoded admin user
  if (userId === 'demo-user-001') {
    return {
      id: 'demo-user-001',
      email: 'admin@example.com',
      name: 'Demo Admin',
      createdAt: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: []
    };
  }

  return null;
}

// 2FA Functions
export function generateTwoFactorSecret(): string {
  // Use speakeasy for proper secret generation
  return speakeasy.generateSecret({
    name: 'Rabbit Panel',
    length: 32
  }).base32;
}

export function generateBackupCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Use crypto for secure random number generation
    const randomBytes = crypto.randomBytes(4);
    const code = randomBytes.readUInt32BE(0).toString().substring(0, 8).padStart(8, '0');
    codes.push(code);
  }
  return codes;
}

export function verifyTwoFactorCode(secret: string, code: string): boolean {
  // Use speakeasy for proper TOTP verification
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 2
  });
}

export async function enableTwoFactor(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
  users = loadUsers();
  const user = users.get(userId);
  
  if (!user) {
    return false;
  }

  user.twoFactorEnabled = true;
  user.twoFactorSecret = secret;
  user.twoFactorBackupCodes = backupCodes;
  
  users.set(userId, user);
  saveUsers(users);
  return true;
}

export function updateUser(userId: string, updates: Partial<StoredUser>): boolean {
  users = loadUsers();
  const user = users.get(userId);
  
  if (!user) {
    return false;
  }

  // Apply updates
  Object.assign(user, updates);
  
  users.set(userId, user);
  saveUsers(users);
  return true;
}

export async function disableTwoFactor(userId: string): Promise<boolean> {
  users = loadUsers();
  const user = users.get(userId);
  
  if (!user) {
    return false;
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = undefined;
  
  users.set(userId, user);
  saveUsers(users);
  return true;
}

export function validateBackupCode(userId: string, code: string): boolean {
  users = loadUsers();
  const user = users.get(userId);
  
  if (!user || !user.twoFactorBackupCodes) {
    return false;
  }

  const codeIndex = user.twoFactorBackupCodes.indexOf(code);
  if (codeIndex !== -1) {
    // Remove used backup code
    user.twoFactorBackupCodes.splice(codeIndex, 1);
    users.set(userId, user);
    saveUsers(users);
    return true;
  }
  
  return false;
}

export function getTwoFactorSecret(userId: string): string | null {
  users = loadUsers();
  const user = users.get(userId);
  return user?.twoFactorSecret || null;
}
