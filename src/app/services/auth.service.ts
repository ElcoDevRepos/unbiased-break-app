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
  UserCredential,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
} from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { getDoc } from '@firebase/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
/* Provide functions for logging in, logging out, and creating accounts
  * with the default Firebase authentication, google, and facebook.
  */
export class AuthService {
  platform: string = Capacitor.getPlatform();

  constructor(
    public auth: Auth,
    public firestore: Firestore,
    public router: Router,
  ) {
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

  async loginFacebook(): Promise<UserCredential> {
    let loginResult: UserCredential | undefined;
    try {
      if (this.platform === 'web') {
        loginResult = await this.loginFacebookWeb();
      } else {
        loginResult = await this.loginFacebookNative();
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

  /* Links the current user to a new provider.
    * @param provider The provider to link the account with.
    * @returns The user object.
    * @throws Error if the auth fails.
    */
  async linkAccount(provider: "fb" | "goog" | "email"): Promise<UserCredential> {
    /* This will be same for web and native */
    if (provider === 'email') {
      this.router.navigate(['/link-email'], { queryParams: { link: true, email: this.auth.currentUser.email } });
    } else if (provider === 'goog' && this.platform === 'web') {
      return await this.linkAccountToGoogleWeb();
    } else if (provider === 'goog' && this.platform !== 'web') {
      return await this.linkAccountToGoogleNative();
    } else if (provider === 'fb' && this.platform === 'web') {
      return await this.linkAccountToFacebookWeb();
    } else if (provider === 'fb' && this.platform !== 'web') {
      //return await this.linkAccountToFacebookNative();
    }

    return undefined;
  }

  /* Links the current user to an email.
    * @param email The email to link the account with.
    * @param password The password to link the account with.
    * @returns The user object or undefined on failure.
    * @throws Nothing.
    */
  async linkAccountToEmail(email: string, password: string): Promise<UserCredential> {
    if (this.auth.currentUser === null) {
      return undefined;
    }
    try {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(this.auth.currentUser, credential);
      return result;
    } catch (error) {
      this.directUserOnFirebaseError(error);
      return undefined;
    }
  }

  /* These could be improved upon, but work for now */
  private directUserOnFirebaseError(error: any) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        alert('Email already in use');
        break;
      case 'auth/invalid-email':
        alert('Invalid email');
        break;
      /* Should change this one to ask user if they want to
        * logout, then do it for them. Can save their data
        * and use it on login.
        */
      case 'auth/requires-recent-login':
        alert('To continue, please logout then log back in');
        break;
    }
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
      const result: UserCredential = await signInWithPopup(this.auth, new GoogleAuthProvider());
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
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  private async loginFacebookNative(): Promise<UserCredential>  {
    throw new Error('Not implemented');
    const result = await FirebaseAuthentication.signInWithFacebook();
    const credential = FacebookAuthProvider.credential(result.credential?.accessToken);
    await signInWithCredential(this.auth, credential);
  }


  private async linkAccountToFacebookWeb(): Promise<UserCredential> {
    const result = linkWithPopup(this.auth.currentUser, new FacebookAuthProvider());
    return result;
  }

  private async linkAccountToGoogleWeb(): Promise<UserCredential> {
    const result = linkWithPopup(this.auth.currentUser, new GoogleAuthProvider());
    return result;
  }

  private async linkAccountToGoogleNative(): Promise<UserCredential> {
    throw new Error('Not implemented');
  }
}
