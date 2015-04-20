
var fs = require('fs');
var path = require('path'); 
var moment = require('moment');
var currency = require('currency.js');

var utils = module.exports = {};



// Converts human readable |str| to a boolean. 
// Case insensitive. 
// Eg. true, yes, y, 1 VS false, no, n, 0
utils.stringToBool = function(str){
	
	if (!str || str.length === 0){
		return false; 
	}
	
	str = str.toLowerCase();
	return str.charAt(0) === 'y' || str.charAt(0) === '1' || str.charAt(0) === 't';
	
};

// Trims whitespace at start and end of string
utils.trim = function(str) {
  return (str && str.replace) ? str.replace(/^\s+|\s+$/g, '') : str;
};

// Returns true if |str| is not null or undefined and has any non-whitespace content
utils.isSet = function(str){
	
	if (str){
		return utils.trim(str).length > 0;
	}
	
	return false;
	
};

utils.cameCaseToSentence = function(varStr){

	var sentence = varStr.replace(/([a-z])([A-Z])/gm, '$1 $2').toLowerCase();
	if (sentence.length === 1){
		sentence = sentence.toUpperCase();
	} else if (sentence.length > 1){
		sentence = sentence.charAt(0).toUpperCase() + sentence.substr(1).toLowerCase();
	}
	
	return sentence;
	
};

utils.sentenceToFilenameFriendly = function(str, preserveCase){
	if (!preserveCase){
		str = str.toLowerCase();
	}
	str = str.split(' ').join('-');
	return str;
	
};

utils.removeNonNumericChars = function(str, allowNegative, allowFractions){
	
	var allowNegativeFilter = allowNegative ? '\\-' : '';
	var allowFractionsFilter = allowFractions ? '\\.' : '';
	
	var filter = new RegExp('([^0-9'+allowNegativeFilter+allowFractionsFilter+'])', 'gm');
	
	return str.replace(filter, '');
	
};

utils.isObjectAnError = function(obj){
	return Object.prototype.toString.call(obj).toLowerCase() === '[object error]';
};

utils.isBool = function(obj){
	return (typeof obj) === 'boolean';
};

utils.isNum = function(obj){
	return (typeof obj) === 'number';
};

utils.isStr = function(obj){
	return (typeof obj) === 'string';
};

utils.isMomentObj = function(obj){
	return Boolean(obj._isAMomentObject);
};

utils.isCurrencyObj = function(obj){
	
	return obj.dollars && obj.cents && obj.format;
	
};

utils.shallowDupe = function(obj){

	var dupeObj = {};
	for (var p in obj){
		dupeObj[p] = obj[p];
	}
	
	return dupeObj;
	
};

// Debugging

// Converts object to string and outputs to console.
utils.pr = function(obj){
	
	console.log(JSON.stringify(obj, null, 2));
	
};

// Date helpers
// ------------

utils.getCurrentFiscalYear = function(){
	
	return utils.getFiscalYearFromDate(moment());
	
};


utils.getFiscalYearFromDate = function(momentDateObj){
	
	var year = momentDateObj.year();
	if (momentDateObj.month() <= 5){
		year--;
	} 
	
	return year;

};

utils.getQuarterFromDate = function(momentDateObj){
	
		var year = utils.getFiscalYearFromDate(momentDateObj);
		
		var m = momentDateObj.month();	// month() is zero-indexed
		m = (m >= 6) ? m - 6 : m + 6; 	// Offset for financial year
		
		var quarter = Math.floor(m/3)+1;
		return {year:year, quarter:quarter}; 
	
};
 
utils.dateRangesFromQuarter = function(year, quarter){
	
	var monthStart; // 0-indexed
	
	if (quarter === 1){
		monthStart = 6;	
	} else if (quarter === 2){
		monthStart = 9;	
	} else if (quarter === 3){
		monthStart = 0;	
		year++;
	} else if (quarter === 4){
		monthStart = 3;
		year++;
	}
	
	var start = moment(String(year)+'-'+String(monthStart+1), 'YYYY-M-D');
	var end = moment(String(year)+'-'+String(monthStart + 3), 'YYYY-M');
	end.date(end.daysInMonth());
	
	return [start, end];
	
};

utils.quarterDateRangeReadable = function(year, quarter){

	var formatFrom = 'D MMM';
	var formatTo = 'D MMM YYYY';
	var range = utils.dateRangesFromQuarter(year, quarter);	
	return range[0].format(formatFrom) + ' to ' + range[1].format(formatTo);

};

utils.quarterReadable = function(year, quarter){

	return 'Q' + String(quarter) + ' ' + String(year) + ' (' + utils.quarterDateRangeReadable(year, quarter) + ')';

};

utils.getLastQuarterEndedBeforeDate = function(momentDateObj){

	var q = utils.getQuarterFromDate(momentDateObj);
	
	q.quarter--;
	if (q.quarter === 0){
		q.year--;
		q.quarter=4;
	}
	
	return {year:q.year, quarter:q.quarter}; 

};

utils.appendPropsToObj = function (baseObj, appendObj, overwriteIfExists){

	for (var p in appendObj){
		
		if (overwriteIfExists || baseObj[p] === undefined){
			baseObj[p] = appendObj[p];
		}
		
	}
	
	return baseObj;

};

// File utils
// ----------
// |dir| Directory path to be created
// |withinDirOnly| Directories will not be created outside this directory 
// |_dirNameQueue| Internal use
utils.mkdirSyncRecursive = function(dir, withinDirOnly, _dirNameQueue) {
		
		dir = utils.addTrailingSlash(dir);
		withinDirOnly = withinDirOnly ? utils.addTrailingSlash(withinDirOnly) : null;
		
		if (withinDirOnly && (dir === withinDirOnly || dir.length < withinDirOnly.length || dir.substr(0,withinDirOnly.length) !== withinDirOnly)){
			return false;
		}
		
		_dirNameQueue = _dirNameQueue ? _dirNameQueue : [];
    
    try { fs.mkdirSync(dir); }
    catch (e) {
    	// Dir wasn't made, something went wrong
    	
    	var dirName = path.basename(dir);
    	var containingDir = path.dirname(dir);
    	_dirNameQueue.splice(0, 0, dirName);
    
      return utils.mkdirSyncRecursive(containingDir, withinDirOnly, _dirNameQueue);
        
    }
    
    if (_dirNameQueue.length === 0){
    	return true;
    } 	
    
    dir = dir + _dirNameQueue[0];
    _dirNameQueue.splice(0, 1);
    
    return utils.mkdirSyncRecursive(dir, withinDirOnly, _dirNameQueue);

};

utils.addTrailingSlash = function(dirPath){

	if (dirPath.charAt(dirPath.length - 1) !== path.sep){
		return dirPath + path.sep;
	} 
	
	return dirPath; 
	
};




