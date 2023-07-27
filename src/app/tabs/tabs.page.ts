import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  isDesktop: boolean;
  constructor(private router: Router, private platform: Platform) {}

  ngOnInit() {
    //this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');
    this.isDesktop = true;
  }

}
