import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NewsArticlePageRoutingModule } from './news-article-routing.module';

import { NewsArticlePage } from './news-article.page';
import { CommentthreadComponent } from 'src/app/modals/commentthread/commentthread.component';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { TopBannerComponent } from 'src/app/components/top-banner/top-banner.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NewsArticlePageRoutingModule,
    PipesModule
  ],
  declarations: [NewsArticlePage, CommentthreadComponent, TopBannerComponent]
})
export class NewsArticlePageModule {}
