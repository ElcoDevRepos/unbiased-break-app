import { Injectable } from '@angular/core';
import * as introJs from 'intro.js/intro.js';

@Injectable({
  providedIn: 'root',
})
export class IntrojsService {
  introJS = null;

  constructor() {}

  featureOne() {
    this.introJS = introJs();

    this.introJS
      .setOptions({
        steps: [
          {
            intro:
              'Welcome to Unbiased Break, the news app that empowers you with a diverse range of perspectives on the topics you care about. Discover a deeper understanding of the news through cross-referencing multiple articles from various sources.',
          },
          {
            element: '#introjs-step2',
            intro: 'Click on a topic to toggle it on/off',
            position: 'right',
          },
          {
            element: '#introjs-step3',
            intro: 'Click on "Edit Topics" to add/remove topics',
          },
          {
            element: '#open-modal',
            intro: 'Click on "Filters" to edit your news sources',
          },
          {
            element: '#introjs-step5',
            intro: 'Click on an article to open it',
          },
          {
            element: '#tab-button-tab2',
            intro:
              'Click on the "Trending" tab to see trending articles and explore article categories',
          },
          {
            element: '#tab-button-tab3',
            intro:
              'Click on the "Profile" tab to see saved bookmarks and read articles',
          },
        ],
      })
      .start();
  }

  topicsFeature() {
    this.introJS = introJs();

    this.introJS
      .setOptions({
        steps: [
          {
            intro:
              'These are your topics, they determine the types of articles in your feed.',
          },
          {
            element: '#introjs-topics2',
            intro:
              'Add a new topic by clicking here. You can add a existing topic or request a new one (new topics can take up to 24h to populate).',
          },
          {
            element: '#introjs-topics3',
            intro: 'Try to toggle the topic Off',
          },
        ],
      })
      .start();
  }

  topicsDeleteFeature() {
    this.introJS = introJs();

    this.introJS
      .setOptions({
        steps: [
          {
            element: '#introjs-topics4',
            intro: 'This button deletes the topic',
          },
        ],
      })
      .start();
  }

  filtersFeature() {
    this.introJS = introJs();

    this.introJS
      .setOptions({
        steps: [
          {
            element: '#introjs-filters2',
            intro: 'This is where you can request new news sources.',
          },
        ],
      })
      .start();
  }

  profileFeature() {
    this.introJS = introJs();

    this.introJS
      .setOptions({
        steps: [
          {
            element: '#open-bookmark-modal',
            intro: 'This is where you find your saved bookmarks.',
          },
          {
            element: '#open-read-articles-modal',
            intro: 'This is where you find all of your read articles.',
          },
        ],
      })
      .start();
  }

  articleFeature() {
    this.introJS = introJs();

    this.introJS
      .setOptions({
        steps: [
          {
            element: '#introjs-article1',
            intro: 'Use these buttons to share and bookmark the open article.',
          },
        ],
      })
      .start();
  }
}
