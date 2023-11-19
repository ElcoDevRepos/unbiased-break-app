import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { Auth } from '@angular/fire/auth';
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
import { Observable } from 'rxjs';
import { UserService } from '../services/user.service';
import { ModalController, Platform } from '@ionic/angular';
import FuzzySearch from 'fuzzy-search';
import _ from 'lodash-es';
import { TopicComponent } from '../modals/topic/topic.component';
import { ToastController } from '@ionic/angular';
import { IntrojsService } from '../introjs.service';
import { MenuController } from '@ionic/angular';
import { TabsPage } from '../tabs/tabs.page';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit {
  @ViewChild('searchBar') searchBar: any;

  expanded = false;
  items$: Observable<any>;
  items = [];
  limit = 10;
  selectedTab = 'middle';
  selectedTopic = 'all';
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
  search = '';
  topicOptions = [];
  canGetMoreData = true;
  customAlertOptions = {
    header: 'Subscribed Topics',
    subHeader: 'Select which article topics you would like shown.',
    translucent: true,
  };
  topicSelectList;
  topicCheckedList;
  isDesktop: boolean;
  readArticles = [];
  showReadArticles;
  gettingData: boolean = false;
  getDataStartTime = null;
  requestedNewsSource: string = '';
  requestNewsSourceLoading: boolean = false;
  showSearchBar: boolean = false;

  constructor(
    private firestore: Firestore,
    private userService: UserService,
    private modal: ModalController,
    private platform: Platform,
    private auth: Auth,
    private toastController: ToastController,
    private introService: IntrojsService,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private menuController: MenuController,
    private tabsPage: TabsPage
  ) {}

  onArticleClick(item: any) {
    const link = item.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      this.addToRead(item.id); //Add the wsj or nyt article to read now because it won't be opening the article page
      Browser.open({ url: link });
    }
  }

  ngOnInit() {
    this.isDesktop =
      this.platform.is('desktop') &&
      !this.platform.is('android') &&
      !this.platform.is('ios');
    this.auth.onAuthStateChanged(async () => {
      let ref = collection(this.firestore, 'users');
      if (this.userService.getLoggedInUser()) {
        let q = query(
          ref,
          where('email', '==', this.userService.getLoggedInUser().email)
        );
        const docSnaps = await getDocs(q);
        docSnaps.forEach((d) => {
          this.readArticles = d.data().readArticles || [];
        });
      } else console.log('ELSE');

      setTimeout(() => {
        this.getUserData();
      }, 1200);
    });
  }

  ionViewWillEnter() {
    this.tabsPage.selectedTab = 'tab1';
  }

  expand() {
    this.expanded = !this.expanded;
  }

  async getUserData() {
    let user = this.auth.currentUser;
    if (user) {
      if (!this.isDesktop)
        this.userService.setDeviceToken(
          window.localStorage.getItem('pushtoken')
        );
      this.userService.setLastSeen();
      let ref = collection(this.firestore, 'users');
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
          } else {
            //Check for any new approved news sources
            this.checkForNewNewsSources();
          }
        }

        if (d.data().topics) {
          this.topicSelectList = d.data().topics;
          this.topicOptions = this.topicSelectList;
          this.topicCheckedList = this.topicOptions.filter(
            (topic) => topic.checked === true
          );
        } else {
          promises.push(this.setupTopics());
        }
      });
      promises.push(this.getSources());
      Promise.all(promises).then(() => this.getData());
    } else {
      await this.getSources();
      await this.setupFilters();
      await this.setupTopics();
      await this.getData();
    }
  }

  isRead(id) {
    return this.readArticles.includes(id);
  }

  async getSources() {
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

  async openTopicModal() {
    if (this.currentUserDoc) {
      let modal = await this.modal.create({
        component: TopicComponent,
        componentProps: {
          topics: this.topicOptions,
          currentUser: this.currentUserDoc.id,
        },
      });
      modal.onDidDismiss().then((response) => {
        this.items = [];
        this.topicOptions = response.data;
        this.loading = true;
        this.lastVisible = null;
        this.topicCheckedList = this.topicOptions.filter(
          (topic) => topic.checked === true
        );
        this.getData();
      });
      modal.present();
    } else {
      alert('Please sign in to edit your subscribed topics!');
    }
  }

  async setupTopics() {
    let user = this.auth.currentUser;
    if (user) {
      let userRef = doc(this.firestore, 'users', this.currentUserDoc.id);
    }
    this.topicSelectList = [
      {
        display: 'Economy',
        id: 4,
        name: 'economy',
        checked: true,
      },
      {
        display: 'Abortion',
        name: 'abortion',
        id: 3,
        checked: true,
      },
      {
        id: 2,
        display: 'Police',
        name: 'police',
        checked: true,
      },
      {
        id: 0,
        display: 'Gun Control',
        name: 'gun',
        checked: true,
      },
      {
        name: 'healthcare',
        id: 5,
        display: 'Healthcare',
        checked: true,
      },
      {
        id: 1,
        display: 'Cannabis',
        name: 'cannabis',
        checked: true,
      },
    ];
    this.topicOptions = this.topicSelectList;
    this.topicCheckedList = this.topicOptions.filter(
      (topic) => topic.checked === true
    );

    this.toggleCard();
  }

  async checkForNewNewsSources() {
    // Query Firestore collections for left, middle, and right sources
    let leftRef = collection(this.firestore, 'left-sources');
    let leftDocs = await getDocs(leftRef);
    let middleRef = collection(this.firestore, 'middle-sources');
    let middleDocs = await getDocs(middleRef);
    let rightRef = collection(this.firestore, 'right-sources');
    let rightDocs = await getDocs(rightRef);

    // Extract the source values from the queried documents
    let leftSourcesFromFirestore = leftDocs.docs.map(
      (doc) => doc.data()['url']
    );
    let middleSourcesFromFirestore = middleDocs.docs.map(
      (doc) => doc.data()['url']
    );
    let rightSourcesFromFirestore = rightDocs.docs.map(
      (doc) => doc.data()['url']
    );

    // Check for new sources in leftFilters
    leftSourcesFromFirestore.forEach(async (url) => {
      let filterMatch = this.leftFilters.find((filter) => filter.label === url);
      if (!filterMatch) {
        // Update the leftFilters array with the new filter
        this.leftFilters.push({ label: url, on: true });
      }
    });

    //Check for sources removed from firestore
    //Remove no longer in-use sources from users list
    this.leftFilters = this.leftFilters.filter((source) => {
      let filterMatch = leftSourcesFromFirestore.find(
        (filter) => filter === source.label
      );
      return filterMatch; // Keep the element in the array if filterMatch is true
    });

    // Check for new sources in middleFilters
    middleSourcesFromFirestore.forEach(async (url) => {
      let filterMatch = this.middleFilters.find(
        (filter) => filter.label === url
      );
      if (!filterMatch) {
        // Update the middleFilters array with the new filter
        this.middleFilters.push({ label: url, on: true });
      }
    });

    //Check for sources removed from firestore
    //Remove no longer in-use sources from users list
    this.middleFilters = this.middleFilters.filter((source) => {
      let filterMatch = middleSourcesFromFirestore.find(
        (filter) => filter === source.label
      );
      return filterMatch; // Keep the element in the array if filterMatch is true
    });

    // Check for new sources in rightFilters
    rightSourcesFromFirestore.forEach(async (url) => {
      let filterMatch = this.rightFilters.find(
        (filter) => filter.label === url
      );
      if (!filterMatch) {
        // Update the rightFilters array with the new filter
        this.rightFilters.push({ label: url, on: true });
      }
    });

    //Check for sources removed from firestore
    //Remove no longer in-use sources from users list
    this.rightFilters = this.rightFilters.filter((source) => {
      let filterMatch = rightSourcesFromFirestore.find(
        (filter) => filter === source.label
      );
      return filterMatch; // Keep the element in the array if filterMatch is true
    });

    let ref = doc(this.firestore, 'users', this.currentUserDoc.id);

    await updateDoc(ref, {
      filters: [
        JSON.stringify(this.leftFilters),
        JSON.stringify(this.middleFilters),
        JSON.stringify(this.rightFilters),
      ],
    });
  }

  async setupFilters() {
    let leftRef = collection(this.firestore, 'left-sources');
    let leftDocs = await getDocs(leftRef);
    let middleRef = collection(this.firestore, 'middle-sources');
    let middleDocs = await getDocs(middleRef);
    let rightRef = collection(this.firestore, 'right-sources');
    let rightDocs = await getDocs(rightRef);
    leftDocs.forEach((d) =>
      this.leftFilters.push({ label: d.data().url, on: true })
    );
    middleDocs.forEach((d) =>
      this.middleFilters.push({ label: d.data().url, on: true })
    );
    rightDocs.forEach((d) =>
      this.rightFilters.push({ label: d.data().url, on: true })
    );

    if (this.currentUserDoc && this.auth.currentUser) {
      let ref = doc(this.firestore, 'users', this.currentUserDoc.id);

      await updateDoc(ref, {
        filters: [
          JSON.stringify(this.leftFilters),
          JSON.stringify(this.middleFilters),
          JSON.stringify(this.rightFilters),
        ],
      });
    }
  }

  toggleCard() {
    let user = this.auth.currentUser;
    if (user) {
      let userRef = doc(this.firestore, 'users', this.currentUserDoc.id);
      updateDoc(userRef, { topics: this.topicSelectList });
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
      if (this.selectedTab === 'left') {
        for (let j = 0; j < this.leftFilters.length; j++) {
          if (
            articles[i].link.includes(this.leftFilters[j].label) &&
            this.leftFilters[j].on
          ) {
            allowedArticles.push(articles[i]);
            break;
          }
        }
      } else if (this.selectedTab === 'middle') {
        for (let j = 0; j < this.middleFilters.length; j++) {
          if (
            articles[i].link.includes(this.middleFilters[j].label) &&
            this.middleFilters[j].on
          ) {
            allowedArticles.push(articles[i]);
            break;
          }
        }
      } else if (this.selectedTab === 'right') {
        for (let j = 0; j < this.rightFilters.length; j++) {
          if (
            articles[i].link.includes(this.rightFilters[j].label) &&
            this.rightFilters[j].on
          ) {
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

    return onTopics.length > 0 ? 'filtered' : 'all';
  }

  async getData() {
    if (this.topicCheckedList.length == 0) {
      this.loading = false;
      return;
    }
    if (this.gettingData) return;
    this.gettingData = true;

    // Start time timer for timing out
    if(!this.getDataStartTime) this.getDataStartTime = Date.now();

    const responsesRef = collection(
      this.firestore,
      this.selectedTab.toLocaleLowerCase() + '-articles'
    );

    //Set up for collection queries in batches of 10 topics
    let q: any[] = [];
    const totalBatches = Math.ceil(this.topicCheckedList.length / 10);
    let topicIds = [];

    for (let i = 0; i < totalBatches; i++) {
      topicIds.push([]);
    }

    this.topicCheckedList.forEach((t, index) => {
      const batchIndex = Math.floor(index / 10);
      topicIds[batchIndex].push(t.id);
    });

    //Set new limit dependent on how many batches are going to be fetched
    const lim = Math.ceil(this.limit / topicIds.length);

    let docSnaps: QuerySnapshot<unknown>[] = [];
    let items = [];
    let endPoint;
    let setEndPoint = false;

    for (let i = 0; i < topicIds.length; i++) {
      //Get first batch of 10 starting at last visable
      if (this.lastVisible && i == 0) {
        q[i] = query(
          responsesRef,
          orderBy('date', 'desc'),
          orderBy('__name__', 'desc'),
          where('topic', 'in', topicIds[i]),
          where('deleted', '==', false),
          limit(lim),
          startAfter(this.lastVisible)
        );

        setEndPoint = true;
      }

      //Get rest of 10 batches at last visable stopping at end point
      else if (this.lastVisible && i != 0) {
        q[i] = query(
          responsesRef,
          orderBy('date', 'desc'),
          orderBy('__name__', 'desc'),
          where('topic', 'in', topicIds[i]),
          where('deleted', '==', false),
          limit(lim),
          startAfter(this.lastVisible),
          endBefore(endPoint)
        );
      }

      //Very first batch of 10 with no start after
      else if (!this.lastVisible && i == 0) {
        q[i] = query(
          responsesRef,
          orderBy('date', 'desc'),
          orderBy('__name__', 'desc'),
          where('topic', 'in', topicIds[i]),
          where('deleted', '==', false),
          limit(lim)
        );

        setEndPoint = true;
      }

      //Other first batches of 10 with no start after
      else if (!this.lastVisible && i != 0) {
        q[i] = query(
          responsesRef,
          orderBy('date', 'desc'),
          orderBy('__name__', 'desc'),
          where('topic', 'in', topicIds[i]),
          where('deleted', '==', false),
          limit(lim),
          endBefore(endPoint)
        );
      }

      docSnaps[i] = await getDocs(q[i]);
      if (setEndPoint) endPoint = docSnaps[0].docs[docSnaps[0].docs.length - 1];

      if (docSnaps[i].size < lim) {
        this.canGetMoreData = false;
      }
    }

    this.lastVisible = docSnaps[0].docs[docSnaps[0].docs.length - 1];

    //Check if user wants to see read articles
    if (this.currentUserDoc) {
      let ref = doc(this.firestore, 'users', this.currentUserDoc.id);
      const docSnap = await getDoc(ref);
      if (docSnap.exists()) {
        this.showReadArticles = docSnap.data().showReadArticles;
      } else {
        console.log('No user doc found!');
      }
    }

    //Push articles to items
    for (let i = 0; i < docSnaps.length; i++) {
      docSnaps[i].forEach((d) => {
        if (d.data()['deleted'] == false) {
          if (this.userService.getLoggedInUser()) {
            //Show read articles
            if (this.showReadArticles) {
              items.push(d.data());
            }
            //Don't show read articles
            else {
              if (!this.readArticles.includes(d.data()['id'])) {
                items.push(d.data());
              }
            }
          } else items.push(d.data());
        }
      });
    }

    this.items.push(...this.getFilteredArticles(items));
    if (this.hasSearched) this.searchShownArticles();
    this.gettingData = false;
    if (this.items.length < this.limit && this.canGetMoreData){
      // Check if timing out
      if (Date.now() - this.getDataStartTime > 30000) { // 30 seconds
        console.log("Time exceeded 30 seconds");
        this.getDataStartTime = null;
        this.loading = false;
        return;
      }
      await this.getData();
    }

    this.getDataStartTime = null;
    this.loading = false;

    //Check if intro.js is going to be shown
    
    if (this.currentUserDoc) {
      const showIntroJS = localStorage.getItem('showHomeIntro');
      if (showIntroJS != 'false') {
          //localStorage.setItem('showHomeIntro', 'false');
          //this.introService.featureOne();
      }
    }
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

  allLeftFilterSelect(checked: boolean) {
    this.leftFilters.forEach((f) => {
      f.on = checked;
    });
  }
  allMiddleFilterSelect(checked: boolean) {
    this.middleFilters.forEach((f) => {
      f.on = checked;
    });
  }
  allRightFilterSelect(checked: boolean) {
    this.rightFilters.forEach((f) => {
      f.on = checked;
    });
  }

  onImgError(item, event) {
    let newUrl = new URL(item.link);
    let index = _.findIndex(this.sourceImages, (s) => s.url === newUrl.host);
    if (index != -1) {
      return this.sourceImages[index].image;
    }

    return (event.target.src = '../../assets/icons/newspaper.svg');
  }

  getImage(item) {
    if (item.image) return item.image;
    else {
      let newUrl = new URL(item.link);
      let url = '';
      if (newUrl.host.includes('www.')) {
        url = newUrl.host.split('www.')[1];
      } else {
        url = newUrl.host;
      }

      let index = _.findIndex(this.sourceImages, (s) => s.url === url);

      if (index != -1) {
        return this.sourceImages[index].image;
      }
    }
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
        JSON.stringify(this.rightFilters),
      ],
    });
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
      sort: true,
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

  async topicClick(topic: any) {
    if (!this.loading) {
      const index = this.topicOptions.findIndex(
        (t: any) => t.display === topic.display
      );
      if (index !== -1) {
        this.topicOptions[index].checked = !topic.checked;
      }
      this.topicCheckedList = this.topicOptions.filter(
        (topic) => topic.checked === true
      );
      //Update user firestore doc
      if (this.currentUserDoc) {
        await updateDoc(doc(this.firestore, 'users', this.currentUserDoc.id), {
          topics: this.topicOptions,
        });
      }

      this.items = [];
      this.loading = true;
      this.lastVisible = null;
      await this.getData();
    }
  }

  //Send request news source doc to firestore
  async requestNewsSource() {
    this.requestNewsSourceLoading = true;

    const urlPattern = /^(?!https:\/\/|www\.).*$/i;

    // Test the URL against the pattern
    if (this.requestedNewsSource.trim() != '') {
      if (urlPattern.test(this.requestedNewsSource)) {
        let ref = collection(this.firestore, 'requested-news-sources');
        await addDoc(ref, {
          user: this.auth.currentUser.email,
          url: this.requestedNewsSource,
          timestamp: Timestamp.now(),
        })
          .then(async () => {
            console.log('success!');
            const successToast = await this.toastController.create({
              message: 'Successfully requested news source!',
              duration: 2000,
              position: 'top',
            });
            await successToast.present();
            this.requestedNewsSource = '';
            this.requestNewsSourceLoading = false;
          })
          .catch(async (err) => {
            console.error('Error', err);
            const errorToast = await this.toastController.create({
              message: 'Error requesting news source!',
              duration: 2000,
              position: 'top',
            });
            await errorToast.present();
            this.requestNewsSourceLoading = false;
          });
      } else {
        console.error('Input needs to be in example.com format');
        const formatToast = await this.toastController.create({
          message:
            'Input needs to be in example.com format (do not include https:// or www)',
          duration: 5000,
          position: 'top',
        });
        await formatToast.present();
        this.requestNewsSourceLoading = false;
      }
    } else {
      console.error("Input can't be empty");
      const emptyToast = await this.toastController.create({
        message: "Input can't be empty",
        duration: 1500,
        position: 'top',
      });
      await emptyToast.present();
      this.requestNewsSourceLoading = false;
    }
  }

  filterIntroJS() {
    //Check if intro.js is going to be shown
    const showIntroJS = localStorage.getItem('showFilterIntro');
    if (showIntroJS != 'false') {
      setTimeout(() => {
        //localStorage.setItem('showFilterIntro', 'false');
        //this.introService.filtersFeature();
      }, 400);
    }
  }

  //Reset IntoJS
  introJSReplay() {
    const container =
      this.elementRef.nativeElement.querySelector('.scroll-container');
    this.renderer.setProperty(container, 'scrollLeft', container.scrollWidth);
    //this.introService.featureOne();
    localStorage.setItem('showFilterIntro', 'true');
    localStorage.setItem('showTopicsDeleteIntro', 'true');
    localStorage.setItem('showProfileIntro', 'true');
    localStorage.setItem('showTopicsIntro', 'true');
  }

  //Toggle search bar when clicking on search glass
  toggleSearchBar() {
    this.showSearchBar = !this.showSearchBar;
    setTimeout(() => {
      this.searchBar.setFocus();
    }, 100);
  }

  closeMenu() {
    this.menuController.close('tab2-menu');
  }
}
