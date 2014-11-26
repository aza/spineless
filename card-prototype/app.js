function CardHolder( isBackground ){
  var springCurve = "spring(200,20,10)"

  var card = new Layer({
    width:  window.innerWidth,
    height: window.innerHeight,
    y:      640,
    scale: .9,
    backgroundColor: Utils.randomColor(1)
  })

  card.states.add({
    base: {scale: 1.0, opacity: 1},
    //active: {opacity:.8},
    drag: { scale: 1.1, opacity: 1},
    wait: {scale: .96, opacity:.5},
    dead: {scale: .7, opacity: 0}
  })

  card.states.animationOptions = {curve: springCurve}
  
  card.states.switch("wait")
  card.index = 0

  card.draggable.enabled = true;
  card.draggable.speedY = 0;
  card.center();

  card.on(Events.TouchStart, function() {
    //return card.states.switch("active")
  });

  card.on(Events.TouchEnd, function() {
    return card.states.switch("base")
  });

  card.on(Events.DragMove, function(event, node) {
    var dR = ((node.x+node.width/2)/window.innerWidth)-.5

    card.states.switch("drag")

    return card.animate({
      properties: {
        opacity: 1-Math.abs(dR*2)+.5,
        rotationZ: dR*30,
        shadowColor: "rgba(0,0,0,1.0)"
      },
      curve: "spring(1000,100,0)"
    })
  });


  var originalX = card.x,
      originalY = card.y

  card.on(Events.DragEnd, function(event, node) {
    var dR = ((node.x+node.width/2)/window.innerWidth)-.5,
        props = {
          x: originalX,
          y: originalY,
          rotationZ: 0,
          opacity: 1,
        }

    if( dR > 0.3){
      //props.x = window.innerWidth
      node.states.switch("wait")
      node.index = -5
      cm.next()
    }
    else if ( dR < -.3 ){
      //props.x = -node.width
      node.states.switch("wait")
      node.index = -5
      cm.next()
    }

    return card.animate({
      properties: props,
      curve: springCurve
    });
  })

  this.card = card
}


function loadEntries(startingAt, limit, callback){
  var blogRef = new Firebase("shorts.firebaseio.com/entries")
  blogRef
    .startAt(null, startingAt.toString())
    .limit(limit)
    .on('child_added', function(entrySnapshot){
      console.log( entrySnapshot.val(), entrySnapshot.name() )
      if( callback ) callback(entrySnapshot.val())
  })
}


loadEntries(0, 1)



function CardManager(){
  var cardQueue = [],
      index = 1

  this.next = function(){
    newCard = cardQueue[(index+1)%cardQueue.length].card
    oldCard = cardQueue[(index)%cardQueue.length].card

    newCard.states.switch("base")
    newCard.index = 5

    oldCard.states.switch("wait")
    newCard.index = 0

    newCard.html = "<h1>"+Utils.randomColor(1)+"</h1>"

    loadEntry(index+1, newCard)

    index++
  }

  function loadEntry(entryNum, node){
    loadEntries(entryNum, 1, function(entry){
      node.html = entry.title
    })
  }


  var cardOne = new CardHolder()
  loadEntry( 0, cardOne )

  var cardTwo = new CardHolder()
  loadEntry( 1, cardOne )

  cardQueue.push( cardOne )
  cardQueue.push( cardTwo )
  this.next()

}

var cm = new CardManager()





