#! /usr/bin/env node

// Code conventions
// ----------------
// - Paths
//   - fooDir is a dir path
//   - fooDirName is a dir name 
//   - barFile is a file path
//   - barFileName is a file name 
//   - dirPaths always have trailing slash
// - Colors
//   - Green is the app
//   - Blue and cyan are general notifications
//   - Yellow is action or warning
//   - Red is error
//   - White is questions

var fs = require('fs');
var path = require('path'); 
var yaml = require('js-yaml');
var shell = require('shell');
var pad = require('pad');
var usr = require('user-settings');
var figlet = require('figlet');
var utils = require('./utils');
var moment = require('moment');
 
// Constants
// ---------
var USER_CONFIG_FILENAME = '.bksconfig';
var APP_CONFIG_FILENAME = 'app.yml';
var DATA_CONFIG_FILENAME = 'config.yml';
var LEFT_COL_PAD = 14;

// Vars
// ----
var appConfig;
var config;
var app; 
var dataDir;
var moduleRootDir;
var dataTypes;

function bks(){

	moduleRootDir =  utils.addTrailingSlash(path.dirname(require.main.filename));
	
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
	
	app.cmd('move', 'Set data directory', move);
	
	app.cmd('new out', 'Add an expense', newOut);
	
	// Locate data directory
	
	var userConfig = usr.file(USER_CONFIG_FILENAME);
	dataDir = userConfig.get('dataDir');
	
	if (!utils.isSet(dataDir) || !fs.existsSync(dataDir)){
		app.run('move');
	} else {
		dataDir = utils.addTrailingSlash(dataDir);
		setup();
	}
	
}

// Assumes data dir is present
function setup(){
	
	// Load app config
	
	try {
		appConfig = yaml.safeLoad(fs.readFileSync(moduleRootDir + APP_CONFIG_FILENAME, 'utf8'));
	} catch (err) {
		throw err;
	}
	
	// Load data types
	
	dataTypes = {};
	for (var t in appConfig.dataTypes){
		var typeModuleFile = './types/' + t + '.js';
		if (!fs.existsSync(typeModuleFile)){
			throw new Error('Type module not found at "'+typeModuleFile+'"');
		}
		dataTypes[t] = require(typeModuleFile);
	}
	
	// Load data config
	
	try {
		config = yaml.safeLoad(fs.readFileSync(dataDir + DATA_CONFIG_FILENAME, 'utf8'));
	} catch (err) {
		throw err;
	}

	// Output environment vars to user
	
	var userConfigFile = utils.addTrailingSlash(process.env.HOME || process.env.USERPROFILE) + USER_CONFIG_FILENAME;
	
	//app.styles.blue(pad(LEFT_COL_PAD, 'User config ')).print();
	//app.styles.cyan(userConfigFile).ln();
	
	app.styles.blue(pad(LEFT_COL_PAD, 'Using ')).print();
	app.styles.cyan(dataDir).ln();
	
	// Make sure basic dirs are present
	
	var jobsDir = utils.addTrailingSlash(dataDir + config.dirNames.jobs);
	if (!fs.existsSync(jobsDir)){
		fs.mkdirSync(jobsDir);
		app.styles.yellow(pad(LEFT_COL_PAD, 'Added ')).print();
		app.styles.cyan(jobsDir).ln();
	}
	
	var ioDir = utils.addTrailingSlash(dataDir + config.dirNames.io);
	if (!fs.existsSync(ioDir)){
		fs.mkdirSync(ioDir);
		app.styles.yellow(pad(LEFT_COL_PAD, 'Added ')).print();
		app.styles.cyan(ioDir).ln();
	}
	
	app.styles.ln();
	app.prompt();
	
}

// Commands
// --------

function move(req, res){
		
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
	
}

function newOut(req, res){
	
	newIONextQuestion('out', 0, null, req, res);
	
}


// |!| This method receives an array of questions - with type and default and required etc.
// |!| At the end it will call back and provide the same array EXCEPT: value is added
// |!| You can then set the values to be used as the default and run it through the ringer again.

function newIONextQuestion(inOrOut, fieldIndex, data, req, res){
	
	if (fieldIndex === 0){
		if (data === null){
			data = {};
			res.green('Enter "?" for input help').ln();
		}
	} else if (fieldIndex === appConfig.fields[inOrOut].length){
		return onNewIODataEntered(inOrOut, data, req, res);
	} 
	
	var field = appConfig.fields[inOrOut][fieldIndex];
	
	var question = {};
	question[field.title] = field.default === false ? 'false' : field.default;
	
	req.question(question, function(input){
		
		for (var p in input){
			input = input[p];
			break;
		}
		
		var fieldData = new dataTypes[field.type]();
		
		if (field.slug === 'cat' && field.type === 'choice'){
			fieldData.setChoices(config[inOrOut].cats);
		} 
		
		var help = [fieldData.inputHelp(), field.help];
		if (utils.trim(input) === '?'){
			outputFieldHelp(res, help);
			return newIONextQuestion(inOrOut, fieldIndex, data, req, res);
		}
		
		// Attempt to parse data
		var parseError = fieldData.setValue(input);
		
		if (parseError){
			res.red(parseError.message).ln();
			outputFieldHelp(res, help);
			return newIONextQuestion(inOrOut, fieldIndex, data, req, res);
		} else if (field.required && fieldData.isEmpty()){
			res.red('Field required').ln();
			outputFieldHelp(res, help);
			return newIONextQuestion(inOrOut, fieldIndex, data, req, res);
		} 
		
		var readable = String(fieldData.readable());
		app.styles.blue(pad(LEFT_COL_PAD, 'Got ')).print();
		app.styles.cyan(readable.length > 0 ? readable : ' ').ln();
		
		data[field.slug] = fieldData;
		newIONextQuestion(inOrOut, fieldIndex+1, data, req, res);
	
	});
	
}

function outputFieldHelp(res, lines){
	for (var i = 0; i < lines.length; i++){
		if (utils.isSet(lines[i])){
			res.green(lines[i]).ln();
		}
	}
}

function onNewIODataEntered(inOrOut, data, req, res){
	
	
	
	
}

module.exports = bks();
