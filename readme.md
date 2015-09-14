# pull-paginated-api-request
Use this pull-stream to lazily traverse a paginated (REST) API
![![NPM](https://nodei.co/npm/pull-paginated-api-request.png)](https://nodei.co/npm/pull-paginated-api-request/)

## Simple Usage

```js
    var pull = require('pull-stream');
    var paginated = require('pull-paginated-api-request');
    ver querystring = require('querystring');
    var extend = require('xtend');
    var hyperquest = require('hyperquest')

    var request = paginated(function(o, pageToken) {
        return hyperquest(o.endpoint + '?' + querystring.stringify(
            extend({o.query, pageToken ? {pageToken: pageToken} : {})
        ));
    });

    pull(
        request({
            endpoint: 'https://api.whatever.com/playlistItems',
            query: {
                playlistId: id,
                maxResults: 50
            }
        },
        [
            ['items', true], 
            ['nextPageToken']
        ]),
        pull.log()
    );

    // outputs all playlist items until a REST API response
    // does not contain a nextPageToken proerty
```

## API

### paginated(makeResponseStream)

Returns a request function that can be used to query the API.
Takes a factory function that provides the response of an API server as a Node-style ReadableStream. The arguments of the factory-function are:

- makeResponseStream(obj, pageToken)
    
    - obj - an ojbect (opaque to pull-paginated-api-request) (see below)
    - pageToken: the token of the result page to request (see below)
    - please return a Node-style ReadStream. (Hint: use hyperquest, it works in Node and in the browser)

## request(obj, [itemPathway, nextPageTokenPathway])

This is the function retruned by `paginated` (see above). The first argument `obj` will simply be forwarded to `makeResponseStream`. The second argument is an array of `pathways`. They describe where to find the items (the stuff that we are interessted in) and the token of the next page of API results. The pathways themselves are arrays. They describe the location of those two properties within the JSON-formatted response of the API server. See [pathway](https://github.com/substack/node-pathway) for details.

`request` returns a pull-stream source. It generates output only when that output is consumed. This means that only those result pages get requested from the server that actually are needed. See [Dominic Tarr's pull-stream](https://github.com/dominictarr/pull-stream) to learn more about pull-streams and the power of laziness.

## License
MIT

