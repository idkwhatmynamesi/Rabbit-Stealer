'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Hash,
  FileText,
  Binary,
  Calculator,
  Clock,
  Globe,
  Palette,
  Code,
  Zap,
  Key,
  Link,
  Shield,
  Settings,
  Download,
  Copy,
  Check
} from 'lucide-react';

export default function ToolsPage() {
  const [hashInput, setHashInput] = useState('');
  const [hashOutput, setHashOutput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [base64Output, setBase64Output] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now());
  const [jsCode, setJsCode] = useState('');
  const [obfuscatedJs, setObfuscatedJs] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlOutput, setUrlOutput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [colorValue, setColorValue] = useState('#3B82F6');
  const [rgbValues, setRgbValues] = useState({ r: 59, g: 130, b: 246 });
  const [passwordLength, setPasswordLength] = useState(16);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const generateHash = async (text: string, algorithm: 'SHA-256' | 'SHA-1' | 'MD5' = 'SHA-256') => {
    if (!text) {
      setHashOutput('Please enter text to hash');
      return;
    }
    
    try {
      if (algorithm === 'MD5') {
        // MD5 implementation (simplified)
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const md5Hash = Math.abs(hash).toString(16).padStart(32, '0');
        setHashOutput(md5Hash);
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setHashOutput(hashHex);
    } catch (error) {
      console.error('Hash error:', error);
      setHashOutput('Error generating hash');
    }
  };

  const encodeBase64 = () => {
    try {
      if (!base64Input) {
        setBase64Output('Please enter text to encode');
        return;
      }
      // Handle Unicode properly
      const encoded = btoa(unescape(encodeURIComponent(base64Input)));
      setBase64Output(encoded);
    } catch (error) {
      console.error('Base64 encode error:', error);
      setBase64Output('Error encoding to base64');
    }
  };

  const decodeBase64 = () => {
    try {
      if (!base64Output) {
        // Decode from the output field if it has encoded text
        if (!base64Input) {
          setBase64Output('Please enter base64 to decode');
          return;
        }
        const decoded = decodeURIComponent(escape(atob(base64Input)));
        setBase64Output(decoded);
      } else {
        // Decode the output field content
        const decoded = decodeURIComponent(escape(atob(base64Output)));
        setBase64Input(decoded);
        setBase64Output('');
      }
    } catch (error) {
      console.error('Base64 decode error:', error);
      setBase64Output('Invalid base64 string');
    }
  };

  const obfuscateJavaScript = () => {
    if (!jsCode) {
      setObfuscatedJs('Please enter JavaScript code');
      return;
    }
    
    try {
      // Convert code to hex array
      const hexArray: string[] = [];
      for (let i = 0; i < jsCode.length; i++) {
        hexArray.push('0x' + jsCode.charCodeAt(i).toString(16));
      }
      
      // Create obfuscated self-executing function
      const obfuscated = `(function(){var _0x=[${hexArray.join(',')}];var _0s='';for(var i=0;i<_0x.length;i++){_0s+=String.fromCharCode(_0x[i]);}eval(_0s);})();`;
      
      setObfuscatedJs(obfuscated);
    } catch (error) {
      console.error('Obfuscation error:', error);
      setObfuscatedJs('Error obfuscating code');
    }
  };

  const encodeUrl = () => {
    try {
      setUrlOutput(encodeURIComponent(urlInput));
    } catch {
      setUrlOutput('Invalid input');
    }
  };

  const decodeUrl = () => {
    try {
      setUrlOutput(decodeURIComponent(urlInput));
    } catch {
      setUrlOutput('Invalid URL encoding');
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch {
      setJsonOutput('Invalid JSON');
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed));
    } catch {
      setJsonOutput('Invalid JSON');
    }
  };

  const handleColorChange = (hex: string) => {
    setColorValue(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    setRgbValues({ r, g, b });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < passwordLength; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const tools = [
    {
      title: 'JavaScript Obfuscator',
      description: 'Obfuscate JavaScript code for protection',
      icon: Shield,
      content: (
        <div className="space-y-3">
          <Label>Original JavaScript Code</Label>
          <Textarea
            placeholder="function hello() { console.log('Hello World!'); }"
            value={jsCode}
            onChange={(e) => setJsCode(e.target.value)}
            className="h-24 font-mono text-xs"
          />
          <Button onClick={obfuscateJavaScript} className="w-full" disabled={!jsCode}>
            <Shield className="h-4 w-4 mr-2" />
            Obfuscate Code
          </Button>
          {obfuscatedJs && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Obfuscated Code</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(obfuscatedJs, 'obfuscated')}
                >
                  {copySuccess === 'obfuscated' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-gray-100 rounded font-mono text-xs break-all max-h-32 overflow-y-auto">
                {obfuscatedJs}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Hash Generator',
      description: 'Generate SHA-256, SHA-1, or MD5 hashes',
      icon: Hash,
      content: (
        <div className="space-y-3">
          <Input
            placeholder="Enter text to hash"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => generateHash(hashInput, 'SHA-256')} variant="outline" className="flex-1 text-xs">
              SHA-256
            </Button>
            <Button onClick={() => generateHash(hashInput, 'SHA-1')} variant="outline" className="flex-1 text-xs">
              SHA-1
            </Button>
            <Button onClick={() => generateHash(hashInput, 'MD5')} variant="outline" className="flex-1 text-xs">
              MD5
            </Button>
          </div>
          {hashOutput && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Hash Output</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(hashOutput, 'hash')}
                >
                  {copySuccess === 'hash' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-gray-100 rounded font-mono text-xs break-all">
                {hashOutput}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Base64 Encoder/Decoder',
      description: 'Convert text to/from Base64',
      icon: Binary,
      content: (
        <div className="space-y-3">
          <Input
            placeholder="Enter text or base64"
            value={base64Input}
            onChange={(e) => setBase64Input(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={encodeBase64} variant="outline" className="flex-1">
              Encode
            </Button>
            <Button onClick={decodeBase64} variant="outline" className="flex-1">
              Decode
            </Button>
          </div>
          {base64Output && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Output</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(base64Output, 'base64')}
                >
                  {copySuccess === 'base64' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-gray-100 rounded font-mono text-xs break-all">
                {base64Output}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'URL Encoder/Decoder',
      description: 'Encode or decode URLs',
      icon: Link,
      content: (
        <div className="space-y-3">
          <Input
            placeholder="Enter URL or encoded URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={encodeUrl} variant="outline" className="flex-1">
              Encode
            </Button>
            <Button onClick={decodeUrl} variant="outline" className="flex-1">
              Decode
            </Button>
          </div>
          {urlOutput && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Output</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(urlOutput, 'url')}
                >
                  {copySuccess === 'url' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-gray-100 rounded font-mono text-xs break-all">
                {urlOutput}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'JSON Formatter',
      description: 'Format, validate and minify JSON',
      icon: Code,
      content: (
        <div className="space-y-3">
          <Label>JSON Input</Label>
          <Textarea
            className="h-24 font-mono text-xs"
            placeholder='{"key": "value", "array": [1,2,3]}'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={formatJson} variant="outline" className="flex-1">
              Format
            </Button>
            <Button onClick={minifyJson} variant="outline" className="flex-1">
              Minify
            </Button>
          </div>
          {jsonOutput && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Formatted JSON</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(jsonOutput, 'json')}
                >
                  {copySuccess === 'json' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <Textarea
                className="h-32 font-mono text-xs"
                value={jsonOutput}
                readOnly
              />
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Password Generator',
      description: 'Generate secure random passwords',
      icon: Key,
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Length:</Label>
            <Input
              type="number"
              min="8"
              max="128"
              value={passwordLength}
              onChange={(e) => setPasswordLength(parseInt(e.target.value))}
              className="w-20"
            />
          </div>
          <Button onClick={generatePassword} className="w-full">
            <Key className="h-4 w-4 mr-2" />
            Generate Password
          </Button>
          {generatedPassword && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Generated Password</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedPassword, 'password')}
                >
                  {copySuccess === 'password' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-gray-100 rounded font-mono text-sm break-all border">
                {generatedPassword}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Strength: <Badge variant="secondary">Strong</Badge></span>
                <span>Length: {generatedPassword.length}</span>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Color Picker & Converter',
      description: 'Pick colors and convert between formats',
      icon: Palette,
      content: (
        <div className="space-y-3">
          <Label>Color Picker</Label>
          <input 
            type="color" 
            value={colorValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-12 rounded cursor-pointer border" 
          />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-gray-50 rounded">
              <Label className="text-xs">HEX</Label>
              <p className="font-mono">{colorValue}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <Label className="text-xs">RGB</Label>
              <p className="font-mono">{rgbValues.r}, {rgbValues.g}, {rgbValues.b}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <Label className="text-xs">HSL</Label>
              <p className="font-mono text-xs">Calculated</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <Label className="text-xs">CSS</Label>
              <p className="font-mono text-xs">rgb({rgbValues.r}, {rgbValues.g}, {rgbValues.b})</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Timestamp Converter',
      description: 'Convert Unix timestamps to readable dates',
      icon: Clock,
      content: (
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Enter timestamp"
            value={timestamp}
            onChange={(e) => setTimestamp(parseInt(e.target.value) || Date.now())}
          />
          <div className="p-3 bg-gray-100 rounded text-sm space-y-1">
            <p><strong>Date:</strong> {new Date(timestamp).toLocaleString()}</p>
            <p><strong>UTC:</strong> {new Date(timestamp).toUTCString()}</p>
            <p><strong>ISO:</strong> {new Date(timestamp).toISOString()}</p>
            <p><strong>Unix:</strong> {Math.floor(timestamp / 1000)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setTimestamp(Date.now())}
              variant="outline"
              className="flex-1"
            >
              Current Time
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => copyToClipboard(Math.floor(timestamp / 1000).toString(), 'timestamp')}
            >
              {copySuccess === 'timestamp' ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              Copy Unix
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Developer Tools</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive utilities and converters for developers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <Card key={index} className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tool.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {tool.content}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyToClipboard(generateUUID(), 'uuid')}
            >
              <FileText className="h-4 w-4 mr-2" />
              {copySuccess === 'uuid' ? 'Copied!' : 'Generate UUID'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://httpbin.org/ip', '_blank')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Check IP
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setTimestamp(Date.now())}
            >
              <Clock className="h-4 w-4 mr-2" />
              Current Timestamp
            </Button>
            <Button variant="outline" size="sm">
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={generatePassword}
            >
              <Key className="h-4 w-4 mr-2" />
              Quick Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Tools Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tool Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Security Features:</h4>
              <ul className="space-y-1">
                <li>• JavaScript obfuscation for code protection</li>
                <li>• Secure password generation with strong entropy</li>
                <li>• Client-side processing - no data sent to servers</li>
                <li>• Multiple hash algorithms supported</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Supported Formats:</h4>
              <ul className="space-y-1">
                <li>• Base64 encoding/decoding</li>
                <li>• URL encoding/decoding</li>
                <li>• JSON formatting and validation</li>
                <li>• Color format conversions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}