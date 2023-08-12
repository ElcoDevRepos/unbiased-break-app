import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  isDesktop: boolean;
  public selectedTab : string = "";
  constructor(private router: Router, private platform: Platform, private route: ActivatedRoute) {}

  ngOnInit() {
    //this.isDesktop = this.platform.is('desktop') && !this.platform.is('android') && !this.platform.is('ios');
    this.isDesktop = false;
  }

  onTabButtonClick(tabName: string) {
    this.selectedTab = tabName;
  }
}
