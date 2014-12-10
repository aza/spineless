Handlebars.registerHelper('simplify', function(str) {
	if( str == undefined ) return 'entry'
  return str.toLowerCase().replace(/ /, '').substr(0,10);
});

function ContentController(){
	var blogRef = new Firebase("snapfiction.firebaseio.com/entries")

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
	this.render = function( entryEl, entryId, data ){
		var tmpl = Handlebars.compile( entryEl.html() )

		data.id = entryId

		if( data.body ){
			data.body = markdown.toHTML(data.body)
		}

		entryEl.html( tmpl( data ) )

		if( data.img ){
			entryEl.find('.cover').css('background-image', 'url('+data.img+')')
		}
		//console.log( data )
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
			var d = Math.abs(els[i].offsetTop - Math.abs(scroller.y) - window.innerHeight*.1)
			if( d < minD ){
				closestEl = els[i]
				minD = d
			}
		}

		scroller.scrollToElement(closestEl, 200)

		// Load current entry and preload the ones around it
		self.loadEntryAndSome( closestEl )
	}

	this.scrollToEntryById = function(entryId){
		var els = $('.entry').filter(function(){return $(this).data('entry-id') == entryId})
		if( els.length != 0 ){
			scroller.scrollToElement( els.get(0), 800 )
			self.loadEntryAndSome( els.get(0) )
		}
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
				renderer.render(entryEl, entryId, data)
				entryEl.find('.section').css('visibility', 'visible')
			})

			entryEl.data('loaded', true)
		}
	}

	this.loadEntryAndSome = function( entryEl ){
		self.loadEntry( $(entryEl) )
		self.loadEntry( $(entryEl).next() )
		self.loadEntry( $(entryEl).next().next() )
		self.loadEntry( $(entryEl).prev() )
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
		self.loadEntryAndSome( $('.entry:first') )
		var anchorEntry = location.hash.substr(1) || parseInt(location.search.substr(1)) || parseInt(location.pathname.substr(1))
		if( anchorEntry ) self.scrollToEntryById( anchorEntry )
	})
}


var app = new AppController()