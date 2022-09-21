import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { OrderByPipe } from './order-by.pipe';
import { ActiveTopicPipe } from './active-topic.pipe';
import { SplitsourcePipe } from './splitsource.pipe';
import { GetRealSitePipe } from './get-real-site.pipe';


/**
 * Shared Messenger Module
 */
@NgModule({
  declarations: [OrderByPipe, ActiveTopicPipe, SplitsourcePipe, GetRealSitePipe],
  exports: [OrderByPipe, ActiveTopicPipe, SplitsourcePipe, GetRealSitePipe],
  imports: [CommonModule],
})
export class PipesModule { }