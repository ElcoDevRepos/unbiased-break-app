import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut, deleteUser, updateProfile } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  updateDoc,
  query,
  where,
  getDoc,
  orderBy,
  limit,
  startAfter,
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  getFirestore,
} from '@angular/fire/firestore';
import {
  ActionSheetController,
  AlertController,
  LoadingController,
  ModalController,
  Platform,
  ToastController,
} from '@ionic/angular';
import { UserService } from '../services/user.service';
import {
  Storage,
  ref,
  uploadString,
  getDownloadURL,
} from '@angular/fire/storage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { async } from '@angular/core/testing';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { IntrojsService } from '../introjs.service';
import { TabsPage } from '../tabs/tabs.page';
import { Share } from '@capacitor/share';
import * as _ from 'lodash';
import {
  InAppPurchase2,
  IAPProduct,
} from '@ionic-native/in-app-purchase-2/ngx';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
})
export class Tab3Page implements OnInit, OnDestroy {
  expanded = false;
  replies;
  reminders;
  randomArticle;
  GPTSummaries;
  showReadArticles;
  public favorites = [];
  public readArticles = [];
  public favoriteSummaries = [];
  readArticlesAmount;
  loadingBookmarks: boolean = true;
  loadingReadArticles: boolean = true;

  isDesktop: boolean;
  displayName = this.auth.currentUser.displayName;
  requestedNewsSources: any = [];
  newsSources: any = [];
  isAdmin: boolean = false;
  products: IAPProduct[] = [];
  isPro: boolean = false;
  sourceImages = [];

  constructor(
    private store: InAppPurchase2,
    private router: Router,
    public auth: Auth,
    private modal: ModalController,
    private userService: UserService,
    private actionSheetController: ActionSheetController,
    private storage: Storage,
    private loadingCtrl: LoadingController,
    private fireStore: Firestore,
    private platform: Platform,
    private alertCtrl: AlertController,
    private inAppBrowser: InAppBrowser,
    private toastController: ToastController,
    private introService: IntrojsService,
    private tabsPage: TabsPage,
    private ref: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.isDesktop =
      this.platform.is('desktop') &&
      !this.platform.is('android') &&
      !this.platform.is('ios');
    this.createFakeHistory();
    this.platform.ready().then(() => {
      this.store.verbosity = this.store.DEBUG;
      console.log('HERE');
      this.registerProducts();
      this.setupListeners();

      // Get the real product information
      this.store.ready(() => {
        this.products = this.store.products;
        this.ref.detectChanges();
      });
    });
  }

  registerProducts() {
    this.store.register({
      id: 'PREMIUM_SUB',
      type: this.store.PAID_SUBSCRIPTION,
    });

    this.store.refresh();
  }

  setupListeners() {
    this.store
      .when('product')
      .approved((p: IAPProduct) => {
        // Handle the product deliverable
        if (p.id === 'PREMIUM_SUB') {
          this.isPro = p.owned;
          this.userService.isPro = this.isPro;
          this.userService.setIsPro(p.owned);
        }
        this.ref.detectChanges();

        return p.verify();
      })
      .verified((p: IAPProduct) => p.finish());

    // Specific query for one ID
    this.store.when('PREMIUM_SUB').owned((p: IAPProduct) => {
      this.isPro = p.owned;
      this.userService.isPro = this.isPro;
      this.userService.setIsPro(p.owned);
    });
  }

  purchase(product: IAPProduct) {
    this.store.order(product).then(
      (p) => {
        // Purchase in progress!
      },
      (e) => {
        this.presentAlert('Failed', `Failed to purchase: ${e}`);
      }
    );
  }

  restore() {
    this.store.refresh();
  }

  async presentAlert(header, message) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });

    await alert.present();
  }

  createFakeHistory() {
    const modalState = {
      modal: true,
      desc: 'fake state for our modal',
    };
    history.pushState(modalState, null);
  }

  ngOnDestroy() {
    if (window.history.state.modal) {
      history.back();
    }
  }

  async ionViewWillEnter() {
    this.tabsPage.selectedTab = 'tab3';

    this.favorites = (await this.userService.getFavorites()) as any;
    this.favoriteSummaries =
      (await this.userService.getFavoriteSummaries()) as any;
    this.loadingBookmarks = false;
    this.readArticles = (await this.userService.getReadArticles()) as any;
    this.readArticlesAmount =
      (await this.userService.getReadArticlesAmount()) as any;
    this.loadingReadArticles = false;

    await this.checkIfAdmin();
    this.checkNotificationSettings();

    //Check if intro.js is going to be shown
    const showIntroJS = localStorage.getItem('showProfileIntro');
    if (showIntroJS != 'false') {
      localStorage.setItem('showProfileIntro', 'false');
      this.introService.profileFeature();
    }
  }

  @HostListener('window:popstate', ['$event'])
  dismissModal() {
    this.modal.dismiss();
  }

  //Check if the users admin field is true in firestore
  async checkIfAdmin() {
    if (!this.auth.currentUser) this.isAdmin = false;

    let ref = collection(this.fireStore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));

    let docs = await getDocs(q);
    docs.forEach((d) => {
      const admin = d.data()['admin'];
      if (admin == undefined || !admin) {
        this.isAdmin = false;
      } else if (admin) this.isAdmin = true;
    });
  }

  //Gets all requested news sources from firestore DB
  async getRequestedNewsSources() {
    this.requestedNewsSources = [];
    const q = query(
      collection(this.fireStore, 'requested-news-sources'),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      this.requestedNewsSources.push({
        id: doc.id,
        url: doc.data()['url'],
        user: doc.data()['user'],
        timestamp: doc.data()['timestamp'],
        bias: '',
        imageUrl: '',
      });
    });
  }

  //Gets all current/active news sources from firestore DB
  async getNewsSources() {
    this.newsSources = [];

    // Define the collection names
    const collectionNames = ['right-sources', 'middle-sources', 'left-sources'];

    // Loop through each collection name and fetch the data
    for (const collectionName of collectionNames) {
      const q = query(collection(this.fireStore, collectionName));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        this.newsSources.push({
          ...doc.data(),
          id: doc.id,
          collection: collectionName,
        });
      });
    }
  }

  //Approves news source by adding it to firestore DB and displays toast as feedback
  async approveNewsSource(source: any) {
    const url = source.url;
    const imageUrl = source.imageUrl;
    const bias = source.bias;
    const urlPattern = /^(?!https:\/\/|www\.).*$/i;

    //Toasts
    const successToast = await this.toastController.create({
      message: 'Success approving news source!',
      duration: 2000,
      position: 'top',
    });
    const errorToast = await this.toastController.create({
      message: 'Error approving news source!',
      duration: 2000,
      position: 'top',
    });
    const formatToast = await this.toastController.create({
      message: 'Select bias and add image URL to approve',
      duration: 3000,
      position: 'top',
    });
    const wrongUrlToast = await this.toastController.create({
      message:
        'Input needs to be in example.com format (do not include https:// or www)',
      duration: 5000,
      position: 'top',
    });

    if (bias.trim() == '' || imageUrl.trim() == '') {
      await formatToast.present();
    } else if (!urlPattern.test(url)) {
      await wrongUrlToast.present();
    } else if (bias == 'left') {
      await addDoc(collection(this.fireStore, 'left-sources'), {
        url: url,
        image: imageUrl,
      })
        .then(async () => {
          this.deleteNewsSource(source, false);
          await successToast.present();
        })
        .catch(async (err) => {
          console.error(err);
          await errorToast.present();
        });
    } else if (bias == 'middle') {
      await addDoc(collection(this.fireStore, 'middle-sources'), {
        url: url,
        image: imageUrl,
      })
        .then(async () => {
          this.deleteNewsSource(source, false);
          await successToast.present();
        })
        .catch(async (err) => {
          console.error(err);
          await errorToast.present();
        });
    } else if (bias == 'right') {
      await addDoc(collection(this.fireStore, 'right-sources'), {
        url: url,
        image: imageUrl,
      })
        .then(async () => {
          this.deleteNewsSource(source, false);
          await successToast.present();
        })
        .catch(async (err) => {
          console.error(err);
          await errorToast.present();
        });
    }
  }
  //Deletes a requested news source from firestore DB and displays toast as feedback
  async deleteNewsSource(source: any, showToast: boolean) {
    const successToast = await this.toastController.create({
      message: 'Success deleting news source!',
      duration: 2000,
      position: 'top',
    });
    const errorToast = await this.toastController.create({
      message: 'Error deleting news source!',
      duration: 2000,
      position: 'top',
    });

    await deleteDoc(doc(this.fireStore, 'requested-news-sources', source.id))
      .then(() => {
        console.log('Success deleting requested news source!');
        if (showToast) successToast.present();
        this.getRequestedNewsSources();
      })
      .catch((err) => {
        console.error('Error deleting requested news source', err);
        if (showToast) errorToast.present();
      });
  }

  //Removes existing news source
  async removeNewsSource(source: any) {
    const successToast = await this.toastController.create({
      message: 'Success removing news source!',
      duration: 2000,
      position: 'top',
    });
    const errorToast = await this.toastController.create({
      message: 'Error removing news source',
      duration: 2000,
      position: 'top',
    });

    await deleteDoc(doc(this.fireStore, source.collection, source.id))
      .then(() => {
        console.log('Success removing news source!');
        successToast.present();
        this.getNewsSources();
      })
      .catch((err) => {
        console.error('Error removing news source', err);
        errorToast.present();
      });
  }

  openURL(url: string) {
    const browser = this.inAppBrowser.create(`https://www.${url}`, '_blank');
  }

  async checkNotificationSettings() {
    let ref = doc(this.fireStore, 'users', this.auth.currentUser.uid);
    let userDoc = await getDoc(ref);
    this.replies = userDoc.data().replyNotifications;
    this.reminders = userDoc.data().reminderNotifications;
    this.randomArticle = userDoc.data().randomArticleNotification;
    this.GPTSummaries = userDoc.data().GPTSummariesNotification;
    this.showReadArticles = userDoc.data().showReadArticles;
  }

  logOut() {
    signOut(this.auth);
    this.router.navigate(['login'], {
      replaceUrl: true,
    });
  }

  async closeAndSave() {
    updateProfile(this.auth.currentUser, {
      displayName: this.displayName,
    });

    this.modal.dismiss();
  }

  async updateProfilePhoto() {
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      width: 500,
      height: 500,
    });

    const loading = await this.loadingCtrl.create({
      message: 'Uploading...',
    });

    await loading.present();
    const imageRef = ref(
      this.storage,
      Math.random().toString(36).slice(2, 12) + '.png'
    );

    let snapshot = await uploadString(imageRef, image.base64String, 'base64', {
      contentType: 'image/png',
    });
    let url = await getDownloadURL(snapshot.ref);
    await updateProfile(this.auth.currentUser, {
      photoURL: url,
    });
    await loading.dismiss();
    this.modal.dismiss();
  }

  base64ToImage(dataURI) {
    const fileDate = dataURI.split(',');
    // const mime = fileDate[0].match(/:(.*?);/)[1];
    const byteString = atob(fileDate[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const int8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([arrayBuffer], { type: 'image/png' });
    return blob;
  }

  updateRemindersSetting(ev) {
    if (ev) {
      this.reminders = ev.detail.checked;
      let ref = doc(this.fireStore, 'users', this.auth.currentUser.uid);
      updateDoc(ref, {
        reminderNotifications: this.reminders,
      });
    }
  }

  //Toggle the "Daily Random Article" notification
  updateRandomArticleSetting(ev) {
    if (ev) {
      this.randomArticle = ev.detail.checked;
      let ref = doc(this.fireStore, 'users', this.auth.currentUser.uid);
      updateDoc(ref, {
        randomArticleNotification: this.randomArticle,
      });
    }
  }

  //Toggle the "Daily GPT Summaries" notification
  updateGPTSummariesSetting(ev) {
    if (ev) {
      this.GPTSummaries = ev.detail.checked;
      let ref = doc(this.fireStore, 'users', this.auth.currentUser.uid);
      updateDoc(ref, {
        GPTSummariesNotification: this.GPTSummaries,
      });
    }
  }

  updateRepliesSetting(ev) {
    if (ev) {
      this.replies = ev.detail.checked;
      let ref = doc(this.fireStore, 'users', this.auth.currentUser.uid);
      updateDoc(ref, {
        replyNotifications: this.replies,
      });
    }
  }

  updateShowReadArticles(ev) {
    if (ev) {
      this.showReadArticles = ev.detail.checked;
      let ref = doc(this.fireStore, 'users', this.auth.currentUser.uid);
      updateDoc(ref, {
        showReadArticles: this.showReadArticles,
      });
    }
  }

  async deleteAccount() {
    const alertW = await this.alertCtrl.create({
      header: 'Are you sure you want to delete your account?',
      buttons: [
        {
          text: 'Yes',
          role: 'destructive',
          handler: async () => {
            deleteUser(this.auth.currentUser).then(() =>
              window.location.reload()
            );
          },
        },
        {
          text: 'No',
          handler: async () => {
            return;
          },
        },
      ],
    });

    alertW.present();
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

  getImage(item) {
    if (item.image) return item.image;
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
    let collectionRef = collection(getFirestore(), 'left-sources');
    let leftDocs = await getDocs(collectionRef);
    leftDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    });
    collectionRef = collection(getFirestore(), 'middle-sources');
    let midDocs = await getDocs(collectionRef);
    midDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    });
    collectionRef = collection(getFirestore(), 'right-sources');
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
      const browser = this.inAppBrowser.create(link, '_blank');
      browser.show();
    }
  }
}
