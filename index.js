// jshint -W061
var concat = require('concat-stream');
var pathway = require('pathway');

var debug = require('debug')('pull-paginated-api-request');
var pull = require('pull-stream');
var generate = require('pull-generate');

// return a function that retuens a stream of objects
// the next page is requested automatically when needed
// arguments:
// - makeRequest: function(query, pageToken) return api response as node-style stream
module.exports = function (makeRequest) {
    // arguments:
    // - query: passed to makeRequest
    // - extract:
    //   - either: function(responseString, cb)
    //     - that calls cb(err, items, nextPageToken)
    //   - or: array, interpreted as a pathway
    //     - first array entry is the items path
    //     - 2nd array entry is the nextPageToken path
    return function request(query, extract) {
        if (extract instanceof Array) {
            var ways = extract;
            extract = function(response, cb) {
                var obj;
                try {
                    obj = JSON.parse(response);
                } catch(err) {
                    debug('JSON parse error: %s', err.message);
                    console.log(response.toString());
                    return cb(err);
                }
                var items = pathway(obj, ways[0]);
                debug('items are %s', ways[0], typeof items);
                if (typeof items === 'undefined') return cb(new Error('no items extracted'));
                var nextToken = ways.length>1 ? pathway(obj, ways[1]) : undefined;
                cb(null, items, nextToken ? nextToken[0] : undefined);
            };
        }
        return pull(
            generate(null, function(pageToken, cb) {
                if (typeof pageToken === 'undefined') return cb(true);
                debug('requesting %s page %s', query, pageToken);
                var responseStream = makeRequest(query, pageToken);
                responseStream.on('error', function(err) {
                    debug('error: %s', err.message);
                    cb(err);
                });
                responseStream.pipe(concat(function(response) {
                    extract(response, cb);
                }));
            }),
            pull.flatten()
        );
    };
};
