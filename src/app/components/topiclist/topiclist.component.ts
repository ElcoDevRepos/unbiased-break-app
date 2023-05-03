import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { Firestore, getDocs, collection } from '@angular/fire/firestore';
import Fuse from 'fuse.js'

@Component({
  selector: 'app-topiclist',
  templateUrl: './topiclist.component.html',
  styleUrls: ['./topiclist.component.scss'],
})
export class TopiclistComponent implements OnInit {
  results = [];
  constructor(private navParams: NavParams, private firestore: Firestore, private popoverCtrl: PopoverController) { }

  async ngOnInit() {
    let query = this.navParams.data.query;
    let currentTopics = this.navParams.data.currentTopics;
    let topicsSnap = await getDocs(collection(this.firestore, "topics"));
    let topics = [];
    topicsSnap.forEach((t) => {
      topics.push(t.data());
    })


    const options = {
      includeScore: true,
      keys: ['name']
    }
    
    const fuse = new Fuse(topics, options)
    
    const fuseResults = fuse.search(query);
    const filteredResults = fuseResults.filter(r => !currentTopics.some(t => t.name === r.item.name));
    const limitedResults = filteredResults.slice(0, 8); // Extract the first 5 results
    this.results = limitedResults;
  }

  addToList(item) {
    this.popoverCtrl.dismiss(item);
  }

}
