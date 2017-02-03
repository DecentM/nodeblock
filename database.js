/* jshint esversion:6, undef: false */

var mc = require('./modulecheck');
mc.check(require.main === module);

var mongoclient = require('mongodb').MongoClient;
var assert = require('assert');
var objectid = require('mongodb').ObjectID;
var config = require('./config');

function getUri() {
    var uri;
    if (config.mongo.uri === "") {
        uri = 'mongodb://' + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.database;
    } else {
        uri = config.mongo.uri;
    }
    return uri;
}

function returnBlocklist() {
    
}

function testConnection(callback) {
    //console.log(getParameters());
    mongoclient.connect(getUri(), function(err, db) {
        assert.equal(null, err);
//        console.log('Connected to MongoDB with: ' + getUri());
        db.close(function () {
//            console.log('Disconnected from MongoDB');
            if (typeof callback === "function") {
                callback(true);
            }
        });
        
        if (err && typeof callback === "function") {
            callback(false);
        }
    });
}

testConnection(function (result) {
    if (!result) {
        console.log('Failed to connect to MongoDB');
        process.exit();
    } else {
        console.log('MongoDB test successful with: ' + getUri());
    }
});

module.exports.test = testConnection;