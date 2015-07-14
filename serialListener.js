
module.exports = serialListener;

var app = require('./app');
var portConfig = require('./portConfig.json');

var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
// var SerialPort = require("serialport").SerialPort

var simpleJson = {
  "date": "19/5/2015:16:6:66:666",
  "voltage":     0,
  "current":    6,
  "rpm":    0,
  "power":    0,
  "timestamp": 3125413672,
  "windSpeed": 0,
  "pitchAngle": -10,
  "dummyLoad": 0
 }
console.log('ports '+ portConfig.stepper.port +" "+ portConfig.windSpeed.port + " " + portConfig.measurement.port);

   
   PAserialPort = new SerialPort(portConfig.stepper.port, {
 
		// test rig
		// baudrate: 9600,
		
		// wind tower
		baudrate: portConfig.stepper.baudrate,

	}, function (err) {
		if (err) console.log('Eroror opening Pitch Angle port: ' +  portConfig.stepper.port);
	});
	  
   WSserialPort = new SerialPort(portConfig.windSpeed.port, {
		baudrate: portConfig.windSpeed.baudrate,
	}, function (err) {
		if (err) console.log('Eroror opening Wind Speed port: ' +  portConfig.windSpeed.port);
	});
		
	DLserialPort = new SerialPort(portConfig.loadController.port, {
		baudrate: portConfig.loadController.baudrate,
	}, function (err) {
		if (err) console.log('Eroror opening dummy load  port: ' +  portConfig.loadController.port);
	});

	DIserialPort = new SerialPort(portConfig.measurement.port, {
		baudrate: portConfig.measurement.baudrate,
		
		parser: serialport.parsers.readline("EOL"),
	}, function (err) {
		if (err) console.log('Eroror opening measurement  port: ' +  portConfig.measurement.port);
	});





function sleep(time, callback) {
// serialListener.prototype.sleep(time, callback) {
    var stop = new Date().getTime();
    while(new Date().getTime() < stop + time) {
        ;
    }
    callback();
};



var socketServer;
var socketio = require('socket.io');
socketServer = socketio.listen(app, true);

function serialListener()
{	//
	//
	//http://www.barryvandam.com/node-js-communicating-with-arduino/ 
	//copied from the server.js file
	var receivedData = "";
    var sendData = "";
	var delimiter = "\n";
	
 // console.log('serialListenerInit called ');

var io = require('socket.io').listen(1337);


console.log('serialListener: setup connection now');

io.sockets.on('connection', function(socket){
	console.log('a user connected');
	console.log('connected socket: '+socket.id);


    socket.on('disconnect', function(){
    console.log('user disconnected');
    console.log('socket disconnected' + socket.id+ " " + socket.disconnected);
  });
  

});
/*
		io.on('updateData', function(data) {
		console.log('DataInput UPDATE: '+data);
	});
	*/
/*		
	io.emit('updateData', {
			dataSource: "somethig",
			dataInputData: "something else \n"
		});
*/
 	
 
   DIserialPort.on("open", function () {
		console.log('serialListener.DIserialPort.on Open ' + portConfig.measurement.port);

        sleep(2000, function() {
		});
		
			// serialListener.write('DI', 'AA');

		//asserting();
	});
    WSserialPort.on("open", function () {
		console.log('serialListener.WSserialPort.on Open ' + portConfig.windSpeed.port);

		//
		//
		//My guess is, that the function sends to fast after the port opening. The uController is still in the reset stage
	
        sleep(2000, function() {
    // executes after two second, and blocks the thread, should be avoided. maybe we find another solution
		});
	});

	
    PAserialPort.on("open", function () {
		console.log('serialListener.PAserialPort.on Open ' + portConfig.stepper.port);
		//
		//
		//My guess is, that the function sends to fast after the port opening. The uController is still in the reset stage

        sleep(2000, function() {
    // executes after two second, and blocks the thread, should be avoided. maybe we find another solution
    });
	
	DLserialPort.on("open", function () {
		console.log('serialListener.DLserialPort.on Open ' + portConfig.loadController.port);
        sleep(2000, function() {
		});
		
	});
	
  }); 
 
 var sendData = '';
 var receivedData = '';
 var chunksIn = 0;
 function handleDIserialPortData(data) {
    // DIserialPort.on('data', function(data) {
//			console.log('DataInput : '+data);

		chunksIn = chunksIn+1;
        receivedData += data.toString();

			var jsonOpened = receivedData.indexOf('{');
			var jsonClosed = receivedData.indexOf('}', jsonOpened);

		if( jsonClosed !== -1 && jsonOpened !== -1 ) {
			if ( jsonClosed > jsonOpened ) {
				sendData = receivedData.substring(jsonOpened, jsonClosed+1);
				receivedData = receivedData.substring(jsonClosed+2, receivedData.length);'';
				chunksIn = 0;
			}
		 }
         // send the incoming data to browser with websockets.
		if (sendData.length > 0 ) {
			var now = new Date();
			var formatNow = now.getDate()+"/"+(now.getMonth()+1)+"/"+now.getFullYear()+'\:'+now.getHours()+'\:'+now.getMinutes()+'\:'+now.getSeconds()+'\:'+now.getMilliseconds();
		
		/* use the same calculation for changin wind speed % to a m/s value
			this is from windsock.ejs. 
			Not the best I know, but hope it works, otherwise windSpeedValue was a percentage...
		*/
		var windSpeedValueText = reutrnWindSpeed(windSpeedValue);

		/* do the same for the pitch angle.
		*/
		var pitchAngleValueText = returnPitchAngle(pitchAngleValue);
		
		/* and dummy load
			NOTE, the magic number 201 is from DLnumFrames in the dummyLoad.ejs file
		*/
		var dummyLoadValueText = returnDummyLoad(dummyLoadValue);
		
			// console.log('SEND update data : '+sendData);
			
			//start with the date
			var sendJSON = '{\n  \"date\": \"'+formatNow+'\",';
			// put in the JSON from the serial input next
			sendJSON += sendData.substring(1, sendData.length-3);
			// now add the info local to the interface, wind speed, pitch angle and dummy load
			sendJSON += ",\n  \"windSpeed\": "+windSpeedValueText+",\n";
			sendJSON += "  \"pitchAngle\": "+pitchAngleValueText+",\n";
			sendJSON += "  \"dummyLoad\": "+dummyLoadValueText+"\n";
			sendJSON += "}";
			
			// have to parse the string sendJSON to a JSON object in order to adjust RPM
			dataItem = JSON.parse(sendJSON);
			
			// adjust RPM due to Arduino issues.
			dataItem.rpm = Math.floor(dataItem.rpm / 1000);

//		 console.log( "serialListener send JSON : \n"+sendJSON);
	
			// have to put JSON dataItem back into a string to send properly, why things cannot handle JSON objects???
			io.emit('updateData', JSON.stringify(dataItem));

			sendJSON = null;
			sendData = null;
			dummyLoadValueText = null;
			pitchAngleValueText = null;
			windSpeedValueText = null;
			now = null;
			receivedData = null;
			jsonClosed = null;
			jsonOpened = null;
			
			// console.log("in SerialListener: the wind speed: "+windSpeedValue);
			// console.log("in SerialListener: the pitch angle: "+pitchAngleValue);
			// console.log("in SerialListener: the dummy load: "+dummyLoadValue);


		};
	}; 
 
 
 function handleWSserialPortData(data) {
 //   WSserialPort.on('data', function(data) {
         receivedData += data.toString();
	}; 
	
	function handlePAserialPortData(data) {
 //   PAserialPort.on('data', function(data) {
         receivedData += data.toString();
	}; 
	
	function handleDLserialPortData(data) {
  //  DLserialPort.on('data', function(data) {
         receivedData += data.toString();
	}; 
   
DIserialPort.on('data', handleDIserialPortData) ;
WSserialPort.on('data', handleWSserialPortData) ;
PAserialPort.on('data', handlePAserialPortData) ;
DLserialPort.on('data', handleDLserialPortData) ;

};


serialListener.doSomething = function() {
	console.log('serialListener.doSomething here');
};

serialListener.write = function( id, value ) {

     sleep(200, function() {
    }); 
	
	console.log('serialListener write value: '+value);
	if( id === 'w' ) {
		WSserialPort.write(value, function(err, results) {
			console.log('Blink_err ' + err);
			console.log('Blink_results from windSpeed ' + results);
		});
	} else if (id === 'PA') {
		console.log('PAserialListener.write '+value);

		PAserialPort.write(value, function(err, results) {
			console.log('PitchAngle ' + err);
			console.log('PitchAngle ' + results);
		});
	} else if (id === 'DL') {
		console.log('DLserialListener.write '+value);

		DLserialPort.write(value, function(err, results) {
			console.log('loadController ' + err);
			console.log('loadController ' + results);
		});
	} else if (id === 'DI') {
		console.log('DIserialListener.write '+value);

		DIserialPort.write(value, function(err, results) {
			console.log('DI_err ' + err);
			console.log('DI_results ' + results);
		});
	} else {
		console.log('bad id '+id);
	};
	

};

function asserting() {
  console.log('asserting');
	DIserialPort.set({rts:true, dtr:true}, function(err, something) {
	  console.log('DLserialPort asserted');
		setTimeout(clear, 250);
	});
}

function clear() {
	console.log('clearing');
	DIserialPort.set({rts:false, dtr:false}, function(err, something) {
	  console.log('DLserialPort clear');
		setTimeout(done, 50);
	});
}

function done() {
	console.log("DLserialPort done resetting");
}

function reutrnWindSpeed( windSpeedValueIn ) {
		var windSpeedValueText = (windSpeedValueIn*0.1456)-0.5523;
		windSpeedValueText =  +(Math.round(windSpeedValueText +"e+1")+"e-1");
		if ( windSpeedValueText < 0 ) {
			windSpeedValueText = 0;
		}		
		return windSpeedValueText;
}		

function returnPitchAngle( pitchAngleIn ) {
	return  (pitchAngleIn-101)/10;
}

function returnDummyLoad( dummyLoadIn ) {
	var dummyLoadValueText = ((dummyLoadValue-1)/201)*100;
		dummyLoadValueText =  +(Math.round(dummyLoadValueText +"e+1")+"e-1");
	return dummyLoadValueText;
}
