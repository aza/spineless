function ContentController(){
	var blogRef = new Firebase("shorts.firebaseio.com/entries")

	this.getEntry = function(startingAt, callback){
		blogRef
			.startAt(null, startingAt.toString())
			.limitToFirst(1)
			.on('child_added', function(entrySnapshot){
				//var el = makeEntry( entrySnapshot.val(), entrySnapshot.name() )
				
				if( callback ) callback(entrySnapshot.val(), entrySnapshot.key())
		})
	}

	this.getCount = function(callback){
		blogRef.limitToLast(1).on('child_added', function(lastEntrySnapshot){
			callback( lastEntrySnapshot.key() )
		})
	}
}

function Renderer(){
	this.render = function( entryEl, data ){
		var tmpl = Handlebars.compile( entryEl.html() )

		if( data.body ){
			data.body = markdown.toHTML(data.body)
		}

		entryEl.html( tmpl( data ) )

		if( data.img ){
			entryEl.find('.cover').css('background-image', 'url('+data.img+')')
		}
		console.log( data )
	}
}

function AppController(){
	var self = this,
			content = new ContentController()
			renderer = new Renderer()
	
	var scroller = new IScroll('.container', { mouseWheel: true, snap:false, deceleration:.005, scrollbars: 'custom', fadeScrollbars: true })
	this.scroller = scroller

	function scrollToNearestSection(){
		var els = document.querySelectorAll('.entry'),
			minD = Infinity,
			closestEl = null

		for( var i=0; i<els.length;i++){
			var d = Math.abs(els[i].offsetTop - Math.abs(scroller.y))
			if( d < minD ){
				closestEl = els[i]
				minD = d
			}
		}

		scroller.scrollToElement(closestEl, 200)

		//console.log( "Stopping on", $(closestEl), $(closestEl).data('entry-id'))
		// Load current entry and preload the ones around it
		self.loadEntry( $(closestEl) )
		self.loadEntry( $(closestEl).next() )
		self.loadEntry( $(closestEl).next().next() )
		self.loadEntry( $(closestEl).prev() )
	}

	this.refresh = function(){
		// Make sure each section takes up the height of the screen
		$('.section').css({height: window.innerHeight})
		scroller.refresh()
	}

	this.appendNextEntry = function(){
		var lastEntry = $('.entry:last'),
				newEntryEl = $( $('#entry-template').html() )		

		var nextEntryId = lastEntry.length == 0 ? 0 : lastEntry.data('entry-id') + 1
		
		newEntryEl.data('entry-id', nextEntryId).find('.section').css('visibility', 'hidden')
		$('#scroller').append( newEntryEl )
		self.refresh()
	}

	this.loadEntry = function( entryEl ){
		var entryId = parseInt( entryEl.data('entry-id') )
		
		if( entryEl.data('loaded') !== true ){

			content.getEntry( entryId, function( data ){
				renderer.render(entryEl, data)
				entryEl.find('.section').css('visibility', 'visible')
			})

			entryEl.data('loaded', true)
		}
	}

	this.appendAllEntryStubs = function(callback){
		content.getCount(function(count){
			for( var i=0; i<=count;i++){
				self.appendNextEntry()
			}
			self.refresh()
			callback()
		})
	}

	scroller.on('scrollEnd', scrollToNearestSection)

	var resizeTimeout = null
	$(window).resize(function(){
		clearTimeout( resizeTimeout )
		resizeTimeout = setTimeout(function(){
			self.refresh()
			scrollToNearestSection()
		}, 300)

	})
	
	self.appendAllEntryStubs(function(){
		self.loadEntry( $('.entry:first') )
		self.loadEntry( $('.entry:nth-child(2)') )
	})
}


var app = new AppController()