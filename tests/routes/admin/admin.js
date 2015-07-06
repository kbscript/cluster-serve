exports.get = function (request, response, next){
    //shouldn't get called
    throw new Error("we shouldn't be able to call admin.js directly.");
};