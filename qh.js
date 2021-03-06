#!/usr/bin/env node

var nodeio = require('node.io'),
    db = require('./db.js'),
    async = require('async');


// Linea de comandos

var argv = require('optimist')
    .usage('Download data from congreso.es, store in MongoDB\nUsage: $0 -abcdefi')
    .check(function(a) {
        // need at least 3 arguments (first two auto populated)
        if(Object.keys(a).length < 3) { 
            throw("Missing parameter. Enter at least one."); 
        }; 
    })
    .describe('a', 'Download links to sessions')
    .describe('b', 'Download session html')
    .describe('c', 'Populate iniciativa & votacion')
    .describe('d', 'Download votacion XML files')
    .describe('e', 'Download iniciativa html')
    .describe('f', 'Export votaciones')
    .describe('g', 'Export participacion')
    .describe('i', 'Database Info')
    .argv
;

// Gestión de tareas

function jobMaker(tarea) {
    return function(cb) {
        var waitInSeconds = 1;
        if(tarea.options != undefined)
            if(tarea.options.wait != undefined)
                waitInSeconds = tarea.options.wait;
                
        nodeio.start(new nodeio.Job({ 
            input: tarea.input, 
            run: tarea.run 
        }), { 
            timeout: 15,
            wait: waitInSeconds,
            debug: true, 
            encoding: 'binary' 
        }, cb); 
    };
}

function jobSequence() {
    var jobs = [];

    // -a = busca enlaces a sesiones y votaciones
    if(argv.a) jobs.push(function(cb) { 
	    db.cleanPendingURL(function(err, result) {
		    if(err)	gameOver(err);
    		db.insertPendingURL(null, function(err, result) {
                // note the (cb) at the end!
                // jobMaker returns a function and we want to
                // call that function when previous database
                // calls are executed.
                jobMaker(require('./tarea/A'))(cb);
            });
    	});
    });

    // -b = descarga archivos html y los guarda en la db
    if(argv.b) jobs.push(jobMaker(require('./tarea/B')));

    // -c = extrae datos sobre iniciativas y votaciones del html
    if(argv.c) jobs.push(jobMaker(require('./tarea/C')));

    // -d = descarga XMLs de las votaciones
    if(argv.d) jobs.push(jobMaker(require('./tarea/D')));
    
    // -e = descarga archivos html de las iniciativas
    if(argv.e) jobs.push(jobMaker(require('./tarea/E')));
    
    // -f = exporta votaciones en csv
    if(argv.f) jobs.push(jobMaker(require('./tarea/gen_csv_votaciones')));

    // -g = exporta participacion en csv
    if(argv.g) jobs.push(jobMaker(require('./tarea/gen_csv_participacion')));
    
    // ejecuta las tareas una tras otra
    async.series(jobs, function(err, result) {
		gameOver(err);
	});
    
    // -i = info
    if(argv.i) db.info();
}

// Inicio. Conexión a la base de datos, lanzar tareas

db.connect(jobSequence);

// Fin

function gameOver(err) {
    // TODO: disconnect from DB.
    if(err) {
    	console.log(err);
	    process.exit(code=1);
    } // else process.exit(code=0);
}
