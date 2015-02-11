// http://www.markhansen.co.nz/javascript-private-members/
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');
var core = require('./_core.js');


var out = module.exports = function(appConfig, config, dataDir){
	
	// var loclVarA;
	// var loclVarB;
	
	var self = core('out', appConfig, config, dataDir);
	
	self.save = function(){
	
		var fiscalYearDir = dataDir + config.dirNames.io + path.sep + String(self.fiscalYear()) + path.sep;
		
		if (!fs.existsSync(fiscalYearDir)){
				fs.mkdirSync(fiscalYearDir);
		}
		
		var containingDir = fiscalYearDir + config.dirNames.out + path.sep;
		
		var dataObj = self.dataObj();
		
		var filenameNoExt = self.date() + '-' + utils.sentenceToFilenameFriendly(self.title());
	
		delete dataObj.date;
		delete dataObj.title;
	
		//console.log(JSON.stringify(dataObj, null, 2));
		
		self.writeToFile(containingDir, filenameNoExt, dataObj);
		
	};
	
	self.fiscalYear = function(){
		
		if (self.dateSet()){
			
			return utils.getFiscalYearFromDate(self.dateVal()); 
			
		} else {
			
			return 0;
			
		}
	};
	
	return self;
	
};