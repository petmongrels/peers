var http = require("http");
var url = require("url");
var fs = require('fs');

var log = require("./log").log;
var serveFileDir = "";
function setServeFilePath(p) {
    serveFilePath = p;
}
exports.serveFilePath = setServeFilePath;

function start(handle, port) {
    function onRequest(req, res) {
        var urldata = url.parse(req.url, true), pathname = urldata.pathname, info = {"res": res, "query": urldata.query, "postData": ""};
        log("Request for " + pathname + " received");
        req.setEncoding("utf8");
        req.addListener("data", function (postDataChunk) {
            info.postData += postDataChunk;
            log("Received POST data chunk '" + postDataChunk + "'.");
        });
        req.addListener("end", function () {
            route(handle, pathname, info);
        });
    }

    http.createServer(onRequest).listen(port);
    log("Server started on port " + port);
}
exports.start = start;
function route(handle, pathname, info) {
    log("About to route a request for " + pathname);
    var filepath = createFilePath(pathname);
    log("Attempting to locate " + filepath);
    fs.stat(filepath, function (err, stats) {
        if (!err && stats.isFile()) {
            serveFile(filepath, info);
        } else {
            handleCustom(handle, pathname, info);
        }
    });
}

function createFilePath(pathname) {
    var components = pathname.substr(1).split('/');
    var filtered = new Array(), temp;
    for (var i = 0, len = components.length; i < len; i++) {
        temp = components[i];
        if (temp == "..") continue;
        if (temp == "") continue;
        temp = temp.replace(/~/g, '');
        filtered.push(temp);
    }
    return (serveFilePath + "/" + filtered.join("/"));
}
function serveFile(filepath, info) {
    var res = info.res, query = info.query;
    log("Serving file " + filepath);
    fs.open(filepath, 'r', function (err, fd) {
        if (err) {
            log(err.message);
            noHandlerErr(filepath, res);
            return;
        }
        var readBuffer = new Buffer(20480);
        fs.read(fd, readBuffer, 0, 20480, 0, function (err, readBytes) {
            if (err) {
                log(err.message);
                fs.close(fd);
                noHandlerErr(filepath, res);
                return;
            }
            log('just read ' + readBytes + ' bytes');
            if (readBytes > 0) {
                res.writeHead(200, {"Content-Type": contentType(filepath)});
                res.write(addQuery(readBuffer.toString('utf8', 0, readBytes), query));
            }
            res.end();
        });
    });
}
function contentType(filepath) {
    var index = filepath.lastIndexOf('.');
    if (index >= 0) {
        switch (filepath.substr(index + 1)) {
            case "html":
                return ("text/html");
            case "js":
                return ("application/javascript");
            case "css":
                return ("text/css");
            case "txt":
                return ("text/plain");
            default:
                return ("text/html");
        }
    }
    return ("text/html");
}
function addQuery(str, q) {
    if (q) {
        return str.replace('<script></script>', '<script>var queryparams = ' + JSON.stringify(q) + ';</script>');
    } else {
        return str;
    }
}
function handleCustom(handle, pathname, info) {
    if (typeof handle[pathname] == 'function') {
        handle[pathname](info);
    } else {
        noHandlerErr(pathname, info.res);
    }
}
function noHandlerErr(pathname, res) {
    log("No request handler found for " + pathname);
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.write("404 Page Not Found");
    res.end();
}