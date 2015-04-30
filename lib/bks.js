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
var fsextra = require('fs-extra');
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
var csv = require('fast-csv');
var glob = require('glob');

// Constants
// ---------
var USER_CONFIG_FILENAME = '.bksconfig';
var APP_CONFIG_FILENAME = 'app.yml';
var DATA_CONFIG_FILENAME = 'config.yml';
var APP_TEMPLATE_DIRNAME = 'templates';
var DATA_CONFIG_OVERRIDE_FILENAME = 'config.override.yml';

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
var _forceApplyNextShortcode;

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
	app.cmd('scour', 'Scour all statements within scour directory for in/out data', scour);
	
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
		fsextra.copySync(path.resolve(moduleRootDir,APP_TEMPLATE_DIRNAME,DATA_CONFIG_FILENAME), dataDir + DATA_CONFIG_FILENAME);
		
		try {
			config = yaml.safeLoad(fs.readFileSync(dataDir + DATA_CONFIG_FILENAME, 'utf8'));
		} catch (err) {
			throw err
		}
		
	}
	
	// Load data config override
	
	try {
		var configOverride = yaml.safeLoad(fs.readFileSync(moduleRootDir + DATA_CONFIG_OVERRIDE_FILENAME, 'utf8'));		
		config = utils.addPropsOverrideNonObjectsIfExists(config, configOverride);		
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
	
	/*
	var jobsDir = utils.addTrailingSlash(dataDir + config.dirNames.jobs);
	if (!fs.existsSync(jobsDir)){
		fs.mkdirSync(jobsDir);
		app.styles.yellow(pad(LEFT_COL_PAD, 'Added ')).print();
		app.styles.cyan(jobsDir).ln();
	}
	*/
	var ioDir = utils.addTrailingSlash(dataDir + config.dirNames.io);
	if (!fs.existsSync(ioDir)){
		fs.mkdirSync(ioDir);
		app.styles.yellow(pad(LEFT_COL_PAD, 'Added ')).print();
		app.styles.cyan(ioDir).ln();
	}
	
	var scourDir =  utils.addTrailingSlash(dataDir + config.dirNames.scour);
	if (!fs.existsSync(scourDir)){
		fs.mkdirSync(scourDir);
		app.styles.yellow(pad(LEFT_COL_PAD, 'Added ')).print();
		app.styles.cyan(scourDir).ln();
	}
		
	var scourProcessedDir = utils.addTrailingSlash(scourDir + config.dirNames.scourProcessed);
	if (!fs.existsSync(scourProcessedDir)){
		fs.mkdirSync(scourProcessedDir);
		app.styles.yellow(pad(LEFT_COL_PAD, 'Added ')).print();
		app.styles.cyan(scourProcessedDir).ln();
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
	
	newEntity('out', true);
	
}

function newIn(req, res){
	
	newEntity('in', true);
	
}

// |newEntryCallback| optional
function newEntity(entityKey, editImmediately){

	var entity = entityTypes[entityKey](appConfig, config, dataDir, dataTypes);
	if (editImmediately){
		editEntity(entity);
	} else {
		return entity;
	}
	
}

function loadEntityFromFile(entityKey, entityDataFile){
	
	var entity = entityTypes[entityKey](appConfig, config, dataDir, dataTypes);
	
	if (!entity.readFromFile(entityDataFile)){
		return null;
	}
	
	return entity;
	
}

function editEntityWithSkipOption(entity, saveCallback, cancelCallback, offerToSkip){
	if (offerToSkip){
	
		booleanPrompt('Skip?', true, function(){
		
			cancelCallback();
		
		}, function(){
		
			editEntity(entity, saveCallback, cancelCallback);
		
		});
	
	} else {
	
		editEntity(entity, saveCallback, cancelCallback);
		
	}

}

function outputPotentialConflicts(entity, firstrun){
	
		var filePath = entity.filePath();
		if (!firstrun){
			app.styles.blue(pad(LEFT_COL_PAD, 'Path ')).print();
			app.styles.cyan(filePath).ln();
		}
		
		var alreadyExists = false;
		if (fs.existsSync(filePath) && filePath != entity.file){
			
			alreadyExists = true;
			app.styles.red(pad(LEFT_COL_PAD, 'WARNING ')).print();
			app.styles.red('File already exists').ln();
			app.styles.ln();
			
		} else {
			
			var files = glob(entity.getContainingDir() + entity.dateFileNamePrefix() + '*' + entity.ext, {sync: true, nounique: true, nodir: true});
			if (files.length > 0){
				var header = 'Others on the same day:'
				app.styles.green(pad(LEFT_COL_PAD + header.length - 5, header)).ln();
			}
			for (var i = 0; i < files.length; i++){
				app.styles.green(pad(LEFT_COL_PAD, 'File ')).print();
				app.styles.green(files[i]).ln();
				app.styles.ln();
			}
		}
		
		return alreadyExists;
}

function editEntity(entity, saveCallback, cancelCallback){
	
	outputPotentialConflicts(entity, true);
	
	quiz(entity.fields, true, function(){
		
		outputAllFieldData(entity.fields, true);
		
	  alreadyExists = outputPotentialConflicts(entity, false);	
		
		/*
		var filePath = entity.filePath();
		app.styles.blue(pad(LEFT_COL_PAD, 'Path ')).print();
		app.styles.cyan(filePath).ln();
		
		var alreadyExists = false;
		if (fs.existsSync(filePath) && filePath != entity.file){
			alreadyExists = true;
			app.styles.red(pad(LEFT_COL_PAD, 'WARNING ')).print();
			app.styles.red('File already exists').ln();
		} else {
			var files = glob(entity.getContainingDir() + entity.dateFileNamePrefix() + '*' + entity.ext, {sync: true, nounique: true, nodir: true});
			if (files.length > 0){
				var header = 'Others on the same day:'
				app.styles.green(pad(LEFT_COL_PAD + header.length - 5, header)).ln();
			}
			for (var i = 0; i < files.length; i++){
				app.styles.green(pad(LEFT_COL_PAD, 'File ')).print();
				app.styles.green(files[i]).ln();
			}
		}
		*/
		
		var field = {};
		field.slug = 'input';
		field.type = 'bool';
		field.title = alreadyExists ? 'Overwrite?' : 'Save?';
		field.help = ':X to cancel';
		field.default = true;
		
		quiz([field], false, function(){
			
			//utils.pr(entity);
			
			if (!field.data.getValue()){
				editEntity(entity, saveCallback, cancelCallback);
			} else {			
				entity.save();
								
				app.styles.ln();
				app.styles.yellow(pad(LEFT_COL_PAD, 'Wrote entity ')).print();
				app.styles.cyan(entity.file).ln();
				app.styles.ln();
				
				if (saveCallback){
					saveCallback();
				} else {
					app.prompt();
				}
			}
			
		}, cancelCallback);
		
		
	}, cancelCallback);
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

function quiz(fields, showPrompt, onQuizCompleteCallback, onQuizSkipCallback){
	
	if (showPrompt){
		app.styles.green('Enter \'?\' for input help, \'<\' to go back or \':X\' to skip').ln();
	}
	
	ask(fields, onQuizCompleteCallback, onQuizSkipCallback, 0, null);
	
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

function ask(fields, onQuizCompleteCallback, onQuizSkipCallback, fieldIndex, skipSlugs){
	 
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
	
	//if (field.data){
	//	if (!field.data.isSet()){
	//			console.log('a) No field data');
	//	} else {
	//		console.log('a) Field data ok ');
	//	}
	//} else {
	//	console.log('a) No field ');
	//}
	
	// If it's an entity then data will always be present	
	initiateFieldData(field);
	
	if (field.setting){
		if (!config.settings[field.setting]){
			throw new Error('Setting "'+field.setting+'" not found');
		}
		var result = setFieldInput(field, config.settings[field.setting], false);
		if (result.success){
			return ask(fields, onQuizCompleteCallback, onQuizSkipCallback, fieldIndex + 1, skipSlugs);
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
		
		if (input != undefined && String(utils.trim(input)).toUpperCase() === ':X'){
			if (onQuizSkipCallback) {
				onQuizSkipCallback();
			} else {
				app.prompt();
			}
			return;
		} else if (utils.trim(input) === '?'){
			app.styles.green(help).ln();
			return ask(fields, onQuizCompleteCallback, onQuizSkipCallback, fieldIndex, skipSlugs);
		} else if (utils.trim(input) === '<' ){
			
			var q = Math.max(0, fieldIndex - 1);
			// Skip settings and skip slugs
			while (q > 0 && (skipSlugs && (skipSlugs[fields[q].slug] || fields[q].setting))){
				q--;
			}
			return ask(fields, onQuizCompleteCallback, onQuizSkipCallback, q, skipSlugs);
		}
		
		// On will save
		// field slug, old value, new value
		
		var result = setFieldInput(field, input, help, true, true);
		if (!result.success){
			return ask(fields, onQuizCompleteCallback, onQuizSkipCallback, fieldIndex, skipSlugs);
		}
		
		if (field.slug === 'shortcode'){
			
			if (result.didChange || _forceApplyNextShortcode){
				_forceApplyNextShortcode = false; 	
				// Delete all fields except shortcode
				// This is incase you've chosen a different shortcode
				var i, f;
				var clearAllData = false;
				if (clearAllData){
					for (i = 0; i < fields.length; i++){
						f = fields[i];
						if (f.slug !== field.slug){
							f.data.clear();
						}
					}
				}
				skipSlugs = {};
				var shortcodeObj = field.data.getObject();			
				for (var prop in shortcodeObj){
					for (i = 0; i < fields.length; i++){
						f = fields[i];
						if (f.slug === prop){
							if (!clearAllData){
								f.data.clear();
							}
							initiateFieldData(f);
							if (setFieldInput(f, shortcodeObj[prop], null, false)){
								skipSlugs[f.slug] = true;
							}
							break;
						}
					}
				}
			}
		}
		
		return ask(fields, onQuizCompleteCallback, onQuizSkipCallback, fieldIndex + 1, skipSlugs);
		
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
			if (readable && readable.length > 0){
				app.styles.cyan(readable).ln();
			} else {
				app.styles.cyan(' ').ln();
			}
		}
	} else {
		app.styles.blue('empty').ln();
	}
	
}

// Scour
// -----

function scour(req, res){
	
	var scourQueueDir = utils.addTrailingSlash(dataDir + config.dirNames.scour);
	
	var files = fs.readdirSync(scourQueueDir);
	for (var i in files) {
		var statementFile = files[i];	
		for (var p in config.scour){
			if (statementFile.toLowerCase().split(p.toLowerCase()).length > 1){
				scourStatement(scourQueueDir + statementFile, p, onScourDone);				
				return;
			}
		}
	}
	
	if (req && res){
		if (files.length){
			app.styles.yellow('No files found at "' + dataDir + config.dirNames.scour + '"').ln();
		} else {
			app.styles.yellow('No matching filenames found at "' + dataDir + config.dirNames.scour + '"').ln();
		}
		app.styles.ln();
	}
	
	app.prompt();
	
}

function onScourDone(statementFile){
	
	var filename = path.basename(statementFile);
	
	var scourProcessedDir = utils.addTrailingSlash(utils.addTrailingSlash(dataDir + config.dirNames.scour) + config.dirNames.scourProcessed);
	fs.renameSync(statementFile, scourProcessedDir + filename);
	
	app.styles.yellow(pad(LEFT_COL_PAD, 'Moved statement ')).print();
	app.styles.cyan(config.dirNames.scour + path.sep + config.dirNames.scourProcessed+ path.sep + filename).ln();
	app.styles.ln();
	
	scour();
	
}

function scourStatement(statementFile, scourConfigName, scourCallback){
				
	app.styles.blue(pad(LEFT_COL_PAD, 'Found ')).print();
	app.styles.cyan(statementFile).ln();
	
	app.styles.blue(pad(LEFT_COL_PAD, 'Using config ')).print();
	app.styles.cyan(scourConfigName).ln();
	
	var statementExt = path.extname(statementFile);
	if (statementExt != '.csv'){
		throw new Error('Only CSV files are supported for scouring');
	}
	
	var rowData = [];
	
	// https://www.npmjs.com/package/fast-csv
	csv
		.fromPath(statementFile, {headers:config.scour[scourConfigName].headerRow, ignoreEmpty:true, delimiter:config.scour[scourConfigName].colDelimiter})
		.on('data', function(data){
	 		rowData.push(data);
		})
	 	.on('end', function(){
			onScourStatementData(rowData, statementFile, scourConfigName, scourCallback);
	 	});
	
};

// Preview the data and proposed field mapping
function onScourStatementData(rowData, statementFile, scourConfigName, scourCallback){
	
	if (config.scour[scourConfigName].reverse){
		rowData.reverse();
	}
	
	var maxCols = 0;
	for (var i = 0; i < rowData.length; i++){
		maxCols = Math.max(maxCols, rowData[i].length);
	}
	
	var statementExt = path.extname(statementFile);
	var statementBase = path.basename(statementFile, statementExt);
	var table = new AsciiTable(statementBase + statementExt);

	makeFieldMappingHeader(table, maxCols, scourConfigName);
	
	var firstIndex = config.scour[scourConfigName].headerRow ? 1 : 0;
	var lastIndex = rowData.length - 1;
	var lastIndexReached = false;
	for (var i = firstIndex; i < Math.min(15,rowData.length); i++){
		if (lastIndex == i){
			lastIndexReached = true;
		}
		var sampleData = [i+1]; // This should match opening the CSV in excel		
		for (var j = 0; j < rowData[i].length; j++){
			sampleData.push(String(rowData[i][j]));
		}
		table.addRow.apply(table, sampleData);
	}
	
	if (!lastIndexReached){
	
		var dotdotdot = ['...']
		for (var i = 0; i < maxCols; i++){
			dotdotdot.push('...')
		}
		table.addRow.apply(table, dotdotdot);
	
		var lastRowData = [lastIndex + 1];	
		for (var j = 0; j < rowData[lastIndex].length; j++){
			lastRowData.push(String(rowData[lastIndex][j]));
		}
		table.addRow.apply(table, lastRowData);
	
	}
	app.styles.cyan(table.toString()).ln();
	app.styles.ln();
	
	var field = {};
	field.slug = 'startRow';
	field.type = 'integer';
	field.title = 'Start row?';
	field.default = firstIndex + 1;
	field.required = true;
	
	quiz([field], false, function(){
		
		newEntityFromDataEntry(field.data.getValue()-1, rowData, statementFile, scourConfigName, scourCallback);
		
	});	
}

function makeFieldMappingHeader(table, maxCols, scourConfigName){

	var headings = [''];
	for (var i = 0; i < maxCols; i++){
		var fieldmapping = config.scour[scourConfigName].fields[String(i)];
		headings.push(String(i) +(fieldmapping ? ':' + fieldmapping : ''));
	}
	table.setHeading.apply(table, headings);
	
}

function newEntityFromDataEntry(index, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, jumpIndexes){
	
	if (!skipIndexes){
		skipIndexes = {};
	}
	if (!jumpIndexes){
		jumpIndexes = {};
	}
	
	if (index >= rowData.length){
		
		var notSkipped = {};
		var totalSkipped = 0;
		var table = new AsciiTable('Skipped rows');
		makeFieldMappingHeader(table, rowData[0].length, scourConfigName);
		
		for (var i = 0; i < rowData.length; i++){
			if (skipIndexes[i]){
				totalSkipped++;
				var sampleData = [i+1];		
				for (var j = 0; j < rowData[i].length; j++){
					sampleData.push(String(rowData[i][j]));
				}
				table.addRow.apply(table, sampleData);
				
			} else {
				notSkipped[i] = true;
			}
		}
		
		if (totalSkipped === 0){
			return scourCallback(statementFile);
		}
		
		app.styles.cyan(table.toString()).ln();
		app.styles.ln();
		
		booleanPrompt('Skip these forever?', true, function(){
			
			return scourCallback(statementFile);
			
		}, function(){
			
			newEntityFromDataEntry(0, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, notSkipped)
			
		});
		
		return;
	}
	
	if (jumpIndexes[index]){
		newEntityFromDataEntry(index+1, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, jumpIndexes);
		return;
	}
	
	var row = rowData[index];
	
	var amountCol;
	for (var f in config.scour[scourConfigName].fields){
		if (config.scour[scourConfigName].fields[f] == 'amount'){
			amountCol = Number(f);
			break
		}
	}
		
	var amount = Number(rowData[index][amountCol]);
	var entityKey;
	
	if (!isNaN(amount)){		
		if (amount < 0){
			entityKey = 'out';
			amount = Math.abs(amount);
		} else if (amount > 0){
			entityKey = 'in';
		}
	} 
	
	var table = new AsciiTable(entityKey);
	
	makeFieldMappingHeader(table, rowData[index].length, scourConfigName);
	
	var tableRow = [String(index+1)+'/' + rowData.length]
	for (var j = 0; j < rowData[index].length; j++){
		tableRow.push(String(rowData[index][j]));
	}
	table.addRow.apply(table, tableRow);		
	
	app.styles.cyan(table.toString()).ln();
	app.styles.ln();
	
	if (entityKey){		
		
		var promptForSkip = false;
		var dataObj = {};
		
		// Build |dataObj| with data from row
		dataObj.amount = amount;				
		for (var f in config.scour[scourConfigName].fields){
			var fieldSlug = config.scour[scourConfigName].fields[f];
			if (fieldSlug != 'amount'){
				if (f >= 0 && f < rowData[index].length - 1){
					var entry = rowData[index][f];
					if (utils.isSet(entry)){
						if (dataObj[fieldSlug] === undefined){
							dataObj[fieldSlug] = entry;
						} else {
							dataObj[fieldSlug] += ', ' + entry;
						}
					}
				}
			}
		}
		
		// Apply scour rules
		// -----------------
		
		var offerToSkip = false;
		var autoSkip = false;
		
		if (config.entities[entityKey].scourrules){
			
			for (var k = 0; k < config.entities[entityKey].scourrules.length; k++){
			
				var rule = config.entities[entityKey].scourrules[k];
				
				if (rule.critera){
					
					var match = false;
					var citeriaSummary = '';
					for (var criteraField in rule.critera){ 
					
						// if |criteraA| OR |criteraB| then match
						if (dataObj[criteraField] !== undefined){
							
							var criteriaFields;
							if (typeof(rule.critera[criteraField]) == 'string'){
								criteriaFields = [rule.critera[criteraField]];
							} else {
								criteriaFields = rule.critera[criteraField];
							}
							
							for (var kk = 0; kk < criteriaFields.length; kk++){
								
								if (citeriaSummary.length > 0){
									citeriaSummary+=',';
								}
								citeriaSummary+=criteriaFields[kk];
								
								var re = new RegExp(criteriaFields[kk],'gmi');
								var m;
								if ((m = re.exec(dataObj[criteraField])) !== null) {
									match = true;
								} else {
									match = false;
									break
								}
							}
							
							if (!match){
								break;
							}
						}
					}
					
					if (match){				
						
						var ruleTitle;
						
						if (rule.title){
							ruleTitle = rule.title;
						}
						
						// Overwrite fields 
						if (rule.fields){
							for (var setField in rule.fields){								
								dataObj[setField] = rule.fields[setField];		
								if (setField == 'title' && !ruleTitle){
									ruleTitle = rule.fields[setField];
								}
							}
						}
						
						if (!ruleTitle){
							ruleTitle = citeriaSummary;
						}
						
						if (rule.actions){
							if (rule.actions.skip){
								offerToSkip = true;
							} else if (rule.actions.autoSkip){
								autoSkip = true;
							}
						}
						
						app.styles.green(pad(LEFT_COL_PAD, 'Matched rule ')).print();
						app.styles.yellow(ruleTitle).ln();
						app.styles.ln();
						
						break; // Apply first matching rule
						
					}
				}
			}
		}
		
		// Clean up data
		// -------------
		var shortCodeWasSet = false;
		if (dataObj.shortcode === undefined){
			dataObj.shortcode = '-';
		} else {
			shortCodeWasSet = true;
		}
		if (dataObj.notes === undefined){
			dataObj.notes = '';
		} else {
			dataObj.notes+= ' ';
		}
		dataObj.notes+= '(' + path.basename(statementFile) + ' row:' + String(index + 1) + ')';
		
		// Edit entity and move on
		// -----------------------
		
		var entity = newEntity(entityKey, false);
		var result = entity.setFieldDataFromDataObj(dataObj, true, false);		
		if (result.success && !autoSkip){
			if (shortCodeWasSet){
				_forceApplyNextShortcode = true;
			}
			editEntityWithSkipOption(entity, function(){
			
				skipIndexes[index] = false;
				delete skipIndexes[index];
				
				newEntityFromDataEntry(index+1, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, jumpIndexes);
		
			}, function(){
				
				app.styles.ln();
				app.styles.yellow(pad(LEFT_COL_PAD, 'Skipping...')).ln();
				app.styles.ln();
				
				skipIndexes[index] = true;
				newEntityFromDataEntry(index+1, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, jumpIndexes);
				
			}, offerToSkip);
			
			return;
			
		} else {
			
			// Proceed to skip...
			skipIndexes[index] = true;
			if (autoSkip){
				app.styles.yellow('Auto skipping...').ln();
			} else {
				app.styles.red(result.msg).ln();
				app.styles.ln();
				app.styles.yellow('Failed to parse row. Skipping...').ln();
			}
			app.styles.ln();
			setTimeout(function(){
				newEntityFromDataEntry(index+1, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, jumpIndexes);
			}, 500);	
			
			return;
			
		}
	} 
	
	skipIndexes[index] = true;
	
	app.styles.yellow('Failed to parse row. Skipping...').ln();
	app.styles.ln();
	
	setTimeout(function(){
		newEntityFromDataEntry(index+1, rowData, statementFile, scourConfigName, scourCallback, skipIndexes, jumpIndexes);
	}, 500);	
	
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
	
	//utils.pr(utils.getQuarterFromDate(moment()));
	
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
	var ins = getEntitiesInDateRange('in', qDateRangeArr[0], qDateRangeArr[1]);
		
	app.styles.blue(pad(LEFT_COL_PAD, 'Found ')).print();
	app.styles.cyan(String(outs.length) + ' outs & ' + String(ins.length) + ' ins').ln();
	
	if (outs.length === 0){
		app.prompt();
		return;
	}
		    
	// In
	// --
	
	var table = new AsciiTable('In');
	table.setHeading('Date', 'Ref', 'Cat', 'Amount', 'Ex GST', 'GST');
	
	var totalSalesAmtIncGST = currency(10);
	var totalSalesGSTPortion = currency(0);
	var totalSalesNonGSTPortion = currency(0);
	var totalExportAmtNonGST = currency(0);
	var totalOtherAmtNonGST = currency(0);

	for (var i = 0; i < ins.length; i++){
		var indata = ins[i];
		
		totalSalesAmtIncGST = totalSalesAmtIncGST.add(indata.amount());
		totalSalesGSTPortion = totalSalesGSTPortion.add(indata.GSTPortion().value);
		totalSalesNonGSTPortion = totalSalesNonGSTPortion.add(indata.nonGSTPortion().value);
		
		if (indata.gstcat() == 'export'){
			totalExportAmtNonGST = totalExportAmtNonGST.add(indata.amount());
		} else if (indata.gstcat() == 'other'){
			totalOtherAmtNonGST = totalOtherAmtNonGST.add(indata.amount());
		}
		
		table.addRow(indata.date(), indata.title(), indata.gstcat(), indata.amount(), indata.nonGSTPortion(), indata.GSTPortion());
	
	}
	app.styles.blue(table.toString()).ln();
	app.styles.ln();
	
	// Out
	// ---
	
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
	
	// Earmarking
	// ----------
	
	if (config.entities.in.earmarks){
	
		var tableSummary = new AsciiTable('Earmarks');
		tableSummary.setHeading('Total sales ex  GST', '%', Math.round(totalSalesNonGSTPortion.value));
		
		for (var earmarkSlug in config.entities.in.earmarks){
			
			var earmark = config.entities.in.earmarks[earmarkSlug];
			var title = earmark.title ? earmark.title : earmarkSlug;
			var percentage = Number(earmark.percentage);
			if (isNaN(percentage) || percentage > 1.0 || percentage  < 0.0){
				throw new Error('Invalid earmark percentage "' + earmarkSlug + '"');
			}
			var amt = totalSalesNonGSTPortion.multiply(percentage);
			tableSummary.addRow(title, String(percentage*100), Math.round(amt.value));
			
		}
		app.styles.cyan(tableSummary.toString()).ln();
		app.styles.ln();	
	
	}
	
	// Summary
	// -------
	
	var tableSummary = new AsciiTable('Q' + String(quarter) + ' ' + String(year));
	tableSummary.addRow('Total sales *', 'G1', Math.round(totalSalesNonGSTPortion.value));
	tableSummary.addRow('Does the amount shown at G1 include GST?', '', 'No');
	tableSummary.addRow('Export sales', 'G2', Math.round(totalExportAmtNonGST.value));
	tableSummary.addRow('Other GST-free sales', 'G3', Math.round(totalOtherAmtNonGST.value));
	tableSummary.addRow('GST on sales *', '1A', Math.round(totalSalesGSTPortion.value));
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

function booleanPrompt(prompt, defaultBool, callbackYay, callbackNay){

	var field = {};
	field.slug = 'input';
	field.type = 'bool';
	field.title = prompt;
	field.default = defaultBool;
	
	quiz([field], false, function(){
		
		if (field.data.getValue()){
			
			callbackYay();
			
		} else {
			
			callbackNay();
			
		}
	});	
}

function debugFields(id, fields){
		
		for (var i = 0; i < fields.length ; i++){
			
				console.log(id + ') **' + fields[i].slug + '**');
				console.log(id + ') field.data ' + (fields[i].data ? 'yes' : 'null'));
				if (fields[i].data){
					console.log(id + ') field.data.isSet() ' + (fields[i].data.isSet() ? 'yes' : 'null'));
				} 
				
		}
		console.log('');
}

module.exports = bks();