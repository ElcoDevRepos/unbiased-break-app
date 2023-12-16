import { Injectable } from '@angular/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  getRedirectResult,
  UserCredential,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { getDoc } from '@firebase/firestore';

@Injectable({
  providedIn: 'root'
})
/* Provide functions for logging in, logging out, and creating accounts
  * with the default Firebase authentication, google, and facebook.
  */
export class AuthService {
  platform: string = Capacitor.getPlatform();

  constructor(
    private _auth: Auth,
    private _firestore: Firestore,
  ) {
  }

  public get auth() {
    return this._auth;
  }

  public get firestore() {
    return this._firestore;
  }

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
    let loginResult: UserCredential | undefined;
    try {
      if (this.platform === 'web') {
        loginResult =  await this.loginGoogleWeb();
      } else {
        loginResult = await this.loginGoogleNative();
      }
    } catch (error) {
      console.log(error.message);
      return undefined;
    }

    if (loginResult) {
      /* This function checks if user exists in the database.
       * It does not override the user if it already exists.
       */
      await this.createDBAccountDefault(loginResult);
    }

    return loginResult;
  }

  async loginFacebook() {
    let loginResult: UserCredential | undefined;
    if (this.platform === 'web') {
      loginResult = await this.loginFacebookWeb();
    } else {
      loginResult = await this.loginFacebookNative();
    }
  }

  /* Create a new account with email and password.
    * @param email The email to create the account with.
    * @param password The password to create the account with.
    * @returns The user object.
    * @throws Error if the auth fails.
    */
  async createAccount(email: string, password: string): Promise<UserCredential> {
    const user = await this.createAuthAccountDefault(email, password);

    await this.createDBAccountDefault(user);
    return user;
  }

  private async createAuthAccountDefault(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  private async createDBAccountDefault(user: UserCredential) {
    const ref = doc(this.firestore, 'users', user.user.uid);
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) { return; }
    /* Create a new user document in the database */
    await setDoc(ref, {
      email: user.user.email,
      filters: [
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([])
      ]
    });
  }

  private async loginGoogleWeb(): Promise<UserCredential> {
    try {
      /* Sign in with redirect is probably better than signInWithPopup
       * but it will not work on browsers with third party cookies disabled.
       */
      const result: UserCredential = await signInWithPopup(this._auth, new GoogleAuthProvider());
      return result;
    } catch (error) {
      return undefined;
    }
  }

  private async loginGoogleNative(): Promise<UserCredential> {
    try {
      /* Login with native SDK */
      const result = await FirebaseAuthentication.signInWithGoogle();
      const credential = GoogleAuthProvider.credential(result.credential?.idToken);
      /* Login with web SDK */
      const user: UserCredential = await signInWithCredential(this.auth, credential);
      return user;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  private async loginFacebookWeb(): Promise<UserCredential>  {
    throw new Error('Not implemented');
  }

  private async loginFacebookNative(): Promise<UserCredential>  {
    throw new Error('Not implemented');
    const result = await FirebaseAuthentication.signInWithFacebook();
    const credential = FacebookAuthProvider.credential(result.credential?.accessToken);
    await signInWithCredential(this.auth, credential);
  }
}
