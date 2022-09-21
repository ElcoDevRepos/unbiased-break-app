import { TestBed } from '@angular/core/testing';

import { PlatformCheckGuard } from './platform-check.guard';

describe('PlatformCheckGuard', () => {
  let guard: PlatformCheckGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(PlatformCheckGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
