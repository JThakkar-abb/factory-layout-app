import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FactoryLayout } from './factory-layout';

describe('FactoryLayout', () => {
  let component: FactoryLayout;
  let fixture: ComponentFixture<FactoryLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FactoryLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(FactoryLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});