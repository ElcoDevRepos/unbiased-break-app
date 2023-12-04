import { Component, OnInit, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-first-time-pop-up',
  templateUrl: './first-time-pop-up.component.html',
  styleUrls: ['./first-time-pop-up.component.scss'],
})
export class FirstTimePopUpComponent implements OnInit {
  @Output() buttonClicked = new EventEmitter<void>();

  constructor() { }

  ngOnInit() {}

  closePopUp() {
    this.buttonClicked.emit();
  }
}
