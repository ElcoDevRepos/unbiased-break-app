import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collectionData, collection, query, where, getDocs, orderBy, limit, startAfter, getDoc, updateDoc, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import FuzzySearch from 'fuzzy-search';
import _ from 'lodash-es';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { UserService } from '../services/user.service';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
  slideOpts = {
    initialSlide: 0
  };
  items$: Observable<any>;
  items = [];
  limit = 10;
  sourceImages = [];
  loading = true;
  lastVisible;
  search = '';
  hasSearched = false;
  isDesktop: boolean;
  readArticles = [];
  constructor(private firestore: Firestore, public sanitizer: DomSanitizer, private http: HttpClient, private platform: Platform, private userService: UserService, private auth: Auth, private iab: InAppBrowser) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');

    this.getData();
  }

  ionViewWillEnter() {
    this.auth.onAuthStateChanged(async () => {
      let ref = collection(
        this.firestore,
        'users'
      );
      if (this.userService.getLoggedInUser()) {
        let q = query(ref, where('email', '==', this.userService.getLoggedInUser().email));
        getDocs(q).then((docSnaps) => {
          docSnaps.forEach((d) => {
            this.readArticles = d.data().readArticles || [];
          })
        })
      }
    }); 
  }

  isRead(id) {
    return this.readArticles.includes(id);
  }

  async getData() {
    await this.getSources();
    // Get data
    const responsesRef = collection(
      this.firestore,
      'trending-articles'
    );
    let q;
    if (this.lastVisible) {
      q = query(responsesRef, orderBy('date', 'desc'), where('deleted', '==', false), limit(this.limit), startAfter(this.lastVisible));
    } else {
      q = query(responsesRef, orderBy('date', 'desc'), where('deleted', '==', false), limit(this.limit));
    }
    let docSnaps = await getDocs(q);
    this.lastVisible = docSnaps.docs[docSnaps.docs.length - 1];
    let items = [];
    docSnaps.forEach((d) => {
      items.push(d.data());
    });
    this.items.push(...items);
    this.loading = false;
    if (this.hasSearched) this.searchShownArticles();
  }

  async getSources() {
    let collectionRef = collection(this.firestore, "left-sources");
    let leftDocs = await getDocs(collectionRef);
    leftDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    })
    collectionRef = collection(this.firestore, "middle-sources");
    let midDocs = await getDocs(collectionRef);
    midDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    })
    collectionRef = collection(this.firestore, "right-sources");
    let rightDocs = await getDocs(collectionRef);
    rightDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    })
  }

  onImgError(event) {
    event.target.src = "../../assets/icons/newspaper.svg";
  }

  getImage(item) {
    let newUrl = new URL(item.link);
    let url = "";
    if (newUrl.host.includes("www.")) {
      url = newUrl.host.split("www.")[1];
    } else {
      url = newUrl.host;
    }
    if (item.siteName) {
      let site = item.siteName.replaceAll(" ", "").toLocaleLowerCase();
      let index = _.findIndex(this.sourceImages, (s) => s.url.includes(site));
      if (index != -1) {
        return this.sourceImages[index].image;
      }
      if (item.image) return item.image;
    }
    
    return newUrl.origin + "/favicon.ico";
  }

  loadData(ev) {
    this.getData();
    ev.target.complete();
  }

  searchShownArticles() {
    if (this.search == '') {
      this.clearSearch();
      return;
    }
    this.hasSearched = true;
    const searcher = new FuzzySearch(this.items, ['title'], {
      caseSensitive: false,
      sort: true
    });
    const result = searcher.search(this.search);
    this.items = result;
    
  }

  clearSearch() {
    this.hasSearched = false;
    this.lastVisible = null;
    this.items = [];
    this.getData();
  }

  async doRefresh(event) {
    this.hasSearched = false;
    this.lastVisible = null;
    this.items = [];
    await this.getData();
    event.target.complete();
  }

  onArticleClick(item: any) {
    const link = item.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      this.addToRead(item.id); //Add the wsj or nyt article to read now because it won't be opening the article page
      const browser = this.iab.create(link, '_blank');
      browser.show();
    }
  }

  async addToRead(articleId) {
    if (!this.userService.getLoggedInUser()) return;
    let user = await getDoc(doc(this.firestore, 'users', this.userService.getLoggedInUser().uid));
    let readArticles = user.data().readArticles || [];
    
    if (!readArticles.includes(articleId)) 
      readArticles.push(articleId)

    updateDoc(doc(this.firestore, 'users', this.userService.getLoggedInUser().uid), {
      readArticles
    })
  }

}
