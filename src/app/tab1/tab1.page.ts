import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, where, orderBy, limit, startAfter, getDocs, updateDoc, doc, getDoc, QuerySnapshot } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserService } from '../services/user.service';
import { ModalController, Platform } from '@ionic/angular';
import FuzzySearch from 'fuzzy-search';
import _ from 'lodash-es';
import { TopicComponent } from '../modals/topic/topic.component';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  expanded = false;
  items$: Observable<any>;
  items = [];
  limit = 10;
  selectedTab = "middle";
  selectedTopic = "all";
  loading = true;
  spinning = false;
  lastVisible;
  leftFilters = [];
  middleFilters = [];
  rightFilters = [];
  currentUserDoc;
  itemsHolder;
  hasSearched = false;
  sourceImages = [];
  search = "";
  topicOptions = [];
  canGetMoreData = true;
  customAlertOptions = {
    header: 'Subscribed Topics',
    subHeader: 'Select which article topics you would like shown.',
    translucent: true
  }
  topicSelectList;
  topicCheckedList;
  isDesktop: boolean;
  readArticles = [];
  showReadArticles;
  constructor(private firestore: Firestore, private userService: UserService, private modal: ModalController, private platform: Platform,
    private auth: Auth, private iab: InAppBrowser) { }

  onArticleClick(item: any) {
    const link = item.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      this.addToRead(item.id); //Add the wsj or nyt article to read now because it won't be opening the article page
      const browser = this.iab.create(link, '_blank');
      browser.show();
    }
  }
    

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');
    this.auth.onAuthStateChanged(async () => {
      let ref = collection(
        this.firestore,
        'users'
      );
      if (this.userService.getLoggedInUser()) {
        let q = query(ref, where('email', '==', this.userService.getLoggedInUser().email));
        const docSnaps = await getDocs(q);
        docSnaps.forEach((d) => {
          this.readArticles = d.data().readArticles || [];
        })
      } else console.log("ELSE");
  
      setTimeout(() => {
        this.getUserData();
      }, 1200);
    })
  }


  expand() {
    this.expanded = !this.expanded;
  }

  async getUserData() {
    let user = this.auth.currentUser;
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
        }

        if (d.data().topics) {
          this.topicSelectList = d.data().topics;
          this.topicOptions = this.topicSelectList;
          this.topicCheckedList = this.topicOptions.filter(topic => topic.checked === true);
        } else {
          promises.push(this.setupTopics());
        }
      })
      promises.push(this.getSources());
      Promise.all(promises).then(() => this.getData());
    } else {
      await this.setupFilters();
      await this.setupTopics()
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

  async openTopicModal() {
    if (this.currentUserDoc) {
      let modal = await this.modal.create({
        component: TopicComponent,
        componentProps: { topics: this.topicOptions, currentUser: this.currentUserDoc.id }
      });
      modal.onDidDismiss().then((response) => {
        this.items = [];
        this.topicOptions = response.data;
        this.loading = true;
        this.lastVisible = null;
        this.topicCheckedList = this.topicOptions.filter(topic => topic.checked === true);
        this.getData();
      })
      modal.present();
    } else {
      alert("Please sign in to edit your subscribed topics!")
    }
  }

  async setupTopics() {
    let user = this.auth.currentUser;
    if (user) {
      let userRef = doc(
      this.firestore,
      'users',
      this.currentUserDoc.id
      );
    }
    this.topicSelectList = [
      {
        "display": "Economy",
        "id": 4,
        "name": "economy",
        "checked": true
      },
      {
        "display": "Abortion",
        "name": "abortion",
        "id": 3,
        "checked": true

      },
      {
        "id": 2,
        "display": "Police",
        "name": "police",
        "checked": true

      },
      {
        "id": 0,
        "display": "Gun Control",
        "name": "gun",
        "checked": true

      },
      {
        "name": "healthcare",
        "id": 5,
        "display": "Healthcare",
        "checked": true

      },
      {
        "id": 1,
        "display": "Cannabis",
        "name": "cannabis",
        "checked": true

      }
    ];
    this.topicOptions = this.topicSelectList;
    this.topicCheckedList = this.topicOptions.filter(topic => topic.checked === true);

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
    
    if (this.currentUserDoc && this.auth.currentUser) {
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
    let user = this.auth.currentUser;
    if (user) {
      let userRef = doc(
        this.firestore,
        'users',
        this.currentUserDoc.id
      );
      updateDoc(userRef, { topics: this.topicSelectList })
      this.items = [];
      this.lastVisible = null;
      this.loading = true;
      this.getData();
    }
  }

  //Only allows article through if it is on the filters (e.g. allow Washington Post article to show if Washington Post filter is on)
  getFilteredArticles(articles) {
    let allowedArticles = [];

    for (let i = 0; i < articles.length; i++) {
      
      if(this.selectedTab === 'left'){
        for (let j = 0; j < this.leftFilters.length; j++) {
          if (articles[i].link.includes(this.leftFilters[j].label) && this.leftFilters[j].on) {
            allowedArticles.push(articles[i]);
            break;
          }
        }
      }

      else if(this.selectedTab === 'middle'){
        for (let j = 0; j < this.middleFilters.length; j++) {
          if (articles[i].link.includes(this.middleFilters[j].label) && this.middleFilters[j].on) {
            allowedArticles.push(articles[i]);
            break;
          }
        }
      }

      else if(this.selectedTab === 'right'){
        for (let j = 0; j < this.rightFilters.length; j++) {
          if (articles[i].link.includes(this.rightFilters[j].label) && this.rightFilters[j].on) {
            allowedArticles.push(articles[i]);
            break;
          }
        }
      }
    }
    return allowedArticles;
  }

  getSelectedTopic() {
    let onTopics = [];

    return onTopics.length > 0 ? "filtered" : "all";
  }

  async getData() {
    const responsesRef = collection(
      this.firestore,
      this.selectedTab.toLocaleLowerCase() + '-articles'
    );
    let q;
    let topicIds = [];
    this.topicCheckedList.forEach((t) => {topicIds.push(t.id)});
    let docSnaps: QuerySnapshot<unknown>;
    let items = [];
    
    if (this.lastVisible) {
      q = query(responsesRef, 
          orderBy('date', 'desc'), 
          orderBy("__name__", 'desc'), 
          where('topic', 'in', topicIds), 
          where('deleted', '==', false), 
          limit(this.limit),
          startAfter(this.lastVisible));

    } else {
      q = query(responsesRef, 
          orderBy('date', 'desc'), 
          orderBy("__name__", 'desc'), 
          where('topic', 'in', topicIds), 
          where('deleted', '==', false), 
          limit(this.limit));
    }
      docSnaps = await getDocs(q);

    this.lastVisible = docSnaps.docs[docSnaps.docs.length - 1];
    if (docSnaps.size < this.limit) {
      this.canGetMoreData = false;
    }
    
    //Check if user wants to see read articles
    if(this.currentUserDoc) {
      let ref = doc(this.firestore, 'users', this.currentUserDoc.id);
      const docSnap = await getDoc(ref);
      if (docSnap.exists()) {
        this.showReadArticles = docSnap.data().showReadArticles;
      } else {
        console.log("No user doc found!");
      }
    }

    //Push articles to items
    docSnaps.forEach((d) => {
      if(d.data()['deleted'] == false) {
        if(this.userService.getLoggedInUser()) {
          //Show read articles
          if(this.showReadArticles) {
            items.push(d.data());
          }
          //Don't show read articles
          else {
            if(!this.readArticles.includes(d.data()['id'])) {
              items.push(d.data());
            }
          }
        } else items.push(d.data());
      }
    });

    this.items.push(...this.getFilteredArticles(items));
    if (this.hasSearched) this.searchShownArticles();
    if (this.items.length < this.limit && this.canGetMoreData) await this.getData();
    this.loading = false;
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

    return event.target.src = "../../assets/icons/newspaper.svg";
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
    this.loading = true;
    this.getData();
  }

  async doRefresh(event) {
    this.hasSearched = false;
    this.lastVisible = null;
    this.items = [];
    await this.getData();
    event.target.complete();
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
