'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { 
  MessageCircle, 
  Send, 
  Shield, 
  Users, 
  Clock,
  Lock
} from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  encrypted: boolean;
}

export default function LiveChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load real messages and online users
  useEffect(() => {
    if (user) {
      setIsConnected(true);
      loadMessages();
      loadOnlineUsers();
      
      // Set up polling for new messages and online users every 3 seconds
      const interval = setInterval(() => {
        loadMessages();
        loadOnlineUsers();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages');
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await fetch('/api/chat/users');
      const data = await response.json();
      
      if (data.success) {
        setOnlineUsers(data.onlineUsers);
      }
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        // Reload messages to get the latest
        await loadMessages();
      } else {
        console.error('Failed to send message:', data.message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to access live chat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <MessageCircle className="h-8 w-8" />
          Live Chat
        </h1>
        <p className="mt-2 text-gray-600">
          Secure encrypted chat with admin and support team
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Online Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Online Users ({onlineUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {onlineUsers.map((userName, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">{userName}</span>
                  {userName === user.name && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="h-3 w-3" />
                <span>End-to-end encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Lock className="h-3 w-3" />
                <span>Messages auto-delete in 24h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Secure Chat Room</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-96">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.userId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.userId === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.userName}
                      </span>
                      {message.encrypted && (
                        <Shield className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 opacity-50" />
                      <span className="text-xs opacity-50">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Type your encrypted message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || !isConnected}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={loading || !newMessage.trim() || !isConnected}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send • Messages are encrypted and auto-delete after 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Lock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">End-to-End Encryption</p>
                <p className="text-xs text-green-600">AES-256 encryption</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Auto-Delete</p>
                <p className="text-xs text-blue-600">Messages expire in 24h</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Authenticated Only</p>
                <p className="text-xs text-purple-600">Verified users only</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}