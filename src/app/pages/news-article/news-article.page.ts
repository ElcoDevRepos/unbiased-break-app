import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Firestore, collection, where, query, getDocs, doc, addDoc, getDoc, updateDoc } from '@angular/fire/firestore';
import { UserService } from 'src/app/services/user.service';
import { ModalController, Platform } from '@ionic/angular';
import { CommentthreadComponent } from 'src/app/modals/commentthread/commentthread.component';
import { AdMob } from '@capacitor-community/admob';
import { AdmobService } from 'src/app/services/admob.service';
import { HttpClient } from '@angular/common/http';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-news-article',
  templateUrl: './news-article.page.html',
  styleUrls: ['./news-article.page.scss'],
})
export class NewsArticlePage implements OnInit {
  article = {} as any;
  loading = true;
  artticleType;
  articleId;
  comment = '';
  comments = [];
  docid;
  favorited = false;
  playing = false;
  urlsToPlay = [];
  isDesktop;
  constructor(private userService: UserService, public sanitizer: DomSanitizer, private route: ActivatedRoute, private firestore: Firestore,
    private modalCtrl: ModalController, private admobService: AdmobService, private platform: Platform) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');

    //this.article = this.router.getCurrentNavigation().extras.state.article;
    this.route.params.subscribe((params) => this.getNewsArticle(params.id, params.type));
    this.addToRead();
  }

  ionViewWillEnter() {
    this.admobService.articleClicked();
    this.admobService.showBanner();
  }

  ionViewWillLeave() {
    this.admobService.hideBanner();
  }

  async addToRead() {
    let user = await getDoc(doc(this.firestore, 'users', this.userService.getLoggedInUser().uid));
    let readArticles = user.data().readArticles || [];
    
    if (!readArticles.includes(this.articleId)) 
      readArticles.push(this.articleId)

    updateDoc(doc(this.firestore, 'users', this.userService.getLoggedInUser().uid), {
      readArticles
    })
  }

  toggleTextToSpeech() {
    this.playing = !this.playing;
    if (this.playing) {
      
    }
  }

  async getNewsArticle(id, type) {
    this.artticleType = type;
    this.articleId = id;
    this.favorited = await this.userService.isArticleFavorited(id);
    
    const responsesRef = collection(
      this.firestore,
      type
    );
    const q = query(responsesRef, where('id', '==', id));
    let docs = await getDocs(q);
    docs.forEach((d) => {
      this.article = d.data();

      this.docid = d.id;
      let articleUpdate = doc(this.firestore, type, d.id);
      updateDoc(articleUpdate, {
        clicks: this.article.clicks ? ++this.article.clicks : 1
      })
      let content = d.data().content;
      content = content.replaceAll('<p>', '<p style="font-size: 18px">');
      content = content.replaceAll('</p>', '</p><br>');
      content = content.replaceAll('<img', '<img style="max-width: 100%; max-height: 250px" ');
      this.article.content = this.sanitizer.bypassSecurityTrustHtml(content);
      let image = new Image();
      image.src = this.article.image;
      image.onload = () => {
        if (image.width <= 125) {
          this.article.image = 'https://assets.digitalocean.com/labs/images/community_bg.png';
        }
      }
    })
    /*let urls = await this.http.post("https://url-content-extractor.herokuapp.com/speech", {
      text: this.article.textBody
    }).toPromise() as Array<any>;
    this.urlsToPlay = [...urls];*/
    await this.getComments();
    this.loading = false;
  }

  async getComments() {
    const commentRef = collection(this.firestore, this.artticleType + "/" + this.docid + "/comments" );
    let docs = await getDocs(commentRef);
    if (docs.empty) this.comments = [];
    else {
      docs.forEach((d) => {
        this.comments.push({id: d.id, data: d.data()});
        console.log(d.data())
      });
    }
  }

  async submitComment() {
    let obj = {
      text: this.comment,
      author: this.userService.getLoggedInUser().displayName || this.userService.getLoggedInUser().email,
      photo: this.userService.getLoggedInUser().photoURL,
      uid: this.userService.getLoggedInUser().uid,
      date: new Date().toISOString(),
      id: 'id-' + Math.random().toString(36).slice(2, 18),
      comments: []
    }


    let ref = collection(this.firestore, this.artticleType, this.docid, "comments");
    let resp = await addDoc(ref, obj);
    let newCommentid = resp.id;
    let comment = await getDoc(doc(this.firestore, this.artticleType, this.docid, "comments", newCommentid));
    this.comments.push({id: comment.id, data: comment.data()});

    this.comment = '';
  }

  async goToCommentThread(comment) {
    const modal = await this.modalCtrl.create({
      component: CommentthreadComponent,
      componentProps: {
        comment,
        articleType: this.artticleType,
        docid: this.docid,
      }
    });

    this.admobService.hideBanner();

    modal.onDidDismiss().then(() => this.admobService.showBanner())
    await modal.present();
  }


  onImgError(event) {
    event.target.src = 'https://assets.digitalocean.com/labs/images/community_bg.png';
  }

  favoriteArticle(flag = false) {
    if (flag) {
      this.favorited = flag;
    } else {
      this.favorited = !this.favorited;
    }
    this.userService.toggleFavorite(this.favorited, this.article, this.artticleType, this.docid)
  }

  async share() {
    console.log(this.article);
    await Share.share({
      title: this.article.title,
      text: this.article.excerpt,
      url: window.location.href,
      dialogTitle: 'Share with your friends',
    });
  }
}
