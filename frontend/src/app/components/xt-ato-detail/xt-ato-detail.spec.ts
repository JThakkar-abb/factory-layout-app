import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XtAtoDetail } from './xt-ato-detail';

describe('XtAtoDetail', () => {
  let component: XtAtoDetail;
  let fixture: ComponentFixture<XtAtoDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XtAtoDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(XtAtoDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
