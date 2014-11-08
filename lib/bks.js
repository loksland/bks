#! /usr/bin/env node

var fs = require('fs');
var path = require('path'); 
var yaml = require('js-yaml');
var shell = require('shell');
var pad = require('pad');
var usr = require('user-settings')
var figlet = require('figlet');
var utils = require('./utils');

// Constants
// ---------
var USER_CONFIG_FILENAME = '.bksconfig';
var APP_CONFIG_FILENAME = 'app.yml';
var DATA_CONFIG_FILENAME = '_config.yml';
var LEFT_COL_PAD = 18;

// Vars
// ----
var appConfig;
var dataConfig;
var app; 
var dataDir;
var moduleRootDir;

function bks(){

	var moduleRootDir =  utils.addTrailingSlash(path.dirname(require.main.filename));
	
	app = new shell({ 
											chdir: __dirname,
											prompt: 'bks >>',
											noPrompt: true
										});
	
	// Output banner
	app.styles.ln();
	app.styles.green(figlet.textSync(' bks', {font:'chunky'})).ln();
	app.styles.ln();
	
	app.configure(function() {
			app.use(shell.history({
					shell: app
			}));
			app.use(shell.completer({
					shell: app
			}));
			app.use(shell.router({
					shell: app
			}));
			app.use(shell.help({
					shell: app,
					introduction: false
			}));
	});
	
	// Register commands
	
	app.cmd('move', 'Set data directory', function(req, res){
		
		req.question('Where is the data directory?', function(_dataDir){
			_dataDir = utils.trim(_dataDir);
  		if (utils.isSet(_dataDir) && fs.existsSync(_dataDir)){
  			dataDir = utils.addTrailingSlash(_dataDir);
  			var userConfig = usr.file(USER_CONFIG_FILENAME);
				userConfig.set('dataDir', dataDir);
  			setup();
  		} else {
  			app.styles.red('Path "'+_dataDir+'" not found').ln();
  			app.run('Move');
  		}
  	});
		
	});
	
	// Load app data
	
	try {
		appConfig = yaml.safeLoad(fs.readFileSync(moduleRootDir + APP_CONFIG_FILENAME, 'utf8'));
	} catch (err) {
		throw err;
	}
	
	// Locate data directory
	
	var userConfig = usr.file(USER_CONFIG_FILENAME);
	dataDir = userConfig.get('dataDir');
	
	if (!utils.isSet(dataDir) || !fs.existsSync(dataDir)){
		app.run('move');
	} else {
		setup();
	}
	
}

function setup(){
	
	var userConfigFile = utils.addTrailingSlash(process.env.HOME || process.env.USERPROFILE) + USER_CONFIG_FILENAME;
	
	app.styles.blue(pad(LEFT_COL_PAD, 'User config ')).print();
	app.styles.cyan(userConfigFile).ln();
	
	app.styles.blue(pad(LEFT_COL_PAD, 'Data dir ')).print();
	app.styles.cyan(dataDir).ln();
	
	app.prompt();
	
	
}

module.exports = bks();
