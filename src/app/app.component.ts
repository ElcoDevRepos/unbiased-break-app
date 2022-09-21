import { Component } from '@angular/core';
import { AdmobService } from './services/admob.service';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { UserService } from './services/user.service';
import { AlertController, Platform, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private admob: AdmobService, private router: Router, private platform: Platform, private toastCtrl: ToastController, private alertCtrl: AlertController) {
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
  
      await alert.present();
    }
  }

}
