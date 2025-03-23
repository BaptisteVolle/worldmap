import { TestBed } from '@angular/core/testing';

import { WonderService } from './wonder.service';

describe('WonderService', () => {
  let service: WonderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WonderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
