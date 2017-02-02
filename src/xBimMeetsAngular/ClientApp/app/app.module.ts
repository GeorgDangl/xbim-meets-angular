import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UniversalModule } from 'angular2-universal';
import { AppComponent } from './components/app/app.component'
import { NavMenuComponent } from './components/navmenu/navmenu.component';
import { HomeComponent } from './components/home/home.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { ModelBrowserComponent } from './components/model-browser/model-browser.component';
import { CustomFileComponent } from './components/custom-file/custom-file.component';

@NgModule({
    bootstrap: [ AppComponent ],
    declarations: [
        AppComponent,
        NavMenuComponent,
        HomeComponent,
        ViewerComponent,
        ModelBrowserComponent,
        CustomFileComponent
    ],
    imports: [
        UniversalModule, // Must be first import. This automatically imports BrowserModule, HttpModule, and JsonpModule too.
        RouterModule.forRoot([
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', component: HomeComponent },
            { path: 'viewer', component: ViewerComponent },
            { path: 'model-browser', component: ModelBrowserComponent },
            { path: 'custom-file', component: CustomFileComponent },
            { path: '**', redirectTo: 'home' }
        ])
    ]
})
export class AppModule {
}
