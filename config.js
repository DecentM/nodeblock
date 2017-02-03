/* jshint esversion:6, undef: false */

var mc = require('./modulecheck');
mc.check(require.main === module);

var fs = require('fs');

module.exports = fs.readFileSync('config.json', 'utf8', function (err, data) {
    return data;
});

module.exports = JSON.parse(module.exports);