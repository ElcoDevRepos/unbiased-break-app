import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import {
  AlertController,
  ModalController,
  NavParams,
  PopoverController,
} from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';
import {
  Firestore,
  addDoc,
  collection,
  updateDoc,
  doc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { TopiclistComponent } from 'src/app/components/topiclist/topiclist.component';
import { IntrojsService } from 'src/app/introjs.service';

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss'],
})
export class TopicComponent implements OnInit, AfterViewInit {
  topics = [] as any;
  isAdding = false;
  newTopic = '';
  currentUser;
  constructor(
    private navParams: NavParams,
    private alertController: AlertController,
    private modalCtrl: ModalController,
    private firestore: Firestore,
    private auth: Auth,
    public popoverController: PopoverController,
    private introService: IntrojsService
  ) {}

  ngOnInit() {
    this.currentUser = this.navParams.data.currentUser;
    this.topics = this.navParams.data.topics;
    this.createFakeHistory();
    this.topics.forEach((t) => {
      if (t.checked === undefined) t.checked = true;
    });
    console.log(this.topics);
  }

  ngAfterViewInit(): void {
    //Check if intro.js is going to be shown
    const showIntroJS = localStorage.getItem('showTopicsIntro');
    if (showIntroJS != 'false') {
      //localStorage.setItem('showTopicsIntro', 'false');
      //this.introService.topicsFeature();
    }
  }

  //These two functions are used to manipulate the navigation so the back button works to close the modal
  createFakeHistory() {
    const modalState = {
      modal: true,
      desc: 'fake state for our modal',
    };
    history.pushState(modalState, null);
  }
  ngOnDestroy() {
    if (window.history.state.modal) {
      history.back();
    }
  }

  async toggleChanged(i, ev) {
    this.topics[i].checked = ev.detail.checked;
    await updateDoc(doc(this.firestore, 'users', this.currentUser), {
      topics: this.topics,
    });

    if (i === 0 && this.topics[i].checked == false) {
      //Check if intro.js is going to be shown
      const showIntroJS = localStorage.getItem('showTopicsDeleteIntro');
      if (showIntroJS != 'false') {
        //localStorage.setItem('showTopicsDeleteIntro', 'false');
        //this.introService.topicsDeleteFeature();
      }
    }
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

            updateDoc(doc(this.firestore, 'users', this.currentUser), {
              topics: this.topics,
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async showPopup(e) {
    if (this.newTopic != '') {
      const popover = await this.popoverController.create({
        component: TopiclistComponent,
        componentProps: {
          query: this.newTopic,
          currentTopics: this.topics,
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
          await updateDoc(doc(this.firestore, 'users', this.currentUser), {
            topics: this.topics,
          });
          this.newTopic = '';
          this.isAdding = false;
        }
      }
    }
  }

  @HostListener('window:popstate', ['$event'])
  dismiss() {
    this.modalCtrl.dismiss(this.topics);
    this.popoverController.dismiss();
  }

  async addNewTopic() {
    let obj = {
      checked: true,
      display: this.newTopic,
      name: this.newTopic,
      id: uuidv4(),
    };

    this.topics.push({ ...obj });
    let topics = [];
    await addDoc(collection(this.firestore, 'topics'), obj);
    await updateDoc(doc(this.firestore, 'users', this.currentUser), {
      topics: this.topics,
    });
    this.isAdding = false;
    this.newTopic = '';
  }
}
