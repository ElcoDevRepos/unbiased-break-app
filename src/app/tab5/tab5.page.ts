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

    docSnaps.forEach(async (d) => {
      const comments = await this.getComments(d.data().id, d.data().collection);
      let data = d.data();
      data.comments = comments;
      this.feed.push(data);
    });
  }

  // Find the original article and get comments if there are any
  async getComments(id: string, collectionType: string) {
    let comments = [];
    let docId = '';
    const q = query(collection(this.firestore, collectionType), where("id", "==", id));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      docId = doc.id;
    });
    const commentRef = collection(
      this.firestore,
      collectionType + '/' + docId + '/comments'
    );
    let docs = await getDocs(commentRef);
    if (!docs.empty) {
      docs.forEach((d) => {
        comments.push({ id: d.id, data: d.data() });
      });
    }
    // Return max 2 comments
    if(comments.length > 1) return [comments[0], comments[1]];
    else if (comments.length == 1) return [comments[0]];
    else return [];
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

  onImgError(event) {
    event.target.src =
      'https://assets.digitalocean.com/labs/images/community_bg.png';
  }
}
