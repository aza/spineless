var isEntry = location.href.replace(/:\d+/,'').match(/(\d+)\/{0,1}$/),
	  isLoading = false

console.log("ENTRY", isEntry)

function makeEntry(data, entryId){
	var entryEl = $('.template').clone()
	entryEl.removeClass('template')

	entryEl.find('.author').text( data.author )
	if( data.title) entryEl.find('.title').text( data.title )
	entryEl.find('p').text( data.body )
	entryEl.find('.header').css({backgroundImage: "url("+data.img+")"})
	entryEl.find('section').attr('id', entryId)

	if( parseInt(entryId) > 0 ){
		entryEl.find('.id').text( entryId )
		entryEl.find('.id').parent().attr('href', '/'+entryId)
	}

	return entryEl
}

function setupScrollBehavior(){
	if( !window.matchMedia('@media screen and (max-aspect-ratio: 1/1)') ){
		$('body').panelSnap()
	} else {
		setInterval(loadMoreIfNearBottom, 200)
	}

	$(document).on('click, touchstart', 'section, .control', function(){
		window.scroller.snapTo('next', false)
	})

	function loadMoreIfNearBottom(){
		// If the user is nearing the end load some more posts
		var isNearBottom = (document.body.scrollHeight-window.scrollY) <= window.innerHeight*2
		if( isNearBottom ){
			var lastEntryId = parseInt($('section').slice(-1).attr('id'))
			if( lastEntryId >= 0 ){
				console.log( "Loading more posts", lastEntryId+1 )
				loadEntries(lastEntryId+1, 2)
			}
		}
	}

	var lastActivateTime = Date.now()
	$('body').bind('panelsnap:activate', function(target){
		entryId = $('.active').attr('id')

		if( entryId ){
			//if( entryId == "splash") history.replaceState({}, "", "/")
			//else history.replaceState({}, "", "/"+entryId)
		}

		loadMoreIfNearBottom()

	})
}

function loadEntries(startingAt, limit, insertBefore, callback){
	if( isLoading == true ) return

	isLoading = true
	var blogRef = new Firebase("shorts.firebaseio.com/entries")
	blogRef
		.startAt(null, startingAt.toString())
		.limit(limit)
		.on('child_added', function(entrySnapshot){
			var el = makeEntry( entrySnapshot.val(), entrySnapshot.name() )

			if( insertBefore === true ) $( $(el.html()) ).insertBefore("#splash")
			else $('body').append(el.html())
			
			isLoading = false
			if( callback ) callback()
	})

}


$(function(){
	setupScrollBehavior()

	if( isEntry ){
		var entryNum = parseInt(location.href.match(/(\d+)\/{0,1}$/)[0])

		$('#splash').css('visibility', 'hidden')
		
		$(".content").find('.id').text( entryNum )
		$(".content").find('.id').parent().attr('href', '/entries/'+entryNum+'.html')

		loadEntries(entryNum,1, true, function(){
			$('#splash').css('visibility', 'visible')
			loadEntries(entryNum+1, 2)	
		})
		
	} else{
		loadEntries(0, 1)
	}
})