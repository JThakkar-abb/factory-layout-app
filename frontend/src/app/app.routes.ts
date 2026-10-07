import { Routes } from '@angular/router';

import { FactoryLayout } from './components/factory-layout/factory-layout';
import { WarehouseDetailComponent } from './components/warehouse-detail/warehouse-detail';
import { XtAtoDetailComponent } from './components/xt-ato-detail/xt-ato-detail';
import { MaterialMappingComponent } from './components/material-mapping/material-mapping';

export const routes: Routes = [
  { path: '', component: FactoryLayout },
  { path: 'warehouse-1', component: WarehouseDetailComponent },
  { path: 'xt-ato', component: XtAtoDetailComponent },

  { path: 'mapping', component: MaterialMappingComponent },

  { path: '**', redirectTo: '' }
];