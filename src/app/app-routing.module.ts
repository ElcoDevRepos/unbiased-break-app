import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, PreloadAllModules, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';
import {
  redirectLoggedInTo,
  canActivate,
  redirectUnauthorizedTo
} from '@angular/fire/auth-guard';
const redirectLoggedInToHome = () => redirectLoggedInTo(['']);
const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule),
    ...canActivate(redirectLoggedInToHome),
  },
  {
    path: 'news-article/:id/:type',
    loadChildren: () => import('./pages/news-article/news-article.module').then( m => m.NewsArticlePageModule),
  },
  {
    path: 'link-email',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule),
    ...canActivate(redirectUnauthorizedToLogin),
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
