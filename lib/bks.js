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
var moment = require('moment');
var utils = require('./utils');

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
var reqResCallback;
var lastReq; // Store last request

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
		app.use(function(req, res, next){
			lastReq = req;
			next();
		});
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

function newOut(){
	
	newInOrOut('out');
	
}

function newInOrOut(inOrOut, questions){
	
	if (!questions){
	
		questions = [];
		for (var i = 0; i < appConfig.fields[inOrOut].length; i++){
		
			var field = utils.shallowDupe(appConfig.fields[inOrOut][i]);
			
			// Pass categories to choose from
			if (field.slug === 'cat' && field.type === 'choice'){
				field.typeConfig = {};
				field.typeConfig.choices = config[inOrOut].cats;
			}
			questions.push(field);
		}
	}

	ask(questions, function(){
		console.log('All questions asked');
		console.log('Asking again now...');
		outputFieldData(questions)
		newInOrOut(inOrOut, questions);
	});
	
};

function outputFieldData(questions) {
	
	for (var i = 0; i < questions.length; i++){
		
		var field = questions[i];
		app.styles.blue(pad(LEFT_COL_PAD, field.title + ' ')).print();
		if (field.data){
			if (field.data.isEmpty()){
				app.styles.blue('empty').ln();
			} else {
				var readable = String(field.data.readable());		
				app.styles.cyan(readable).ln();
			}
		} else {
			app.styles.blue('empty').ln();
		}
	
	}
		
};


// |questions| is an array of field objects with the following properties:
// - slug (string)
// - title (optional)
// - question (optional)
// - type (string)
// - typeConfig (obj) Optional obj passed to data type constructor
// - required (boolean)
// - default	(optional)
// - help	(help text, will be added to datatype help text)
// - data (instance of type, will override default)
function ask(questions, callback, questionIndex){
	
	// |!| test setValue and getValue are ok together
	
	if (questionIndex === undefined){	
		questionIndex = 0;
	} else if (questionIndex === questions.length){
		return callback();
	}
	
	if (questionIndex === 0){
		app.styles.green('Enter "?" for input help, "<" to go back or "cancel" to exit').ln();
	}
	
	var field = questions[questionIndex];
	var question = {};
	
	// The question text
	var prompt;
	if (field.question !== undefined){
		prompt = field.question;
	} else if (field.title !== undefined){
		prompt = field.title;
	} else {
		prompt = field.slug;
	}
	
	var defaultVal = null;

	if (field.data && !field.data.isEmpty()){
		defaultVal = field.data.readable();
	} 
	
	if (field.default === false || field.default === 0){
		field.default = String(field.default);
	}	
	
	if (!utils.isSet(defaultVal) && field.default){
		defaultVal = field.default;
	} 
	
	question[prompt] = defaultVal;
	
	if (field.data === undefined){
		// Make a new instance of data type
		field.data = new dataTypes[field.type]();
		if (field.typeConfig && field.data.config){
			field.data.config(field.typeConfig);
		}
	}
	
	lastReq.question(question, function(input){
		
		// Input is an obj with 1 prop
		for (var p in input){
			input = input[p];
			break;
		}
		
		// Concat help text: for field and data type (if set)
		var help = field.data.inputHelp();		
		help = (utils.isSet(help) ? (help + '\n') : '') + field.help;
		
		if (utils.trim(input) === 'cancel'){
			app.prompt();
			return;
		} else if (utils.trim(input) === '?'){
			app.styles.green(help);
			return ask(questions, callback, questionIndex);
		} else if (utils.trim(input) === '<' ){
			return ask(questions, callback, Math.max(0, questionIndex - 1));
		}
		
		// Attempt to parse data		
		var parseError = field.data.setValue(input);
		
		if (parseError){
			app.styles.red(parseError.message).ln();
			app.styles.green(help);
			return ask(questions, callback, questionIndex);
		} else if (field.required && field.data.isEmpty()){
			app.styles.red('Field required').ln();
			app.styles.green(help);
			return ask(questions, callback, questionIndex);
		}
		
		var readable = String(field.data.readable());
		app.styles.blue(pad(LEFT_COL_PAD, 'Got ')).print();
		app.styles.cyan(readable.length > 0 ? readable : ' ').ln();
		
		return ask(questions, callback, questionIndex + 1);
		
	});
	
}

module.exports = bks();
