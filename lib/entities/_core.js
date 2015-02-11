
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');
var yaml = require('js-yaml');

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

var core = module.exports = function(entityKey, appConfig, config, dataDir){
	
	var self = {};
	self.fields = [];
	
	function makeProp(f){
		var refField = f;
		self[f.slug] = function(){
			if (refField.data){
				return refField.data.val();
			}
			return null;
		};
		self[f.slug + 'Set'] = function(){
			if (refField.data){
				return refField.data.isSet();
			}
			return false;
		};
		self[f.slug + 'Val'] = function(){
			if (refField.data){
				return refField.data.getValue();
			}
			return null;
		};
	}
	
	// Add fields
	for (var i = 0; i < appConfig.entities[entityKey].fields.length; i++){
		
		var f = utils.shallowDupe(appConfig.entities[entityKey].fields[i]);
		
		// Populate cat choices
		if (f.slug === 'cat' && f.type === 'choice'){
			f.typeConfig = {};
			f.typeConfig.choices = config.entities[entityKey].cats;
		}
		
		self.fields.push(f);
		makeProp(f);
		
	}
	
	// Add shortcode choice field
	var shortcodes = config.entities[entityKey].shortcodes;
	if (shortcodes) {
		var shortCodeField = {};
		shortCodeField.slug = 'shortcode';
		shortCodeField.type = 'choice';
		shortCodeField.title = 'Short code';
		shortCodeField.required = true;
		shortCodeField.default = '-';
		shortCodeField.typeConfig = {};
		shortCodeField.typeConfig.choices = {};
		shortCodeField.typeConfig.choiceLabelKeys = ['_title','title'];		
		shortCodeField.typeConfig.choices['-'] = 'None'; 	 		
		for (var shortcode in shortcodes){ 
			shortCodeField.typeConfig.choices[shortcode] = shortcodes[shortcode];
		} 
		// Insert at start
		self.fields.splice(0, 0, shortCodeField); 
	}
	
	self.key = entityKey;
	
	// |newInput| string input
	// Returns input to be saved
	self.onFieldWillSave = function(newInput, field){
		return newInput;
	};
	
	self.onFieldDidSave = function(valueDidChange, field){
		
	};
	
	self.save = function(){
		// To be overwritten
		// JSON.stringify(responseData, null, 2)
	};
	
	self.dataObj = function(){
		
		var obj = {};
		for (var i = 0; i < self.fields.length; i++){
			var f = self.fields[i];
			if (f.data && f.data.isSet()){
				obj[f.slug] = f.data.val();
			}
		}
		return obj;
		
	};
	
	self.writeToFile = function(containingDir, filenameNoExt, dataObj){
		
		if (!fs.existsSync(containingDir)){
				fs.mkdirSync(containingDir);
		}
		
		var filename = filenameNoExt + '.yml';
		var fileContents = yaml.safeDump(dataObj, {indent:2});
		
		fs.writeFileSync(containingDir + filename, fileContents);
		
	};
	
	return self;
	
};