/* jshint esversion:6, undef: false */

var server = require('dns-express')();
var isReachable = require('is-reachable');
var dns = require('dns');
var address = require('address');

isReachable('google.com').then(online => {
    console.log('Online status: ' + online);
});

var blocklist = [
    'domain.com',
    'test.com',
    'example.com'
];

function testarray(array, query) {
    if (array.includes(query)) {
        return true;
    }
}

server.a(function (req, res, next) {
    isReachable('google.com').then(online => {
        console.log('Online status: ' + online);
        if (online) {
            if (testarray(blocklist, req.name)) {
                console.log('Domain ' + req.name + ' is blocked');
                console.log('Changing A record for ' + req.name);
                //Add an A record to the response's answer.

                res.a({
                    name: req.name,
                    address: address.ip(),
                    ttl: 600
                });
                res.aaaa({
                    name: req.name,
                    address: address.ipv6(),
                    ttl: 600
                });
                return res.end();
            } else { // Domain not blocked
                console.log('Domain ' + req.name + ' is NOT blocked');
                dns.lookup(req.name, {
                    all: false
                }, (err, addresses, family) => {
                    console.log('Sending real data for ' + req.name + ': ' + addresses);
                    res.a({
                        name: req.name,
                        address: addresses,
                        ttl: 600
                    });
                    return res.end();
                });
            }
        } else { // No internet
            console.log('Online status: ' + online);
            res.a({
                name: req.name,
                address: '127.0.0.1',
                ttl: 30
            });
            return res.end();
        }
    });
});

server.use(function (req, res) {
    //End the response if no "routes" are matched
    console.log('Responding to ' + req.remote.address + ', who is asking for ' + req.questions[0].name);
    res.end();
});

server.listen(53535, function () {
    console.log('Server is listening');
});