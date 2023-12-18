import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential,
} from '@angular/fire/auth';
import { doc, query, where, orderBy, limit, startAfter, getDocs, updateDoc, setDoc, collection } from '@angular/fire/firestore';
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

  isLink: boolean;

  constructor(private router: Router, private alertController: AlertController, private authService: AuthService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params.link === "true") {
        this.email = params.email;
        this.isLogin = false;
        this.isLink = true;
      } else {
        this.isLogin = this.router.getCurrentNavigation().extras.state.islogin;
      }
    });
  }

  async submitForm() {
    if (this.isLink) {
      this.linkAccountToEmail();
    } else if (this.isLogin) {
      this.login();
    } else {
      this.createAccount();
    }
  }

  async login() {
    try {
      const user = await signInWithEmailAndPassword(this.authService.auth, this.email, this.password);
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
      const user = await createUserWithEmailAndPassword(this.authService.auth, this.email, this.password);

      let ref = doc(this.authService.firestore, 'users', user.user.uid);
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

  async linkAccountToEmail() {
    this.authService.linkAccountToEmail(this.email, this.password).then((user) => {
      if (user) {
        this.router.navigate([""], {
          replaceUrl: true,
        });
      }
    });

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
      await sendPasswordResetEmail(this.authService.auth, data.values[0]);
      alert("Password Reset Email Sent");
    } catch (error) {
      alert("Something went wrong")
    }

  }

  // Checks the 'users' collection for existing username, returns false if it does not exist
  async checkIfUsernameExists(username : string) {
    const collectionRef = collection(this.authService.firestore, 'users');
    const q = query(collectionRef, where('username', '==', username));
    const docSnaps = await getDocs(q);
    if(docSnaps.empty) return false;
    else return true;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
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

  cancel() {
    if (this.isLink) {
      this.router.navigate([""]);
    } else {
      this.router.navigate([".."]);
    }
  }

}
