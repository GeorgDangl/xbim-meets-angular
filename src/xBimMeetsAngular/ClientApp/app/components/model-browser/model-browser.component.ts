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
    }

    private setUpViewer() {
        var self = this;
        //alert('WebGL support is OK');
        this.viewer = new xViewer("viewer-canvas");
        this.viewer.background = [249, 249, 249, 255];
        this.viewer.on("mouseDown",
            function(args) {
                if (!self.keepTarget) self.viewer.setCameraTarget(args.id);
            });
        this.viewer.on("pick",
            function(args) {
                self.browser.activateEntity(args.id);
                self.viewer.renderingMode = "normal";
                self.viewer.resetStates(true);
                self.keepTarget = false;
            });
        this.viewer.on("dblclick",
            function(args) {
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

        var currentlySelectedElement: any;
        this.viewer.on('pick',
            (args) => {
                if (currentlySelectedElement) {
                    this.viewer.setState(xState.UNSTYLED, [currentlySelectedElement]);
                }
                if (currentlySelectedElement === args.id) {
                    currentlySelectedElement = null;
                    return;
                }
                currentlySelectedElement = args.id;
                this.viewer.setState(xState.HIGHLIGHTED, [args.id]);
            });

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
}
