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
	
	var self = core('out', appConfig, config, dataDir, dataTypes);
	
	// Overrides
	// ---------
	
	self.getContainingDir = function(){
		
		var fiscalYearDir = dataDir + config.dirNames.io + path.sep + String(self.fiscalYear()) + path.sep;
		return fiscalYearDir + config.dirNames.out + path.sep;
		
	};
	
	// Custom
	// ------
	
	self.fiscalYear = function(){
		
		return utils.getFiscalYearFromDate(self.dateVal()); 
		
	};
	
	// Returns 1-4
	self.quarter = function(){
		
		return utils.getQuarterFromDate(self.dateVal()).quarter;
		
	};
	
	// Returns currency object
	self.deductibleAmountIncGST = function(readable) {
		
		return self.amountVal().multiply(self.percentage()).multiply(self.deduction() ? 1 : 0);
		
	};
	
	// Returns currency object
	self.deductibleAmountExGST = function(readable) {
		
		return self.deductibleAmountIncGST().subtract(self.deductibleGSTAmount());
		
	};
	
	// Returns currency object
	self.deductibleGSTAmount = function(readable) {
		
		return self.deductibleAmountIncGST().multiply(self.gst() ? self.gstperc() : 0);
		
	};
	
	return self;
	
};