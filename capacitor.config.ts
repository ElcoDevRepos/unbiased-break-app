import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.votercertified.votercertified',
  appName: 'Unbiased Break',
  webDir: 'www',
  plugins: {
    InAppBrowser: {},
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
  bundledWebRuntime: false
};

export default config;
