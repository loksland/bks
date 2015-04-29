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
	
	self.GSTPortion = function() {
		
		if (self.gstcat() == 'gst'){
			
			return currency(self.amount()).multiply(self.gstperc());
			
		} else if (self.gstcat() == 'export'){
			
			return currency(0);
			
		} else if (self.gstcat() == 'other'){
			
			return currency(0);
						
		}
		
	};
	
	self.nonGSTPortion = function() {
		
		return currency(self.amount()).subtract(self.GSTPortion().value);
		
	};
	
	/*
	
	// Assumes date and title props
	// Format expected: YYYYMMDD or YYYY-MM-DD-info
	// Override if not
	self.getDataFromFileName = function(fileName){
		
		var data = globdule.feed(fileName).to('date').to('leftoversToSlug').end();
		var returnData = {};
		if (data){
			if (data.description){
				returnData.invoice = data.description; // From leftoversToSlugAndDescription
			}
			if (data.date){
				returnData.date = data.date; // From leftoversToSlugAndDescription
			}
		}
		
		return returnData;
	
	};
	
	self.getFileNameFromData = function(dataObj){
		
		var fileNameNoExt = self.date() + '-' + self.invoice();
		
		// Remove these props from data to be added to the file contents
		delete dataObj.date;
		delete dataObj.invoice;
		
		return {fileNameNoExt: fileNameNoExt, data: dataObj};
		
	};
	
	*/

	return self;
	
};