sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'myapp/controller/Library'
], function (Controller, JSONModel, Library) {
    "use strict";
    return Controller.extend("myapp.controller.LiveStats", {
        ModelDetailPages: sap.ui.getCore().getModel("GeneralModel"),
        ModelButton: new JSONModel({}),
        STOP: null,
        BusyDialog: new sap.m.BusyDialog(),
        TIMER: null,
        Counter: null,
        ModelSPCData: new JSONModel({}),
        ModelBarData: new JSONModel({}),
        ModelPieData: new JSONModel({}),
        ModelCausesBarData: new JSONModel({}),
        indexSPC: null,
        batchID: null,
        buttonPressed: sap.ui.getCore().getModel("buttonPressed"),
//  FUNZIONI D'INIZIALIZZAZIONE      
        onInit: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("LiveStats").attachPatternMatched(this.URLChangeCheck, this);
        },
        URLChangeCheck: function () {
            this.STOP = 0;
            clearInterval(this.TIMER);
            this.Counter = 15;
//            this.pathLinea = this.buttonPressed.getData().path;
            this.indexSPC = this.buttonPressed.getData().index;
            this.idLinea = this.ModelDetailPages.getData().DettaglioLinea.idLinea;
            this.ParametroID = this.ModelDetailPages.getData().DatiSPC[this.indexSPC].parametroId;
            this.DescrizioneParametro = this.FixDescription();
            this.batchID = this.ModelDetailPages.getData().Linea.Batch.BatchID;
//            this.RefreshCall();
            var that = this;
            this.TIMER = setInterval(function () {
                try {
                    that.Counter++;
                    if (that.STOP === 0 && that.Counter >= 15) {
                        that.RefreshFunction();
                    }
                } catch (e) {
                    console.log(e);
                }
            }, 1000);
        },
//  FUNZIONI DI REFRESH
        RefreshFunction: function (msec) {
            this.Counter = 0;
            if (typeof msec === "undefined") {
                msec = 0;
            }
            setTimeout(this.RefreshCall.bind(this), msec);
        },
        RefreshCall: function () {
            var link;
            if (this.ISLOCAL === 1) {
                link = "model/JSON_SPCData.json";
            } else {
                if (typeof this.ParametroID !== "undefined") {
                    link = "/XMII/Runner?Transaction=DeCecco/Transactions/Graphs/Graphs&Content-Type=text/json&OutputParameter=JSON&LineaID=" + this.idLinea + "&ParametroID=" + this.ParametroID;
                }
            }
            Library.AjaxCallerData(link, this.SUCCESSSPCDataLoad.bind(this));
        },
        //         -> PULSANTI SPC CON REFRESH
        FixDescription: function () {
            var prefix = (this.indexSPC === 0) ? "Left Packaging Branch" : "Right Packaging Branch";
            return prefix;
        },
        SUCCESSSPCDataLoad: function (Jdata) {
            this.ModelButton.setData({stato: Jdata.statoLinea});
            this.getView().setModel(this.ModelButton, "button");
            this.Allarme = this.ModelDetailPages.getData().DatiSPC[this.indexSPC].allarme;
            this.Fase = this.ModelDetailPages.getData().DatiSPC[this.indexSPC].fase;
            this.Avanzamento = this.ModelDetailPages.getData().DatiSPC[this.indexSPC].avanzamento;
            Jdata.graph1 = this.ParseBarData(Jdata.graph1, "#");
            this.ModelBarData.setProperty("/", Jdata.graph1);
            this.ModelPieData.setProperty("/", Jdata.graph3);
            this.ModelCausesBarData.setProperty("/", Jdata.graph4);
            Jdata.graph2 = this.ParseSPCData(Jdata.graph2, "#");
            this.ModelSPCData.setProperty("/", Jdata.graph2);
            this.SPCDialogFiller();
            if (this.STOP === 0) {
                this.Counter = 0;
            }
        },
        //      FUNZIONI SPC    
        SPCDialogFiller: function () {
            var textHeader = this.getView().byId("headerSPCWindow");
            textHeader.setText(String(this.DescrizioneParametro));
            var alarmButton = this.getView().byId("alarmButton");
            if (Number(this.Fase) === 2 && Number(this.Allarme) === 1) {
                alarmButton.setEnabled(true);
                alarmButton.removeStyleClass("chiudiButtonStats");
                alarmButton.addStyleClass("allarmeButtonStats");
            } else {
                alarmButton.setEnabled(false);
                alarmButton.removeStyleClass("allarmeButtonStats");
                alarmButton.addStyleClass("chiudiButtonStats");
            }
            var plotBox = this.getView().byId("plotBox1");
            var data = this.ModelBarData.getData();
            var result = this.PrepareBarDataToPlot(data);
            var ID = jQuery.sap.byId(plotBox.getId()).get(0);
            Plotly.newPlot(ID, result.dataPlot, result.layout, {responsive: true});
            plotBox = this.getView().byId("plotBox3");
            data = this.ModelPieData.getData();
            result = this.PreparePieDataToPlot(data);
            ID = jQuery.sap.byId(plotBox.getId()).get(0);
            Plotly.newPlot(ID, result.dataPlot, result.layout, {responsive: true});
            plotBox = this.getView().byId("plotBox");
            data = this.ModelSPCData.getData();
            result = this.PrepareDataToPlot(data, this.Fase, this.Avanzamento);
            ID = jQuery.sap.byId(plotBox.getId()).get(0);
            Plotly.newPlot(ID, result.dataPlot, result.layout, {responsive: true});
            plotBox = this.getView().byId("plotBox4");
            data = this.ModelCausesBarData.getData();
            result = this.PrepareCausesBarDataToPlot(data);
            ID = jQuery.sap.byId(plotBox.getId()).get(0);
            Plotly.newPlot(ID, result.dataPlot, result.layout, {responsive: true});
        },
        ParseBarData: function (data, char) {
            var i;
            data.belowTimeGood = [];
            data.aboveTimeGood = [];
            data.belowGood = [];
            data.aboveGood = [];
            data.aboveBaseGood = [];
            data.belowBaseGood = [];
            data.belowTimeBad = [];
            data.aboveTimeBad = [];
            data.belowBad = [];
            data.aboveBad = [];
            data.aboveBaseBad = [];
            data.belowBaseBad = [];
            var tempRef = Number(data.ref);
            var tempInf = Number(data.limInf);
            var tempSup = Number(data.limSup);
            for (var key in data) {
                if (key === "valori" || key === "time") {
                    data.ref = [];
                    data.limInf = [];
                    data.limSup = [];
                    data[key] = data[key].split(char);
                    for (i = data[key].length - 1; i >= 0; i--) {
                        if (data[key][i] === "") {
                            data[key].splice(i, 1);
                        } else {
                            data.ref.push(tempRef);
                            data.limInf.push(tempInf);
                            data.limSup.push(tempSup);
                            if (key !== "time") {
                                data[key][i] = Number(data[key][i]);
                            }
                        }
                    }
                }
            }
            for (i = 0; i < data.valori.length; i++) {
                if (data.valori[i] >= tempRef) {
                    if (data.valori[i] <= tempSup) {
                        data.aboveTimeGood.push(data.time[i]);
                        data.aboveBaseGood.push(tempRef);
                        data.aboveGood.push(data.valori[i] - tempRef);
                    } else {
                        data.aboveTimeBad.push(data.time[i]);
                        data.aboveBaseBad.push(tempRef);
                        data.aboveBad.push(data.valori[i] - tempRef);
                    }
                } else {
                    if (data.valori[i] >= tempInf) {
                        data.belowTimeGood.push(data.time[i]);
                        data.belowBaseGood.push(data.valori[i]);
                        data.belowGood.push(tempRef - data.valori[i]);
                    } else {
                        data.belowTimeBad.push(data.time[i]);
                        data.belowBaseBad.push(data.valori[i]);
                        data.belowBad.push(tempRef - data.valori[i]);
                    }
                }
            }
            return data;
        },
        PrepareBarDataToPlot: function (Jdata) {
            var dataPlot, layout;
            var ref = {
                x: Jdata.time,
                y: Jdata.ref,
                type: 'scatter',
                line: {color: '#003A6B', width: 1}
            };
            var aboveGood = {
                x: Jdata.aboveTimeGood,
                y: Jdata.aboveGood,
                base: Jdata.aboveBaseGood,
                type: 'bar',
                marker: {color: '#80C342'}
            };
            var belowGood = {
                x: Jdata.belowTimeGood,
                y: Jdata.belowGood,
                base: Jdata.belowBaseGood,
                type: 'bar',
                marker: {color: '#80C342'}
            };
            var aboveBad = {
                x: Jdata.aboveTimeBad,
                y: Jdata.aboveBad,
                base: Jdata.aboveBaseBad,
                type: 'bar',
                marker: {color: '#DC6774'}
            };
            var belowBad = {
                x: Jdata.belowTimeBad,
                y: Jdata.belowBad,
                base: Jdata.belowBaseBad,
                type: 'bar',
                marker: {color: '#DC6774'}
            };
            var limInf = {
                x: Jdata.time,
                y: Jdata.limInf,
                type: 'scatter',
                line: {color: '#DC6774', width: 1}
            };
            var limSup = {
                x: Jdata.time,
                y: Jdata.limSup,
                type: 'scatter',
                line: {color: '#DC6774', width: 1}
            };
            dataPlot = [ref, aboveGood, belowGood, aboveBad, belowBad, limInf, limSup];
            var min = (isNaN(Math.min.apply(null, Jdata.belowBaseBad))) ? Jdata.limInf[0] : Math.min(Math.min.apply(null, Jdata.belowBaseBad), Jdata.limInf[0]);
            var max = (isNaN(Math.max.apply(null, Jdata.aboveBad))) ? Jdata.limSup[0] : Math.max(Math.max.apply(null, Jdata.aboveBad) + Jdata.ref[0], Jdata.limSup[0]);
            layout = {
                title: 'Packages Weight Deviations from Target',
                titlefont: {color: '#003A6B'},
                showlegend: false,
                autosize: false,
                width: 937.5,
                height: 425,
                xaxis: {
                    showgrid: true,
                    zeroline: false
                },
                yaxis: {
                    showgrid: true,
                    zeroline: false,
                    range: [min - 1, max + 1]
                }
            };
            layout.xaxis.linewidth = 1;
            layout.xaxis.mirror = true;
            layout.yaxis.linewidth = 1;
            layout.yaxis.mirror = true;
            return {dataPlot: dataPlot, layout: layout};
        },
        PreparePieDataToPlot: function (Jdata) {
            var dataPlot = [{
                    values: [Number(Jdata.UB), Number(Jdata.US), Number(Jdata.SS)],
                    labels: ["Good Items", "Rejected Items", "Setup Trial Items"],
                    type: 'pie',
                    marker: {colors: ["#80C342", "#DC6774", "#FFD300"]}
                }];
            var layout = {
                title: 'Packaging Quality',
                titlefont: {color: '#003A6B'},
                autosize: false,
                width: 687.5,
                height: 462.5
            };
            return {dataPlot: dataPlot, layout: layout};
        },
        PrepareCausesBarDataToPlot: function (Jdata) {
            var i;
            var causes = [];
            var times = [];
            for (i = 0; i < Jdata.length; i++) {
                causes.push(Jdata[i].Causale);
                times.push(Jdata[i].Time / 60);
            }
            var dataPlot = [{
                    type: 'bar',
                    x: times,
                    y: causes,
                    marker: {color: '#003A6B'},
                    orientation: 'h'
                }];
            var layout = {
                title: 'Automatic Stops Distribution',
                titlefont: {color: '#003A6B'},
                yaxis: {
                    automargin: true
                },
                xaxis: {
                    title: 'Time [Minutes]'
                },
                autosize: false,
                width: 1000,
                height: 437.5
            };
            return {dataPlot: dataPlot, layout: layout};
        },
        RemoveAlarm: function () {
            var alarmButton = this.getView().byId("alarmButton");
            alarmButton.setEnabled(false);
            alarmButton.removeStyleClass("allarmeButtonStats");
            alarmButton.addStyleClass("chiudiButtonStats");
            var link = "/XMII/Runner?Transaction=DeCecco/Transactions/ResetSPCAlarm&Content-Type=text/json&BatchID=" + this.batchID + "&ParametroID=" + this.ParametroID;
            Library.AjaxCallerVoid(link, this.RefreshFunction.bind(this));
            this.BackToMain();
        },
        ParseSPCData: function (data, char) {
            for (var key in data) {
                data[key] = data[key].split(char);
                for (var i = data[key].length - 1; i >= 0; i--) {
                    if (data[key][i] === "") {
                        data[key].splice(i, 1);
                    } else {
                        if (key !== "time") {
                            data[key][i] = Number(data[key][i]);
                        }
                    }
                }
            }
            return data;
        },
        PrepareDataToPlot: function (Jdata, fase, avanzamento) {
            var dataPlot, layout;
            var valori = {
                x: Jdata.time,
                y: Jdata.valori,
                type: 'scatter',
                line: {color: 'rgb(0,58,107)', width: 1},
                config: {displayModeBar: false}
            };
            var limSup = {
                x: Jdata.time,
                y: Jdata.limSup,
                type: 'scatter',
                line: {color: '#DC6774', width: 1}
            };
            var limInf = {
                x: Jdata.time,
                y: Jdata.limInf,
                type: 'scatter',
                line: {color: '#DC6774', width: 1}
            };
            dataPlot = (fase === "1") ? [] : [valori, limSup, limInf];
            var title = (fase === "1") ? "SPC Chart - Sampling... " + avanzamento + "/50" : "SPC Chart";
            layout = {
                title: title,
                titlefont: {color: '#003A6B'},
                showlegend: false,
                autosize: false,
                width: 1000,
                height: 425,
                xaxis: {
                    showgrid: true,
                    zeroline: false
                },
                yaxis: {
                    showgrid: true,
                    zeroline: false
                },
                config: {displayModeBar: false}
            };
            if (Number(this.Allarme) === 0) {
                layout.xaxis.linecolor = "#80C342";
                layout.yaxis.linecolor = "#80C342";
            } else {
                layout.xaxis.linecolor = "rgb(255,211,0)";
                layout.yaxis.linecolor = "rgb(255,211,0)";
            }
            layout.xaxis.linewidth = 4;
            layout.xaxis.mirror = true;
            layout.yaxis.linewidth = 4;
            layout.yaxis.mirror = true;
//            }
            return {dataPlot: dataPlot, layout: layout};
        },
        BackToMain: function () {
            clearInterval(this.TIMER);
            this.BusyDialog.open();
            this.STOP = 1;
            this.getOwnerComponent().getRouter().navTo("Operatore");
            this.BusyDialog.close();
        }
    });
});