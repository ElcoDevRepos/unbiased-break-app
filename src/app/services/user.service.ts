import { Injectable } from '@angular/core';
import { Firestore, doc, collection, query, where, updateDoc, getDocs, getDoc } from '@angular/fire/firestore';
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

  async getReadArticles() {
    if(!this.auth.currentUser) return;

    let readArticles = [];
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      const readArticlesIDs = d.data().readArticles.slice(0, 50);
      readArticlesIDs.reverse();
      let found = false;

      readArticlesIDs.forEach(async id => {
        // Query the middle-articles collection for documents with a matching ID
        let q = query(collection(this.firestore, "middle-articles"), where("id", "==", id));
        let querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          readArticles.push({
            ...doc.data(),
            type: 'middle-articles'
          });
          found = true;
        });
        
        // Query the left-articles collection for documents with a matching ID
        if(!found){
          q = query(collection(this.firestore, "left-articles"), where("id", "==", id));
          querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            readArticles.push({
              ...doc.data(),
              type: 'left-articles'
            });
            found = true;
          });
        }
        
        if(!found){
          // Query the right-articles collection for documents with a matching ID
          q = query(collection(this.firestore, "right-articles"), where("id", "==", id));
          querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            readArticles.push({
              ...doc.data(),
              type: 'right-articles'
            });
          });
        }
      });            
    });

    return readArticles;
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
