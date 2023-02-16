import { Component, OnInit } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { Firestore, doc, query, where, orderBy, limit, startAfter, getDocs, updateDoc, setDoc } from '@angular/fire/firestore';

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
  constructor(private platform: Platform, private router: Router, public auth: Auth, private firestore: Firestore, private alertController: AlertController) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop');
  }

  async login() {
    try {
      const user = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate([""]);
    } catch (error) {
      alert(error);
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
