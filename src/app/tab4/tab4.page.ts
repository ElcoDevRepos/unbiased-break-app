import { Component, OnInit } from '@angular/core';
import { TabsPage } from '../tabs/tabs.page';
import { Firestore, collection, query, where, orderBy, limit, startAfter, getDocs, updateDoc, doc, getDoc, QuerySnapshot, endBefore, addDoc, Timestamp } from '@angular/fire/firestore';
import * as _ from 'lodash';
import { UserService } from '../services/user.service';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss']
})
export class Tab4Page implements OnInit{

  gptSummaries;
  sourceImages = [];

  constructor( private tabsPage : TabsPage, private firestore : Firestore, private userService : UserService, private iab : InAppBrowser ) {}

  async ngOnInit() {
    this.getSourceImages();
    try {
      let sum = await this.getSummaries();
      this.gptSummaries = sum[0];
      console.log(this.gptSummaries); // This will print the summaries to the browser console
    } catch (error) {
      console.error("Failed to fetch summaries:", error);
    }
  }

  ionViewWillEnter() {
    this.tabsPage.selectedTab = "tab4";
  }

  //Fetch the gpt summaries from firestore
  getSummaries(): Promise<any[]> {
    return new Promise((resolve, reject) => {

      const ref = collection(this.firestore, 'gpt-summaries');
      const q = query(ref, orderBy('timestamp', 'desc'), limit(1));

      getDocs(q)
        .then(docSnaps => {
          resolve(docSnaps.docs.map(doc => doc.data().summaries));
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  //This will return the referenced image link in the "img" container inside item
  //If there is no value, this will return a placeholder image
  getImage(item) {
    if (item.image) return item.image;
  }

  //This will return the source img/logo based on the item
  //i.e a item from CNN will return the CNN img/logo
  getSourceImage (item) {

    let newUrl = new URL(item.link);
    let url = "";
    if (newUrl.host.includes("www.")) {
      url = newUrl.host.split("www.")[1];
    } else {
      url = newUrl.host;
    }
    if (item.source) {
      let site = item.source.replaceAll(" ", "").toLocaleLowerCase();

      //Fix for the washington post image
      if(site === "thewashingtonpost") site = "washingtonpost";
      //Fix for BBC image
      if(site === "bbcnews") site = "bbc";
      //Fix for NYP image
      if(site === "newyorkpost") site = "nyp";

      let index = _.findIndex(this.sourceImages, (s) => s.url.includes(site));
      if (index != -1) {
        return this.sourceImages[index].image;
      }
    }

    return newUrl.origin + "/favicon.ico";
  }

  async getSourceImages() {
    let collectionRef = collection(this.firestore, "left-sources");
    let leftDocs = await getDocs(collectionRef);
    leftDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    })
    collectionRef = collection(this.firestore, "middle-sources");
    let midDocs = await getDocs(collectionRef);
    midDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    })
    collectionRef = collection(this.firestore, "right-sources");
    let rightDocs = await getDocs(collectionRef);
    rightDocs.forEach((d) => {
      if (d.data().image) {
        this.sourceImages.push(d.data());
      }
    })
  }


  onArticleClick(item: any) {
    const link = item.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      const browser = this.iab.create(link, '_blank');
      browser.show();
    }
  }
}
