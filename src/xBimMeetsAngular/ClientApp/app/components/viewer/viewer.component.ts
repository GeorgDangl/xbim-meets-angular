import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Http } from '@angular/http';
import { xViewer } from 'xbim-webui';


@Component({
    templateUrl: './viewer.component.html'
})
export class ViewerComponent implements AfterViewInit{

    constructor(private http: Http) { }

    private viewer: xViewer;

    private loadingFile: boolean = false;

    ngAfterViewInit() {
        this.viewer = new xViewer('viewer');
        this.viewer.start();
        this.loadingFile = true;
        this.viewer.on('loaded',
            () => {
                this.loadingFile = false;
            });
        this.viewer.load('/models/SampleHouse.wexbim', 'model');
    }
}
