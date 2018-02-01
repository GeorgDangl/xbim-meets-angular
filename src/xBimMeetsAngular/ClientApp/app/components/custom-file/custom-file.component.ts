import { Component, AfterViewInit } from '@angular/core';
import { Http, ResponseContentType } from '@angular/http';
import { Viewer, State } from 'xbim-viewer';
import 'rxjs/add/operator/toPromise';

@Component({
    templateUrl: './custom-file.component.html'
})
export class CustomFileComponent implements AfterViewInit {

    constructor(private http: Http) {}

    private viewer: Viewer;
    private loadingFile: boolean = false;
    private loadComplete: boolean = false;

    ngAfterViewInit() {
        this.viewer = new Viewer('viewer');
        this.viewer.start();
    }

    selectedFileChanged(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            this.loadingFile = true;
            var file = event.target.files[event.target.files.length - 1];
            var formData = new FormData();
            formData.append('ifcFile', file);
            var url = '/Api/IfcConversion/IfcToWexbim';
            this.http
                .post(url, formData, { responseType: ResponseContentType.Blob})
                .toPromise()
                .then(response => {
                    if (response.ok) {
                        this.loadingFile = false;
                        this.loadComplete = true;
                        this.viewer.load(response.blob(), 'model');
                    } else {
                        this.loadingFile = false;
                        alert('Could not convert this model');
                    }
                })
                .catch(() => {
                    this.loadingFile = false;
                    alert('Could not convert this model');
                });
        }
    }
}
