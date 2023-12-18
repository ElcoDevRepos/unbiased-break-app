import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {
  redirectLoggedInTo,
  canActivate,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';
import { LoginPage } from './login.page';
const redirectLoggedInToHome = () => redirectLoggedInTo(['']);
const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);

const routes: Routes = [
  {
    path: '',
    component: LoginPage
  },
  {
    path: 'form',
    loadChildren: () => import('./form/form.module').then( m => m.FormPageModule),
    ...canActivate(redirectLoggedInToHome),
  },
  {
    path: 'link',
    loadChildren: () => import('./form/form.module').then( m => m.FormPageModule),
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginPageRoutingModule {}
