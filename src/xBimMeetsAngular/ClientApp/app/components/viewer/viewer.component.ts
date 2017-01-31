import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Http } from '@angular/http';
import { xViewer } from 'xbim-webui';

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
        this.setViewerTouchNavigation();
    }

    private setViewerTouchNavigation() {
        this.viewer._canvas.addEventListener('touchstart', (event) => {this.handleTouchStart(event)});
        this.viewer._canvas.addEventListener('touchmove', (event) => { this.handleTouchMove(event) });
    }

    private lastTouchX_1: number;
    private lastTouchY_1: number;
    private lastTouchX_2: number;
    private lastTouchY_2: number;
    private lastTouchX_3: number;
    private lastTouchY_3: number;

    private handleTouchStart(event: TouchEvent) {
        event.preventDefault();
        if (event.touches.length >= 1) {
            this.lastTouchX_1 = event.touches[0].clientX;
            this.lastTouchY_1 = event.touches[0].clientY;
        }
        if (event.touches.length >= 2) {
            this.lastTouchX_2 = event.touches[1].clientX;
            this.lastTouchY_2 = event.touches[1].clientY;
        }
        if (event.touches.length >= 3) {
            this.lastTouchX_3 = event.touches[2].clientX;
            this.lastTouchY_3 = event.touches[2].clientY;
        }
    }

    private handleTouchMove(event: TouchEvent) {
        event.preventDefault();
        if (this.viewer.navigationMode === 'none' || !event.touches) {
            return;
        }
        if (event.touches.length === 1) {
            // touch move with single finger -> orbit
            var deltaX = event.touches[0].clientX - this.lastTouchX_1;
            var deltaY = event.touches[0].clientY - this.lastTouchY_1;
            this.lastTouchX_1 = event.touches[0].clientX;
            this.lastTouchY_1 = event.touches[0].clientY;
            this.navigate(this.viewer.navigationMode, deltaX, deltaY);
        } else if (event.touches.length === 2) {
            // touch move with two fingers -> zoom
            var distanceBefore = Math.sqrt((this.lastTouchX_1 - this.lastTouchX_2) * (this.lastTouchX_1 - this.lastTouchX_2) + (this.lastTouchY_1 - this.lastTouchY_2) * (this.lastTouchY_1 - this.lastTouchY_2));
            this.lastTouchX_1 = event.touches[0].clientX;
            this.lastTouchY_1 = event.touches[0].clientY;
            this.lastTouchX_2 = event.touches[1].clientX;
            this.lastTouchY_2 = event.touches[1].clientY;
            var distanceAfter = Math.sqrt((this.lastTouchX_1 - this.lastTouchX_2) * (this.lastTouchX_1 - this.lastTouchX_2) + (this.lastTouchY_1 - this.lastTouchY_2) * (this.lastTouchY_1 - this.lastTouchY_2));
            if (distanceBefore > distanceAfter) {
                this.navigate('zoom', -1, -1); // Zooming out, fingers are getting closer together

            } else {
                this.navigate('zoom', 1, 1); // zooming in, fingers are getting further apart
            }
        } else if (event.touches.length === 3) {
            // touch move with three fingers -> pan
            var directionX = ((event.touches[0].clientX + event.touches[1].clientX + event.touches[2].clientX) / 3) - ((this.lastTouchX_1 + this.lastTouchX_2 + this.lastTouchX_3) / 3);
            var directionY = ((event.touches[0].clientY + event.touches[1].clientY + event.touches[2].clientY) / 3) - ((this.lastTouchY_1 + this.lastTouchY_2 + this.lastTouchY_3) / 3);
            this.lastTouchX_1 = event.touches[0].clientX;
            this.lastTouchY_1 = event.touches[0].clientY;
            this.lastTouchX_2 = event.touches[1].clientX;
            this.lastTouchY_2 = event.touches[1].clientY;
            this.lastTouchY_3 = event.touches[2].clientX;
            this.lastTouchY_3 = event.touches[2].clientY;
            // pan seems to be too fast, just adding a factor here
            var panFactor = 0.2;

            this.navigate('pan', panFactor * directionX, panFactor * directionY);
        }
    }

    navigate(type, deltaX, deltaY) {
        if (!this.viewer['_handles'] || !this.viewer['_handles'][0]) return;
        //translation in WCS is position from [0, 0, 0]
        var origin = this.viewer._origin;
        var camera = this.viewer.getCameraPosition();

        //get origin coordinates in view space
        var mvOrigin = glMatrix.vec3.transformMat4(glMatrix.vec3.create(), origin, this.viewer._mvMatrix);

        //movement factor needs to be dependant on the distance but one meter is a minimum so that movement wouldn't stop when camera is in 0 distance from navigation origin
        var distanceVec = glMatrix.vec3.subtract(glMatrix.vec3.create(), origin, camera);
        var distance = Math.max(glMatrix.vec3.length(distanceVec), this.viewer['_handles'][0]._model.meter);

        //move to the navigation origin in view space
        var transform = glMatrix.mat4.translate(glMatrix.mat4.create(), glMatrix.mat4.create(), mvOrigin);

        //function for conversion from degrees to radians
        function degToRad(deg) {
            return deg * Math.PI / 180.0;
        }

        switch (type) {
        case 'free-orbit':
            transform = glMatrix.mat4.rotate(glMatrix.mat4.create(), transform, degToRad(deltaY / 4), [1, 0, 0]);
            transform = glMatrix.mat4.rotate(glMatrix.mat4.create(), transform, degToRad(deltaX / 4), [0, 1, 0]);
            break;

        case 'fixed-orbit':
        case 'orbit':
            glMatrix.mat4.rotate(transform, transform, degToRad(deltaY / 4), [1, 0, 0]);

            //z rotation around model z axis
            var mvZ = glMatrix.vec3.transformMat3(glMatrix.vec3.create(),
                [0, 0, 1],
                glMatrix.mat3.fromMat4(glMatrix.mat3.create(), this.viewer._mvMatrix));
            mvZ = glMatrix.vec3.normalize(glMatrix.vec3.create(), mvZ);
            transform = glMatrix.mat4.rotate(glMatrix.mat4.create(), transform, degToRad(deltaX / 4), mvZ);

            break;

        case 'pan':
            glMatrix.mat4.translate(transform, transform, [deltaX * distance / 150, 0, 0]);
            glMatrix.mat4.translate(transform, transform, [0, (-1.0 * deltaY) * distance / 150, 0]);
            break;

        case 'zoom':
            glMatrix.mat4.translate(transform, transform, [0, 0, deltaX * distance / 20]);
            glMatrix.mat4.translate(transform, transform, [0, 0, deltaY * distance / 20]);
            break;

        default:
            break;
        }

        //reverse the translation in view space and leave only navigation changes
        var translation = glMatrix.vec3.negate(glMatrix.vec3.create(), mvOrigin);
        transform = glMatrix.mat4.translate(glMatrix.mat4.create(), transform, translation);

        //apply transformation in right order
        this.viewer._mvMatrix = glMatrix.mat4.multiply(glMatrix.mat4.create(), transform, this.viewer._mvMatrix);
    }
}
