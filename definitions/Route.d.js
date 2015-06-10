var Route = function () {};

Route.prototype.checkVerb = {
    name: "checkVerb",
    description: "Used to get verb from path so it can be called in api export function.  Returns empty string if not found or string of valid verb (new, get, update, delete) if found.",
    params: [
        {name: "this", default: {callPath: "string", verb: "string" }, type: "new Route()", description: "Route object passed as context to function.  Should have properties callPath, verb"}
    ],
    returns: "string"
};