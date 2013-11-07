/*
    Herramientas para la descarga, análisis y visualización de datos referentes al 
    trabajo realizado por los diputados españoles en el Congreso.
    
    Copyright (C) 2013  Abraham Pazos Solatie

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var db = require('../db.js');
var csv = require('ya-csv');

// About the node CSV library, keep an eye on 
// http://justinratner.com/2012/07/nodejs-fs-ya-csv-mysteriously-buffered-write-stream/

var filename = 'csv/votaciones.csv';

var cursor = false;
var writer = csv.createCsvFileWriter(filename);

writer.writeRecord([
    'sesion', 
    'num_votacion', 
    'fecha', 
    'legislatura', 
    'num_expediente', 
    'presentes', 
    'si', 
    'no', 
    'abs', 
    'titulo', 
    'texto_expediente', 
    'titulo_subgrupo', 
    'texto_subgrupo'
]);

// This first version of this file committed to GitHub 
// saves one line to the CSV file on each call to run()

// Override 1 second wait. This task requires no access to the web.
exports.options = {
    wait: 0
}

exports.input = function(pos, limit, cb) {
    if(cursor === false) {
        db.getVotacionAll(function(err, cur) {        
    		if(err || !cur)
	    		cb(null, false);
    		else
                cursor = cur;
                cursor.nextObject(function(err, item) {
                    if(item)
    	    		    cb([item]);
                    else
                        cb(null, false);
                });
            });
    } else {
        cursor.nextObject(function(err, item) {
            if(item)
    		    cb([item]);
            else
                cb(null, false);
        });
    }
}
// Empty values in json are stored as an empty object: {}
// If we put this directly in the CSV file, it becomes [object object]
// so we replace objects with an empty string, which looks better in CSV.
function fix(str) {
    if(typeof str == 'object')
        return '';
    return str;
}

exports.run = function(item) {
    var res = item.xml.resultado;

    if(res.totales.asentimiento == 'No') {
        var values = [
            res.informacion.sesion,
            item.num,
            res.informacion.fecha,
            item.legislatura,
            item.numExpediente,
            res.totales.presentes,
            res.totales.afavor,
            res.totales.encontra,
            res.totales.abstenciones,
            res.informacion.titulo,
            res.informacion.textoexpediente,
            res.informacion.titulosubgrupo,
            res.informacion.textosubgrupo
        ];
        values = values.map(fix);
        writer.writeRecord(values);
        console.log(res.informacion.fecha + " " + res.informacion.sesion);
    }
	self.emit(["run F complete: " + res.informacion.titulo]);
}

