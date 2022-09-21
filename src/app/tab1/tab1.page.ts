import { Component } from '@angular/core';
import { Firestore, collection, query, where, orderBy, limit, startAfter, getDocs, updateDoc, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserService } from '../services/user.service';
import { ModalController, Platform } from '@ionic/angular';
import FuzzySearch from 'fuzzy-search';
import _ from 'lodash';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  expanded = false;
  items$: Observable<any>;
  items = [];
  limit = 20;
  selectedTab = "middle";
  selectedTopic = "all";
  loading = true;
  spinning = false;
  lastVisible;
  activeTopics = [{ on: false, id: 0 }, { on: false, id: 1 }, { on: false, id: 2 }, { on: false, id: 3 }, { on: false, id: 4 }, { on: false, id: 5 }];
  leftFilters = [];
  middleFilters = [];
  rightFilters = [];
  currentUserDoc;
  itemsHolder;
  hasSearched = false;
  sourceImages = [];
  search = "";
  canGetMoreData = true;
  customAlertOptions = {
    header: 'Subscribed Topics',
    subHeader: 'Select which article topics you would like shown.',
    translucent: true
  }
  topicSelectList;
  isDesktop: boolean;
  readArticles = [];
  constructor(private firestore: Firestore, private userService: UserService, private modal: ModalController, private platform: Platform) { }


  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');
    this.getUserData();
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


  expand() {
    this.expanded = !this.expanded;
  }

  async getUserData() {
    let user = this.userService.getLoggedInUser();
    if (user) {
      this.userService.setDeviceToken(window.localStorage.getItem('pushtoken'));
      this.userService.setLastSeen();
      let ref = collection(
        this.firestore,
        'users'
      );
      let q = query(ref, where('email', '==', user.email));
      let docSnaps = await getDocs(q);
      let promises = [];
      docSnaps.forEach(async (d) => {
        this.currentUserDoc = d;
        if (d.data().filters) {
          this.leftFilters = JSON.parse(d.data().filters[0]) || [];
          this.middleFilters = JSON.parse(d.data().filters[1]) || [];
          this.rightFilters = JSON.parse(d.data().filters[2]) || [];
  
          if (this.leftFilters.length === 0) {
            promises.push(this.setupFilters());
          }
        } else {
          promises.push(this.setupFilters());
        }
  
        if (d.data().topics) {
          this.topicSelectList = d.data().topics;
        } else {
          promises.push(this.setupTopics());
        }
      })
      promises.push(this.getSources());
      Promise.all(promises).then(() => this.getData());
    } else {
      await this.setupFilters();
      await this.getData();
    }
    
  }

  isRead(id) {
    return this.readArticles.includes(id);
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

  async setupTopics() {
    let userRef = doc(
      this.firestore,
      'users',
      this.currentUserDoc.id
    );
    this.topicSelectList = ["0", "1", "2", "3", "4", "5"];
    await updateDoc(userRef, {topics: this.topicSelectList})
    this.toggleCard();
  }

  async setupFilters() {
    let leftRef = collection(
      this.firestore,
      'left-sources'
    );
    let leftDocs = await getDocs(leftRef);
    let middleRef = collection(
      this.firestore,
      'middle-sources'
    );
    let middleDocs = await getDocs(middleRef);
    let rightRef = collection(
      this.firestore,
      'right-sources'
    );
    let rightDocs = await getDocs(rightRef);
    leftDocs.forEach((d) => this.leftFilters.push({ label: d.data().url, on: true }));
    middleDocs.forEach((d) => this.middleFilters.push({ label: d.data().url, on: true }));
    rightDocs.forEach((d) => this.rightFilters.push({ label: d.data().url, on: true }));

    if (this.currentUserDoc) {
      let ref = doc(this.firestore, 'users', this.currentUserDoc.id);
      await updateDoc(ref, {
        filters: [
          JSON.stringify(this.leftFilters),
          JSON.stringify(this.middleFilters),
          JSON.stringify(this.rightFilters)
        ]
      })
    }
    
  }

  toggleCard() {
    this.activeTopics = [{ on: false, id: 0 }, { on: false, id: 1 }, { on: false, id: 2 }, { on: false, id: 3 }, { on: false, id: 4 }, { on: false, id: 5 }];

    for (let i = 0; i < this.topicSelectList.length; i++) {
      let flag = parseInt(this.topicSelectList[i]);
      this.activeTopics[flag].on = true;
    }

    let userRef = doc(
      this.firestore,
      'users',
      this.currentUserDoc.id
    );
    updateDoc(userRef, {topics: this.topicSelectList})
    this.items = [];
    this.lastVisible = null;
    this.loading = true;
    this.getData();
  }

  getFilteredTopics(value) {
    let onTopics = [];
    for (let i = 0; i < this.activeTopics.length; i++) {
      if (this.activeTopics[i].on) onTopics.push(this.activeTopics[i].id);
    }
    if (onTopics.length === 0) {
      let a = this.getFilteredArticles(value);
      return a;
    } else {
      let allowedArticles = [];
      for (let i = 0; i < value.length; i++) {
        if (onTopics.includes(value[i].topic)) allowedArticles.push(value[i]);
      }
      return this.getFilteredArticles(allowedArticles);
    }
  }

  getFilteredArticles(articles) {
    let allowedArticles = [];
    for (let i = 0; i < articles.length; i++) {
      for (let j = 0; j < this.leftFilters.length; j++) {
        if (articles[i].link.includes(this.leftFilters[j].label) && this.leftFilters[j].on) {
          allowedArticles.push(articles[i]);
          break;
        }
      }
      for (let j = 0; j < this.middleFilters.length; j++) {
        if (articles[i].link.includes(this.middleFilters[j].label) && this.middleFilters[j].on) {
          allowedArticles.push(articles[i]);
          break;
        }
      }
      for (let j = 0; j < this.rightFilters.length; j++) {
        if (articles[i].link.includes(this.rightFilters[j].label) && this.rightFilters[j].on) {
          allowedArticles.push(articles[i]);
          break;
        }
      }
    }
    return allowedArticles;
  }

  getSelectedTopic() {
    let onTopics = [];
    for (let i = 0; i < this.activeTopics.length; i++) {
      if (this.activeTopics[i].on) onTopics.push(this.activeTopics[i].id);
    }
    return onTopics.length > 0 ? "filtered" : "all";
  }

  async getData() {
    const responsesRef = collection(
      this.firestore,
      this.selectedTab.toLocaleLowerCase() + '-articles'
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
    if (docSnaps.size < this.limit) this.canGetMoreData = false;
    docSnaps.forEach((d) => {
      items.push(d.data());
    });

    this.items.push(...this.getFilteredTopics(items));
    this.loading = false;
    if (this.hasSearched) this.searchShownArticles();
    if (this.items.length < this.limit && this.canGetMoreData) await this.getData();
  }

  onLeftChanged(ev, i) {
    this.leftFilters[i].on = ev.detail.checked;
  }
  onMiddleChanged(ev, i) {
    this.middleFilters[i].on = ev.detail.checked;
  }
  onRightChanged(ev, i) {
    this.rightFilters[i].on = ev.detail.checked;
  }

  onImgError(item, event) {
    let newUrl = new URL(item.link);
    let index = _.findIndex(this.sourceImages, (s) => s.url === newUrl.host);
    if (index != -1) {
      return this.sourceImages[index].image;
    }
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
    let index = _.findIndex(this.sourceImages, (s) => s.url === url);

    if (index != -1) {
      return this.sourceImages[index].image;
    }
    if (item.image) return item.image;
    return newUrl.origin + "/favicon.ico";
  }

  segmentChanged() {
    this.items = [];
    this.lastVisible = null;
    this.loading = true;
    this.getData();
  }

  async loadData(ev) {
    this.spinning = true;
    await this.getData();
    ev.target.complete();
    this.spinning = false;
  }

  async closeAndSave() {
    this.modal.dismiss();
    let ref = doc(this.firestore, 'users', this.currentUserDoc.id);
    await updateDoc(ref, {
      filters: [
        JSON.stringify(this.leftFilters),
        JSON.stringify(this.middleFilters),
        JSON.stringify(this.rightFilters)
      ]
    })
    this.hasSearched = false;
    this.lastVisible = null;
    this.items = [];
    await this.getData();
    await this.getData();
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
