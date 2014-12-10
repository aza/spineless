var blogRef = new Firebase("shorts.firebaseio.com/entries"),
	backupRef = new Firebase("shorts.firebaseio.com/backup-entries")
	allEntries = null

blogRef.once('value', function(entriesSnapshot){
	var output = ""

	allEntries = entriesSnapshot.val()
	allEntries.forEach(function(entry, num){
		if( entry ){
			output += '::' + num + '\n'
			
			Object.keys(entry).forEach(function(key){
				output += key+'::'+entry[key]+'\n'
				//console.log( key, ":", entry[key] )
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

	var json = {},
		curIndex = 0,
		curKey = null

	lines.forEach(function(line){
		var indexMatch = line.match(/^::(\d+)/),
		    keyMatch = line.match(/^(\w+)::(.*)/)
		
		if( indexMatch ){
			curIndex = indexMatch[1]
			json[curIndex] = {}
		}
		else if( keyMatch ){
			curKey = keyMatch[1]
			json[curIndex][curKey] = keyMatch[2]
		}
		else if(curKey == 'body'){
			json[curIndex].body += '\n'+line
		}
	})

	blogRef.set( json, function(err){
		$('#save').css({opacity: .5})
		if(!err) $('#save').text('SAVED')
		else $('#save').text('ERROR...')

		setTimeout(function(){
			$('#save').text('SAVE')
		}, 2500)
	})
})