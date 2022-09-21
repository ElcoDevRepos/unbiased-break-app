import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '@angular/fire/auth';
import { Firestore, doc, query, where, orderBy, limit, startAfter, getDocs, updateDoc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-form',
  templateUrl: './form.page.html',
  styleUrls: ['./form.page.scss'],
})
export class FormPage implements OnInit {
  email: string;
  password: string;
  isLogin: boolean;
  constructor(private router: Router, public auth: Auth, private firestore: Firestore) { }

  ngOnInit() {
    this.isLogin = this.router.getCurrentNavigation().extras.state.islogin;
  }

  async login() {
    try {
      const user = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate([""]);
    } catch (error) {
      alert(error);
    }

  }

  async createAccount() {
    try {
      const user = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
      
      let ref = doc(this.firestore, 'users', user.user.uid);
      await setDoc(ref, {
        email: user.user.email,
        filters: [
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([])
        ]
      })
      this.router.navigate([""]);
    } catch (error) {
      alert(error);
    }
  }

}
