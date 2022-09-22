import { Component } from '@angular/core';
import { Firestore, collectionData, collection, query, where, getDocs, orderBy, limit, startAfter } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import FuzzySearch from 'fuzzy-search';
import _ from 'lodash';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { UserService } from '../services/user.service';
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
  limit = 20;
  sourceImages = [];
  loading = true;
  lastVisible;
  search = '';
  hasSearched = false;
  isDesktop: boolean;
  readArticles = [];
  constructor(private firestore: Firestore, public sanitizer: DomSanitizer, private http: HttpClient, private platform: Platform, private userService: UserService) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');

    this.getData();
  }

  ionViewWillEnter() {
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
    const searcher = new FuzzySearch(this.items, ['title', 'byline', 'excerpt', 'siteName'], {
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

}
