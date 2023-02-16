import { Injectable } from '@angular/core';
import { Firestore, doc, collection, query, where, updateDoc, getDocs } from '@angular/fire/firestore';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from '@angular/fire/auth';
import _ from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  getLoggedInUser() {
    return this.auth.currentUser;
  }

  async isArticleFavorited(id) {
    if (this.auth.currentUser) {
      let ref = collection(this.firestore, 'users');
      const q = query(ref, where('email', '==', this.auth.currentUser.email));
      let docs = await getDocs(q);
      let favorites;
      docs.forEach((d) => {
        favorites = d.data().favorites;
      })
      if (!favorites) {
        favorites = [];
      }
  
      // loop through favorites here to find the right id
      let found = _.find(favorites, (f) => {
        return f.id === id;
      })
  
      if (found && found.id === id) return true;
  
      return false;
  
    } else return false;
    
  }

  async toggleFavorite(favorited, article, type, articleDocId) {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    let favorites = [];
    let docid;
    docs.forEach((d) => {
      docid = d.id;
      favorites = d.data().favorites;
    });
    if (!favorites) {
      favorites = [];
    }

    if (favorited)
      favorites.push({id: article.id, title: article.title, type, siteName: article.siteName})
    else {
      let found = _.findIndex(favorites, (f) => {
        return f.id === article.idid;
      })

      favorites.splice(found, 1)
    }
    let articleUpdate = doc(this.firestore, type, articleDocId);
    await updateDoc(articleUpdate, {
      hearts: favorited ? ++article.hearts : --article.hearts
    })
    let updateref = doc(this.firestore, 'users', docid);
    await updateDoc(updateref, {
      favorites
    });
  }
  
  async getFavorites() {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    let f = [];
    docs.forEach((d) => {
      if (d.data().favorites) f = d.data().favorites;
    })

    return f;
  }

  async setDeviceToken(token) {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      updateDoc(doc(this.firestore, 'users', d.id), {token})
    })
  }

  async setLastSeen() {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      updateDoc(doc(this.firestore, 'users', d.id), {lastSeen: new Date()})
    })
  }
}
