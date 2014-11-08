#! /usr/bin/env node

var shell = require('shell');

var app = new shell({ 
											chdir: __dirname,
											prompt: 'bks >>'
										});

app.configure(function() {
    app.use(shell.history({
        shell: app
    }));
    app.use(shell.completer({
        shell: app
    }));
    app.use(shell.router({
        shell: app
    }));
    app.use(shell.help({
        shell: app,
        introduction: true
    }));
});

app.cmd('hi', function(req, res){
    res.cyan('Hi');
    res.prompt();
});

var year = 1800;

// Simple command
app.cmd('select year :year', 'Select fiscal year (defaults to current)', function(req, res){
  
  var yrNum = Number(req.params.year);
  
  if (!isNaN(yrNum) && yrNum > 1000 && yrNum < 9999){
  	res.cyan('Year was ' + year).ln();
  	year = yrNum;
  	res.cyan('Year now ' + year).ln();
  } else {
  	res.red('invalid year ').ln();
  	res.magenta(req.params.year).ln();
  }
  
  res.prompt();
  
});

app.cmd('col', 'Color test', function(req, res){

	//var txt = res.raw('You do.', {color: 'cyan'});
	
	
});

app.cmd('install', 'Install', [
  shell.routes.confirm('Do you confirm?'),
  shell.routes.prompt('YAR'),
  shell.routes.prompt('NAR')
]);

app.cmd('test', 'Test confirm', function(req, res){
  	req.confirm('Do you have mustard?', false, function(answer){
  		if (answer){
  			res.cyan('You do.').print();
  		} else {
  			res.cyan('You don\'t.').println();
  		}
  		res.prompt();
  	});
  }
);

app.cmd('AMA', 'AMA', function(req, res){
  	req.question('Your name', function(answers){
  		res.cyan('Ola' + answers).ln();
  		res.prompt();
  	});
  }
);

app.cmd('AMAMULTI', 'AMA Multiple', function(req, res){
  	req.question({'Your name': 'John Doe', 'yourAge': '30', 'Your starsign': 'Gemini'}, function(answers){
  		res.cyan(answers['Your name']).ln();
  		res.cyan(answers.yourAge).ln();
  		res.cyan(answers['Your starsign']).ln();
  		res.prompt();
  	});
  }
);

app.cmd('yar', function(req, res){
  
  res.cyan('YES').ln();
  res.prompt();
  
});

app.cmd('nar', function(req, res){
  
  res.cyan('NO').ln();
  res.prompt();
  
});



