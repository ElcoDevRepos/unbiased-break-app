import { TestBed } from '@angular/core/testing';

import { CommunityFeedService } from './community-feed.service';

describe('CommunityFeedService', () => {
  let service: CommunityFeedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommunityFeedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
