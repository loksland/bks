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
//   - Green is the app // app.styles.green
//   - Blue and cyan are general notifications
//   - Yellow is action or warning
//   - Red is error
//   - White is fields
// - Dates
//   - Any reference to a date object is a momentjs date object

var fs = require('fs');
var path = require('path'); 
var yaml = require('js-yaml');
var shell = require('shell');
var pad = require('pad');
var usr = require('user-settings');
var figlet = require('figlet');
var moment = require('moment');
var utils = require('./utils');
var AsciiTable = require('ascii-table');
var currency = require('currency.js');

// Constants
// ---------
var USER_CONFIG_FILENAME = '.bksconfig';
var APP_CONFIG_FILENAME = 'app.yml';
var DATA_CONFIG_FILENAME = 'config.yml';
var LEFT_COL_PAD = 25;

// Vars
// ----
var appConfig;
var config;
var app; 
var dataDir;
var moduleRootDir;
var dataTypes;
var entityTypes;
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
	app.cmd('new in', 'Add an payment received', newIn);
	
	app.cmd('bas', 'Calculate a BAS statement', calcBAS);
	
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
	
	// Load entity types
	
	entityTypes = {};
	for (var e in appConfig.entities){
		var entityModuleFile = './entities/' + e + '.js';
		if (!fs.existsSync(entityModuleFile)){
			throw new Error('Entity module not found at "'+entityModuleFile+'"');
		}
		entityTypes[e] = require(entityModuleFile);
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

// Entities 
// --------

function newOut(req, res){
	
	newEntity('out');
	
}

function newIn(req, res){
	
	newEntity('in');
	
}

function newEntity(entityKey){

	var entity = entityTypes[entityKey](appConfig, config, dataDir, dataTypes);
	editEntity(entity);
	
}

function loadEntityFromFile(entityKey, entityDataFile){
	
	var entity = entityTypes[entityKey](appConfig, config, dataDir, dataTypes);
	
	if (!entity.readFromFile(entityDataFile)){
		return null;
	}
	
	return entity;
	
}

function editEntity(entity){
	
	quiz(entity.fields, true, function(){
		
		outputAllFieldData(entity.fields, true);
		
		var field = {};
		field.slug = 'input';
		field.type = 'bool';
		field.title = 'OK?';
		field.default = true;
		
		quiz([field], false, function(){
			
			if (!field.data.getValue()){
				editEntity(entity);
			} else {
				entity.save();
				
				app.styles.yellow(pad(LEFT_COL_PAD, 'Wrote entity ')).print();
				app.styles.cyan(entity.file).ln();
				
				app.prompt();
			}
			
		});
	});
}

// Inclusive. Assumes entities have "date" property
function getEntitiesInDateRange(entityKey, dateFrom, dateTo){
	
	var ents = [];
	
	var ioDir = dataDir + config.dirNames.io + path.sep;
	
	var startYear = utils.getFiscalYearFromDate(dateFrom);
	var endYear = utils.getFiscalYearFromDate(dateTo);
	
	for (var y = startYear; y <= endYear; y++){
	
		var fiscalYearDir = ioDir + y + path.sep;
		
		if (fs.existsSync(fiscalYearDir)){
			
			var entityDir = fiscalYearDir + config.dirNames[entityKey] + path.sep;
			var files = fs.readdirSync(entityDir);
			for (var i in files) {
				var dataFile = files[i];
				if (dataFile.charAt(0) !== '.'){
					var e = loadEntityFromFile(entityKey, entityDir + dataFile);		
					if (!e){
						throw new Error('Invalid ' + entityKey + ' entity encountered at "'+entityDir + dataFile+'"');
					}		
					if (!e.dateVal){
						throw new Error('Entity must have "date" property for date range operations');
					}
					
					if (e.dateVal() >= dateFrom && e.dateVal() <= dateTo){
						ents.push(e);
					}
				}
			}
		}
	}
	
	return ents;
	
}

// Core
// ----

function quiz(fields, showPrompt, onQuizCompleteCallback){
	
	if (showPrompt){
		app.styles.green('Enter "?" for input help, "<" to go back or "cancel" to exit').ln();
	}
	
	ask(fields, onQuizCompleteCallback, 0, null);
	
}

// |fields| is an array of field objects with the following properties:
// - slug (string)
// - title (optional)
// - question (optional)
// - type (string)
// - typeConfig (obj) Optional obj passed to data type constructor
// - required (boolean)
// - default	(optional)
// - help	(help text, will be added to datatype help text)
// - data (instance of type, will override default)

function ask(fields, onQuizCompleteCallback, fieldIndex, skipSlugs){
	 
	// Skip this question if it's in skip slugs	
	if (skipSlugs){	
		while (fieldIndex < fields.length && skipSlugs[fields[fieldIndex].slug]){
			fieldIndex++;
		}		
	}
	
	if (fieldIndex === fields.length){
		return onQuizCompleteCallback();
	}
	
	var field = fields[fieldIndex];
	// If it's an entity then data will always be present	
	initiateFieldData(field);
	
	if (field.setting){
		if (!config.settings[field.setting]){
			throw new Error('Setting "'+field.setting+'" not found');
		}
		var result = setFieldInput(field, config.settings[field.setting], false);
		if (result.success){
			return ask(fields, onQuizCompleteCallback, fieldIndex + 1, skipSlugs);
		} 
	}

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
	
	if (field.data && field.data.isSet()){		
		defaultVal = field.data.readable();
	} 
	
	if (field.default === false || field.default === 0){
		field.default = String(field.default);
	}	
	
	if (!utils.isSet(defaultVal) && field.default){
		defaultVal = field.default;
	}
	
	question[prompt] = defaultVal;
	
	lastReq.question(question, function(input){
		
		// Input is an obj with 1 prop
		for (var p in input){
			input = input[p];
			break;
		}
		
		// Concat help text: for field and data type (if set)
		var help = field.data.inputHelp();		
		if (utils.isSet(field.help)){
			help = (utils.isSet(help) ? (help + '\n') : '') + field.help;
		}
		
		if (utils.trim(input) === 'cancel'){
			app.prompt();
			return;
		} else if (utils.trim(input) === '?'){
			app.styles.green(help).ln();
			return ask(fields, onQuizCompleteCallback, fieldIndex, skipSlugs);
		} else if (utils.trim(input) === '<' ){
			
			var q = Math.max(0, fieldIndex - 1);
			// Skip settings and skip slugs
			while (q > 0 && (skipSlugs && (skipSlugs[fields[q].slug] || fields[q].setting))){
				q--;
			}
			return ask(fields, onQuizCompleteCallback, q, skipSlugs);
		}
		
		// On will save
		// field slug, old value, new value
		
		var result = setFieldInput(field, input, help, true, true);
		if (!result.success){
			return ask(fields, onQuizCompleteCallback, fieldIndex, skipSlugs);
		}
		
		if (field.slug === 'shortcode' && result.didChange){			
			// Delete all fields except shortcode
			// This is incase you've chosen a different shortcode
			var i, f;
			for (i = 0; i < fields.length; i++){
				f = fields[i];
				if (f.slug !== field.slug){
					f.data.clear();
				}
			}
			skipSlugs = {};
			var shortcodeObj = field.data.getObject();			
			for (var prop in shortcodeObj){
				for (i = 0; i < fields.length; i++){
					f = fields[i];
					if (f.slug === prop){
						initiateFieldData(f);
						if (setFieldInput(f, shortcodeObj[prop], null, false)){
							skipSlugs[f.slug] = true;
						}
						break;
					}
				}
			}
		}
		
		return ask(fields, onQuizCompleteCallback, fieldIndex + 1, skipSlugs);
		
	});
}

function initiateFieldData(field){
	if (field.data === undefined){
		// Make a new instance of data type
		field.data = new dataTypes[field.type]();
		if (field.typeConfig && field.data.config){
			field.data.config(field.typeConfig);
		}
	}
}

// Attempt to set the field's value via string input
// Returns obj with |success| boolean and |didChange| boolean
function setFieldInput(field, input, help, outputMessage, outputGenericVarName){
	
	var oldFieldIsSet = field.data ? field.data.isSet() : false;
	var oldFieldIsEmpty = field.data ? field.data.isEmpty() : true;
	var oldFieldReadable = field.data ? field.data.readable() : '';
		
	// Attempt to parse data		
	var parseError = field.data.setValue(input);
	
	if (parseError){
		if (outputMessage){
			app.styles.red(parseError.message).ln();
			app.styles.green(help).ln();
		}
		
		return {success: false, didChange: false};
		
	} else if (field.required && field.data.isEmpty()){
	
		if (outputMessage){
			app.styles.red('Field required').ln();
			app.styles.green(help).ln();
		}		
		
		return {success: false, didChange: false};
	} 
	
	if (outputMessage){
		outputFieldData(field, outputGenericVarName);
	}
	
	var newFieldIsSet = field.data ? field.data.isSet() : false;
	var newFieldIsEmpty = field.data ? field.data.isEmpty() : true;
	var newFieldReadable = field.data ? field.data.readable() : '';
	var didChange = newFieldIsSet !== oldFieldIsSet || newFieldIsEmpty !== oldFieldIsEmpty || oldFieldReadable !== newFieldReadable;
	
	return {success: true, didChange: didChange};

}

function outputAllFieldData(fields, skipSettingsFields) {
	
	app.styles.green(' ').ln();
	app.styles.green(pad(LEFT_COL_PAD,' ') + 'Summary').ln();
	
	for (var i = 0; i < fields.length; i++){
		if (!skipSettingsFields || !fields[i].setting){
			outputFieldData(fields[i], false);
		}
	}
}

function outputFieldData(field, outputGenericVarName) {

	var title = outputGenericVarName ? 'Got' : field.title;

	app.styles.blue(pad(Math.max(LEFT_COL_PAD, field.title.length + 1), title + ' ')).print();
	if (field.data){
		if (!field.data.isSet()){
			app.styles.blue('empty').ln();
		} else {
			var readable = String(field.data.readable());		
			app.styles.cyan(readable).ln();
		}
	} else {
		app.styles.blue('empty').ln();
	}
	
}

// BAS
// ---

function calcBAS(req, res){
	
	var field = {};
	//field.slug = 'quarter';
	//field.type = 'choice';
	//field.title = 'Select quarter';
	//field.default = true;
	
	field.slug = 'quarter';
	field.type = 'choice';
	field.title = 'Select quarter';
	field.required = true;
	 
	field.typeConfig = {};
	field.typeConfig.choices = {};
	field.typeConfig.choiceLabelKeys = ['_title','title'];		
		
	//field.typeConfig.choices['2014 Q1'] = 'Jan 01 to March 31 2014';
	//field.typeConfig.choices['2014 Q2'] = 'Apr 01 to May 31 2014';
	
	utils.pr(utils.getQuarterFromDate(moment()));
	
	var qrtrs = quarterList();
	
	for (var i = 0; i < qrtrs.length; i++){
		var key = qrtrs[i].quarter + '.' + qrtrs[i].year;
		if (i === 0){
			field.default = key;
		}
		field.typeConfig.choices[key] = utils.quarterReadable(qrtrs[i].year,qrtrs[i].quarter);
		
	}
	 
	quiz([field], false, function(){
		
		var val = field.data.getValue();
		var q = Number(val.split('.')[0]);
		var y = Number(val.split('.')[1]);
		
		for (var i = 0; i < qrtrs.length; i++){
			if (q === qrtrs[i].quarter && y === qrtrs[i].year){
				processQuarter(y, q);
				break;
			}
		}
	});
		
}

function processQuarter(year, quarter) {
	
	var qDateRangeArr = utils.dateRangesFromQuarter(year, quarter);
	var outs = getEntitiesInDateRange('out', qDateRangeArr[0], qDateRangeArr[1]);
	
	app.styles.blue(pad(LEFT_COL_PAD, 'Found ')).print();
	app.styles.cyan(String(outs.length) + ' results').ln();
	
	if (outs.length === 0){
		app.prompt();
		return;
	}
	
	var table = new AsciiTable('Out');
	table.setHeading('Date', 'Title', 'Amount', '%', 'Inc GST', 'Ex GST', 'GST');
	
	var totalDeductibleAmtExGSTCapital = currency(0);
	var totalDeductibleAmtExGSTNonCapital = currency(0);
	var totalDeductibleGST = currency(0);
	
	for (var i = 0; i < outs.length; i++){
		var out = outs[i];
		if (out.gst()){ // Only process GST transactions
			
			var deductibleAmountExGST = out.deductibleAmountExGST();
			var deductibleGSTAmount = out.deductibleGSTAmount();
			if (out.capital()){
				totalDeductibleAmtExGSTCapital = totalDeductibleAmtExGSTCapital.add(deductibleAmountExGST.value);
			} else {
				totalDeductibleAmtExGSTNonCapital = totalDeductibleAmtExGSTNonCapital.add(deductibleAmountExGST.value);
			}
			totalDeductibleGST = totalDeductibleGST.add(deductibleGSTAmount.value);
			
			table.addRow(out.date(), out.title(), out.amount(), out.percentage(), out.deductibleAmountIncGST(), deductibleAmountExGST, deductibleGSTAmount);
			
		}
	}
	app.styles.blue(table.toString()).ln();
	app.styles.ln();

	var tableSummary = new AsciiTable('Q' + String(quarter) + ' ' + String(year));
	tableSummary.addRow('Total sales *', 'G1', '?');
	tableSummary.addRow('Does the amount shown at G1 include GST?', '', 'Yes');
	tableSummary.addRow('Export sales', 'G2', '?');
	tableSummary.addRow('Other GST-free sales', 'G3', '?');
	tableSummary.addRow('GST on sales *', '1A', '?');
	tableSummary.addRow('Capital purchases', 'G10', Math.round(totalDeductibleAmtExGSTCapital));
	tableSummary.addRow('Non-capital purchases', 'G11',  Math.round(totalDeductibleAmtExGSTNonCapital));
	tableSummary.addRow('GST on purchases', '1B', Math.round(totalDeductibleGST.value));
	app.styles.cyan(tableSummary.toString()).ln();
	app.styles.ln();
	
	app.prompt();
	
}

// Utils
// -----

// Returns an array of the fiscal years present in the data dir (YYYY)
function fiscalYears(){
	
	var yrs = [];
	var ioDir = dataDir + config.dirNames.io + path.sep;
	
	var files = fs.readdirSync(ioDir);
	for (var i in files) {
		var fileName = files[i];
		if (fileName.length === 4 && !isNaN(Number(fileName)) && fs.lstatSync(ioDir + fileName).isDirectory()){
			yrs.push(Number(fileName));
		}
	}
	
	return yrs;
	
}

// Retrieves fiscal quarters present in data
function quarterList(){

	var qrtrs = [];

	var yrs = fiscalYears();
	var lastQ = utils.getLastQuarterEndedBeforeDate(moment());
	
	for (var i = 0; i < yrs.length; i++){
		var y = yrs[i];
		for (var q = 4; q >= 1; q--){
			if (y !== lastQ.year || q <= lastQ.quarter) {
				qrtrs.push({year:y, quarter:q});
			}
		}
	}
	
	return qrtrs;

}

module.exports = bks();
