import { Component, OnInit } from '@angular/core';
import { TabsPage } from '../tabs/tabs.page';
import { Firestore, collection, query, where, orderBy, limit, startAfter, getDocs, updateDoc, doc, getDoc, QuerySnapshot, endBefore, addDoc, Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss']
})
export class Tab4Page implements OnInit{

  gptSummaries;

  constructor( private tabsPage : TabsPage, private firestore : Firestore ) {}

  async ngOnInit() {
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
}
