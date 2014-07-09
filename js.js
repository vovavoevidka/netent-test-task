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

    self.pickRandomProperty = function(obj) {
        var result;
        var count = 0;
        for (var prop in obj)
            if (Math.random() < 1 / ++count)
                result = prop;
        return result;
    }

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

        for (var index in self.clickHandlers) {
            var handler = self.clickHandlers[index];
            if (y > handler.area.top && y < handler.area.top + handler.area.height && x > handler.area.left && x < handler.area.left + handler.area.width) {
                handler.callback();
            }
        }
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
                onEnter: function(data) {
                    var isSimSelected = false;
                    var setBackground = function(ctx, img) {
                        ctx.drawImage(img, 0, 0);
                    };
                    var drawSelectedSim = function(ctx, img) {
                        refreshView();
                        ctx.drawImage(img,
                            config.welcome_selectedSimProp.left,
                            config.welcome_selectedSimProp.top,
                            config.welcome_selectedSimProp.width,
                            config.welcome_selectedSimProp.height);
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
                                        isSimSelected = true;
                                        drawSelectedSim(ctx, config.sims[name]);
                                        config.selectedSim = name;
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
                        ctx.drawImage(img, area.left, area.top, area.width, area.height);
                        self.clickHandlers.push({
                            callback: (function() {
                                return data.nav_spin_me;
                            }()),
                            area: {
                                top: parseInt(area.top),
                                left: parseInt(area.left),
                                width: parseInt(area.width),
                                height: parseInt(area.height)
                            }
                        })
                    };
                    var refreshView = function() {
                        self.clickHandlers = [];
                        setBackground(ctx, config.background);
                        drawSim(ctx, config.sims, config.welcome_simSize["width"], config.welcome_simSize["height"]);
                        if (!isSimSelected) {
                            drawNavigation(ctx, config.buttons.refresh_disabled, config.navigation_area);
                        } else {
                            drawNavigation(ctx, config.buttons.refresh, config.navigation_area);
                        }
                    };
                    refreshView();
                },
                onLeave: function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    self.clickHandlers = [];
                }
            },
            "game": {
                onEnter: function(data) {
                    var num_on_catches = 0;
                    var FPS = 60;
                    setInterval(function() {
                        draw();
                    }, 1000 / FPS);

                    var dy = 5,
                        sims = [],
                        minWait = 1000,
                        lastTime = +new Date();

                    function Sim(x, y, width, height, type) {
                        this.x = x;
                        this.y = y;
                        this.width = width;
                        this.height = height;
                        this.type = type;
                    }

                    Sim.prototype.update = function() {
                        if (this.y < parseInt(config.gameareasize.height)) {
                            this.y += dy
                        } else {
                            this.y = parseInt(config.gameareasize.top);
                        }
                        if (this.type == config.selectedSim) {
                            self.clickHandlers = [];
                            addNavigationHandler(config.navigation_area);
                            self.clickHandlers.push({
                                callback: (function() {
                                    return function() {
                                        num_on_catches += 1;
                                        draw();
                                        if (num_on_catches >= parseInt(config.num_on_catches_to_win))
                                            data.win_scenario();
                                    };
                                }()),
                                area: {
                                    top: parseInt(this.y),
                                    left: parseInt(this.x),
                                    width: parseInt(this.width),
                                    height: parseInt(this.height)
                                }
                            })
                        }
                    };

                    Sim.prototype.render = function() {
                        ctx.drawImage(config.sims[this.type], this.x, this.y, this.width, this.height);
                    };

                    var start_new_game = function() {
                        sims = [];
                    };

                    var setBackground = function(ctx, img) {
                        ctx.drawImage(img, 0, 0);
                    };

                    var addNavigationHandler = function(area) {
                        self.clickHandlers.push({
                            callback: (function() {
                                return start_new_game;
                            }()),
                            area: {
                                top: parseInt(area.top),
                                left: parseInt(area.left),
                                width: parseInt(area.width),
                                height: parseInt(area.height)
                            }
                        });
                    };

                    var drawNavigation = function(ctx, img, area) {
                        ctx.drawImage(img, area.left, area.top, area.width, area.height);
                    };

                    var drawCurrentScore = function(ctx, score) {
                        ctx.font = '20pt Calibri';
                        ctx.fillStyle = 'blue';
                        ctx.fillText("score " + score + " of " + config.num_on_catches_to_win, canvas.width - 100, 30)
                    };

                    function draw() {
                        if (+new Date() > lastTime + minWait) {
                            lastTime = +new Date();
                            sims.push(new Sim(Math.random() * parseInt(config.gameareasize.width) + parseInt(config.gameareasize.left), parseInt(config.gameareasize.top), 40, 40, self.pickRandomProperty(config.sims)));
                        }

                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        setBackground(ctx, config.background);
                        drawCurrentScore(ctx, num_on_catches);
                        drawNavigation(ctx, config.buttons.refresh, config.navigation_area);
                        sims.forEach(function(e) {
                            e.update();
                            e.render();
                        });
                    };
                },
                onLeave: function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    self.clickHandlers = [];
                }
            },
            "win": {
                onEnter: function(data) {

                },
                onLeave: function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    self.clickHandlers = [];
                }
            }
        };
        service.currentState = null;
        service.changeState = function(state, data) {
            if (this.currentState)
                this.states[this.currentState].onLeave();

            if (Object.keys(this.states).indexOf(state) != -1) {
                this.currentState = state;
                this.states[state].onEnter(data);
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
        self.stateService.changeState("welcome", {
            nav_spin_me: function() {
                self.stateService.changeState("game", {
                    win_scenario: function() {
                        self.stateService.changeState("win");
                    }
                });
            }
        });
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
            config.welcome_simSize = data.welcome_simSize;
            config.welcome_selectedSimProp = data.welcome_selectedSimProp;
            config.navbuttons_prop = data.navbuttons_prop;
            config.gameareasize = data.gameareasize;
            config.num_on_catches_to_win = data.num_on_catches_to_win;

            config.navigation_area = {
                top: config.navbuttons_prop.top,
                left: config.navbuttons_prop.left,
                width: config.navbuttons_prop.width,
                height: config.navbuttons_prop.height
            };
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            init(config);
        });
    }, function(xhr) {
        console.error(xhr);
    })

})(document, window);