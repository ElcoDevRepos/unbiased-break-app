import { Injectable } from '@angular/core';
import * as introJs from 'intro.js/intro.js';

@Injectable({
  providedIn: 'root'
})
export class IntrojsService {

  introJS = null;

  constructor() { }

  featureOne() {
    this.introJS = introJs();

    this.introJS
        .setOptions({
            steps: [
                {
                    intro:
                        'Introduction: (expand on this later)',
                },
                {
                  element: '#introjs-step2',
                  intro:
                      'Click on a topic to toggle it on/off',
                  position: 'right',
                },
                {
                    element: '#introjs-step3',
                    intro:
                        'Click on "Edit Topics" to add/remove topics',
                },
                {
                  element: '#introjs-step4',
                  intro:
                      'Click on "Filters" to edit your news sources',
                },
                {
                  element: '#introjs-step5',
                  intro:
                      'Click on an article to open it',
                },
                {
                  element: '#tab-button-tab3',
                  intro:
                      'Click on "My Profile" to see saved bookmarks and read articles',
                },
            ]
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
                        'Explanation on how topics works',
                },
                {
                    element: '#introjs-topics2',
                    intro:
                        'Add a new topic by clicking here',
                },
                {
                  element: '#introjs-topics3',
                  intro:
                      'Try to toggle the topic Off',
              },
            ]
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
                  intro:
                      'This button removes the topic',
              },
            ]
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
                  intro:
                      'This is where you can request new news sources',
                },
            ]
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
                  intro:
                      'This is where you find your saved bookmarks.',
                },
                {
                  element: '#open-read-articles-modal',
                  intro:
                      'This is where you find all of your read articles.',
                },
            ]
        })
        .start();
  }
}
