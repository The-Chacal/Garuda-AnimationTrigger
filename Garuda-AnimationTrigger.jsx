//========== Animation Trigger v1.3 ==========
createUI( this )
/**
 * Creates the UI
 * @param { object } thisObj "this"
 */
function createUI( thisObj ){
    var myDlg = thisObj ;
    var BtnA = myDlg.add( "button" , undefined , "Get Animations" );
    BtnA.size = [ 100 , 25 ];
    var staticText = myDlg.add( "staticText{ justify : 'center' , text : 'Undefined'}" );
    staticText.characters = 10 ;
    var dropdownlist = myDlg.add( "dropdownlist" , undefined , ["Nothing"] );
    dropdownlist.size = [ 100 , -1 ];
    dropdownlist.selection = dropdownlist.items[0];
    var BtnB = myDlg.add( "button" , undefined , "Add Marker" );
    BtnB.size = [ 100 , 25 ];
    //Ui Events
    myDlg.onResizing = function(){ myDlg.layout.resize(); }
    BtnA.onClick = function(){ getDropdownItems( staticText , dropdownlist ); };
    BtnB.onClick = function(){ setMarker( dropdownlist.selection.text ); };
    //Showing UI.
    myDlg.layout.layout( "true" );
}
/**
 * Add a marker with the name of the animation wanted according the previous loops eventually in place.
 * @param { string } markerName Name of the animation wanted.
 */
function setMarker( markerName ){
    
    if( app.project.activeItem == undefined || app.project.activeItem.selectedLayers.length == 0 || app.project.activeItem.selectedLayers.length > 1 || markerName == "Nothing" ){
        GarudaAlertDlg( "Pouah" , "I don't have what I need to work here!" );
        return ;
    }
    var activeComposition = app.project.activeItem ;
    var activeLayer = app.project.activeItem.selectedLayers[0];
    var newMarker = new MarkerValue( markerName );
    var timeToAddMarker = activeComposition.time ;
    var nearestKeyIndex = activeLayer.property( "ADBE Marker" ).nearestKeyIndex( activeComposition.time );
    if( activeLayer.property( "ADBE Marker" ).numKeys < 1 || ( activeLayer.property( "ADBE Marker" ).numKeys < 2 && activeComposition.time == activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) ) ){
        activeLayer.property( "ADBE Marker" ).setValueAtTime( timeToAddMarker , newMarker );
    } else {
        var previousKeyIndex = 0 ;
        var nextKeyIndex = 0 ;
        if(  activeComposition.time == activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) && nearestKeyIndex > 1 && nearestKeyIndex < activeLayer.property( "ADBE Marker" ).numKeys ){
            previousKeyIndex = nearestKeyIndex -1 ;
            nextKeyIndex = nearestKeyIndex ;
        } else if( activeComposition.time == activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) && nearestKeyIndex == 1 ){
            nextKeyIndex = nearestKeyIndex ;
        } else if(  activeComposition.time == activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) && nearestKeyIndex == activeLayer.property( "ADBE Marker" ).numKeys ){
            previousKeyIndex = nearestKeyIndex - 1 ;
            nextKeyIndex = nearestKeyIndex ;
        } else if( activeComposition.time < activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) && nearestKeyIndex == 1 ){
            nextKeyIndex = nearestKeyIndex ;
        } else if( activeComposition.time > activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) && nearestKeyIndex == activeLayer.property( "ADBE Marker" ).numKeys ){
            previousKeyIndex = nearestKeyIndex ;
        } else if( activeComposition.time < activeLayer.property( "ADBE Marker" ).keyTime( nearestKeyIndex ) ){
            previousKeyIndex = nearestKeyIndex - 1 ;
            nextKeyIndex = nearestKeyIndex ;
        } else {
            previousKeyIndex = nearestKeyIndex ;
            nextKeyIndex = nearestKeyIndex + 1 ;
        }
        if( previousKeyIndex > 0 ){
            timeToAddMarker = getPreviousAnimationEndTime( activeLayer.property( "ADBE Marker" ).keyValue( previousKeyIndex ).comment , activeLayer.property( "ADBE Marker" ).keyTime( previousKeyIndex ) , activeComposition.time );
        }
        //alert( "nearestKeyIndex : " +  nearestKeyIndex + "\npreviousKeyIndex : " +  previousKeyIndex + "\nnextKeyIndex : " + nextKeyIndex );
        if( nextKeyIndex > 0 ){
            var timeDelta = getPreviousAnimationEndTime( markerName , timeToAddMarker , activeLayer.property( "ADBE Marker" ).keyTime( nextKeyIndex ) ) - activeLayer.property( "ADBE Marker" ).keyTime( nextKeyIndex );
            var markersToMove = [];
            for( var i = activeLayer.property( "ADBE Marker" ).numKeys ; i >= nextKeyIndex ; i-- ){
                var currentMarkerProps = [];
                currentMarkerProps.push( activeLayer.property( "ADBE Marker" ).keyTime( i ) + timeDelta );
                currentMarkerProps.push( activeLayer.property( "ADBE Marker" ).keyValue( i ).comment );
                activeLayer.property( "ADBE Marker" ).removeKey( i );
                markersToMove.push( currentMarkerProps );
            }
            for( i = 0 ; i < markersToMove.length ; i++ ){
                var movedMarker = new MarkerValue( markersToMove[i][1] );
                activeLayer.property( "ADBE Marker" ).setValueAtTime( markersToMove[i][0] , movedMarker );
            }
        }
        activeLayer.property( "ADBE Marker" ).setValueAtTime( timeToAddMarker , newMarker );
    }
}
//Fonction récupérant la durée de l'anim liée au marqueur.
function getAnimationLength( sourceLayer , startMarkerComment ){
    var startMarkerTime = sourceLayer.property( "ADBE Marker" ).keyTime( startMarkerComment );
    var startMarkerIndex = sourceLayer.property( "ADBE Marker" ).nearestKeyIndex( startMarkerTime );
	if ( sourceLayer.property( "ADBE Marker" ).numKeys > startMarkerIndex ){
            var animationLength = sourceLayer.property( "ADBE Marker" ).keyTime( startMarkerIndex + 1 ) - startMarkerTime ;
        } else {
            var animationLength = sourceLayer.outPoint - startMarkerTime ;
        }
	return animationLength ;
}
/**
 * Calculates the length of the loops of the previous running animation.
 * @param { number } markerComment The Comment of the marker starting the animation.
 * @param { number } markerTime The time of the marker starting the animation.
 * @param { number } comparisonInstant Time of end to compare to.
 * @returns { number } The instant of the end of the current loop of the previous animation.
 */
function getPreviousAnimationEndTime( markerComment , markerTime , comparisonInstant ){
    var layerToTreat = app.project.activeItem.selectedLayers[0];
    var animationLayer = app.project.activeItem.selectedLayers[0].source.layer( "Markers" );
    var animationTriggerComment = markerComment ;
    var animationLength = getAnimationLength( animationLayer , animationTriggerComment )
    var endOfPreviousAnimationLoops = markerTime + ( Math.floor( ( comparisonInstant - markerTime ) / animationLength ) + 1 ) * animationLength ;
    return endOfPreviousAnimationLoops ;
}
/**
 * Gets the names of the animations.
 * @param { object } staticText The staticText displaying the name of the layer.
 * @param { object } dropdownlist The dropdownlist for which we search items.
 */
function getDropdownItems( staticText , dropdownlist ){

    if( app.project.activeItem == undefined || app.project.activeItem.selectedLayers.length == 0 || app.project.activeItem.selectedLayers.length > 1 ){
        GarudaAlertDlg( "Pouah" , "I don't have what I need to work here!" );
        return ;
    }
    var sourceLayer = null ;
    if( app.project.activeItem.selectedLayers[0].source != null && app.project.activeItem.selectedLayers[0].source.typeName == "Composition" && gotLayer( app.project.activeItem.selectedLayers[0].source , "Markers" ) ){
        sourceLayer = app.project.activeItem.selectedLayers[0].source.layer( "Markers" );
    }
    if( sourceLayer == null || sourceLayer.property( "ADBE Marker" ).numKeys < 1 ){
        GarudaAlertDlg( "Pouah" , "The layer selected is not one I can work with." );
        return ;
    }
    staticText.text = app.project.activeItem.selectedLayers[0].name
    while( dropdownlist.items.length > 0 ){ dropdownlist.remove( 0 ); }
    for( var i = 1 ; i <= sourceLayer.property( "ADBE Marker" ).numKeys ; i++ ){
        var currentMarkerComment = sourceLayer.property( "ADBE Marker" ).keyValue( i ).comment ;
        for( var j = 0 ; j <= dropdownlist.items.length ; j++ ){
            if( currentMarkerComment == dropdownlist.items[j] ){
                break ;
            } else if ( j + 1 > dropdownlist.items.length ){
                dropdownlist.add( "item" , currentMarkerComment );
                break ;
            }
        }
    }
    dropdownlist.selection = dropdownlist.items[0];

}
/**
 * Parse a Composition layers to find the one matching the name.
 * @param { object } compositionToParse The object corresponding to the composition.
 * @param { string } nameToFind Name of the layer searched for. 
 */
function gotLayer( compositionToParse , nameToFind ){

    for( var i = 1 ; i <= compositionToParse.layers.length ; i++ ){
        if( compositionToParse.layers[i].name == nameToFind )
        {
            return true ;
        }
    }
    return false ;

}
/**
 * Opens a dialog with a message for the user.
 * @param { string } title Name of the Dialog.
 * @param { string } messageContent Message displayed.
 */
 function GarudaAlertDlg( title , messageContent ){
    
    var alertDialog = new Window( "dialog" , title , undefined , { borderless : true } );
    alertDialog.spacing = 2 ;
        var textPanel = alertDialog.add( "panel" );
        textPanel.preferredSize = [ 200 , -1 ];
            textPanel.add( "staticText" , undefined , messageContent , { multiline : true } );
        var btnA = alertDialog.add( "button" , undefined , "Ok" );
    //UI Parameters
    alertDialog.defaultElement = btnA ;
    //Showing UI
    alertDialog.show();
}
/*========== Ref Expresion ==========
var sourceLayer = comp( name ).layer("Markers");
var closestMarkerIndex = 0 ;
if( marker.numKeys > 0 ){
    closestMarkerIndex = marker.nearestKey(time).index ;
    if( marker.key( closestMarkerIndex ).time > time ){
        closestMarkerIndex-- ;
    }
}
if( closestMarkerIndex == 0 ){
    0 ;
} else {
	var triggerMarker = marker.key( closestMarkerIndex );
	var myComment = triggerMarker.comment ;
	var t = time - triggerMarker.time ;
	try {
		var startMarker = sourceLayer.marker.key( myComment );
		if ( sourceLayer.marker.numKeys > startMarker.index ){ 
			var animationLength = sourceLayer.marker.key( startMarker.index + 1 ).time - startMarker.time ;
		} else {
			var animationLength = sourceLayer.outPoint - startMarker.time ;
		}
		t = timeToFrames( t ) % timeToFrames( animationLength );
		startMarker.time + framesToTime( t );
	} catch( e ) {
		0 ;
	}
}
========== Ref Expression ==========*/