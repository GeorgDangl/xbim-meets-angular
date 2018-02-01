import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Http } from '@angular/http';
import { Viewer, State } from 'xbim-viewer';

@Component({
    templateUrl: './viewer.component.html'
})
export class ViewerComponent implements AfterViewInit {

    constructor(private http: Http) {}

    private viewer: Viewer;

    private loadingFile: boolean = true;

    ngAfterViewInit() {
        this.viewer = new Viewer('viewer');
        this.viewer.start();
        this.viewer.on('loaded',
            () => {
                this.loadingFile = false;
            });
        this.viewer.load('/models/SampleHouse.wexbim', 'model');
        this.viewer.on('pick',
            (args) => {
                var cmb = document.getElementById('cmbSelection');
                var option = cmb['value'];
                switch (option) {
                case 'select':
                    this.viewer.setState(State.HIGHLIGHTED, [args.id]);
                    break;
                case 'hide':
                    this.viewer.setState(State.HIDDEN, [args.id]);
                    break;
                default:
                    break;
                }
            });
    }

    resetViewerState() {
        this.viewer.resetStates(true);
    }
}
