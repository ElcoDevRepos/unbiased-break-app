import { Component, NgZone } from '@angular/core';
import { AdmobService } from './services/admob.service';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { App, App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';


import { UserService } from './services/user.service';
import { AlertController, Platform, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private admob: AdmobService, private router: Router, private platform: Platform, private toastCtrl: ToastController, private alertCtrl: AlertController, private zone: NgZone) {

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
          const domain = 'unbiasedbreak.com';
          const pathArray = event.url.split(domain);
          const slug = pathArray.pop();

          if (slug) {
              this.router.navigateByUrl(slug);
          }
          // If there is no slug do nothing
          // let angular route normally
      });
  });

    this.admob.initialize();
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        PushNotifications.register();
      } else {
        // Show some error
      }
    });

    PushNotifications.addListener('registration',
      (token: Token) => {
        window.localStorage.setItem('pushtoken', token.value);
      }
    );
  }

  async ngOnInit() {
    CapacitorApp.addListener('backButton', ({canGoBack}) => {
      if(!canGoBack){
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });
    const submittedFeedback = window.localStorage.getItem("hasSubmittedFeedback");
    if (!submittedFeedback) {
      const alert = await this.alertCtrl.create({
        header: 'Feedback Requested',
        subHeader: 'We could really use your feedback! It will really help us add positive features to the app!',
        buttons: [
          {
            text: 'No',
            role: 'cancel',
            handler: () => {
              return true;
            },
          },
          {
            text: 'Yes',
            role: 'confirm',
            handler: () => {
              window.localStorage.setItem("hasSubmittedFeedback", "true");
              window.open("https://docs.google.com/forms/d/e/1FAIpQLSeE1XHRZtK3gUdBDQPVw8mF8vH_Z1qkWCL9aJeTVvb7qzFJIw/viewform?usp=sf_link", '_blank')
            },
          },
        ],
      });
  
      //await alert.present();
    }
  }

}
