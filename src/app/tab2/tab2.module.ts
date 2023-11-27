import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab2Page } from './tab2.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'

import { Tab2PageRoutingModule } from './tab2-routing.module';
import { OrderByPipe } from '../pipes/order-by.pipe';
import { PipesModule } from '../pipes/pipes.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    Tab2PageRoutingModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [Tab2Page]
})
export class Tab2PageModule {}
