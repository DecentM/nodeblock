/* jshint esversion:6, undef: false */

var dnsServer = require('dns-express')();
var isReachable = require('is-reachable');
var dns = require('dns');
var address = require('address');
var sleep = require('sleep');
var eventemitter = require('events');
var config = require('./config');
var db = require('./database');

class myEmitter extends eventemitter {}
var event = new myEmitter();

function netstatus(onConnect, onDisconnect) {
    var s = {};

    function expand(toExpand, func) {
        s[toExpand] = func;
    }
    var statusCategories = [
        'bool',
        'string'
    ];
    for (var i in statusCategories) {
        expand(statusCategories[i], {});
    }

    if (typeof address.ip() === "undefined") { // NO NETWORK CONNECTION
        s.bool.network = false;
        s.string.ip4 = "127.0.0.1";
        s.string.ip6 = "::1";
        s.bool.dns = false;
        if (typeof onDisconnect === "function") {
            onDisconnect();
        }
    } else { // NETWORK CONNECTION AVAILABLE
        s.bool.network = true;
        s.string.ip4 = address.ip();
        s.string.ip6 = address.ipv6();
        isReachable('https://google.com:443').then(online => { // INTERNET CONNECTION AVAILABLE
            if (online) {
                s.bool.dns = true;
            } else {
                s.bool.dns = false;
            }
        });
        if (typeof onConnect === "function") {
            onConnect();
        }
    }
    return s;
}

event.on('networkDown', function () {
    console.log('Waiting for network...');
});

event.on('networkUp', function () {
    console.log('Network connection established');
    console.log('IPV4 address: ' + netstatus().string.ip4);
    console.log('IPV6 address: ' + netstatus().string.ip6);
});

function networkCheck(initial) {
    if (netstatus().bool.network === false) {
        event.emit('networkDown');
        while (netstatus().bool.network === false) {
            sleep.msleep(2000);
        }
        if (!initial) {
            event.emit('networkUp');
        }
    }

    if (initial) {
        if (netstatus().bool.network === true) {
            event.emit('networkUp');
        }
    }
}

networkCheck(true);
setInterval(function () {
    networkCheck();
}, 5000);

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

function reply(res, name, ip, ip6) {
    res.a({
        name: name,
        address: ip,
        ttl: 600
    });
    if (typeof ip6 === "string") {
        res.aaaa({
            name: name,
            address: ip6,
            ttl: 600
        });
    }
}

dnsServer.a(function (req, res, next) {
    isReachable('google.com').then(online => {
        console.log('Online status: ' + online);
        if (online) {
            if (testarray(blocklist, req.name)) {
                console.log('Domain ' + req.name + ' is blocked');
                console.log('Changing A record for ' + req.name);
                //Add an A record to the response's answer.

                reply(res, req.name, address.ip(), address.ipv6());
                return res.end();
            } else { // Domain not blocked
                console.log('Domain ' + req.name + ' is NOT blocked');
                dns.lookup(req.name, {
                    all: false
                }, (err, addresses, family) => {
                    console.log('Sending real data for ' + req.name + ': ' + addresses);
                    reply(res, req.name, addresses);
                    return res.end();
                });
            }
        } else { // No internet
            console.log('Online status: ' + online);
            console.log('Responding to ' + req.remote.address + ', who is asking for ' + req.name);

            reply(res, req.name, address.ip(), address.ipv6());
            return res.end();
        }
    });
});

dnsServer.use(function (req, res) {
    //End the response if no "routes" are matched
    res.end();
});

dnsServer.listen(53535, function () {
    console.log('DNS server is listening');
});