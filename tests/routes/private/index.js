exports.get = function (request, response, next){
    //if we got here there's a problem
    throw new Error("routes/private/index.js should not be accessed.  It is in excludes.")
};