import { Injectable } from '@angular/core';
import { GptSummaryService } from './gpt-summary.service';
import { UserService } from './user.service';
import { Firestore, Timestamp, addDoc, collection } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class CommunityFeedService {

  constructor(
    private gptSummaryService: GptSummaryService,
    private userService: UserService,
    private firetore: Firestore
  ) { }

  // Use for regular articles
  async addArticleToCommunityFeed (collectionRef, articleData) {

    // Extract article data
    const { image, siteName, title, id, timestamp, link } = articleData;
    console.log(articleData);

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
        shared_count: 0
      }

      // Add summary to the Community Feed collection
      await addDoc(collection(this.firetore, 'community-feed'), summary);
    });
  }

  // Use for GPT summaries
  async addGPTSummaryToCommunityFeed (summary) {
    // Add info to summary object
    summary.shared_count = 0;
    summary.created_by = this.userService.username;
    summary.timestamp = Timestamp.now();

    // Add summary to the Community Feed collection
    await addDoc(collection(this.firetore, 'community-feed'), summary);
  }
}
