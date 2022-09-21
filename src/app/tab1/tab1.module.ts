import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { Tab1PageRoutingModule } from './tab1-routing.module';
import { ExpandableComponent } from '../components/expandable/expandable.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { OrderByPipe } from '../pipes/order-by.pipe';
import { PipesModule } from '../pipes/pipes.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    Tab1PageRoutingModule,
    FontAwesomeModule,
    PipesModule
  ],
  declarations: [Tab1Page]
})
export class Tab1PageModule {}
