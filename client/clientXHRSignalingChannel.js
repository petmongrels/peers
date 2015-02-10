var createSignalingChannel = function (key, handlers) {
    var id, status, doNothing = function () {
    }, handlers = handlers || {}, initHandler = function (h) {
        return ((typeof h === 'function') && h) || doNothing;
    }, waitingHandler = initHandler(handlers.onWaiting), connectedHandler = initHandler(handlers.onConnected), messageHandler = initHandler(handlers.onMessage);

    function connect(failureCB) {
        var failureCB = (typeof failureCB === 'function') || function () {
        };

        function handler() {
            if (this.readyState == this.DONE) {
                if (this.status == 200 && this.response != null) {
                    var res = JSON.parse(this.response);
                    if (res.err) {
                        failureCB("error:  " + res.err);
                        return;
                    }
                    id = res.id;
                    status = res.status;
                    poll();
                    if (status === "waiting") {
                        waitingHandler();
                    } else {
                        connectedHandler();
                    }
                    return;
                } else {
                    failureCB("HTTP error:  " + this.status);
                    return;
                }
            }
        }

        var client = new XMLHttpRequest();
        client.onreadystatechange = handler;
        client.open("GET", "/connect?key=" + key);
        client.send();
    }

    function poll() {
        var msgs;
        var pollWaitDelay = (function () {
            var delay = 10, counter = 1;

            function reset() {
                delay = 10;
                counter = 1;
            }

            function increase() {
                counter += 1;
                if (counter > 20) {
                    delay = 1000;
                } else if (counter > 10) {
                    delay = 100;
                }
            }

            function value() {
                return delay;
            }

            return {reset: reset, increase: increase, value: value};
        }());
        (function getLoop() {
            get(function (response) {
                var i, msgs = (response && response.msgs) || [];
                if (response.msgs && (status !== "connected")) {
                    status = "connected";
                    connectedHandler();
                }
                if (msgs.length > 0) {
                    pollWaitDelay.reset();
                    for (i = 0; i < msgs.length; i += 1) {
                        handleMessage(msgs[i]);
                    }
                } else {
                    pollWaitDelay.increase();
                }
                setTimeout(getLoop, pollWaitDelay.value());
            });
        }());
    }

    function get(getResponseHandler) {
        function handler() {
            if (this.readyState == this.DONE) {
                if (this.status == 200 && this.response != null) {
                    var res = JSON.parse(this.response);
                    if (res.err) {
                        getResponseHandler("error:  " + res.err);
                        return;
                    }
                    getResponseHandler(res);
                    return res;
                } else {
                    getResponseHandler("HTTP error:  " + this.status);
                    return;
                }
            }
        }

        var client = new XMLHttpRequest();
        client.onreadystatechange = handler;
        client.open("POST", "/get");
        client.send(JSON.stringify({"id": id}));
    }

    function handleMessage(msg) {
        setTimeout(function () {
            messageHandler(msg);
        }, 0);
    }

    function send(msg, responseHandler) {
        var reponseHandler = responseHandler || function () {
        };

        function handler() {
            if (this.readyState == this.DONE) {
                if (this.status == 200 && this.response != null) {
                    var res = JSON.parse(this.response);
                    if (res.err) {
                        responseHandler("error:  " + res.err);
                        return;
                    }
                    responseHandler(res);
                    return;
                } else {
                    responseHandler("HTTP error:  " + this.status);
                    return;
                }
            }
        }

        var client = new XMLHttpRequest();
        client.onreadystatechange = handler;
        client.open("POST", "/send");
        var sendData = {"id": id, "message": msg};
        client.send(JSON.stringify(sendData));
    }

    return {   connect: connect, send: send };
};