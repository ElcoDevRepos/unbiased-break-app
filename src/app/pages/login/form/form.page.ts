import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { Firestore, doc, query, where, orderBy, limit, startAfter, getDocs, updateDoc, setDoc, collection } from '@angular/fire/firestore';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-form',
  templateUrl: './form.page.html',
  styleUrls: ['./form.page.scss'],
})
export class FormPage implements OnInit {
  username: string;
  email: string;
  password: string;
  isLogin: boolean;
  showPassword: boolean = false;

  constructor(private router: Router, public auth: Auth, private firestore: Firestore, private alertController: AlertController, private authService: AuthService) { }

  ngOnInit() {
    this.isLogin = this.router.getCurrentNavigation().extras.state.islogin;
  }

  async login() {
    try {
      const user = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate([""]);
    } catch (error) {
      alert("Wrong email/password");
    }

  }

  async createAccount() {
    // Check for valid username
    const usernameRegex = /^[^\s]{3,}$/;
    if(!usernameRegex.test(this.username)) {
      alert("Username has to be at least 3 characters with no white spaces");
      return;
    }

    // Check that username is not already taken
    const exists = await this.checkIfUsernameExists(this.username);
    if(exists) {
      alert(`The username "${this.username}" is taken`);
      return;
    }

    try {
      const user = await createUserWithEmailAndPassword(this.auth, this.email, this.password);

      let ref = doc(this.firestore, 'users', user.user.uid);
      await setDoc(ref, {
        username: this.username,
        email: user.user.email,
        filters: [
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([])
        ]
      })
      this.router.navigate([""]);
    } catch (error) {
      alert("Something went wrong");
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

  // Checks the 'users' collection for existing username, returns false if it does not exist
  async checkIfUsernameExists(username : string) {
    const collectionRef = collection(this.firestore, 'users');
    const q = query(collectionRef, where('username', '==', username));
    const docSnaps = await getDocs(q);
    if(docSnaps.empty) return false;
    else return true;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle() {
    this.authService.loginGoogle();
  }

}
