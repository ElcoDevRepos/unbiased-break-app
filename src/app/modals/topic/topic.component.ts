import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, NavParams, PopoverController } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';
import { Firestore, addDoc, collection, updateDoc, doc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { TopiclistComponent } from 'src/app/components/topiclist/topiclist.component';

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss'],
})
export class TopicComponent implements OnInit {
  topics = [] as any;
  isAdding = false;
  newTopic = "";
  currentUser;
  constructor(private navParams: NavParams,private alertController: AlertController, private modalCtrl: ModalController, private firestore: Firestore, private auth: Auth, public popoverController: PopoverController) { }

  ngOnInit() {
    this.currentUser = this.navParams.data.currentUser;
    this.topics = this.navParams.data.topics;
    this.topics.forEach((t) => {
      if (t.checked === undefined) 
      t.checked = true;
    });
    console.log(this.topics);
  }

  async toggleChanged(i, ev) {
    this.topics[i].checked = ev.detail.checked;
    await updateDoc(doc(this.firestore, "users", this.currentUser), {
      topics: this.topics
    });
  }

  async removeTopic(topic) {
    const alert = await this.alertController.create({
      header: 'Are you sure you want to delete this?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {},
        },
        {
          text: 'OK',
          role: 'confirm',
          handler: () => {
            for (let i = 0; i < this.topics.length; i++) {
              if (this.topics[i].id === topic.id) {
                this.topics.splice(i, 1);
                break;
              }
            }

            updateDoc(doc(this.firestore, "users", this.currentUser), {
              topics: this.topics
            });
          },
        },
      ],
    });

    await alert.present();
  }


  async showPopup(e) {
    const popover = await this.popoverController.create({
      component: TopiclistComponent,
      componentProps: {
        query: this.newTopic,
        currentTopics: this.topics
      },
      event: e,
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();

    if (data) {
      let newItem = data.item;
      if (data === 'new') {
        this.addNewTopic();
      } else {
        newItem.checked = true;
        this.topics.push(newItem);
        await updateDoc(doc(this.firestore, "users", this.currentUser), {
          topics: this.topics
        });
        this.newTopic = "";
        this.isAdding = false;      }
      
    }
    
  }

  dismiss() {
    this.modalCtrl.dismiss(this.topics);
  }

  async addNewTopic() {
    let obj = {
      checked: true,
      display: this.newTopic,
      name: this.newTopic,
      id: uuidv4()
    };

    this.topics.push({...obj});
    let topics = [];
    await addDoc(collection(this.firestore, "topics"), obj);
    await updateDoc(doc(this.firestore, "users", this.currentUser), {
      topics: this.topics
    });
    this.isAdding = false;
    this.newTopic = "";
  }

  //Capitilize first letter in every word
  capitalizeWords(str) {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
  
}
