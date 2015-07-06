module.exports = function Timeout (ms, ontimeout) {
    return function (request, response, next) {
        var destroy = request.socket.destroy, timeoutId;
        var end = request.end;

        request.timedOut = false;

        timeoutId = setTimeout(function () {
            request.timedOut = true;
            ontimeout(request, response, new Error("Response timeout for: " + request.url));
        }, ms);

        request.clearTimeout = clearTimeout.bind(this, timeoutId);

        request.end = function () {
            clearTimeout(timeoutId);
            end.apply(this, arguments)
        };

        request.socket.destroy = function () {
            clearTimeout(timeoutId);
            destroy.apply(this, arguments);
        };

        next();
    }
};