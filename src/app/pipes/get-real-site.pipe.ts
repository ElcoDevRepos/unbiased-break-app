import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Pipe({
  name: 'getRealSite'
})
export class GetRealSitePipe implements PipeTransform {

  constructor(private http: HttpClient) {

  }
  transform(value: string, ...args: unknown[]): unknown {
    return null;
  }

}
