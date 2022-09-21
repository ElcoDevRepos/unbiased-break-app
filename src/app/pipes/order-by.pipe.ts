import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy'
})
export class OrderByPipe implements PipeTransform {

  transform(value: Array<any>, ...args: any[]): any {
    function custom_sort(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (value && value.length > 0) {
      value.sort(custom_sort);
      return value;
    } else return null;

  }

}
