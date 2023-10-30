import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

@Injectable({
  providedIn: 'root',
})
export class GptSummaryService {
  private functions = getFunctions();
  private summarizeArticleCall = httpsCallable(
    this.functions,
    'summarizeArticle'
  );

  constructor() {}

  async summarizeArticle(collection: string, articleId: string, user?: any) {
    const summary = await this.getSummaryLocal(collection, articleId);
    if (summary) {
      return summary;
    }

    let response = null;
    try {
      response = await this.summarizeArticleCall({
        collection,
        article: articleId,
        user: user,
      });
    } catch (error) {}
    if (response && response.data.summary) {
      this.saveSummaryLocal(collection, articleId, response.data.summary);
    }
    return response ? response.data.summary : null;
  }

  async saveSummaryLocal(
    collection: string,
    articleId: string,
    summary: string
  ) {
    if ((await this.getSummaryLocal(collection, articleId)) != null) {
      return;
    }
    localStorage.setItem(`${collection}-${articleId}`, summary);
  }

  async getSummaryLocal(collection: string, articleId: string) {
    return localStorage.getItem(`${collection}-${articleId}`);
  }
}
