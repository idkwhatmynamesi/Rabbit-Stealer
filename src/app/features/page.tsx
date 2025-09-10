'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Zap,
  MessageSquare,
  Download,
  Bell,
  Shield,
  Terminal,
  Webhook,
  Activity,
  Save,
  CheckCircle,
  Copy,
  Code
} from 'lucide-react';

interface Feature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
  category: 'display' | 'notification' | 'security' | 'integration' | 'automation';
  config?: any;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([
    {
      id: 'show_message_box',
      name: 'Show Message Box',
      description: 'Display a message box after successful upload',
      enabled: false,
      icon: MessageSquare,
      category: 'display',
      config: { message: 'Upload completed successfully!' }
    },
    {
      id: 'play_sound',
      name: 'Play Sound Notification',
      description: 'Play a sound when upload completes',
      enabled: false,
      icon: Bell,
      category: 'notification',
      config: { soundFile: 'notification.wav' }
    },
    {
      id: 'auto_open_folder',
      name: 'Auto Open Folder',
      description: 'Automatically open the upload folder after completion',
      enabled: false,
      icon: Download,
      category: 'automation'
    },
    {
      id: 'webhook_notification',
      name: 'Webhook Notification',
      description: 'Send webhook to specified URL on events',
      enabled: false,
      icon: Webhook,
      category: 'integration',
      config: { url: '' }
    },
    {
      id: 'desktop_notification',
      name: 'Desktop Notification',
      description: 'Show system desktop notification',
      enabled: false,
      icon: Bell,
      category: 'notification'
    },
    {
      id: 'log_to_file',
      name: 'Log to File',
      description: 'Write upload logs to local file',
      enabled: false,
      icon: Terminal,
      category: 'automation',
      config: { logPath: 'uploads.log' }
    },
    {
      id: 'verify_checksum',
      name: 'Verify Checksum',
      description: 'Verify file integrity after upload',
      enabled: false,
      icon: Shield,
      category: 'security'
    },
    {
      id: 'auto_compress',
      name: 'Auto Compress Large Files',
      description: 'Automatically compress files over specified size',
      enabled: false,
      icon: Activity,
      category: 'automation',
      config: { threshold: '10MB' }
    },
    {
      id: 'encrypt_upload',
      name: 'Encrypt Before Upload',
      description: 'Encrypt files before uploading',
      enabled: false,
      icon: Shield,
      category: 'security',
      config: { algorithm: 'AES-256' }
    },
    {
      id: 'batch_mode',
      name: 'Batch Processing Mode',
      description: 'Process multiple files in batch',
      enabled: false,
      icon: Activity,
      category: 'automation'
    }
  ]);

  const [saved, setSaved] = useState(false);
  const [cppCode, setCppCode] = useState('');

  useEffect(() => {
    // Load saved features from localStorage
    const savedFeatures = localStorage.getItem('app-features');
    if (savedFeatures) {
      try {
        const parsed = JSON.parse(savedFeatures);
        setFeatures(prev => prev.map(f => ({
          ...f,
          enabled: parsed[f.id]?.enabled || false,
          config: parsed[f.id]?.config || f.config
        })));
      } catch {}
    }
  }, []);

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f =>
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const updateConfig = (id: string, key: string, value: string) => {
    setFeatures(prev => prev.map(f =>
      f.id === id ? { ...f, config: { ...f.config, [key]: value } } : f
    ));
  };

  const saveFeatures = async () => {
    const featuresObj: any = {};
    features.forEach(f => {
      featuresObj[f.id] = { enabled: f.enabled, config: f.config };
    });

    // Save to localStorage
    localStorage.setItem('app-features', JSON.stringify(featuresObj));

    // Save to API
    try {
      await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: featuresObj })
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving features:', error);
    }
  };

  const generateCppCode = () => {
    const enabledFeatures = features.filter(f => f.enabled);

    const code = `// ZIP Manager Feature Check
#include <curl/curl.h>
#include <json/json.h>
#include <iostream>

bool checkFeatures(const std::string& serverUrl) {
    CURL* curl = curl_easy_init();
    if (!curl) return false;

    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, (serverUrl + "/api/features/check").c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) return false;

    Json::Value root;
    Json::Reader reader;
    if (!reader.parse(response, root)) return false;

    Json::Value features = root["features"];

${enabledFeatures.map(f => `    // Check ${f.name}
    if (features["${f.id}"]["enabled"].asBool()) {
        ${getFeatureCode(f)}
    }`).join('\n\n')}

    return true;
}

${enabledFeatures.map(f => getFeatureImplementation(f)).join('\n\n')}`;

    setCppCode(code);
  };

  const getFeatureCode = (feature: Feature): string => {
    switch (feature.id) {
      case 'show_message_box':
        return `showMessageBox("${feature.config?.message || 'Upload completed!'}");`;
      case 'play_sound':
        return `playSound("${feature.config?.soundFile || 'notification.wav'}");`;
      case 'auto_open_folder':
        return 'openUploadFolder();';
      case 'webhook_notification':
        return `sendWebhook("${feature.config?.url || ''}");`;
      case 'desktop_notification':
        return 'showDesktopNotification("Upload Complete", "Your file has been uploaded successfully");';
      case 'log_to_file':
        return `logToFile("${feature.config?.logPath || 'uploads.log'}");`;
      case 'verify_checksum':
        return 'verifyFileChecksum();';
      case 'auto_compress':
        return `if (fileSize > parseSize("${feature.config?.threshold || '10MB'}")) compressFile();`;
      case 'encrypt_upload':
        return `encryptFile("${feature.config?.algorithm || 'AES-256'}");`;
      case 'batch_mode':
        return 'enableBatchMode();';
      default:
        return '// Custom implementation';
    }
  };

  const getFeatureImplementation = (feature: Feature): string => {
    switch (feature.id) {
      case 'show_message_box':
        return `void showMessageBox(const std::string& message) {
    #ifdef _WIN32
        MessageBoxA(NULL, message.c_str(), "ZIP Manager", MB_OK | MB_ICONINFORMATION);
    #else
        system(("zenity --info --text=\\"" + message + "\\"").c_str());
    #endif
}`;
      case 'play_sound':
        return `void playSound(const std::string& soundFile) {
    #ifdef _WIN32
        PlaySound(soundFile.c_str(), NULL, SND_FILENAME);
    #else
        system(("aplay " + soundFile).c_str());
    #endif
}`;
      default:
        return `// Implementation for ${feature.name}`;
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(cppCode);
  };

  const categories = ['display', 'notification', 'security', 'integration', 'automation'];
  const categoryIcons = {
    display: MessageSquare,
    notification: Bell,
    security: Shield,
    integration: Webhook,
    automation: Activity
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Configuration</h1>
          <p className="mt-2 text-gray-600">
            Configure features that C++ clients can check and execute
          </p>
        </div>
        <Button onClick={saveFeatures} size="lg">
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Features
            </>
          )}
        </Button>
      </div>

      {/* Features by Category */}
      {categories.map(category => {
        const categoryFeatures = features.filter(f => f.category === category);
        const Icon = categoryIcons[category as keyof typeof categoryIcons];

        return (
          <Card key={category} className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {category.charAt(0).toUpperCase() + category.slice(1)} Features
              </CardTitle>
              <CardDescription>
                {categoryFeatures.filter(f => f.enabled).length} of {categoryFeatures.length} enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryFeatures.map(feature => (
                  <div key={feature.id} className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50">
                    <Switch
                      id={feature.id}
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={feature.id} className="text-base font-medium cursor-pointer">
                          {feature.name}
                        </Label>
                        {feature.enabled && (
                          <Badge variant="default" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>

                      {/* Feature Config */}
                      {feature.enabled && feature.config && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          {Object.entries(feature.config).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3 mb-2">
                              <Label className="text-xs min-w-[100px]">
                                {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
                              </Label>
                              <Input
                                type="text"
                                value={value as string}
                                onChange={(e) => updateConfig(feature.id, key, e.target.value)}
                                className="flex-1 h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* C++ Code Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            C++ Implementation Code
          </CardTitle>
          <CardDescription>
            Generate C++ code for enabled features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateCppCode} className="mb-4">
            Generate C++ Code
          </Button>

          {cppCode && (
            <div className="relative">
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                <pre>{cppCode}</pre>
              </div>
              <Button
                onClick={copyCode}
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
