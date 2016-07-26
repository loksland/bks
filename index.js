#! /usr/bin/env node


var fs = require('fs');
var path = require('path'); 
var utils = require('./lib/utils.js'); 
// HACK: 
// `shell` will break with new version of `each`
// "each": "0.4.9" is required so delete shell's own version and the older verion
// will be used
var tmpModuleRootDir = utils.addTrailingSlash(path.dirname(require.main.filename));
var newEachModuleDir = path.join(tmpModuleRootDir,'node_modules', 'shell', 'node_modules', 'each');
if (fs.existsSync(newEachModuleDir)){
	var newEachModuleDirNewName = path.join(tmpModuleRootDir,'node_modules', 'shell', 'node_modules', 'eachX');
	fs.renameSync(newEachModuleDir, newEachModuleDirNewName) 
}


module.exports = require('./lib/bks.js'); 