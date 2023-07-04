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
    this.introJS.start();

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
                        'Topics',
                },
                {
                    element: '#introjs-step3',
                    intro:
                        'Add Topic',
                },
            ]
        })
        .start();
  }
}
