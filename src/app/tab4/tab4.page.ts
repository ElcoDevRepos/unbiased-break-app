import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { Browser } from '@capacitor/browser';

import { TabsPage } from '../tabs/tabs.page';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  QuerySnapshot,
  endBefore,
  addDoc,
  Timestamp,
} from '@angular/fire/firestore';
import * as _ from 'lodash';
import { UserService } from '../services/user.service';
import { Share } from '@capacitor/share';
import { AdmobService } from '../services/admob.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
})
export class Tab4Page implements OnInit {
  gptSummaries;
  sourceImages = [];
  summariesRead = 0;
  doneLoading = false;
  dateString;
  isLoggedIn = false;
  showFirstTimePopUp = false;
  @ViewChild('slides') slides: any;
  constructor(
    private tabsPage: TabsPage,
    private firestore: Firestore,
    private userService: UserService,
    private admobService: AdmobService,
    private renderer: Renderer2,
    private el: ElementRef,
    private alertController: AlertController
  ) {}
  
  async ngOnInit() {
    this.getSourceImages();
    try {
      let sum = await this.getSummaries();
      // check to see if summary is bookmarked
      const user = this.userService.getLoggedInUser();
      if (user) {
        this.isLoggedIn = true;
        let favoriteSummaries = await this.userService.getFavoriteSummaries();
        function isElementInFavorites(element, array) {
          return array.some(function (arrayElement) {
            return arrayElement.id === element.id;
          });
        }
        sum[0].forEach((element) => {
          if (isElementInFavorites(element, favoriteSummaries)) {
            element.favorited = true;
          }
        });
      }

      this.gptSummaries = sum[0];
      this.goToNextNotClearedSummary();
      this.doneLoading = true;
    } catch (error) {
      console.error('Failed to fetch summaries:', error);
    }
    console.log(this.gptSummaries);
    this.checkShowFirstTimePopUp();
  }

  favoriteArticle(summary) {
    if (!this.userService.getLoggedInUser()) return;

    if (typeof summary.favorited == 'boolean') {
      summary.favorited = !summary.favorited;
    } else {
      summary.favorited = true;
    }
    this.userService.toggleFavoriteSummary(summary);
  }

  ionViewWillEnter() {
    this.tabsPage.selectedTab = 'tab4';
    this.admobService.showBanner();
  }

  ionViewWillLeave() {
    this.admobService.hideBanner();
  }

  //Fetch the gpt summaries from firestore
  getSummaries(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const ref = collection(this.firestore, 'gpt-summaries');
      const q = query(ref, orderBy('timestamp', 'desc'), limit(1));

      getDocs(q)
        .then((docSnaps) => {
          if (docSnaps.docs.length > 0)
            this.dateString = docSnaps.docs[0].data().timestamp.toDate();
          resolve(docSnaps.docs.map((doc) => doc.data().summaries));
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  //This will return the referenced image link in the "img" container inside item
  //If there is no value, this will return a placeholder image
  getImage(item) {
    if (item.image) return item.image;
  }

  async didChangeToNext() {
    this.summariesRead++;
    if (this.summariesRead >= 5) {
      this.summariesRead = 0;
      this.admobService.showInterstitial();
    }
  }

  //This will return the source img/logo based on the item
  //i.e a item from CNN will return the CNN img/logo
  getSourceImage(item) {
    let newUrl = new URL(item.link);
    let url = '';
    if (newUrl.host.includes('www.')) {
      url = newUrl.host.split('www.')[1];
    } else {
      url = newUrl.host;
    }
    if (item.source) {
      let site = item.source.replaceAll(' ', '').toLocaleLowerCase();

      //Fix for the washington post image
      if (site === 'thewashingtonpost') site = 'washingtonpost';
      //Fix for BBC image
      if (site === 'bbcnews') site = 'bbc';
      //Fix for NYP image
      if (site === 'newyorkpost') site = 'nyp';

      let index = _.findIndex(this.sourceImages, (s) => s.url.includes(site));
      if (index != -1) {
        return this.sourceImages[index].image;
      }
    }

    return newUrl.origin + '/favicon.ico';
  }

  async getSourceImages() {
    let collectionRef = collection(this.firestore, 'left-sources');
    let leftDocs = await getDocs(collectionRef);
    leftDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    });
    collectionRef = collection(this.firestore, 'middle-sources');
    let midDocs = await getDocs(collectionRef);
    midDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    });
    collectionRef = collection(this.firestore, 'right-sources');
    let rightDocs = await getDocs(collectionRef);
    rightDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    });
  }

  onArticleClick(item: any) {
    const link = item.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      Browser.open({ url: link });
    }
  }

  //Share the article using capacitor share plugin
  async share(article: any) {
    await Share.share({
      title: article.title,
      text: article.summary,
      url:
        'https://app.unbiasedbreak.com/news-article/' +
        article.id +
        '/trending-articles',
      dialogTitle: 'Share with your friends',
    });
  }

  /* ion alert to verify clearing all GPT summary articles */
  async presentGPTClearAlert() {
    const alert = await this.alertController.create({
      header: 'Are you sure?',
      message: "This will clear all of today's GPT summaries.",
      buttons: [
      {
        text: 'Continue',
        handler: () => {
          this.clearAllSummaries();
        }
      }, 
      {
        text: 'Cancel',
        role: 'cancel',
      }
    ]
    });

    await alert.present();
  }

  /* Add all the summaries for the day to the cleared list */
  clearAllSummaries() {
    this.addSummariesToCleared(this.gptSummaries.map((s) => s.id));
    this.gptSummaries = [];
  }

  /* Add the summary to the cleared list */
  async clearSummary(event: any, articleId: string) {
    this.addSummariesToCleared([articleId]);
    this.gptSummaries.splice(
      this.gptSummaries.findIndex((s) => s.id === articleId),
      1
    );
  }

  /* Add the summaries to the cleared list in local storage */
  private addSummariesToCleared(articleIds: string[]) {
    let clearedValues = [];
    const gptClearedToday = this.getGptClearedForToday();
    if (gptClearedToday) {
      clearedValues = gptClearedToday.split(',');
    }
    for (let i = 0; i < articleIds.length; i++) {
      if (!clearedValues.includes(articleIds[i])) {
        clearedValues.push(articleIds[i]);
      }
    }
    localStorage.setItem(
      this.getGptClearedForTodayKey(),
      clearedValues.join(',')
    );
  }

  /* After fetching summaries on load, go to the next summary that has not been cleared */
  private goToNextNotClearedSummary() {
    const gptClearedToday = this.getGptClearedForToday();
    if (!gptClearedToday) {
      return;
    }
    const clearedValues = gptClearedToday.split(',');
    this.gptSummaries = this.gptSummaries.filter(
      (s) => !clearedValues.includes(s.id)
    );
    return;
  }

  /* Get the cleared summaries for the day from local storage */
  private getGptClearedForToday() {
    return localStorage.getItem(this.getGptClearedForTodayKey());
  }

  /* Get the key for the cleared summaries for the day from local storage */
  private getGptClearedForTodayKey() {
    const date = new Date();
    return `${this.dateString}gpt-cleared`;
  }

  // Check if the first time pop up needs to be shown
  checkShowFirstTimePopUp () {
    const show = localStorage.getItem('showFirstTimePopUp');
    if(!show) {
      this.showFirstTimePopUp = true;
      localStorage.setItem('showFirstTimePopUp', 'false');
    }
  }
  
  closeFirstTimePopUp() {
    this.showFirstTimePopUp = false;
  }
}
