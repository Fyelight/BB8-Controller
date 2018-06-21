var haley_username = ""
var haley_password = ""
var haley_appID = "haley-saas";
var haley_eventbusURL = "https://haley-saas-server.vital.ai/eventbus/";
var haleyModule = require('@vital-ai/haley');
var sphero = require("sphero");  
var bb8 = sphero("C2:04:A2:3E:4E:BB"); // change BLE address accordingly

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

var haleyBB8channel = null;


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
	haleyBB8channel = this.bb8Channel.URI;
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

var bb8Controller = new HaleyBB8Controller();
bb8Controller.login();

var intentMsg = vitaljs.graphObject({ type: 'http://vital.ai/ontology/vital-aimp#JoinChannel'});
	intentMsg.URI = 'urn:msg-' + new Date().getTime() + '_' + (Math.random() * 10000);
	intentMsg.set('channelURI', "http://vital.ai/haley.ai/haley-saas/Channel/1517524443895_821378006");
	intentMsg.set('endpointURI', bb8Controller.haley_endpointURI);
	//intentMsg.set('intent', "move_up");
	
	console.log("Sending join channel message ...", intentMsg);
	
	bb8Controller.haleyApi.sendMessage(bb8Controller.haleySession, intentMsg, [], callback);
/*
var respMessage = vitaljs.graphObject({type: 'http://vital.ai/ontology/vital-aimp#IntentMessage'});
respMessage.set('intent', 'move_up');
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
*/
console.log("Connecting to sphero");
/*
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
  *//*

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

  });*/