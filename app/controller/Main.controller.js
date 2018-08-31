sap.ui.define([
    'jquery.sap.global',
    'sap/ui/core/mvc/Controller',
    'sap/m/MessageToast',
    'sap/ui/model/json/JSONModel'
], function (jQuery, Controller, MessageToast, JSONModel) {
    "use strict";
    var MainController = Controller.extend("myapp.controller.Main", {
        Global: new JSONModel(),
        JSONLinee: new JSONModel(),

        onInit: function () {
            this.getOwnerComponent().setModel(this.Global, "Global");
            this.AjaxCallerData("model/JSON_Main.json", this.SUCCESSValuesTiles.bind(this));
        },
        SUCCESSValuesTiles: function (Jdata) {
            var model = new JSONModel({});
            model.setData(Jdata);
            this.FillModel(model, Jdata);
            this.getView().setModel(model, "ValuesTiles");
            this.ToggleColorClassIcons();
        },
        GoToOperatore: function (event) {
            if (event.getSource().getProperty("state") !== "Failed") {
                var line_num = event.getSource()._oTitle.getProperty("text");
                var chooser;
                for (var i = 0; i < this.JSONLinee.getData().length; i++) {
                    if (this.JSONLinee.getData()[i].linea === line_num) {
                        chooser = this.JSONLinee.getData()[i].idlinea;
                    }
                }
                this.Global.setProperty("/", {"Linea": line_num, "idLinea": chooser});
                sap.ui.getCore().setModel(this.Global, "Global");
                this.getOwnerComponent().getRouter().navTo("Operatore");
            } else {
                MessageToast.show("This line is not available");
            }
        },
        FillModel: function (model, data) {
            model.setProperty("/", data);
            this.JSONLinee.setData(data);
        },
        ToggleColorClassIcons: function () {
            var tile_icon, tile_path, state;
            var tiles = this.getView().byId("container").getContent();
            for (var i = 0; i < tiles.length; i++) {
                tile_path = tiles[i].getBindingContext("ValuesTiles").sPath;
                state = this.getView().getModel("ValuesTiles").getProperty(tile_path).state;
                tile_icon = tiles[i].getTileContent()[0].getContent();
                if (state === "active") {
                    tiles[i].setState("Loaded");
                    tile_icon.removeStyleClass("nonActiveState");
                    tile_icon.addStyleClass("activeState");
                    tiles[i].setBackgroundImage("img/" + this.getView().getModel("ValuesTiles").getProperty(tile_path).image);
                } else {
                    tiles[i].setState("Failed");
                    tile_icon.removeStyleClass("activeState");
                    tile_icon.addStyleClass("nonActiveState");
                    tiles[i]._sFailedToLoad = "Line not available";
                    tiles[i].setBackgroundImage("img/techedge.png");
                }
            }
        },
        AjaxCallerData: function (addressOfJSON, successFunc, errorFunc) {
            jQuery.ajax({
                url: addressOfJSON,
                method: "GET",
                dataType: "json",
                async: true,
                success: successFunc,
                error: errorFunc
            });
        },

    });
    return MainController;
});