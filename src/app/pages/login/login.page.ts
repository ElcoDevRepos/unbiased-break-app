import { Component, OnInit } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential,
} from '@angular/fire/auth';
import { Firestore, doc, query, where, orderBy, limit, startAfter, getDocs, updateDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  email: string;
  password: string;
  isDesktop: boolean;
  isLogin = true;
  constructor(private platform: Platform, private router: Router, public auth: Auth, private firestore: Firestore, private alertController: AlertController, private route: ActivatedRoute, private authService: AuthService) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop');
    this.route.queryParams.subscribe(params => {
      if (params.link === "true") {
        this.router.navigate(["/link-email/link"], {
          replaceUrl: true,
          queryParams: {
            link: "true",
            email: params.email,
          }
        });
      }
    });
  }

  async login() {
    try {
      const user = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate([""]);
    } catch (error) {
      alert("Wrong username/password");
    }

  }

  async createAccount() {
    try {
      const user = await createUserWithEmailAndPassword(this.auth, this.email, this.password);

      let ref = doc(this.firestore, 'users', user.user.uid);
      await setDoc(ref, {
        email: user.user.email,
        filters: [
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([])
        ]
      })
      this.router.navigate([""]);
    } catch (error) {
      alert(error);
    }
  }

  async loginWithGoogle() {
    let user: UserCredential | undefined;
    try {
      user = await this.authService.loginGoogle();
    } catch (error) {
    } finally {
      if(user) {
        this.router.navigate([""]);
      } else {
        alert("Something went wrong");
      }
    }
  }

  async forgotPassword() {
    try {
      const alertBox = await this.alertController.create({
        header: 'Please enter your email',
        buttons: ['OK'],
        inputs: [
          {
            placeholder: 'Email',
          },
        ],
      });


      await alertBox.present();

      const { data } = await alertBox.onDidDismiss();
      await sendPasswordResetEmail(this.auth, data.values[0]);
      alert("Password Reset Email Sent");
    } catch (error) {
      alert("Something went wrong")
    }

  }

}
