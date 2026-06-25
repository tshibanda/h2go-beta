import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.h2go.app',
  appName: 'H2GO',
  webDir: 'dist/client',
  server: {
    url: 'https://h2go-app.com',
    cleartext: false,
    allowNavigation: [
      'h2go-app.com',
      'www.h2go-app.com',
      'h2go-beta.lovable.app',
      '*.lovable.app',
      'oauth.lovable.app',
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      'appleid.apple.com',
      '*.apple.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;