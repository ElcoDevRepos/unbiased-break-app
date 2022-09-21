import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'google-adsense',
  templateUrl: './top-banner.component.html',
  styleUrls: ['./top-banner.component.scss'],
})
export class TopBannerComponent implements OnInit {

  constructor() { }

  ngOnInit() {}

  ngAfterViewInit() {
    console.log("HEERE");
    setTimeout(() => {
      try {
        (window['adsbygoogle'] = window['adsbygoogle'] || []).push({});
      } catch (error) {
        console.log("HERE");
        console.log(error);
      }
    }, 2000)
  }

}
