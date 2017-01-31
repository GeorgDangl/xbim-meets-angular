import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Http } from '@angular/http';
import { xViewer } from 'xbim-webui';
import { xBrowser } from 'xbim-webui';
import { xNavigationCube } from 'xbim-webui';
import { xState } from 'xbim-webui';
import 'jquery';
import 'jquery-ui/ui/widgets/accordion';
declare var $: any; // xBrowser is internally dependant on jQuery being globally available
var glMatrix = require('xbim-webui/Libs/gl-matrix');

@Component({
    templateUrl: './model-browser.component.html',
    styles: [ require('./model-browser.component.css')] 
})
export class ModelBrowserComponent implements AfterViewInit {

    constructor(private http: Http) { }

    private viewer: xViewer;
    private browser: xBrowser;
    private keepTarget: boolean = false;
    private _lastSelection: any;

    private loadingFile: boolean = false;

    ngAfterViewInit() {
        var self = this;
        this.initControls();
        $(window).resize(function () {
            self.reinitControls();
        });
        this.browser = new xBrowser();
        this.browser.on("loaded", function (args) {
            var facility = args.model.facility;
            //render parts
            self.browser.renderSpatialStructure("structure", true);
            self.browser.renderAssetTypes("assetTypes", true);
            self.browser.renderSystems("systems", null);
            self.browser.renderZones("zones", null);
            self.browser.renderContacts("contacts");
            self.browser.renderDocuments(facility[0], "facility-documents");

            //open and selectfacility node
            $("#structure > ul > li").click();
        });

        this.browser.on("entityClick", function (args) {
            var span = $(args.element).children("span.xbim-entity");
            if (self._lastSelection)
                self._lastSelection.removeClass("ui-selected");
            span.addClass("ui-selected")
            self._lastSelection = span;
        });
        this.browser.on("entityActive", function (args) {
            var isRightPanelClick = false;
            if (args.element)
                if ($(args.element).parents("#semantic-descriptive-info").length != 0)
                    isRightPanelClick = true;

            //set ID for location button
            $("#btnLocate").data("id", args.entity.id);

            self.browser.renderPropertiesAttributes(args.entity, "attrprop");
            self.browser.renderAssignments(args.entity, "assignments");
            self.browser.renderDocuments(args.entity, "documents");
            self.browser.renderIssues(args.entity, "issues");

            if (isRightPanelClick)
                $("#attrprop-header").click();

        });

        this.browser.on("entityDblclick", function (args) {
            var entity = args.entity;
            var allowedTypes = ["space", "assettype", "asset"];
            if (allowedTypes.indexOf(entity.type) === -1) return;

            var id = parseInt(entity.id);
            if (id && self.viewer) {
                self.viewer.resetStates(true);
                self.viewer.renderingMode = "x-ray";
                if (entity.type === "assettype") {
                    var ids = [];
                    for (var i = 0; i < entity.children.length; i++) {
                        id = parseInt(entity.children[i].id);
                        ids.push(id);
                    }
                    this.viewer.setState(xState.HIGHLIGHTED, ids);
                }
                else {
                    this.viewer.setState(xState.HIGHLIGHTED, [id]);
                }
                this.viewer.zoomTo(id);
                this.keepTarget = true;
            }
        });

        this.setUpViewer();
        this.setViewerTouchNavigation();
        this.setViewerTouchPick();
    }

    private setUpViewer() {
        var self = this;
        //alert('WebGL support is OK');
        this.viewer = new xViewer("viewer-canvas");
        this.viewer.background = [249, 249, 249, 255];
        this.viewer.on("mouseDown", function (args) {
            if (!self.keepTarget) self.viewer.setCameraTarget(args.id);
        });
        this.viewer.on("pick", function (args) {
            self.browser.activateEntity(args.id);
            self.viewer.renderingMode = "normal";
            self.viewer.resetStates(true);
            self.keepTarget = false;
        });
        this.viewer.on("dblclick", function (args) {
            self.viewer.resetStates(true);
            self.viewer.renderingMode = "x-ray";
            var id = args.id;
            self.viewer.setState(xState.HIGHLIGHTED, [id]);
            self.viewer.zoomTo(id);
            self.keepTarget = true;
        });

        this.viewer.load("/models/LakesideRestaurant.wexbim", 'modelWexbim');
        this.browser.load("/models/LakesideRestaurant.json");

        var cube = new xNavigationCube();
        this.viewer.addPlugin(cube);

        this.viewer.start();
    }

    private initControls() {
        var self = this;
        $("#semantic-descriptive-info").accordion({
            heightStyle: "fill"
        });
        $("#semantic-model").accordion({
            heightStyle: "fill"
        });

        $("#btnLocate").button().click(function () {
            var id = $("#btnLocate").data("id");
            if (typeof (id) != "undefined" && self.viewer) {
                self.viewer.zoomTo(parseInt(id));
            }
        });

        $("#toolbar button").button();

        $("#btnClip").click(function () {
            self.viewer.clip();
        });

        $("#btnUnclip").click(function () {
            self.viewer.unclip();
        });
    }

    private reinitControls() {
        $("#semantic-model").accordion("refresh");
        $("#semantic-descriptive-info").accordion("refresh");
    }

    private setViewerTouchNavigation() {
        this.viewer._canvas.addEventListener('touchstart', (event) => { this.handleTouchStart(event) });
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

    private setViewerTouchPick() {

        var touchDown = false;
        var lastTouchX: number;
        var lastTouchY: number;
        var maximumLengthBetweenDoubleTaps = 200;
        var lastTap = new Date();

        var id = -1;

        //set initial conditions so that different gestures can be identified
        var handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 1) {
                return;
            }


            touchDown = true;
            lastTouchX = event.touches[0].clientX;
            lastTouchY = event.touches[0].clientY;
            //get coordinates within canvas (with the right orientation)
            var r = this.viewer._canvas.getBoundingClientRect();
            var viewX = lastTouchX - r.left;
            var viewY = this.viewer._height - (lastTouchY - r.top);

            //this is for picking
            id = this.viewer._getID(viewX, viewY);

            var now = new Date();
            var isDoubleTap = (now.getTime() - lastTap.getTime()) < maximumLengthBetweenDoubleTaps;
            if (isDoubleTap) {
                this.viewer._fire('dblclick', { id: id });
            };
            lastTap = now;

            /**
            * Occurs when mousedown event happens on underlying canvas.
            *
            * @event xViewer#mouseDown
            * @type {object}
            * @param {Number} id - product ID of the element or null if there wasn't any product under mouse
            */
            this.viewer._fire('mouseDown', { id: id });

            this.viewer._disableTextSelection();
        };

        var handleTouchEnd = (event: TouchEvent) => {
            if (!touchDown) {
                return;
            }
            touchDown = false;

            var endX = event.changedTouches[0].clientX;
            var endY = event.changedTouches[0].clientY;

            var deltaX = Math.abs(endX - lastTouchX);
            var deltaY = Math.abs(endY - lastTouchY);

            console.log(deltaX);
            console.log(deltaY);

            //if it was a longer movement do not perform picking
            if (deltaX < 3 && deltaY < 3) {

                var handled = false;
                this.viewer['_plugins'].forEach(function (plugin) {
                    if (!plugin.onBeforePick) {
                        return;
                    }
                    handled = handled || plugin.onBeforePick(id);
                },
                    this);

                /**
                * Occurs when user click on model.
                *
                * @event xViewer#pick
                * @type {object}
                * @param {Number} id - product ID of the element or null if there wasn't any product under mouse
                */
                if (!handled) this.viewer._fire('pick', { id: id });
            }

            this.viewer._enableTextSelection();
        };


        this.viewer._canvas.addEventListener('touchstart', (event) => handleTouchStart(event), true);
        this.viewer._canvas.addEventListener('touchend', (event) => handleTouchEnd(event), true);
    }
}
