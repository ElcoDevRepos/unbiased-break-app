import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

@Injectable({
  providedIn: 'root'
})
export class GptSummaryService {
  private functions = getFunctions();
  private summarizeArticleCall = httpsCallable(this.functions, 'summarizeArticle');


  constructor() {}

  async summarizeArticle(collection: string, articleId: string, user?: any) {
    /* The backend function will check if the user is a Pro user.
      * do it here just to save function calls if possible
      */
    if (user && !user.isPro) {
      throw new Error('This feature is only available for Pro users.');
    }

    const summary = await this.getSummaryLocal(collection, articleId);
    if (summary) {
      return summary;
    }

    let response = null;
    try {
      response = await this.summarizeArticleCall({collection, article: articleId});
    } catch (error) {}
    if (response && response.data.summary) {
      this.saveSummaryLocal(collection, articleId, response.data.summary);
    }
    return response ? response.data.summary : null;
  }

  async saveSummaryLocal(collection: string, articleId: string, summary: string) {
    if ((await this.getSummaryLocal(collection, articleId)) != null) {
      return;
    }
    localStorage.setItem(`${collection}-${articleId}`, summary);
  }

  async getSummaryLocal(collection: string, articleId: string) {
    return localStorage.getItem(`${collection}-${articleId}`);
  }

}
