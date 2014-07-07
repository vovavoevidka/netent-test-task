(function(document, window) {
    //HELPERS:
    //NOTE: count of fields in object;
    var self = this;
    self.count = function(obj) {
        if (obj.__count__ !== undefined)
            return obj.__count__;
        if (Object.keys)
            return Object.keys(obj).length;
        var c = 0;
        for (var p in obj) {
            if (obj.hasOwnProperty(p))
                c += 1;
        }
        return c;
    };

    //END OF HELPERS;

    //GENERAL:
    self.clickHandlers = [];

    var pathToConfig = "config.json";
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");

    var convasLeft = canvas.offsetLeft;
    var convasTop = canvas.offsetTop;

    canvas.addEventListener('click', function(event) {
        var x = event.pageX - convasLeft,
            y = event.pageY - convasTop;

        self.clickHandlers.forEach(function(handler) {
            if (y > handler.area.top && y < handler.area.top + handler.area.height && x > handler.area.left && x < handler.area.left + handler.area.width) {
                handler.callback();
            }
        });
    });

    self.config = {};
    self.stateService = null;

    //start loading 'animation';
    function drawLoading(canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '30pt Calibri';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2)
    };
    drawLoading(canvas, ctx);

    //load config;
    function loadConfig(success, error) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (success)
                        success(JSON.parse(xhr.responseText));
                } else {
                    if (error)
                        error(xhr);
                }
            }
        };
        xhr.open("GET", pathToConfig, true);
        xhr.send();
    };
    //END OF GENERAL;

    var StateMachine = function() {
        var service = {};
        service.states = {
            "welcome": {
                onEnter: function() {
                    var setBackground = function(ctx, img) {
                        ctx.drawImage(img, 0, 0);
                    };
                    var drawSim = function(ctx, imges, width, height) {
                        var x = 120,
                            y = 120,
                            count = 0;
                        for (var img in imges) {
                            ctx.drawImage(imges[img], x, y, width, height);

                            self.clickHandlers.push({
                                callback: (function(name) {
                                    return function() {
                                        alert("sim " + name + " clicked");
                                    }
                                }(img)),
                                area: {
                                    top: y,
                                    left: x,
                                    width: parseInt(width),
                                    height: parseInt(height)
                                }
                            })

                            x += 100 + parseInt(width);
                            count++;
                            if (count % 3 == 0) {
                                x = 120;
                                y += 100 + parseInt(height);
                            }
                        };
                    };
                    var drawNavigation = function(ctx, img, area) {
                        ctx.drawImage(img, area.top, area.left, area.width, area.height);
                    };
                    setBackground(ctx, config.background);
                    drawSim(ctx, config.sims, config.simSize["width"], config.simSize["height"]);
                    drawNavigation(ctx, config.buttons.refresh_disabled, {
                        top: 0,
                        left: 0,
                        width: 100,
                        height: 100
                    });
                },
                onLeave: function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    self.clickHandlers = [];
                }
            }
        };
        service.currentState = null;
        service.changeState = function(state) {
            if (this.currentState)
                this.states[this.currentState].onLeave();

            if (Object.keys(this.states).indexOf(state) != -1) {
                this.currentState = state;
                this.states[state].onEnter();
            } else {
                console.error("state " + state + " not defined");
            }
        };

        return service;
    };

    self.stateService = new StateMachine();







    //init function
    var init = function(config) {
        self.config = config;
        self.stateService.changeState("welcome");
    };

    var imagesLoad = function(config, prop, url, success) {
        var onLoad = function(e) {
            e.target.removeEventListener("load", onLoad);
            success(config);
        }

        var props = prop.split(' ');

        if (props.length == 1) {
            config[props[0]] = new Image();
            config[props[0]].addEventListener("load", onLoad, false);
            config[props[0]].src = url;
        } else {
            var p = config;
            for (var prop in props) {
                if (prop < props.length - 1) {
                    p = p[props[prop]];
                } else {
                    p[props[prop]] = new Image();
                    p[props[prop]].addEventListener("load", onLoad, false);
                    p[props[prop]].src = url;
                }
            }
        }
    };

    var imagesPreload = function(data, success) {
        var loadCompleted = function(config) {
            count--;
            if (0 == count) {
                success(config);
            }
        };
        var count = 1 + self.count(data.sims) + self.count(data.buttons);
        var config = {};

        imagesLoad(config, "background", data.background, loadCompleted);


        config.buttons = {};
        config.sims = {};

        for (var item in data.buttons) {
            imagesLoad(config, "buttons " + item, data.buttons[item], loadCompleted);
        }

        for (var item in data.sims) {
            imagesLoad(config, "sims " + data.sims[item].name, data.sims[item].url, loadCompleted);
        }
    };

    loadConfig(function(data) {
        imagesPreload(data, function(config) {
            config.simSize = {};
            config.simSize["width"] = data.simSize["width"];
            config.simSize["height"] = data.simSize["height"];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            init(config);
        });
    }, function(xhr) {
        console.error(xhr);
    })

})(document, window);