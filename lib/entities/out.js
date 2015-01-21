// http://www.markhansen.co.nz/javascript-private-members/
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');
var core = require('./_core.js');

var out = module.exports = function(appConfig, config, dataDir){
	
	// var loclVarA;
	// var loclVarB;
	
	var self = core('out', appConfig, config, dataDir);
	
	// Now add all the props from settings as 
	//obj.prop = 'foo';
	
	self.save = function(){
		
		var containingDir = dataDir + config.dirNames.io + path.sep + config.dirNames.out + path.sep;
		if (!fs.existsSync(dataDir)){
			throw new Error('Data dir "'+containingDir+'" not found');
		}
		
		/*
		if (self.titleSet()){
			console.log('title = ' + self.title());
		}
		*/
		
		for (var i = 0; i < self.fields.length; i++){
			var f = self.fields[i];
		}
		
		console.log(JSON.stringify(self.dataObj(), null, 2));
		
	}
	
	return self;
	
};