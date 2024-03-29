import { Component, ViewChild } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collectionData,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  getDoc,
  updateDoc,
  doc,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import FuzzySearch from 'fuzzy-search';
import _ from 'lodash-es';
import { HttpClient } from '@angular/common/http';
import { ModalController, Platform } from '@ionic/angular';
import { UserService } from '../services/user.service';
import { Browser } from '@capacitor/browser';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { TabsPage } from '../tabs/tabs.page';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})
export class Tab2Page {
  @ViewChild('searchBar') searchBar: any;

  slideOpts = {
    initialSlide: 0,
  };
  categoryItems$: Observable<any>;
  items = [];
  categoryItems = [];
  trendingLimit = 20;
  categoryLimit = 10;
  sourceImages = [];
  trendingLoading = true;
  categoryLoading = true;
  lastVisible;
  search = '';
  hasSearched = false;
  isDesktop: boolean;
  currentUserDoc;
  showReadArticles;
  readArticles = [];
  leftFilters = [];
  middleFilters = [];
  rightFilters = [];
  showSearchBar: boolean = false;
  category: string = 'united-states';
  stopCategoryArticleQuery: boolean = false;

  constructor(
    private firestore: Firestore,
    public sanitizer: DomSanitizer,
    private platform: Platform,
    private userService: UserService,
    private auth: Auth,
    private router: Router,
    private menuController: MenuController,
    private tabsPage: TabsPage,
    private modal: ModalController
  ) {}

  ngOnInit() {
    this.isDesktop =
      this.platform.is('desktop') &&
      !this.platform.is('android') &&
      !this.platform.is('ios');

    this.getData();
    this.getCategoryData();
  }

  ionViewWillEnter() {
    this.tabsPage.selectedTab = 'tab2';

    this.auth.onAuthStateChanged(async () => {
      let ref = collection(this.firestore, 'users');
      if (this.userService.getLoggedInUser()) {
        let q = query(
          ref,
          where('email', '==', this.userService.getLoggedInUser().email)
        );
        getDocs(q).then((docSnaps) => {
          docSnaps.forEach((d) => {
            this.currentUserDoc = d;
            this.readArticles = d.data().readArticles || [];

            // Fetch users filters from Firestore doc
            if(d.data().filters) {
              this.leftFilters = JSON.parse(d.data().filters[0]) || [];
              this.middleFilters = JSON.parse(d.data().filters[1]) || [];
              this.rightFilters = JSON.parse(d.data().filters[2]) || [];
            }
          });
        });
      }
    });
  }

  isRead(id) {
    return this.readArticles.includes(id);
  }

  //Get trending articles from firestore
  async getData() {
    await this.getSources();
    // Get data
    const responsesRef = collection(this.firestore, 'trending-articles');
    let q = query(
      responsesRef,
      orderBy('date', 'desc'),
      where('deleted', '==', false),
      limit(this.trendingLimit)
    );
    let docSnaps = await getDocs(q);
    let items = [];

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
    docSnaps.forEach((d) => {
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
    });

    //Set a topic on each trending article
    items.forEach((i) => {
      i.topic = this.setTrendingArticleTopic(i.link);
    });

    items = this.filterArticles(items);

    this.items.push(...items);
    this.trendingLoading = false;
  }

  //Get category articles from firestore
  async getCategoryData() {
    if (this.stopCategoryArticleQuery) return;

    const responsesRef = collection(this.firestore, 'category-articles');
    let q;
    if (this.lastVisible) {
      q = query(
        responsesRef,
        orderBy('date', 'desc'),
        where('deleted', '==', false),
        where('topic', '==', this.category),
        limit(this.categoryLimit),
        startAfter(this.lastVisible)
      );
    } else {
      q = query(
        responsesRef,
        orderBy('date', 'desc'),
        where('deleted', '==', false),
        where('topic', '==', this.category),
        limit(this.categoryLimit)
      );
    }

    let docSnaps = await getDocs(q);
    this.lastVisible = docSnaps.docs[docSnaps.docs.length - 1];
    let categoryItems = [];

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
    docSnaps.forEach((d) => {
      //check if the articles date is newer than the last article
      //this prevents the query from looping
      if (this.categoryItems.length > 0) {
        if (
          this.categoryItems[this.categoryItems.length - 1].date <=
          d.data()['date']
        ) {
          this.stopCategoryArticleQuery = true;
          return;
        }
      }

      if (this.userService.getLoggedInUser()) {
        //Show read articles
        if (this.showReadArticles) {
          categoryItems.push(d.data());
        }
        //Don't show read articles
        else {
          if (!this.readArticles.includes(d.data()['id'])) {
            categoryItems.push(d.data());
          }
        }
      } else categoryItems.push(d.data());
    });

    //This is for loading new articles after a search has been preformed
    if (this.hasSearched) {
      const searcher = new FuzzySearch(categoryItems, ['title'], {
        caseSensitive: false,
        sort: true,
      });
      const result = searcher.search(this.search);
      categoryItems = result;
    }

    categoryItems = this.filterArticles(categoryItems);

    this.categoryItems.push(...categoryItems);

    this.categoryLoading = false;
  }

  // Filter out articles based on user filter settings
  filterArticles (articles) {
    // Just return same articles if user is not logged in
    if(!this.userService.getLoggedInUser()) return articles;

    let allowedArticles = [];

    articles.forEach(a => {
      let done = false;
      for (let i = 0; i < this.leftFilters.length; i++) {
        if (
          a.link.includes(this.leftFilters[i].label) &&
          !this.leftFilters[i].on
        ) {
          done = true;
          break;
        }
      }
      if(!done) {
        for (let i = 0; i < this.middleFilters.length; i++) {
          if (
            a.link.includes(this.middleFilters[i].label) &&
            !this.middleFilters[i].on
          ) {
            done = true;
            break;
          }
        }
      }
      if(!done) {
        for (let i = 0; i < this.rightFilters.length; i++) {
          if (
            a.link.includes(this.rightFilters[i].label) &&
            !this.rightFilters[i].on
          ) {
            done = true;
            break;
          }
        }
      }
      if(!done) allowedArticles.push(a); 
    });
    return allowedArticles;
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

  onImgError(event) {
    event.target.src = '../../assets/icons/newspaper.svg';
  }

  //This will return the referenced image link in the "img" container inside item
  //If there is no value, this will return a placeholder image
  getImage(item) {
    //This is to prevent empty image from displaying (currently only for business insider)
    if (item.link.includes('markets.businessinsider.com'))
      return 'https://markets.businessinsider.com/Images/FacebookIcon.jpg';
    //This is a fix for market insider articles since there images are wack
    if (
      item.image ==
      'https://www.businessinsider.com/public/assets/subscription/marketing/banner-overlay/top-left.svg'
    )
      return this.getSourceImage(item);

    if (item.image) return item.image;
    //Get random placeholder image
    else {
      return this.getSourceImage(item);
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
    if (item.siteName) {
      let site = item.siteName.replaceAll(' ', '').toLocaleLowerCase();

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

  loadData(ev) {
    this.getCategoryData();
    ev.target.complete();
  }

  searchShownArticles() {
    if (this.search == '') {
      this.clearSearch();
      return;
    }
    this.hasSearched = true;
    const searcher = new FuzzySearch(this.categoryItems, ['title'], {
      caseSensitive: false,
      sort: true,
    });
    const result = searcher.search(this.search);
    this.categoryItems = result;
  }

  async clearSearch() {
    this.hasSearched = false;
    this.lastVisible = null;
    this.categoryItems = [];
    this.stopCategoryArticleQuery = false;
    await this.getCategoryData();
    await this.getData();
  }

  async doRefresh(event) {
    this.hasSearched = false;
    this.lastVisible = null;
    this.categoryItems = [];
    this.items = [];
    this.stopCategoryArticleQuery = false;
    await this.getData();
    await this.getCategoryData();
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

  //Toggle search bar when clicking on search glass
  toggleSearchBar() {
    this.showSearchBar = !this.showSearchBar;
    setTimeout(() => {
      this.searchBar.setFocus();
    }, 100);
  }

  //Updates the category string
  async setCategory(cat: string) {
    this.category = cat;
    this.lastVisible = null;
    this.categoryItems = [];
    this.stopCategoryArticleQuery = false;
    await this.getCategoryData();
  }

  getHoursAgo(timestamp: Timestamp): string {
    const currentDate = new Date();
    const publishedDate = timestamp.toDate();
    const timeDifference = currentDate.getTime() - publishedDate.getTime();
    const hoursDifference = Math.floor(timeDifference / (1000 * 3600));

    //Return "Just now" if the hour difference is within an hour
    if (hoursDifference > 0) return `${hoursDifference.toString()} hours ago`;
    else return 'Just now';
  }

  closeMenu() {
    this.menuController.close('tab2-menu');
  }

  //Pass a link and this return a string depending on topic in link
  setTrendingArticleTopic(link: string) {
    let topic = 'News';

    //Add on this as more categories are identified
    if (link.includes('politics')) return 'Politics';
    if (link.includes('nation')) return 'Nation';
    if (link.includes('business')) return 'Business';
    if (link.includes('us')) return 'U.S.';
    if (link.includes('us-news')) return 'U.S.';
    if (link.includes('travel')) return 'Travel';
    if (link.includes('world')) return 'World';
    if (link.includes('global')) return 'Global';
    if (link.includes('investing')) return 'Investing';
    if (link.includes('europe')) return 'Europe';
    if (link.includes('economy')) return 'Economy';
    if (link.includes('asia')) return 'Asia';
    if (link.includes('russia')) return 'Russia';

    return topic;
  }

  // For closing and saving the news filter modal
  async closeNewsFilter () {
    // Close modal
    this.modal.dismiss();

    // Save new filter settings for user
    let ref = doc(this.firestore, 'users', this.currentUserDoc.id);
    await updateDoc(ref, {
      filters: [
        JSON.stringify(this.leftFilters),
        JSON.stringify(this.middleFilters),
        JSON.stringify(this.rightFilters),
      ],
    });

    // Reload articles
    this.hasSearched = false;
    this.lastVisible = null;
    this.categoryItems = [];
    this.items = [];
    this.stopCategoryArticleQuery = false;
    await this.getData();
    await this.getCategoryData();
  }

  // Handle filter on/off checkbox
  onLeftChanged(ev, i) {
    this.leftFilters[i].on = ev.detail.checked;
  }
  onMiddleChanged(ev, i) {
    this.middleFilters[i].on = ev.detail.checked;
  }
  onRightChanged(ev, i) {
    this.rightFilters[i].on = ev.detail.checked;
  }
}
