import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams} from '@ionic/angular';
import { Firestore, collectionData, collection, where, query, getDoc, updateDoc, doc } from '@angular/fire/firestore';
import { UserService } from 'src/app/services/user.service';
import _ from 'lodash';

@Component({
  selector: 'app-commentthread',
  templateUrl: './commentthread.component.html',
  styleUrls: ['./commentthread.component.scss'],
})
export class CommentthreadComponent implements OnInit {
  comments = [];
  comment;
  commenttext = '';
  constructor(private navParams: NavParams, private userService: UserService, private firestore: Firestore, public modal: ModalController) { }

  ngOnInit() {
    this.comment = {...this.navParams.data.comment};
    this.comments = this.comment.data.comments ? this.comment.data.comments : [];
  }

  async submitComment() {

    let obj = {
      text: this.commenttext,
      author: this.userService.getLoggedInUser().displayName || this.userService.getLoggedInUser().email,
      photo: this.userService.getLoggedInUser().photoURL,
      uid: this.userService.getLoggedInUser().uid,
      date: new Date().toISOString(),
      id: 'id-'+Math.random().toString(36).slice(2, 18)
    }
    this.commenttext = '';

    this.comments.push(obj);
    let ref = doc(this.firestore, this.navParams.data.articleType, this.navParams.data.docid, "comments", this.comment.id);
    let d = await getDoc(ref);
    if (d.exists()) {
      await updateDoc(ref, {
        comments: this.comments
      });
    }
  }

  onImgError(event) {
    event.target.src = 'https://assets.digitalocean.com/labs/images/community_bg.png';
  }

}
