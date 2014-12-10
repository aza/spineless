var blogRef = new Firebase("snapfiction.firebaseio.com/entries"),
	backupRef = new Firebase("snapfiction.firebaseio.com/backup-entries")
	allEntries = null

blogRef.once('value', function(entriesSnapshot){
	var output = ""

	allEntries = entriesSnapshot.val()
	allEntries.forEach(function(entry, num){
		if( entry ){
			output += '::' + (entry.link ? entry.link : '') + '\n'
			
			Object.keys(entry).forEach(function(key){
				if( key != 'link') output += key+'::'+entry[key]+'\n'
			})
			output += "\n\n"
		}
	})
	$("textarea").val( output )
})


$("#save").click(function(){
	backupRef.push( allEntries )

	$('#save').css({opacity: .1})

	var input = $("textarea").val()
	var lines = input.split("\n")

	console.log( lines )

	var json = [],
		curKey = null

	lines.forEach(function(line){
		var indexMatch = line.match(/^::(.*)/),
		    keyMatch = line.match(/^(\w+)::(.*)/)
		
		if( indexMatch ){
			console.log( "INDEX MATCH", indexMatch)
			json.push({})

			if( indexMatch[1] ){
				json[ json.length-1 ].link = indexMatch[1]
			}
		}
		else if( keyMatch ){
			curKey = keyMatch[1]
			json[ json.length-1 ][curKey] = keyMatch[2]
		}
		else if(curKey == 'body'){
			json[ json.length-1 ].body += '\n'+line
		}
	})

	console.log( json )

	blogRef.set( json, function(err){
		$('#save').css({opacity: .5})
		if(!err) $('#save').text('SAVED')
		else $('#save').text('ERROR...')

		setTimeout(function(){
			$('#save').text('SAVE')
		}, 2500)
	})
})