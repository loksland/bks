'use strict';

// Grunt is used to validate js.
 
module.exports = function (grunt) {

	grunt.initConfig();
	
	// Achtung
	// -------
	grunt.loadNpmTasks('grunt-achtung');
	grunt.config('achtung', {
    src: ['*.js','lib/**/*.js']
  });
	
	// Watch
	// -----
    
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.config('watch', {
		js: {
			options: {
			event: ['changed'],
			},
			files: ['*.js','lib/**/*.js'],
			tasks: ['on-js-changed']
		}				
	});
	
	// JS Hint
	// -------
	
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.config('jshint', {
		options: {
      'curly': true,
			'eqeqeq': true,
			'undef': true,
			'browser': true,
			'unused': false,
			'quotmark': 'single',
			'noarg': true,
			'nonew': true,
			'newcap': true,
			'latedef': false,
			'freeze': true,
			'immed': true,
			'bitwise': true,
			'camelcase': true,
			'indent': 2,
			'strict': false,
			'devel': true,
			'node': true
    },
    dev: ['*.js','lib/**/*.js'],
    prod: {
      options: {
        'devel': false,
      },
      files: {
        src: ['*.js','lib/**/*.js']
      },
    }
	});
	
  // Tasks
  // -----
	grunt.registerTask(
		'on-js-changed',
		'dev'
	);
	
	grunt.registerTask(
		'dev', 
		['achtung', 'jshint:dev']
	);
	
	grunt.registerTask(
		'prod', 
		['jshint:prod']
	);
	
	grunt.registerTask(
		'default', 
		['watch']
	);
	
};