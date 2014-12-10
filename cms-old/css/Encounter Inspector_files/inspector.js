var Logs = [],
	  Users = {},
	  G = {startTime: 0, scale: 10, firstRun: true}

Logs.elList = {}

Logs.getLogsForUser = function(name){
		var userLogs = Logs.map(function(log){

			if( log.meta.userData && log.meta.userData.name && log.meta.userData.name.match(name))
				log.meta.isUser = true
			if( log.data.peripheralData && log.data.peripheralData.name && log.data.peripheralData.name.match(name))
					log.meta.isConnectingToUser = true
			return log
		})

		var userLogs = userLogs.filter(function(log){
			return log.meta.isUser || log.meta.isConnectingToUser
		})

		return userLogs
	}

Logs.allUsers = function(){
	var users = {}
	_(Logs).each(function(log){

		if( log.meta.userData ){
			var userData = log.meta.userData,
				  aid = log.meta.central_aid
			userData.isCentral = true
			if( users[aid] ) users[aid].eventCount++
		}

		if( log.data.peripheralData ){
			var userData = log.data.peripheralData,
					aid = log.data.peripheral_aid
			userData.isPeripheral = true
			if( users[aid] ) users[aid].eventCount++
		}

		if( !aid ) return

		if( !users[aid] ){
			userData.eventCount = 1
			users[aid] = userData
		}

		if( users[aid] && userData.isCentral ) users[aid].isCentral = true
	
		users[aid].addToHeader = function(){ Users._addToHeader(users[aid]) }
	})

	return users
}

Logs.showOnScreen = function(){

	var minY = .8*window.scrollY/G.scale,
		  maxY = 1.2*(window.scrollY+window.innerHeight)/G.scale
	
	_(Logs.elList).each(function(event){
		if( event.y >= minY && event.y <= maxY){
			if( !event.isInDOM ){
				event.el.appendTo('#inspector')
				event.isInDOM = true
			}
			
			event.el.css('top', event.y*G.scale)
		}
	})

}

function addEventsToLog(jsonArray){
	jsonArray = jsonArray.map(function(log){
		var cAid = log.meta.central_aid 
		try{ if( cAid ) log.meta.userData = Users[cAid].data }
		catch(e){ console.log("No central_aid for event:", log) }
		return log
	})

	jsonArray = jsonArray.map(function(log){
		if( log.data.PeripheralAId ) log.data.peripheral_aid = log.data.PeripheralAId
		if( log.data.auraId ) log.data.peripheral_aid = log.data.auraId

		var pAid = log.data.peripheral_aid
		if( pAid ) log.data.peripheralData = Users[pAid].data
		return log
	})	

	for( var i=0; i<jsonArray.length; i++) Logs.push( jsonArray[i] )
}


usersRef = new Firebase('https://aura-staging.firebaseio.com/CC1B4154-356E-4B5E-BBBD-8CB73EA7028F/users')
usersRef.once('value', function(usersSnapshot){
	users = usersSnapshot.val()

	Users = users
	Users.userByAuraId = function( auraId ){
		return _(users).filter(function(user){return user.sessionId == auraId })[0]
	}

	Users.userById = function( id ){
		return users[id]
	}

	Users.getUserByName = function(name){
		var allUsers = Logs.allUsers()
		return _(allUsers).find(function(u){return u.name ? u.name.match(name): false})
	}

	Users.getUserByAid = function(aid){
		var allUsers = Logs.allUsers()
		return allUsers[aid]	
	}

	Users._addToHeader = function(user){
		var el = $('<div>').addClass('header').text(user.first_name).appendTo('#names')
		el.click(function(){
			if( !user.name ) alert("I'm sorry. I can't do that, Dave.")
			else location.assign( '/inspector.html?'+user.first_name)
		})

		user.headerEl = el 

		var zebra = $('<div>').addClass('zebra').appendTo('body').css({
			left: el.offset().left,
			width: el.outerWidth()
		})

		user.centerX = el.offset().left + el.outerWidth()/2
	}

	getData()
})

function getDataOld(){
	$.get('/data', function(body){
		var lines = body.split('\n')
		var jsonArray = []

		for( var i=0; i<lines.length; i++){
			try{
				jsonArray.push( JSON.parse(lines[i]) )
			} catch(e){}
		}

		addEventsToLog(jsonArray)
		main()
	})
}


function getData(loadNext){
	var startDateString = $('#datetime').val()

	//http://ec2-54-234-195-210.compute-1.amazonaws.com/2014-09-23/13/aura-2014-09-23-13-00.txt

	var day = startDateString.split('T')[0],
	    hour = parseInt(startDateString.match(/T(\d+):/)[1]),
	    minute = (new Date(startDateString)).getMinutes(),
	    dMinutes = parseInt($('#minutes').val())

	var pathTemplate = day + '/H/aura-' + day + '-H-M.txt'
	//path = path.replace(/M/, ('00'+minute).substr(-2) )

	if( loadNext ){
		minute = G.lastLoadedMinute+1
		dMinutes = 1
		$('#minutes').val( parseInt($('#minutes').val())+1 )
		localStorage['minutes'] = $('#minutes').val()
	}

	var minutes = _.range(minute, minute+dMinutes)
	G.lastLoadedMinute = minutes[ minutes.length-1 ]
	
	var semiphore = dMinutes

	_(minutes).each(function(m){
		// Supports going across hour boundaries, but not day+ boundaries
		var path = pathTemplate
								.replace(/M/g, ('00'+m%60).substr(-2) )
								.replace(/H/g, ('00'+(parseInt(m/60)+hour)).substr(-2))

		$('#output').text( 'Fetching ' + path )

		$.get('/kenisis?path=' + path, function(data){
			$('#output').text( 'Fetched ' + path )
			setTimeout(function(){
				$('#output').text( '' )
			}, 500)

			if( --semiphore == 0 ) main()
			addEventsToLog( JSON.parse(data) )
		})
	})
}


function getOtherActor(event, aidPath){
	aidPath = aidPath.split('.')
	var aid = event[aidPath[0]][aidPath[1]]
	
	if( !aid ) return null

	var user = Users.getUserByAid(aid)
	if( !user ) return null

	if( !user.headerEl ) user.addToHeader()

	return user
}


function showUsers(){
	var allUsers = Logs.allUsers()

	_(allUsers).each(function(user){
		
		$('<div>')
			.addClass('control-name')
			.text( user.name + ' (' + user.eventCount + ')')
			.data( 'userData', user )
			.appendTo('#controls')
			.click(function(){
				if( !user.name ) alert("I'm sorry. I can't do that, Dave.")
				else location.assign( '/inspector.html?'+user.first_name)
			})
		
	})
}

function displayEvent(event, user){

	// We don't need to do anything if we've already displayed the event
	if( Logs.elList[event.meta.timestamp] ) return

	var dT = event.meta.timestamp - G.startTime
	var el = $('<div>')
		.addClass('event')
		.addClass(event.data.type)
		.css({top: dT*G.scale, left: user.centerX })

	event.isInDOM = false
	event.y = dT
	event.el = el

	Logs.elList[event.meta.timestamp] = event

	if( event.meta.isConnectingToUser ) var otherActor = getOtherActor(event, 'meta.central_aid')
	if( event.meta.isUser ) var otherActor = getOtherActor(event, 'data.peripheral_aid' )

	if( !otherActor ) var otherActor = {left:'auto'}
	
	var fromTo = 'CentralFailure ConnectionTimeout HeartbeatNotification Connected DisconnectError'
	if( fromTo.match( event.data.type ) ){
		el.css({width: otherActor.centerX-user.centerX})
		if( event.meta.isUser ) el.addClass('to')
		else el.addClass('from')
	}

	//if( "event.data.type)	
	if( event.data.type == 'rssi' ) el.css({left:otherActor.centerX-10}).text( event.data.rssi )
	if( event.data.type == 'Deprecated' ) el.css({left:otherActor.centerX-10}).text( 'Deprecated' )
	if( 'CentralManagerWillRestoreState WritingSessionId'.match(event.data.type) ) el.text( event.data.type )
	if( event.data.type == 'CurrentUser' ) el.text( 'Current User: ' + event.data.Name )
	if( event.data.type == 'didReceiveRemoteNotification' ) el.text( '<' )
	if( 'AuraFelt AuraFade'.match(event.data.type) ) el.css({left:otherActor.centerX-10}).text( event.data.type.substr(4) )

	if( event.data.type == 'Discovered'){
		// TODO: Discovered needs to report the peripheral aid!
		//el.css({left:otherActor.centerX-10}).text( '!' )
		el.text('!')	
	}


	el.on('mouseenter', function(){
		console.log( event.data.type, event )
		$('#output').text( event.data.type )
	}).on('mouseout', function(){
		$('#output').text('')
	})

	Logs.showOnScreen()
}


function drawEventsForName(name){
	var userLogs = Logs.getLogsForUser(name)
	var user = Users.getUserByName(name)
	
	if( G.firstRun ){
		user.addToHeader()
		$('.control-name:contains('+user.name+')').addClass('active')
	}

	G.startTime = _(userLogs.map(function(e){return e.meta.timestamp})).min()
	G.endTime   = _(userLogs.map(function(e){return e.meta.timestamp})).max()

	$('#farthest').css('top', (G.endTime-G.startTime) * G.scale+20)

	_(userLogs).each(function(event){
		setTimeout(function(){ displayEvent( event, user ) }, 0)
	})
}

function main(name){
	if( G.firstRun ) showUsers()

	var firstName = $('.control-name').eq(0).data('userData').first_name
	drawEventsForName(location.search.substr(1) || firstName)
	G.firstRun = false
}


function changeScale(scale){
	_(Logs.elList).each(function(event){event.el.css('top', event.y*scale)})
	$('#farthest').css('top', (G.endTime-G.startTime) * scale+20)
	window.scrollTo(0, window.scrollY/G.scale * scale)
	G.scale = scale
}



function saveState(){
	var state = {
		scale: G.scale,
		minutes: parseInt($('#minutes').val())
	}

	console.log( state )
	history.pushState( null, null, JSON.stringify(state) )
}

/* -------------- Add UI event handling -------------- */


$('#go').on('click', function(){
	localStorage['minutes'] = $('#minutes').val()
	localStorage['datetime'] = $('#datetime').val()
	location.reload()
})

if( localStorage['minutes'] ) $('#minutes').val( localStorage['minutes'] )
if( localStorage['datetime'] ) $('#datetime').val( localStorage['datetime'] )

$(window).on('scroll', function(){
	Logs.showOnScreen()
	if( document.body.scrollHeight-window.scrollY-$(document.body).height() < 100 ) $('#load-next').fadeIn()
	else $('#load-next').fadeOut()
})

$('#load-next div').click(function(){
	$('#load-next').css('visibility', 'hidden')
	setTimeout(function(){ $('#load-next').css('visibility', 'visible') }, 1000)
	getData(true)
})

$('#plus').click(function(){ changeScale(G.scale*2) })
$('#minus').click(function(){ changeScale(G.scale*.5) })
