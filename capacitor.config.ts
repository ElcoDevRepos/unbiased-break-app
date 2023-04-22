import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.votercertified.votercertified',
  appName: 'Unbiased Break',
  webDir: 'www',
  plugins: {
    InAppBrowser: {},
  },
  bundledWebRuntime: false
};

export default config;
