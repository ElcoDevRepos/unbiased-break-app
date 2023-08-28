import { Component } from '@angular/core';
import { TabsPage } from '../tabs/tabs.page';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss']
})
export class Tab4Page {

  constructor( private tabsPage : TabsPage ) {}

  ionViewWillEnter() {
    this.tabsPage.selectedTab = "tab4";
  }

}
