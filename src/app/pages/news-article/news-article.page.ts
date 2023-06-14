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
import { Auth } from '@angular/fire/auth';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

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

  allRelatedArticles = [];

  constructor(public userService: UserService, public sanitizer: DomSanitizer, private route: ActivatedRoute, private firestore: Firestore,
    private modalCtrl: ModalController, private admobService: AdmobService, private platform: Platform, private auth: Auth, private iab: InAppBrowser) { }

  ngOnInit() {
    this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');
    console.log(this.userService.getLoggedInUser());
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
    if (!this.userService.getLoggedInUser()) return;
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

      this.allRelatedArticles = [];
      if(d.data().related_articles){
        d.data().related_articles.forEach((relatedArticle) => {
          this.loadRelatedArticles(relatedArticle); //Gets the related_articles from articles document and calls loadRelatedArticles
        });
      }
      
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
    if (!this.userService.getLoggedInUser()) return;
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
    if (!this.userService.getLoggedInUser()) return;
    if (flag) {
      this.favorited = flag;
    } else {
      this.favorited = !this.favorited;
    }
    this.userService.toggleFavorite(this.favorited, this.article, this.artticleType, this.docid)
  }

  async share() {
    await Share.share({
      title: this.article.title,
      text: this.article.excerpt,
      url: "https://app.unbiasedbreak.com/news-article/" + this.articleId + "/" + this.artticleType,
      dialogTitle: 'Share with your friends',
    });
  }

  async loadRelatedArticles (relatedArticle) {

    const leftDocRef = await getDoc(doc(this.firestore, 'left-articles', `${relatedArticle}`));
    const middleDocRef = await getDoc(doc(this.firestore, 'middle-articles', `${relatedArticle}`));
    const rightDocRef = await getDoc(doc(this.firestore, 'right-articles', `${relatedArticle}`));
    const trendingDocRef = await getDoc(doc(this.firestore, 'trending-articles', `${relatedArticle}`));

    if(leftDocRef.exists) {
      const data = leftDocRef.data();
      if(data) {
        this.allRelatedArticles.push({
          title: data.title,
          image: data.image,
          id: data.id,
          source: data.siteName,
          link: data.link,
          articleGroup: "left-articles"
        });
      }
    }
      
    if(middleDocRef.exists) {
      const data = middleDocRef.data();
      if(data) {
        this.allRelatedArticles.push({
          title: data.title,
          image: data.image,
          id: data.id,
          source: data.siteName,
          link: data.link,
          articleGroup: "middle-articles"
        });
      }
    }

    if(rightDocRef.exists) {
      const data = rightDocRef.data();
      if(data) {
        this.allRelatedArticles.push({
          title: data.title,
          image: data.image,
          id: data.id,
          source: data.siteName,
          link: data.link,
          articleGroup: "right-articles"
        });
      }
    }

    if(trendingDocRef.exists) {
      const data = trendingDocRef.data();
      if(data) {
        this.allRelatedArticles.push({
          title: data.title,
          image: data.image,
          id: data.id,
          source: data.siteName,
          link: data.link,
          articleGroup: "trending-articles"
        });
      }
    }
  }

  checkIfAnyRelatedArticles () {
    if(this.allRelatedArticles) {
      if(this.allRelatedArticles.length > 0) return true;
      else return false;
    }
  }

  getRelatedArticleImage(image) {
    if(image) return image;
    else return 'https://assets.digitalocean.com/labs/images/community_bg.png';
  }

  relatedArticleClick(article : any) {
    const link = article.link;
    if (link.includes('nytimes.com') || link.includes('wsj.com')) {
      const browser = this.iab.create(link, '_blank');
      browser.show();
    }
  }
}
