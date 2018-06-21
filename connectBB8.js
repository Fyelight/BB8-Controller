
//var haley_username = ""
//var haley_password = ""
var haley_username = ""
var haley_password = ""
var haley_appID = "haley-saas";
var haley_eventbusURL = "https://haley-saas-server.vital.ai/eventbus/";

var haleyModule = require('@vital-ai/haley');
//var Gamepad = require("node-gamepad");
//var controller = new Gamepad("ps4/dualshock4",{
//	vendorID:1356,
//	productID:2508,
//});

var VitalService = haleyModule.VitalService;
var HaleyAPI = haleyModule.HaleyAPI;
var HaleyAPIVitalServiceImpl = haleyModule.HaleyAPIVitalServiceImpl;

var HaleyBB8Controller = function(){
	//config
	this.devMode = false;
	this.haley_username = haley_username;
	this.haley_password = haley_password;
	this.haley_appID = haley_appID;
	this.haley_eventbusURL = haley_eventbusURL;
	this.haley_endpointURI = null;
	this.haley_channelName = "BB8";
}

var haleyApi = null;
var haleySession = null;


var vitalService = null;

HaleyBB8Controller.prototype.login = function(){

	var _this = this;

	var vitalService = new VitalService('endpoint.' + haley_appID, haley_eventbusURL, function(){
	//success
	console.log("vitalservice ready, ", vitalService);	
	
	
	console.log('adding entity and relationship classes as exceptions for json validation');

	VitalServiceJson.SINGLETON.dynamicPropertiesClasses.push('http://vital.ai/ontology/vital-aimp#Entity');
	VitalServiceJson.SINGLETON.dynamicPropertiesClasses.push('http://vital.ai/ontology/vital-aimp#Edge_hasRelationship');

	var haleyApiImpl = new HaleyAPIVitalServiceImpl(vitalService);
	haleyApiImpl.logEnabled = false;
	
	haleyApiImpl.addReconnectListener(function(){
		
		console.log("Reconnect listener called");
		_this.joinChannel(function(error){
			if(error) {
				console.error("Error when re-joining BB8 channel: " + error);
			} else {
				console.info("BB8 channel re-joined successfully.");
			}
		});		
	});

	new HaleyAPI(haleyApiImpl, false, function(error, _haleyInstance){
		if(error) {
			console.error("Error when creating haley API instance: " + error);
			return;
		}
		console.info("Haley API instance created");
		_this.haleyApi = _haleyInstance;

		_this.haleyApi.openSession(function(error, _haleySession){

			if(error) {
				vital.error("Error when checking session: " + error);

				app.onLoggedOut();

				return;
			}

			console.log("haley session opened", _haleySession);

			_this.haleySession = _haleySession;

			try {
				var messageHandler = function(msgRL){
					_this.onAIMPMessage(msgRL);
				}
				var r = haleyApi.registerCallback(_this.haleySession, 'http://vital.ai/ontology/vital-aimp#AIMPMessage', true, messageHandler);

				if(!r) throw "Messages handler not registered!";

			} catch(e) {
				console.error("Couldn't register handler: " + e);
			}

			if( _this.haleySession.isAuthenticated() ) {

				var data = _this.haleySession.getAuthAccount();

				console.log("Session already authenticated: ", data);

				onSessionAuthenticated();

			} else {
				
				console.info("Session not authenticated - authenticating");

				_this.haleyApi.authenticateSession(_this.haleySession, _this.haley_username, _this.haley_password, function(error, loginObject){

					if(error) {
						console.error("Error when authenticating user: " + error);
						return;
					}

					console.log("session authenticated: ", loginObject);

					_this.onSessionAuthenticated();

				});

			}

		});

	});

}, function(error){
	console.error("vitalservice error");
});
}

HaleyBB8Controller.prototype.onSessionAuthenticated = function() {
	
	console.log("Haley session ready");

	var _this = this;
	
	console.log("onSessionAuthenticated");
	
	console.log("listing channels");
	this.haleyApi.listChannels(this.haleySession, function(error, channelsRL){
		
		if(error) {
			console.error("Error when listing channels", error);
			throw new Error(error);
		}
		
		var channels = channelsRL.iterator('http://vital.ai/ontology/vital-aimp#Channel');
		console.log('channels', channels);
		
		for(var i = 0 ; i < channels.length; i++) {
			var channel = channels[i];
			var n = channel.get('name');
			if(_this.haley_channelName == n) {
				_this.bb8Channel = channel;
			}
		}
		
		if(_this.bb8Channel == null) {
			console.error("channel not found: " + _this.haley_channelName);
			throw new Error("channel not found: " + _this.haley_channelName);
		}
		
		_this.onEndpointChecked();
		
	});
	
}

HaleyBB8Controller.prototype.onEndpointChecked = function() {
	
	var _this = this;
	
	this.joinChannel(function(error){
		if(error) {
			console.error("Error when joining channel", error);
			throw new Error("Error when joining channel: " + error);
		}
		
	});
	
}

HaleyBB8Controller.prototype.joinChannel = function(callback) {

	if(this.bb8Channel == null) {
		console.error("bb8 channel not set!");
		callback("bb8 channel not set");
		return;
	}
	
	console.log("joining bb8 channel: " + this.bb8Channel.URI);
	
	//joining endpoint updates notification channel
	var aimpMessage = vitaljs.graphObject({ type: 'http://vital.ai/ontology/vital-aimp#JoinChannel'});
	aimpMessage.URI = 'urn:msg-' + new Date().getTime() + '_' + (Math.random() * 10000);
	aimpMessage.set('channelURI', this.bb8Channel.URI);
	aimpMessage.set('endpointURI', this.haley_endpointURI);
	
	console.log("Sending join channel message ...", this.bb8Channel.URI);
	
	this.haleyApi.sendMessage(this.haleySession, aimpMessage, [], callback);
	
	
}

HaleyBB8Controller.prototype.onAIMPMessage = function(msgRL, callback) {
	
	var _this = this;
	
	var msgList = msgRL.iterator();
	var msg = msgRL.first();
	console.log("on haley msg", msg.type + " " + msg.get('text'));
	
	
	if(this.bb8Channel == null) {
		console.warn("bb8 channel not ready");
		return;
	}
	
	if(msg.get('channelURI') != this.bb8Channel.URI) {
		console.warn("Ignoring message not for bb8 channel: " + msg.get('channelURI'));
		return;
	}
	
	var channelsHistory = msg.get('channelsHistory');
	var fromChannel = null;
	if(channelsHistory) {
		var channelURIs = channelsHistory.split(/\s+/);
		fromChannel = channelURIs[channelURIs.length - 1];
	}
	
	if(msg.type == 'http://vital.ai/ontology/vital-aimp#SendPushNotificationMessage') {
		
		var pushNotifications = msgRL.iterator('http://vital.ai/ontology/vital-aimp#PushNotification');
		
		console.log("SendPushNotificationMessage notifications count", pushNotifications.length);
		
		for(var i = 0 ; i < pushNotifications.length; i++) {
			
			var pn = pushNotifications[i];
			
			console.log('push notification ' + i, pn);
		
			var badge = pn.get('badge');
			var expirationTimestamp = pn.get('expirationDate');
			var optionalData = pn.get('optionalData');

			var sound = pn.get('sound');
			var text = pn.get('text');
			if(!text) {
				console.error("No text!");
			}
			var tokens = pn.get('tokens');
			
			if(tokens == null || tokens.length == 0) {
				console.error("No tokens!");
				return
			}
			
			var note = new apn.Notification();
			if(expirationTimestamp != null) {
				note.expiry = Math.floor(expirationTimestamp / 1000);
			}
			if(badge != null) note.badge = 1;
			if(optionalData) {
				optionalData = JSON.parse(optionalData);
				note.payload = optionalData;
			}
			if(sound != null) {
				note.sound = sound;
			}
			if(text) {
				note.alert = text;
			}
			note.topic = this.apn_topic;
			
			this.apnProvider.send(note, tokens).then(function(result) {
				
				console.log("send result", result);
				
				if(fromChannel != null) {
					
					console.log("sending result to channel where the request came from: " + fromChannel);
					var respMessage = vitaljs.graphObject({type: 'http://vital.ai/ontology/vital-aimp#IntentMessage'});
					respMessage.set('intent', 'pushnotificationresults');
					respMessage.set('propertyValue', JSON.stringify(result));
					respMessage.set('replyTo', msg.URI);
					respMessage.set('requestURI', msg.get('requestURI') ? msg.get('requestURI') : msg.URI);
					respMessage.set('channelURI', fromChannel);
					
					_this.haleyApi.sendMessage(_this.haleySession, respMessage, [], function(error){
						if(error) {
							console.error("Error when sending results intent", error);
						} else {
							console.info("Results intent sent successfully");
						}
					});
				}
				
				if(callback) {
					callback(result);
				}
				
			});
			
		}
		
		
	} else {
		console.warn("Ignoring message of type: " + msg.type);
	}
	
}
 
	var speed = 60;
	var angle = 0.0;
	var maxSpeed = 150;
	var accel = 1;
	var isCalibrating = false;	

  //var stop = bb8.roll.bind(bb8, 0, 0);
/*
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
	//bb8.color("blue");
} );
controller.on( 'circle:press', function() {
    console.log( 'circle' );
	//bb8.color("red");
} );
controller.on( 'square:press', function() {
    console.log( 'square' );
	//bb8.color("pink");
} );
controller.on( 'triangle:press', function() {
    console.log( 'triangle' );
	//bb8.color("green");
} );
controller.on( 'r1:press', function() {
    console.log( 'r1' );
	//luminance()
} );
controller.on( 'r2:press', function() {
    console.log( 'r2' );
	//bb8.roll(speed,angle);
    setTimeout(function() {
	//bb8.roll(0,angle);
    }, 100000);	
} );
controller.on( 'r2:release', function() {
    console.log( 'r2 released' );
	//bb8.roll(0,angle);
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
	//bb8.stop();
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
	//bb8.stop();
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
  /*bb8.getPowerState(function(err, data) {
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
  });*//*
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
*//*
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
*/
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

var bb8Controller = new HaleyBB8Controller();
bb8Controller.login();