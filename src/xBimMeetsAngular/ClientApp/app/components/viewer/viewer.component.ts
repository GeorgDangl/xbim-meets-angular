import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Http } from '@angular/http';
import { xViewer, xState } from 'xbim-webui';

var glMatrix = require('xbim-webui/Libs/gl-matrix');

@Component({
    templateUrl: './viewer.component.html'
})
export class ViewerComponent implements AfterViewInit {

    constructor(private http: Http) {}

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
        this.viewer.on('pick',
            (args) => {
                var cmb = document.getElementById('cmbSelection');
                var option = cmb['value'];
                switch (option) {
                case 'select':
                    this.viewer.setState(xState.HIGHLIGHTED, [args.id]);
                    break;
                case 'hide':
                    this.viewer.setState(xState.HIDDEN, [args.id]);
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
