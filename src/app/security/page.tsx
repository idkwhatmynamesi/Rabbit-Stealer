'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import {
  Shield,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Fingerprint,
  ShieldCheck,
  QrCode,
  Copy
} from 'lucide-react';

export default function SecurityPage() {
  const { user } = useAuth();
  const [securityScore, setSecurityScore] = useState(75);
  const [features, setFeatures] = useState({
    twoFactor: false,
    encryption: true,
    virusScanning: true,
    ipWhitelist: false,
    rateLimit: true,
    sessionTimeout: true,
    auditLog: false,
    backupEnabled: true
  });
  
  // 2FA related state
  const [twoFactorSetup, setTwoFactorSetup] = useState(false);
  const [qrSecret, setQrSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.twoFactorEnabled) {
      setFeatures(prev => ({ ...prev, twoFactor: true }));
      // Recalculate security score
      const enabledCount = Object.values({ ...features, twoFactor: true }).filter(v => v).length;
      setSecurityScore(Math.round((enabledCount / Object.keys(features).length) * 100));
    }
  }, [user]);

  const toggleFeature = (feature: keyof typeof features) => {
    // Handle 2FA toggle separately
    if (feature === 'twoFactor') {
      if (!features.twoFactor && !user?.twoFactorEnabled) {
        handleEnable2FA();
      } else if (features.twoFactor || user?.twoFactorEnabled) {
        handleDisable2FA();
      }
      return;
    }
    
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
    // Recalculate security score
    const enabledCount = Object.values({ ...features, [feature]: !features[feature] }).filter(v => v).length;
    setSecurityScore(Math.round((enabledCount / Object.keys(features).length) * 100));
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // First, get the 2FA setup data
      const response = await fetch('/api/auth/2fa', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQrSecret(data.secret);
        setQrCodeUrl(data.qrCode);
        setBackupCodes(data.backupCodes);
        setTwoFactorSetup(true);
        setSuccess('2FA setup initiated. Please scan the QR code with your authenticator app.');
      } else {
        setError(data.message || 'Failed to enable 2FA');
      }
    } catch (err) {
      console.error('2FA enable error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disable'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFeatures(prev => ({ ...prev, twoFactor: false }));
        setTwoFactorSetup(false);
        setQrSecret('');
        setQrCodeUrl('');
        setBackupCodes([]);
        setSuccess('2FA has been disabled successfully.');
        // Trigger a page refresh to update user state
        window.location.reload();
      } else {
        setError(data.message || 'Failed to disable 2FA');
      }
    } catch (err) {
      console.error('2FA disable error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    if (verificationCode.length !== 6) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'enable',
          secret: qrSecret,
          code: verificationCode,
          backupCodes: backupCodes
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTwoFactorSetup(false);
        setFeatures(prev => ({ ...prev, twoFactor: true }));
        setVerificationCode('');
        setSuccess('2FA has been successfully enabled! Save your backup codes safely.');
        // Refresh user data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const getScoreColor = () => {
    if (securityScore >= 80) return 'text-green-600';
    if (securityScore >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = () => {
    if (securityScore >= 80) return 'Excellent';
    if (securityScore >= 60) return 'Good';
    if (securityScore >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div>
      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 text-sm text-green-800 bg-green-100 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
        <p className="mt-2 text-gray-600">
          Manage security settings and monitor system protection
        </p>
      </div>

      {/* Security Score */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Score
            </span>
            <Badge className={getScoreColor()} variant="outline">
              {getScoreLabel()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-4xl font-bold ${getScoreColor()}`}>
                {securityScore}%
              </span>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {Object.values(features).filter(v => v).length} of {Object.keys(features).length}
                </p>
                <p className="text-xs text-gray-500">features enabled</p>
              </div>
            </div>
            <Progress value={securityScore} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="2fa">Two-Factor Authentication</Label>
                  <p className="text-xs text-gray-500">Extra layer of security</p>
                  {user?.twoFactorEnabled && (
                    <Badge variant="outline" className="text-xs mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  )}
                </div>
              </div>
              <Switch
                id="2fa"
                checked={features.twoFactor || user?.twoFactorEnabled || false}
                onCheckedChange={() => toggleFeature('twoFactor')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="session">Session Timeout</Label>
                  <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
                </div>
              </div>
              <Switch
                id="session"
                checked={features.sessionTimeout}
                onCheckedChange={() => toggleFeature('sessionTimeout')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">File Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="encryption">File Encryption</Label>
                  <p className="text-xs text-gray-500">AES-256 encryption</p>
                </div>
              </div>
              <Switch
                id="encryption"
                checked={features.encryption}
                onCheckedChange={() => toggleFeature('encryption')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="virus">Virus Scanning</Label>
                  <p className="text-xs text-gray-500">Scan uploads for malware</p>
                </div>
              </div>
              <Switch
                id="virus"
                checked={features.virusScanning}
                onCheckedChange={() => toggleFeature('virusScanning')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="ip">IP Whitelist</Label>
                  <p className="text-xs text-gray-500">Restrict access by IP</p>
                </div>
              </div>
              <Switch
                id="ip"
                checked={features.ipWhitelist}
                onCheckedChange={() => toggleFeature('ipWhitelist')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="rate">Rate Limiting</Label>
                  <p className="text-xs text-gray-500">Prevent abuse</p>
                </div>
              </div>
              <Switch
                id="rate"
                checked={features.rateLimit}
                onCheckedChange={() => toggleFeature('rateLimit')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCheck className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="audit">Audit Logging</Label>
                  <p className="text-xs text-gray-500">Track all actions</p>
                </div>
              </div>
              <Switch
                id="audit"
                checked={features.auditLog}
                onCheckedChange={() => toggleFeature('auditLog')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <Label htmlFor="backup">Auto Backup</Label>
                  <p className="text-xs text-gray-500">Daily backups</p>
                </div>
              </div>
              <Switch
                id="backup"
                checked={features.backupEnabled}
                onCheckedChange={() => toggleFeature('backupEnabled')}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Setup Modal/Section */}
      {twoFactorSetup && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Setup Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code Display */}
            <div className="text-center">
              <div className="inline-block p-4 bg-white border rounded-lg">
                {qrCodeUrl && (
                  <div className="mb-4">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code for 2FA setup" 
                      className="mx-auto mb-2"
                      style={{ width: '200px', height: '200px' }}
                    />
                  </div>
                )}
                <div className="text-xs font-mono break-all mb-2">
                  Manual entry: {qrSecret}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(qrSecret)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Secret
                </Button>
              </div>
            </div>

            {/* Backup Codes */}
            <div>
              <Label className="text-sm font-medium">Backup Codes</Label>
              <p className="text-xs text-gray-500 mb-2">
                Save these codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-100 rounded font-mono text-xs">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All Codes
              </Button>
            </div>

            {/* Verification */}
            <div>
              <Label htmlFor="verification-code" className="text-sm font-medium">
                Verify Setup
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Enter the 6-digit code from your authenticator app to verify the setup.
              </p>
              <div className="flex gap-2">
                <Input
                  id="verification-code"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="flex-1"
                />
                <Button
                  onClick={handleVerifyAndEnable2FA}
                  disabled={verificationCode.length !== 6 || loading}
                >
                  Verify
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTwoFactorSetup(false);
                  setQrSecret('');
                  setQrCodeUrl('');
                  setBackupCodes([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Security Events */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent Security Events</CardTitle>
          <CardDescription>Last 24 hours activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center py-8">No recent security events</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}