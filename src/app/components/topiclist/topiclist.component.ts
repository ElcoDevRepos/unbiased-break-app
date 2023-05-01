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
    
    const result = fuse.search(query).filter(r => !currentTopics.some(t => t.name === r.item.name)); //Ensures that user can not add a topic that is already added
    this.results = result;
  }

  addToList(item) {
    this.popoverCtrl.dismiss(item);
  }

}
