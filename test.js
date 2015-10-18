var par = require('./');
var test = require('tape');
var debug = require('debug')('test');
var pull = require('pull-stream');
var through = require('through');

function mock(t, expectedQuery, expectedToken, responses, opts) {
    opts = opts ||{};
    var fail = opts.fail;
    var headers = opts.headers || [];
    var i = 0;
    return function makeRequest(query, token) {
        debug('make request for %s with token=%s', query, token);
        if (fail) debug('(will fail)');
        t.deepEqual(query, expectedQuery[i]);
        t.equal(token, expectedToken[i]);
        var responseStream;
       
        if (fail) {
            responseStream = through(function(err) {
                this.emit('error', err);
            });
            setTimeout(function() {
                responseStream.write(fail);
            }, 250);
        } else {
            responseStream = through(function(data) {
                if (data.headers) this.emit('response', {headers: data.headers});
                this.push(data.body);
                this.push(null);
            });
            (function(body, headers) {
                setTimeout(function() {
                    responseStream.write({headers: headers, body: body});
                }, 250);
            })(responses[i], headers[i]);
        }
        i++;
        return responseStream;
    };
}

test('call extract with headers if its arity is three', function(t) {
    var expectedValues = [1,2,3];
    var req = par(mock(t, ['query'],[null],['response'], {headers: [{abc:123}]}));
    var stream = req('query', function(response, headers, cb) {
        debug('extract called');
        t.equal(response.toString(), 'response');
        t.deepEqual(headers, {abc: 123});
        cb(null, expectedValues, undefined);}
    );
    pull(
        stream,
        pull.collect(function(end, values) {
            t.end();
        })
    );
});
test('immediately aborts pull-stream source when token === undefined', function(t) {
    var expectedValues = [1,2,3];
    var req = par(mock(t, ['query'],[null],['response']));
    var stream = req('query', function(response, cb) {
        debug('extract called');
        t.equal(response.toString(), 'response');
        cb(null, expectedValues, undefined);}
    );
    pull(
        stream,
        pull.collect(function(end, values) {
            t.equal(end, null);
            t.deepEqual(values, expectedValues);
            t.end();
        })
    );
});

test('pass error during request', function(t) {
    var err = new Error('hey');
    var req = par(mock(t, ['query'],[null],['response'], {fail: err}));
    var stream = req('query', function(response, cb) {
        t.fail('should not call extract');
    });
    pull(
        stream,
        pull.collect(function(end, values) {
            t.equal(end, err);
            t.deepEqual(values, []);
            t.end();
        })
    );
});

test('pass error during extract', function(t) {
    var err = new Error('hey');
    var req = par(mock(t, ['query'],[null],['response']));
    var stream = req('query', function(response, cb) {
        t.equal(response.toString(), 'response');
        cb(err);
    });
    pull(
        stream,
        pull.collect(function(end, values) {
            t.equal(end, err);
            t.deepEqual(values, []);
            t.end();
        })
    );
});

test('pass on what has been extracted from 2 pages', function(t) {
    var req = par(mock(t, ['query', 'query'],[null, 'page1'],['[1,2,3]', '[4,5,6]']));
    var i = 0;
    var stream = req('query', function(response, cb) {
        cb(null, JSON.parse(response), i++ === 0 ? 'page1' : undefined);
    });
    pull(
        stream,
        pull.collect(function(end, values) {
            t.equal(end, null);
            t.deepEqual(values, [1,2,3,4,5,6]);
            t.end();
        })
    );
});

test('support pathways in place of extract functions', function(t) {
    var req = par(mock(t, ['query', 'query'],[null, 'page1'],['{"items": [1,2,3], "token": "page1"}', '{"items": [4,5,6]}']));
    var i = 0;
    var stream = req('query', [['items', true],['token']]);
    pull(
        stream,
        pull.collect(function(end, values) {
            t.equal(end, null);
            t.deepEqual(values, [1,2,3,4,5,6]);
            t.end();
        })
    );
});

test('default extract (pathways) - error in JSON', function(t) {
    var req = par(mock(t, ['query'],[null],['glibberish']));
    var stream = req('query', [['items', true],['token']]);
    pull(
        stream,
        pull.collect(function(err, values) {
            t.ok(err, 'should be an error');
            t.deepEqual(values, []);
            t.end();
        })
    );
});

test('default extract (pathways) - non-existing items', function(t) {
    var req = par(mock(t, ['query'],[null],['{}']));
    var stream = req('query', [['items', true],['token']]);
    pull(
        stream,
        pull.collect(function(err, values) {
            t.notOk(err, 'should not be an error');
            t.deepEqual(values, []);
            t.end();
        })
    );
});
