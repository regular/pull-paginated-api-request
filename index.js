// jshint -W061
var hyperquest = require('hyperquest');
var concat = require('concat-stream');

var debug = require('debug')('pull-paginated-api-request');
var pull = require('pull-stream');
var generate = require('pull-generate');

// return a function that retuens a stream of objects
// the next page is requested automatically when needed
module.exports = function (makeUrl) {
    return function request(url, query, extract) {
        return pull(
            generate(null, function(pageToken, cb) {
                if (typeof pageToken === 'undefined') return cb(true);
                debug('requesting %s page %s', url, pageToken);
                hyperquest(makeUrl(url, query, pageToken))
                .pipe(concat(function(json) {
                    var result = extract(json);
                    var items = result[0];
                    var nextToken = result[1];
                    cb(null, items, nextToken);
                }));
            }),
            pull.flatten()
        );
    };
};
