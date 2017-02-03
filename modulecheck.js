/* jshint esversion:6, undef: false */

function check (main) {
    if (main) {
        console.log('This file is a module of nodeblock. Please run index.js!');
        process.exit();
    }
}

check(require.main === module);

module.exports.check = check;