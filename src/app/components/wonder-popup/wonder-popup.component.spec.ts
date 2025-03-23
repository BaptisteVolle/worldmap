import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WonderPopupComponent } from './wonder-popup.component';

describe('WonderPopupComponent', () => {
  let component: WonderPopupComponent;
  let fixture: ComponentFixture<WonderPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WonderPopupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WonderPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
