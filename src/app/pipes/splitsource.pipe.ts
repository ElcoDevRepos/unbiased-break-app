import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'split'
})
export class SplitsourcePipe implements PipeTransform {

  transform(value: string, ...args: unknown[]): unknown {
    let name = value.split('.')[0];
    name = name.toLocaleUpperCase();
    return name;
  }

}
