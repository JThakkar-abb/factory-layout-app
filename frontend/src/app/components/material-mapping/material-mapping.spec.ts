import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MaterialMappingComponent } from './material-mapping';

describe('MaterialMappingComponent', () => {
  let component: MaterialMappingComponent;
  let fixture: ComponentFixture<MaterialMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialMappingComponent], // standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialMappingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});