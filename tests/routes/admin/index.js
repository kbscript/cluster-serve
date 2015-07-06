exports.get = function (request, response, next){
    response.send.status(200).send("ok").end();
};