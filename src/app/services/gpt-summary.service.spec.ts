import { TestBed } from '@angular/core/testing';

import { GptSummaryService } from './gpt-summary.service';

describe('GptSummaryService', () => {
  let service: GptSummaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GptSummaryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
