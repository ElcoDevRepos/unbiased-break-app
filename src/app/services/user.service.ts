import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  collection,
  query,
  where,
  updateDoc,
  getDocs,
  getDoc,
} from '@angular/fire/firestore';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import _ from 'lodash-es';
import { AdmobService } from './admob.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  isPro: boolean = false;
  username: string = '';
  constructor(private firestore: Firestore, private auth: Auth, private admob : AdmobService) {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        let ref = collection(this.firestore, 'users');
        const q = query(ref, where('email', '==', user.email));
        getDocs(q).then((docs) => {
          docs.forEach((d) => {
            this.username = d.data()['username'] || '';
            this.isPro = d.data()['isPro'] || false;
            if(this.isPro) {
              console.log('isPro');
              admob.isPro = true;
              admob.hideBanner();
            }
          });
        });
      }
    });
  }

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
      });
      if (!favorites) {
        favorites = [];
      }

      // loop through favorites here to find the right id
      let found = _.find(favorites, (f) => {
        return f.id === id;
      });

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
      favorites.push({
        id: article.id,
        title: article.title,
        type,
        siteName: article.siteName,
      });
    else {
      let found = _.findIndex(favorites, (f) => {
        return f.id === article.id;
      });

      favorites.splice(found, 1);
    }
    let articleUpdate = doc(this.firestore, type, articleDocId);
    await updateDoc(articleUpdate, {
      hearts: favorited ? ++article.hearts : --article.hearts,
    });
    let updateref = doc(this.firestore, 'users', docid);
    await updateDoc(updateref, {
      favorites,
    });
  }

  async toggleFavoriteSummary(summary) {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);

    let favorites = [];
    let docid;
    docs.forEach((d) => {
      docid = d.id;
      favorites = d.data().favoriteSummaries || [];
    });

    if (summary.favorited) {
      favorites.push(summary);
    } else {
      let found = _.findIndex(favorites, (f) => {
        return f.id === summary.id;
      });

      favorites.splice(found, 1);
    }
    let updateref = doc(this.firestore, 'users', docid);
    await updateDoc(updateref, {
      favoriteSummaries: favorites,
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
    });

    return f;
  }

  async getFavoriteSummaries() {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    let f = [];
    docs.forEach((d) => {
      if (d.data().favoriteSummaries) f = d.data().favoriteSummaries;
    });

    return f;
  }

  async getReadArticles() {
    if (!this.auth.currentUser) return;

    let readArticles = [];
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    let readArticlesIDs = [];

    docs.forEach(async (d) => {
      //At most fetch 50 read articles to limit load times
      if (d.data().readArticles.length > 50) {
        readArticlesIDs = d
          .data()
          .readArticles.slice(
            d.data().readArticles.length - 50,
            d.data().readArticles.length
          );
      } else readArticlesIDs = d.data().readArticles;
      readArticlesIDs = readArticlesIDs.reverse();

      await Promise.all(
        readArticlesIDs.map(async (id) => {
          let found = false;

          const collections = [
            { name: 'middle-articles', type: 'middle-articles' },
            { name: 'left-articles', type: 'left-articles' },
            { name: 'right-articles', type: 'right-articles' },
            { name: 'trending-articles', type: 'trending-articles' },
            { name: 'category-articles', type: 'category-articles' },
          ];

          // Create a promises array to collect promises for each collection query
          const promises = [];

          for (const collectionInfo of collections) {
            const q = query(
              collection(this.firestore, collectionInfo.name),
              where('id', '==', id)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              querySnapshot.forEach((doc) => {
                promises.push(
                  Promise.resolve({
                    ...doc.data(),
                    type: collectionInfo.type,
                  })
                );
                found = true;
              });
            }

            if (found) {
              break;
            }
          }
          return promises;
        })
      ).then((results) => {
        // Flatten the results and add articles to readArticles in the correct order
        const flattenedResults = [].concat(...results);
        let flatArticles = [];
        flatArticles.push(...flattenedResults);
        for (const zoneAwarePromise of flatArticles) {
          readArticles.push(zoneAwarePromise.__zone_symbol__value);
        }
      });
    });

    return readArticles;
  }

  //Use this to get the total amount of read articles without loading all data to limit load times
  async getReadArticlesAmount() {
    if (!this.auth.currentUser) return;

    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    let amt = 0;
    docs.forEach((d) => {
      amt = d.data().readArticles.length;
    });

    return amt;
  }

  async setDeviceToken(token) {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      updateDoc(doc(this.firestore, 'users', d.id), { token });
    });
  }

  async setLastSeen() {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      updateDoc(doc(this.firestore, 'users', d.id), { lastSeen: new Date() });
    });
  }
  async setIsPro(flag) {
    if (!this.auth.currentUser) return;
    let ref = collection(this.firestore, 'users');
    const q = query(ref, where('email', '==', this.auth.currentUser.email));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      updateDoc(doc(this.firestore, 'users', d.id), { isPro: flag });
    });
  }
}
