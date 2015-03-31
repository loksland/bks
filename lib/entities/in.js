// http://www.markhansen.co.nz/javascript-private-members/
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');
var core = require('./_core.js');
var globdule = require('globdule');
var currency = require('currency.js');

var out = module.exports = function(appConfig, config, dataDir, dataTypes){
	
	// var loclVarA;
	// var loclVarB;
	
	var self = core('in', appConfig, config, dataDir, dataTypes);
	
	// Overrides
	// ---------
	
	self.getContainingDir = function(){
		
		var fiscalYearDir = dataDir + config.dirNames.io + path.sep + String(self.fiscalYear()) + path.sep;
		return fiscalYearDir + config.dirNames.in + path.sep;
		
	};
	
	// Custom
	// ------
	
	self.fiscalYear = function(){
		
		return utils.getFiscalYearFromDate(self.dateVal()); 
		
	};
	
	return self;
	
};