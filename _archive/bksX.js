#! /usr/bin/env node

var fs = require('fs');
var path = require('path'); 
var cmdPrompt = require('prompt');
var yaml = require('js-yaml');
var moment = require('moment');

// Constants
// ---------
var CORE_CONFIG_FILENAME = 'core.yml';
var USER_CONFIG_FILENAME = '.bksconfig';

// Vars
// ----
var appConfig;
var program; // Commander instance

function bks(){
	
	cmdPrompt.message = 'bks';
	
	program = require('commander');
	program
  //.version('0.0.1')
  .option('-i, --index', 'Index data')
  .option('-r, --reset', 'Reset user config ('+USER_CONFIG_FILENAME+')')
  .parse(process.argv);
	
	// Load app config core
	try {
		appConfig = yaml.safeLoad(fs.readFileSync(CORE_CONFIG_FILENAME, 'utf8'));
	} catch (err) {
		throw err;
	}
	
	if (program.reset){
  	
  	resetUserConfig();
  	
  } else {
  
  	var userConfig = require('user-settings').file(USER_CONFIG_FILENAME);
	
		checkUserConfig(userConfig, function(err, userConfig){
	
			if (err){
				throw err;
			}
			
			log('Loaded user config from '.grey + String(ensureTrailingSlash(process.env.HOME || process.env.USERPROFILE) + USER_CONFIG_FILENAME).blue + '...'.grey);
			
			// Overwrite app config with user settings 
			for (var key in appConfig.userConfig){
				appConfig.userConfig[key] = userConfig.get(key);
			}
	
			autoPopulate(function(err){
				if (err){
					throw err;
				} 
				handleAction();
			});
			
		});
	}
	
}

// Perform action requested by command line arguments
function handleAction(){
	
  if (program.index){
  	index();
  } 
	
}

// Prompt user for any missing user settings
function checkUserConfig(userConfig, callback){

	var quiz = [];
	
	for (var key in appConfig.userConfig){
		
		var existingUserConfigVal = userConfig.get(key);
		var doPromptUser = !existingUserConfigVal || existingUserConfigVal.length === 0; 
		
		var q = {
				name: key,
				type: 'string',
				required: true
		};
		
		var customPrompt = appConfig.userConfigOptions.prompts[key];
		if (customPrompt){
			q.description = customPrompt.grey;
		} else {
			q.description = 'Custom ' + convertCamelCaseVarToSentence(key).toLowerCase() + '?';
		}
		
		var defaultVal = appConfig.userConfig[key];
		if (defaultVal){
			q.default = defaultVal;
		} 
		if (!doPromptUser && key.toLowerCase().substr(-7) === 'dirpath' && !fs.existsSync(existingUserConfigVal)){
			doPromptUser = true;
			if (existingUserConfigVal && existingUserConfigVal.length){
				log(String(existingUserConfigVal + ' not found').grey);
			}
		}
	
		if (doPromptUser){
			quiz.push(q);
		}
	}
	
	if (quiz.length > 0){
		
		cmdPrompt.start();
	
		cmdPrompt.get(quiz, function (err, result) {
			if (!err){
				for (var key in appConfig.userConfig){
					if (result[key] !== undefined){
						var val = trim(result[key]);
						if (key.toLowerCase().substr(-7) === 'dirpath'){
							val = ensureTrailingSlash(val);
						}
						userConfig.set(key, val);
					}
				}
				checkUserConfig(userConfig, callback);
			} else {
				callback(err);
			}
		});
		
	} else {
		return callback(null, userConfig);
	}
}

function resetUserConfig(){
	
	cmdPrompt.start();

	cmdPrompt.get([{
		name: 'confirm',
		description: 'Reset user configuration?',
		type: 'string',
		required: true,
		default: 'y'
	}], function (err, result) {
		var confirm = stringToBool(result.confirm);
		if (confirm){
			var userConfig = require('user-settings').file(USER_CONFIG_FILENAME);
			for (var key in appConfig.userConfig){
				userConfig.unset(key);
			}
		}
	});
}

// Auto populate if needed...
function autoPopulate(callback) {
	
	var jobsDirPath = ensureTrailingSlash(appConfig.userConfig.dataDirPath + appConfig.userConfig.jobsDirName);
	if (!fs.existsSync(jobsDirPath)){
		fs.mkdirSync(jobsDirPath);
		log('Added directory '.grey + appConfig.userConfig.jobsDirName.blue);
	}
	
	var ioDirPath = ensureTrailingSlash(appConfig.userConfig.dataDirPath + appConfig.userConfig.ioDirName);
	if (!fs.existsSync(ioDirPath)){
		fs.mkdirSync(ioDirPath);
		log('Added directory '.grey + appConfig.userConfig.ioDirName.blue);
	}
	
	var quiz = [];
	
	var totalYearDirs = 0;
	var files = fs.readdirSync(ioDirPath);
	for (var file in files) {
		var filename = files[file];
  	if (filename.charAt(0) !== '.') {
  		
  		var stat = fs.statSync(ioDirPath + filename);
    	if (stat.isDirectory()){
  			var yr = Number(filename);
  			if (!isNaN(yr) && yr >= 1900 && yr < 9999){
    			totalYearDirs++;
    		}
    	}
  	}
  }
  if (totalYearDirs === 0){
  	quiz.push({
			name: 'makeSampleYear',
			description: 'Add sample year with some dummy data?',
			type: 'string',
			required: true,
			default: 'y'
		});
  }   
      
  if (quiz.length === 0 ){
  	return callback(null);
  }     
  
	cmdPrompt.start();

	cmdPrompt.get(quiz, function (err, result) {
		var makeSampleYear = stringToBool(result.makeSampleYear);
		if (makeSampleYear){
			var yr = getCurrentFiscalYear();
			var yrDirPath = ioDirPath + String(yr) + path.sep;
			fs.mkdirSync(yrDirPath);
			fs.mkdirSync(yrDirPath + appConfig.userConfig.inDirName);
			fs.mkdirSync(yrDirPath + appConfig.userConfig.outDirName);
			log('Added year '.grey + String(yr).blue);
		}
		return callback(err);
	});
	
}

// Data
// ----

function index(){
	console.log('i n  d e x'); 
}

// Logging
// -------

function log(msg){
	
	console.log(msg);
	
}

// Utils
// -----

function ensureTrailingSlash(dirPath){

	if (dirPath.charAt(dirPath.length - 1) !== path.sep){
		return dirPath + path.sep;
	} 
	
	return dirPath; 
	
}

function stringToBool(str){
	
	if (!str || str.length === 0){
		return false;
	}
	
	str = str.toLowerCase();
	return str.charAt(0) === 'y' || str.charAt(0) === '1' || str.charAt(0) === 't';
	
}

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

function getCurrentFiscalYear(){
	
	var now = moment();
	var year = now.year();
	if (now.month() <= 5){
		year--;
	} 
	
	return year;
}

function convertCamelCaseVarToSentence(varStr){

	var sentence = varStr.replace(/([a-z])([A-Z])/gm, '$1 $2').toLowerCase();
	if (sentence.length === 1){
		sentence = sentence.toUpperCase();
	} else if (sentence.length > 1){
		sentence = sentence.charAt(0).toUpperCase() + sentence.substr(1).toLowerCase();
	}
	
	return sentence;
	
}

module.exports = bks();