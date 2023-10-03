import { Injectable } from '@angular/core';
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  AdOptions,
} from '@capacitor-community/admob';
import { Platform } from '@ionic/angular';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class AdmobService {
  clickLimit = 5;
  clicks = 0;
  constructor(private platform: Platform, private userService: UserService) {}

  async initialize() {
    await AdMob.initialize({
      initializeForTesting: false,
    });

    // Prepare banner
    const options: BannerAdOptions = {
      adId: 'ca-app-pub-4575624656787324/6256368039',
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.TOP_CENTER,
      margin: this.platform.is('android') ? 75 : -45,
      isTesting: false,
    };

    await AdMob.showBanner(options);
    await AdMob.hideBanner();

    const pOptions: AdOptions = {
      adId: 'ca-app-pub-4575624656787324/8113758076',
      isTesting: false,
    };
    await AdMob.prepareInterstitial(pOptions);
  }

  async articleClicked() {
    this.clicks++;

    if (this.clicks === this.clickLimit) {
      const pOptions: AdOptions = {
        adId: 'ca-app-pub-4575624656787324/8113758076',
        isTesting: false,
      };
      if (!this.userService.isPro) await AdMob.prepareInterstitial(pOptions);
      if (!this.userService.isPro) await AdMob.showInterstitial();
      this.clicks = 0;
    }
  }

  async showBanner() {
    if (!this.userService.isPro) AdMob.resumeBanner();
  }
  async hideBanner() {
    if (!this.userService.isPro) AdMob.hideBanner();
  }

  async showInterstitial() {
    const pOptions: AdOptions = {
      adId: 'ca-app-pub-4575624656787324/8113758076',
      isTesting: false,
    };
    if (!this.userService.isPro) await AdMob.prepareInterstitial(pOptions);
    if (!this.userService.isPro) await AdMob.showInterstitial();
  }

  async;
}
