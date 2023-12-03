import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab4Page } from './tab4.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { Tab4PageRoutingModule } from './tab4-routing.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { FirstTimePopUpComponent } from '../components/first-time-pop-up/first-time-pop-up.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    RouterModule.forChild([{ path: '', component: Tab4Page }]),
    Tab4PageRoutingModule,
    FontAwesomeModule,
  ],
  declarations: [Tab4Page, FirstTimePopUpComponent]
})
export class Tab4PageModule {}
