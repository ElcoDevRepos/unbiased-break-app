import { Injectable } from '@angular/core';
import { GptSummaryService } from './gpt-summary.service';
import { UserService } from './user.service';
import { Firestore, Timestamp, addDoc, collection, doc, getDocs, query, updateDoc, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class CommunityFeedService {

  public currentlyAddingArticle : boolean = false; // Prevents calling function multiple times

  constructor(
    private gptSummaryService: GptSummaryService,
    private userService: UserService,
    private firetore: Firestore
  ) { }

  // Use for regular articles
  async addArticleToCommunityFeed (collectionRef, articleData) {
    if(this.currentlyAddingArticle) return;
    this.currentlyAddingArticle = true;

    // Extract article data
    const { image, siteName, title, id, link } = articleData;
    
    // Check if articles is already in community feed page
    const createNewDoc = await this.checkIfArticleExistInCommunityFeed(id);

    if(createNewDoc) {
      // Since this is called from a regular article being added to the Community Feed
      // we first need to summarize it by calling the GPT service
      await this.gptSummaryService.summarizeArticle(collectionRef, id, this.userService.getLoggedInUser().uid).then(async (response) => {
        // Create summary object
        const summary = {
          id: id,
          image: image,
          link: link,
          source: siteName,
          summary: response,
          timestamp: Timestamp.now(),
          title: title,
          created_by: this.userService.username,
          share_count: 1,
          collection: collectionRef
        }

        // Add summary to the Community Feed collection
        await addDoc(collection(this.firetore, 'community-feed'), summary);
        this.currentlyAddingArticle = false;
        return true;
      });
    }
    else console.log('Upvoted community feed article');
    this.currentlyAddingArticle = false;
    return false;
  }

  // Use for GPT summaries
  async addGPTSummaryToCommunityFeed (summary) {
    if(this.currentlyAddingArticle) return;
    this.currentlyAddingArticle = true;

    // Add info to summary object
    summary.share_count = 1;
    summary.created_by = this.userService.username;
    summary.timestamp = Timestamp.now();
    summary.collection = 'trending-articles';

    // Check if articles is already in community feed page
    const createNewDoc = await this.checkIfArticleExistInCommunityFeed(summary.id);

    if(createNewDoc) {
      // Add summary to the Community Feed collection
      await addDoc(collection(this.firetore, 'community-feed'), summary);
      this.currentlyAddingArticle = false;
      return true;
    }
    else console.log('Upvoted community feed article');
    this.currentlyAddingArticle = false;
    return false;
  }

  // Returns true if article does not exist in community feed collection
  async checkIfArticleExistInCommunityFeed(articleID) {
    const q = query(collection(this.firetore, "community-feed"), where("id", "==", articleID));
    const querySnapshot = await getDocs(q);
    if(querySnapshot.empty) return true;

    // Since the doc already exists we are just going to "upvote" it
    else {
      querySnapshot.forEach(async (d) => {
        const addShareCount = d.data()['share_count']+1;
        await updateDoc(doc(this.firetore, 'community-feed', d.id), {
          share_count: addShareCount
        })
      });
      return false;
    }
  }
}
