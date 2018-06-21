var haleyModule = require('@vital-ai/haley');

var VitalService = haleyModule.VitalService;
var HaleyAPI = haleyModule.HaleyAPI;
var HaleyAPIVitalServiceImpl = haleyModule.HaleyAPIVitalServiceImpl;

var sphero = require("sphero");  
var bb8 = sphero("C2:04:A2:3E:4E:BB"); // change BLE address accordingly

var Gamepad = require("node-gamepad");
var controller = new Gamepad("ps4/dualshock4",{
	vendorID:1356,
	productID:2508,
});

console.log("Connecting to sphero");

bb8.connect(function() {

  console.log("Now connected to BB-8");

  //The Ping command verifies that BB8 is awake and receiving commands.
  bb8.ping(function(err, data) {
    console.log(err || data);
  });

  //Get bluetooth infos
  bb8.getBluetoothInfo(function(err, data) {
    if (err) {
      console.log("error: ", err);
    } else {
      console.log("data:");
      console.log("  name:", data.name);
      console.log("  btAddress:", data.btAddress);
      console.log("  separator:", data.separator);
      console.log("  colors:", data.colors);
    }
  });

  //Get battery infos
  bb8.getPowerState(function(err, data) {
    if (err) {
      console.log("error: ", err);
    } else {
      console.log("data:");
      console.log("  recVer:", data.recVer);
      console.log("  batteryState:", data.batteryState);
      console.log("  batteryVoltage:", data.batteryVoltage);
      console.log("  chargeCount:", data.chargeCount);
      console.log("  secondsSinceCharge:", data.secondsSinceCharge);
    }
  });

  // roll BB-8 in a random direction, changing direction every second 
  /*
  setInterval(function() {
    var direction = Math.floor(Math.random() * 360);
    bb8.roll(150, direction);
  }, 1000);



  bb8.roll(150, 0);

  // turn Sphero green 
  bb8.color("green");
  */

  // have Sphero tell you when it detect collisions 
  bb8.detectCollisions();

  // when Sphero detects a collision, turn red for a second, then back to green 
  bb8.on("collision", function(data) {
    console.log("collision detected");
    console.log("  data:", data);

    bb8.color("red");

    setTimeout(function() {
      bb8.color("green");
    }, 100);
  });

	var speed = 60;
	var angle = 0.0;
	var maxSpeed = 150;
	var accel = 1;
	var isCalibrating = false;	

  var stop = bb8.roll.bind(bb8, 0, 0);

console.log("Connecting to controller");

controller.connect();

console.log("Controller Connected");

controller.on( 'dpadUp:press', function() {
    console.log( 'up' );
	leftAnalogUp();
} );
controller.on( 'dpadDown:press', function() {
    console.log( 'down' );
	leftAnalogDown();
} );
controller.on( 'dpadLeft:press', function() {
    console.log( 'left' );
	leftAnalogLeft();
} );
controller.on( 'dpadRight:press', function() {
    console.log( 'right' );
	leftAnalogRight();
} );
controller.on( 'x:press', function() {
    console.log( 'x' );
	bb8.color("blue");
} );
controller.on( 'circle:press', function() {
    console.log( 'circle' );
	bb8.color("red");
} );
controller.on( 'square:press', function() {
    console.log( 'square' );
	bb8.color("pink");
} );
controller.on( 'triangle:press', function() {
    console.log( 'triangle' );
	bb8.color("green");
} );
controller.on( 'r1:press', function() {
    console.log( 'r1' );
	luminance()
} );
controller.on( 'r2:press', function() {
    console.log( 'r2' );
	bb8.roll(speed,angle);
    setTimeout(function() {
	bb8.roll(0,angle);
    }, 100000);	
} );
controller.on( 'r2:release', function() {
    console.log( 'r2 released' );
	bb8.roll(0,angle);
} );
controller.on( 'l1:press', function() {
    console.log( 'l1' );
	if (isCalibrating == false){
		bb8.startCalibration();
		isCalibrating = true;
	}else{
		bb8.finishCalibration();
		isCalibrating = false;
	}

} );
controller.on( 'l2:press', function() {
    console.log( 'l2' );
	bb8.stop();
	console.log("stop!");
} );
controller.on( 'touch:press', function() {
    console.log( 'Touchpad clicked' );
} );
controller.on( 'psx:press', function() {
    console.log( 'PlayStation button' );
} );
controller.on( 'l3:press', function() {
    console.log( 'l3 Left analog clicked' );
	bb8.stop();
	console.log("stop!");
} );
controller.on( 'r3:press', function() {
    console.log( 'r3 Right analog clicked' );
} );
controller.on( 'options:press', function() {
    console.log( 'options' );
  //Get bluetooth infos
  bb8.getBluetoothInfo(function(err, data) {
    if (err) {
      console.log("error: ", err);
    } else {
      console.log("data:");
      console.log("  name:", data.name);
      console.log("  btAddress:", data.btAddress);
      console.log("  separator:", data.separator);
      console.log("  colors:", data.colors);
    }
  });

  //Get battery infos
  bb8.getPowerState(function(err, data) {
    if (err) {
      console.log("error: ", err);
    } else {
      console.log("data:");
      console.log("  recVer:", data.recVer);
      console.log("  batteryState:", data.batteryState);
      console.log("  batteryVoltage:", data.batteryVoltage);
      console.log("  chargeCount:", data.chargeCount);
      console.log("  secondsSinceCharge:", data.secondsSinceCharge);
    }
  });
} );
controller.on( 'share:press', function() {
    console.log( 'share' );
} );

//extras
controller.on( 'dpadUpRight:press', function() {
    console.log( 'dpadUpRight	' );
} );
controller.on( 'dpadDownRight:press', function() {
    console.log( 'dpadDownRight' );
} );
controller.on( 'dpadDownLeft:press', function() {
    console.log( 'dpadDownLeft' );
} );
controller.on( 'dpadUpLeft:press', function() {
    console.log( 'dpadUpLeft' );
} );

//joysticks
controller.on( 'left:move', function(currentState) {
    //console.log( "Left Analog: "+JSON.stringify(currentState) );
    //x and y ranges from 0 - 255, 125-130 is its resting values
    //Up: y=255 Down: y=0 Left: x=0 Right: x=255
/*
    if(currentState.x > 190){
    	leftAnalogRight();
    	console.log( "Left Analog: Right");
    }else if(currentState.x < 62){
    	leftAnalogLeft();
    	console.log( "Left Analog: Left");
    }
    
    if(currentState.y > 190){
    	leftAnalogDown();
    	console.log( "Left Analog: Down");
    }else if(currentState.y < 62){
    	leftAnalogUp();
    	console.log( "Left Analog: Up");
    }
*/
	if ((currentState.x-128)*(currentState.x-128) + (currentState.y-128)*(currentState.y-128) > 120*120){
		angle =	calculateAngleDegrees(currentState.x - 128, -(currentState.y - 128));
		console.log("angle: "+angle);
	}
    
} );
controller.on( 'right:move', function(currentState) {
    //console.log( "Right Analog: "+JSON.stringify(currentState) );
    //x and y ranges from 0 - 255, 125-130 is its resting values
    //Up: y=255 Down: y=0 Left: x=0 Right: x=255
    
    if(currentState.x > 190){
    	//rightAnalogRight();
    	console.log( "Right Analog: Right");
    }else if(currentState.x < 62){
    	//rightAnalogLeft();
    	console.log( "Right Analog: Left");
    }
    
    if(currentState.y > 190){
    	//rightAnalogDown();
    	console.log( "Right Analog: Down");
	if (speed > 0){
		speed -= accel;
	}
	console.log("speed: "+ speed);
    }else if(currentState.y < 62){
    	//rightAnalogUp();
    	console.log( "Right Analog: Up");
	if (speed < maxSpeed){
		speed += accel;
	}
	console.log("speed: "+ speed);
    }
} );

function leftAnalogUp(){
	angle=angle%360;
	if (angle <= 0){ angle = 0;}
	else if (angle > 180){
		angle++;
	}
	else if (angle <= 180){
		angle--;
	}
 console.log( angle + " " + speed );
	//bb8.roll(speed,angle);
}
function leftAnalogDown(){
	angle=angle%360;
	if (angle == 180){}
	else if (angle < 180){
		angle++;
	}
	else if (angle > 180){
		angle--;
	}
 console.log( angle + " " + speed );
	//bb8.roll(speed,angle);
}
function leftAnalogLeft(){
	angle=angle%360;
	if (angle == 270){}
	else if (angle > 90 && angle <270){
		angle++;
	}
	else if (angle <= 90 || angle > 270){
		if (angle <= 0){
			angle += 360;
		}
		angle--;
	}
 console.log( angle + " " + speed );
	//bb8.roll(speed,angle);
}
function leftAnalogRight(){
	angle=angle%360;
	if (angle == 90){}
	else if (angle >= 270 || angle < 90){
		angle++;
	}
	else if (angle < 270 ){
		angle--;
	}
 console.log( angle + " " + speed );
	//bb8.roll(speed,angle);
}

function calculateAngleDegrees(x, y){
	var rad = Math.atan2(x, y); // In radians
	var deg = rad * (180.0 / Math.PI);
	
	if (deg < 0){
		deg += 360;
	}
	return deg
}

function luminance(){
  bb8.color({ red: 255, green: 0, blue: 255 });

  setTimeout(function() {
    console.log("color 1 -50% luminance");
    // sets color to the provided hex value, at -50% luminance
    bb8.color(0xcc0000, -0.5);
  }, 1000);

  setTimeout(function() {
    console.log("color 1 normal% luminance");
    // sets color to the same hex value, at +50% luminance
    bb8.color(0xcc0000, 0);
  }, 2000);

  setTimeout(function() {
    console.log("color 1 +50% luminance");
    // sets color to the same hex value, at +50% luminance
    bb8.color(0xcc0000, 0.5);
  }, 3000);

  setTimeout(function() {
    console.log("color 2 -50% luminance");
    // hex numbers can also be passed in strings
    bb8.color("00cc00", -0.5);
  }, 4000);

  setTimeout(function() {
    console.log("color 2 normal% luminance");
    // hex numbers can also be passed in strings
    bb8.color("00cc00", 0);
  }, 5000);

  setTimeout(function() {
    console.log("color 2 +50% luminance");
    // hex numbers can also be passed in strings
    bb8.color("00cc00", 0.5);
  }, 6000);

  setTimeout(function() {
    console.log("color 3 -50% luminance");
    // sets color to the provided color name
    bb8.color("magenta", -0.5);
  }, 7000);

  setTimeout(function() {
    console.log("color 3 normal% luminance");
    // sets color to the provided color name
    bb8.color("magenta", 0);
  }, 8000);

  setTimeout(function() {
    console.log("color 3 +50% luminance");
    // sets color to the provided color name
    bb8.color("magenta", 0.5);
  }, 9000);
}

});

