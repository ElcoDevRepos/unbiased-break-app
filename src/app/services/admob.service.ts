import { Injectable } from '@angular/core';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdOptions } from '@capacitor-community/admob';

@Injectable({
  providedIn: 'root'
})
export class AdmobService {
  clickLimit = 5;
  clicks = 0;
  constructor() {}

  async initialize() {
    await AdMob.initialize({
      initializeForTesting: false
    });

    // Prepare banner
    const options: BannerAdOptions = {
      adId: 'ca-app-pub-4575624656787324/6256368039',
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.TOP_CENTER,
      margin: 75,
      isTesting: false
    };
    await AdMob.showBanner(options);
    await AdMob.hideBanner();

    const pOptions: AdOptions = {
      adId: 'ca-app-pub-4575624656787324/8113758076',
      isTesting: false
    };
    await AdMob.prepareInterstitial(pOptions);
  }

  async articleClicked() {
    this.clicks++;

    if (this.clicks === this.clickLimit) {
      await AdMob.showInterstitial();
      this.clicks = 0;
    }
  }

  async showBanner() {
    AdMob.resumeBanner();
  }
  async hideBanner() {
    AdMob.hideBanner();
  }
}
