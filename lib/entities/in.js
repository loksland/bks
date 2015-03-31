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
	
	
	//freelance: Freelance work # Don't edit these
  //appsales: App sales
	
	
	return self;
	
};