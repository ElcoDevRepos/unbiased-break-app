import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'activeTopic'
})
export class ActiveTopicPipe implements PipeTransform {
  getFilteredArticles(articles, args) {
    let leftFilters = args[1];
    let middleFilters = args[2];
    let rightFilters = args[3];

    let allowedArticles = [];
    for (let i = 0; i < articles.length; i++) {
      for (let j = 0; j < leftFilters.length; j++) {
        
        if (articles[i].link.includes(leftFilters[j].label) && leftFilters[j].on) {
          allowedArticles.push(articles[i]);
          break;
        }
      }
      for (let j = 0; j < middleFilters.length; j++) {
        if (articles[i].link.includes(middleFilters[j].label) && middleFilters[j].on) {
          allowedArticles.push(articles[i]);
          break;
        }
      }
      for (let j = 0; j < rightFilters.length; j++) {
        if (articles[i].link.includes(rightFilters[j].label) && rightFilters[j].on) {
          allowedArticles.push(articles[i]);
          break;
        }
      }
    }
    console.log(allowedArticles.length);
    return allowedArticles;
  }
  
  transform(value: any, ...args: any[]): any[] {
    let onTopics = [];
    for (let i = 0; i < args[0].length; i++) {
      if (args[0][i].on) onTopics.push(args[0][i].id);
    }
    console.log(onTopics);
    if (onTopics.length === 0) {
      let a = this.getFilteredArticles(value, args);
      return a;
    } else {
      let allowedArticles = [];
      for (let i = 0; i < value.length; i++) {
        if (onTopics.includes(value[i].topic)) allowedArticles.push(value[i]);
      }
      return this.getFilteredArticles(allowedArticles, args);
    }
    return null;
  }

}
