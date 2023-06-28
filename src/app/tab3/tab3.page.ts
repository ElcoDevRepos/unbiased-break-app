import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signOut,
  deleteUser,
  updateProfile
} from '@angular/fire/auth';
import { Firestore, doc, updateDoc, query, where, getDoc, orderBy, limit, startAfter, collection, getDocs } from '@angular/fire/firestore';
import { ActionSheetController, AlertController, LoadingController, ModalController, Platform } from '@ionic/angular';
import { UserService } from '../services/user.service';
import {
  Storage,
  ref,
  uploadString,
  getDownloadURL
} from '@angular/fire/storage';
import { Camera, CameraResultType,CameraSource } from '@capacitor/camera';
import { async } from '@angular/core/testing';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})

export class Tab3Page implements OnInit, OnDestroy {
  expanded = false;
  replies;
  reminders;
  showReadArticles;
  public favorites = [];
  public readArticles = [];
  isDesktop: boolean;
  displayName = this.auth.currentUser.displayName
  requestedNewsSources : any = [];

  constructor(private router: Router, public auth: Auth, private modal: ModalController, private userService: UserService, private actionSheetController: ActionSheetController,
  private storage: Storage, private loadingCtrl: LoadingController, private fireStore: Firestore, private platform: Platform, private alertCtrl: AlertController) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');
    this.createFakeHistory();
  }

  createFakeHistory() {
    const modalState = {
      modal : true,
      desc : 'fake state for our modal'
    };
    history.pushState(modalState, null);
  }

  ngOnDestroy() {
    if (window.history.state.modal) {
      history.back();
    }
  }

  async ionViewWillEnter() {
    this.favorites = await this.userService.getFavorites() as any;
    this.checkNotificationSettings();
  }

  @HostListener('window:popstate', ['$event'])
  dismissModal () {
    this.modal.dismiss();
  }

  async getReadArticles() {
    this.readArticles = await this.userService.getReadArticles() as any;
    console.log(this.readArticles);
  }

  async getRequestedNewsSources() {
    this.requestedNewsSources = [];
    const q = query(collection(this.fireStore, 'requested-news-sources'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      this.requestedNewsSources.push({
        url: doc.data()['url'],
        user: doc.data()['user'],
        timestamp: doc.data()['timestamp']
      });
    });
  }

  approveNewsSource (source : any) {
    const url = source.url;
  }

  async checkNotificationSettings() {
    let ref = doc(this.fireStore, "users", this.auth.currentUser.uid);
    let userDoc = await getDoc(ref);
    this.replies = userDoc.data().replyNotifications;
    this.reminders = userDoc.data().reminderNotifications;
    this.showReadArticles = userDoc.data().showReadArticles;
  }

  logOut() {
    signOut(this.auth);
    this.router.navigate(['login'], {
      replaceUrl: true
    });
  }

  async closeAndSave() {
    updateProfile(this.auth.currentUser, {
      displayName: this.displayName
    })

    this.modal.dismiss();
  }

  async updateProfilePhoto() {
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      width: 500,
      height: 500
    });

    const loading = await this.loadingCtrl.create({
      message: 'Uploading...',
    });
    
    await loading.present();
    const imageRef = ref(this.storage, Math.random().toString(36).slice(2, 12) + '.png');

    let snapshot = await uploadString(imageRef, image.base64String, 'base64', {
      contentType: 'image/png'
    });
    let url = await getDownloadURL(snapshot.ref);
    await updateProfile(this.auth.currentUser, {
      photoURL: url
    })
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
      let ref = doc(this.fireStore, "users", this.auth.currentUser.uid);
      updateDoc(ref, {
        reminderNotifications: this.reminders
      })
    }
  }

  updateRepliesSetting(ev) {
    if (ev) {
      this.replies = ev.detail.checked;
      let ref = doc(this.fireStore, "users", this.auth.currentUser.uid);
      updateDoc(ref, {
        replyNotifications: this.replies
      })
    }
  }

  updateShowReadArticles (ev) {
    if (ev) {
      this.showReadArticles = ev.detail.checked;
      let ref = doc(this.fireStore, "users", this.auth.currentUser.uid);
      updateDoc(ref, {
        showReadArticles: this.showReadArticles
      })
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
            deleteUser(this.auth.currentUser).then(() => window.location.reload());
          }
        },
      {
        text: 'No',
        handler:  async() => {
          return;
        }
      }
      ]
    });

    alertW.present();
  }
}
