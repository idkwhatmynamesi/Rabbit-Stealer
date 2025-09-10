import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FEATURES_FILE = path.join(process.cwd(), 'data', 'features.json');

export async function GET() {
  try {
    if (fs.existsSync(FEATURES_FILE)) {
      const data = fs.readFileSync(FEATURES_FILE, 'utf-8');
      const features = JSON.parse(data);

      // Return only enabled features for C++ client
      const enabledFeatures: any = {};
      Object.entries(features).forEach(([key, value]: [string, any]) => {
        if (value.enabled) {
          enabledFeatures[key] = value;
        }
      });

      return NextResponse.json({
        success: true,
        features: enabledFeatures,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      features: {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking features:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check features' },
      { status: 500 }
    );
  }
}
