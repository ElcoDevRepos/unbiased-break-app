import { Injectable } from '@angular/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
/* Provide functions for logging in, logging out, and creating accounts
  * with the default Firebase authentication, google, and facebook.
  */
export class AuthService {
  platform: string = Capacitor.getPlatform();

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private googleAuthProvider: GoogleAuthProvider,
  ) { }

  /* Login with email and password.
    * @param email The email to login with.
    * @param password The password to login with.
    * @returns The user object.
    * @throws Error if the auth fails.
    */
  async loginDefault(email: string, password: string) {
    const user = await signInWithEmailAndPassword(this.auth, email, password);
    return user;
  }

  async loginGoogle() {
    if (this.platform === 'web') {
      return await this.loginGoogleWeb();
    } else {
      return await this.loginGoogleNative();
    }
  }

  async loginFacebook() {
    if (this.platform === 'web') {
      return await this.loginFacebookWeb();
    } else {
      return await this.loginFacebookNative();
    }
  }

  /* Create a new account with email and password.
    * @param email The email to create the account with.
    * @param password The password to create the account with.
    * @returns The user object.
    * @throws Error if the auth fails.
    */
  async createAccount(email: string, password: string) {

    const user = await createUserWithEmailAndPassword(this.auth, email, password);

    const ref = doc(this.firestore, 'users', user.user.uid);
    await setDoc(ref, {
      email: user.user.email,
      filters: [
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([])
      ]
    });
    return user;
  }

  private async loginGoogleWeb() {
    signInWithRedirect(this.auth, this.googleAuthProvider);
    getRedirectResult(this.auth).then((result) => {
      if (result.user) {
        console.log(result.user);
      }
    }).catch((error) => {
      console.log(error);
    });
  }

  private async loginGoogleNative() {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    await signInWithCredential(this.auth, credential);
  }

  private async loginFacebookWeb() {

  }

  private async loginFacebookNative() {
    const result = await FirebaseAuthentication.signInWithFacebook();
    const credential = FacebookAuthProvider.credential(result.credential?.accessToken);
    await signInWithCredential(this.auth, credential);
  }
}
