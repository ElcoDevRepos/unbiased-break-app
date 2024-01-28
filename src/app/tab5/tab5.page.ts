import { Component, OnInit } from '@angular/core';
import { TabsPage } from '../tabs/tabs.page';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from '@angular/fire/firestore';
import { Browser } from '@capacitor/browser';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
})
export class Tab5Page implements OnInit {

  feed = [];

  constructor(
    private tabsPage: TabsPage,
    private firestore: Firestore,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.loadCommunityFeedArticles().then(() => {

    });
  }

  ionViewWillEnter() {
    this.tabsPage.selectedTab = 'tab5';
  }

  // Get articles from firestore
  async loadCommunityFeedArticles() {
    const responsesRef = collection(this.firestore, 'community-feed');
    let q = query(
      responsesRef,
      orderBy('share_count', 'desc'),
      orderBy('timestamp', 'desc'),
    );
    let docSnaps = await getDocs(q);

    docSnaps.forEach((d) => {
      this.feed.push(d.data());
    });
  }

  // Call when user refreshes feed
  async doRefresh(event) {
    this.feed = [];
    await this.loadCommunityFeedArticles();
    event.target.complete();
  }

  onArticleClick(item: any) {
    const link = item.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      this.addToRead(item.id); //Add the wsj or nyt article to read now because it won't be opening the article page
      Browser.open({ url: link });
    }
  }

  async addToRead(articleId) {
    if (!this.userService.getLoggedInUser()) return;
    let user = await getDoc(
      doc(this.firestore, 'users', this.userService.getLoggedInUser().uid)
    );
    let readArticles = user.data().readArticles || [];

    if (!readArticles.includes(articleId)) readArticles.push(articleId);

    updateDoc(
      doc(this.firestore, 'users', this.userService.getLoggedInUser().uid),
      {
        readArticles,
      }
    );
  }
}
