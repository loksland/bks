
var fs = require('fs');
var path = require('path'); 
var utils = require('../utils.js');
var yaml = require('js-yaml');
var globdule = require('globdule');

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

var core = module.exports = function(entityKey, appConfig, config, dataDir, dataTypes){
	
	// Globdule: for file name data
	if (!globdule.filterExists('date')){
	
		var dateFilter = function(glob, data){
			
			// Either YYYYMMD or 
			// 2/4 digit date, 1/2 digit month, 1/2 digit day with - | or _ as separators
			var search = /^([0-9]{4})([0-9]{2})([0-9]{2})|((?:[0-9]{2}|[0-9]{4}))(-|_)([0-9]{1,2})(-|_)([0-9]{1,2})/gi;
			var matchString = '';
			var matchInfo;
			
			var y = '';
			var m = '';
			var d = '';
			
			while ((matchInfo = search.exec(glob)) !== null){
			
				matchString = matchInfo[0];
				
				if (matchInfo[1] && matchInfo[2] && matchInfo[3] ){
					
					y = matchInfo[1];
					m = matchInfo[2];
					d = matchInfo[3];								
				} else if (matchInfo[4]  && matchInfo[6] && matchInfo[8] ){		
		
					y = matchInfo[4];
					m = matchInfo[6];
					d = matchInfo[8];									
				} else {
					return false;
				}
				
				if (!y || !m || !d){					
					return false;
				}
				
				if (y.length === 2){
					if (Number(y) < 50){
						y = String(Number(y) + 2000);
					} else {
						y = String(Number(y) + 1900);
					}
				}
					
				if (m.length === 1){
					m = '0' + m;
				}
				
				if (d.length === 1){
					d = '0' + d;
				}

			}
			
			// Sets it as 'YYYY-MM-DD'
			if (y.length === 4 && m.length === 2 && d.length === 2){
				data.date = d + '-' + m + '-' + y;
			} else {
				return false;
			}
			
			return glob.substr(matchString.length);
 
		};
		
		globdule.defineFilter('date', dateFilter);
		
	}
	
	var self = {};
	self.fields = [];
	self.file = null;
	self.ext = '.yml';
	
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
		self[f.slug + 'Ref'] = function(){
			if (refField.data){
				return refField.data;
			}
			return null;
		};
	}
	
	// Add fields
	for (var i = 0; i < appConfig.entities[entityKey].fields.length; i++){
		
		var f = utils.shallowDupe(appConfig.entities[entityKey].fields[i]);
		
		// Populate cat choices
		if (f.type === 'choice' && f.choicesConfig && config.entities[entityKey][f.choicesConfig]){
			f.typeConfig = {};
			f.typeConfig.choices = config.entities[entityKey][f.choicesConfig]; //config.entities[entityKey].cats;
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
	
	// Add |data| prop to all fields
	for (var ff = 0; ff < self.fields.length; ff++){
		
		var ffField = self.fields[ff];
	
		ffField.data = new dataTypes[ffField.type]();
		
		if (ffField.typeConfig && ffField.data.config){
			ffField.data.config(ffField.typeConfig);
		}
	}
	
	self.key = entityKey;
	
	// |newInput| string input
	// Returns input to be saved
	//self.onFieldWillSave = function(newInput, field){
	//	return newInput;
	//};
	//self.onFieldDidSave = function(valueDidChange, field){
	//};
	
	self.filePath = function(){
		
		var containingDir = self.getContainingDir();
		var fileName = self.fileName();
		
		return containingDir + fileName
	};
	
	self.fileName = function(){
	
		var fileNameResult = self.getFileNameFromData(self.dataObj());		
		var fileNameNoExt = fileNameResult.fileNameNoExt;
		
		return fileNameNoExt + self.ext;
		
	};
	
	self.save = function(){
		
		var containingDir = self.getContainingDir(); 
		if (!fs.existsSync(containingDir)){
				utils.mkdirSyncRecursive(containingDir, dataDir);
		}
		
		var fileNameResult = self.getFileNameFromData(self.dataObj());
		var dataObj = fileNameResult.data;
		var fileNameNoExt = fileNameResult.fileNameNoExt;
		
		self.writeToFile(containingDir, fileNameNoExt + self.ext, dataObj);
		
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
	
	self.writeToFile = function(containingDir, filename, dataObj){
		
		if (!fs.existsSync(containingDir)){
				fs.mkdirSync(containingDir);
		}
		
		var fileContents = yaml.safeDump(dataObj, {indent:2});
		
		fs.writeFileSync(containingDir + filename, fileContents);
		
		// If the file path has changed since loaded then 
		// delete the old file before saving
		if (utils.isSet(self.file) && fs.existsSync(self.file)){
			if (self.file !== containingDir + filename){			
				fs.unlinkSync(self.file);
			}
		}
		
		self.file = containingDir + filename;
		
	};
	
	self.readFromFile = function(file){
		
		var success = false;
		if (!fs.existsSync(file)){
			throw new Error('File not found "' + file + '"');		
		}
				
		var ext = path.extname(file);					
		var baseFileName = path.basename(file, ext);
		
		if (ext === '.yml'){
		
			var data;
			try {
				data = yaml.safeLoad(fs.readFileSync(file, 'utf8'));				
			} catch (e) {
				throw e;
			}
			
			var fileNameData = self.getDataFromFileName(baseFileName);
			
			data = utils.appendPropsToObj(data, fileNameData, true);
			var result = self.setFieldDataFromDataObj(data, true, true);
			if (result.success){
				success = true;
				self.file = file;				
			} else {
				throw new Error(result.msg + ' ('+file+')');
			} 
		}
		
		return success;
		
	};
	
	// Clears any data present in the fields
	self.resetData = function(){
		for (var f = 0; f < self.fields.length; f++){
			var field = self.fields[f];
			self.fields[f].data.clear();
		}
	};
	
	// Provide a data obj in the format to be populated into fields
	// {fieldSlug: stringInput}
	// |validate| entity must be ready to save after this or will fail
	// If |validate| is false then this is being used for partial data entry
	self.setFieldDataFromDataObj = function(dataObj, wipeExistingData, validate){
		
		if (wipeExistingData){
			self.resetData();
		}
		
		var success = false;
		
		var fieldsNotFound = {};
		for (var fieldSlug in dataObj){
			fieldsNotFound[fieldSlug] = true;
		}
		
		for (var f = 0; f < self.fields.length; f++){
			
			var field = self.fields[f];
			var input = dataObj[field.slug];
			
			if (validate || input !== undefined){
			
				delete fieldsNotFound[field.slug];
			
				self.fields[f].data.clear();
				var parseError = field.data.setValue(input);
				
				if (parseError){
					return {success: false, msg: 'Parse error for "'+field.slug+'": ' + parseError.message};
				} else if (validate && field.required && field.data.isEmpty()){
					return {success: false, msg: 'Required field "'+field.slug+'" not found'};
				}
			
			}
			
		}
		
		for (var p in fieldsNotFound){
			return {success: false, msg: 'Provided field "'+p+'" not found in entity'};
		}
		
		if (validate && !self.isDataValid()){
			return {success: false, msg: 'Resulting entity is invalid'};
		}
		
		return {success: true};
		
	};
	
	// Ensure all required fields have data present
	self.isDataValid = function(){
		
		for (var f = 0; f < self.fields.length; f++){
			var field = self.fields[f];
			if (field.required && field.data.isEmpty()){
				return false;
			}
		}		
		return true;
	};
	
	// Overrides
	// ---------
	
	// Required:
	// Must be overridden by entity
	self.getContainingDir = function(){
	
	};
	
	// Assumes date and title props
	// Format expected: YYYYMMDD or YYYY-MM-DD-info
	// Override if not
	self.getDataFromFileName = function(fileName){
		
		var data = globdule.feed(fileName).to('date').to('leftoversToText', {preserveCase: true}).end();
		var returnData = {};
		if (data){		
		
			if (data.description){
				returnData.title = data.description; // From leftoversToSlugAndDescription
			}
			if (data.date){
				returnData.date = data.date; // From leftoversToSlugAndDescription
			}
			
		}
		
		return returnData;
	
	};
	
	// Assumes date and title props
	self.getFileNameFromData = function(dataObj){
		
		var fileNameNoExt = self.date() + '-' + utils.sentenceToFilenameFriendly(self.title(), true);
		
		// Remove these props from data to be added to the file contents
		delete dataObj.date;
		delete dataObj.title;
		
		return {fileNameNoExt: fileNameNoExt, data: dataObj};
		
	};
	
	self.dateFileNamePrefix = function(){
		
		return self.date();
			
	}
	
	
	return self;
	
};