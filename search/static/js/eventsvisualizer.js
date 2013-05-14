// By default always Munich map
var map;
var currentMarkers; // MapLayer to store markers
var currentRelElems; // Highlight Objects
var currentMapNodes; // All nodes currently in the map
var eventName = "";
var eventCategory = "";
var eventStartDate = "";
var eventEndDate = "";
var eventMarkerHashMap = {};
$("form button[type=submit]").click(function(event) {
	event.preventDefault(); 
	if (currentMarkers != undefined) {
		currentMarkers.clearLayers();
		currentMarkers = undefined;
	}
	currentMapNodes = undefined;
	eventName = $("input[name=eventName]").val();
	eventCategory = $("input[name=eventCategory]").val();
	eventStartDate = $("input[name=eventStartDate]").val();
	eventEndDate = $("input[name=eventEndDate]").val();
	fetchMarkers();
});

function initialize() {
	// Check if we have previously stored map coordinates
	var curMapView = $.cookie("mapView");
	if (undefined != curMapView) {
		curMapView = curMapView.split(":");
		for (var i=0; i<curMapView.length; i++) {
			curMapView[i] = parseFloat(curMapView[i]);
		}
	}
	else {
		// Default coordinates for Munich, [Lat, Lng, Zoom]
		curMapView = [48.1742, 11.5453, 13];
	}
	map = L.map('map').setView([curMapView[0], curMapView[1]], curMapView[2]);
	// L.tileLayer('http://{s}.tile.cloudmade.com/8afbe1354ec0452da96ac774a8dc4403/1/256/{z}/{x}/{y}.png', 
	L.tileLayer('http://{s}.tile.localhost/osm_tiles/{z}/{x}/{y}.png', 
	{
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
		maxZoom: 18
	}).addTo(map);
}

function fetchMarkers(e) {
	// How to get the values
	// zoom = map.getZoom()
	var n = map.getBounds().getNorthEast().lat;
	var e = map.getBounds().getNorthEast().lng;
	var s = map.getBounds().getSouthWest().lat;
	var w = map.getBounds().getSouthWest().lng;

	var lng = (e+w)/2;
	var lat = (n+s)/2;
	var zoom = map.getZoom();
	$.cookie("mapView", sprintf("%.4f:%.4f:%d", lat, lng, zoom));
	
	$.getJSON('/searchapi/',
	{
		'e':e, 'w':w, 'n':n, 's':s,
		'name':eventName,
		'category':eventCategory,
		'startdate':eventStartDate,
		'enddate':eventEndDate,
	})
	.success(renderMarkers)
	.success(renderResults);
}

function renderMarkers(data)
{
	var nodes = {};
	if (currentMapNodes == undefined) {
		currentMapNodes = data.elements;
		nodes = currentMapNodes;
	}
	else {
		// Append new nodes
		for (var key in data.elements) {
			if (currentMapNodes[key] == undefined) {
				nodes[key] = data.elements[key]
				currentMapNodes[key] = data.elements[key]
			}
		}
	}
	
	var length = nodes.length;
	var markers = [];
	for (var key in nodes) {
		var node = nodes[key];
		var eventPopup = renderEventPopup(node.events);
		var marker = L.marker([node.lat, node.lng]).bindPopup(eventPopup);
		marker.on('mouseover', onMarkerMouseOver);
		marker.on('mouseout', onMarkerMouseOut);
		marker.current_node = node;
		markers.push(marker);

		for (var eventKey in node.events) {
			eventMarkerHashMap[eventKey] = marker;
		}
	}
	if (currentMarkers != undefined) { 
		for (var key in markers) {
			currentMarkers.addLayer(markers[key]);
		}
	}
	else {
		currentMarkers = L.layerGroup(markers).addTo(map);
	}
}

function renderEventPopup(events) {
	var length = events.length;
	var tagPopUpWrapper = "";
	for (var key in events) {
		event = events[key];
		var tagPopupValue = "";
		// for (var i=0; i<length; i++) {
		var eventName = event.name;
		tagPopupValue += (eventName)?sprintf("<b>%s</b><br/>", eventName):"";
		var eventCat = event.category;
		var eventSubCat = event.subcategory;
		tagPopupValue += (eventCat && eventSubCat)?sprintf("Category: %s > %s<br/>", eventCat, eventSubCat):"";
		var eventStartDate = event.startdate;
		var eventEndDate = event.enddate;
		tagPopupValue += (eventStartDate && eventEndDate)?sprintf("From: %s to %s<br/>", eventStartDate, eventEndDate):"";
		var eventUrl = event.url;
		if (eventUrl != undefined && eventUrl.trim().length > 0 && eventUrl.charAt(0) != "h") eventUrl = "http://" + eventUrl;
		tagPopupValue += (eventUrl)?sprintf("Url: <a href='%s' target='_blank'>%s</a><br/>", eventUrl, trimUrl(eventUrl)):"";
		var eventNumParticipants = event.num_participants;
		tagPopupValue += (eventNumParticipants)?sprintf("Number of Participants: %s<br/>", eventNumParticipants):"";
		var eventHowOften = event.howoften;
		tagPopupValue += (eventHowOften)?sprintf("How often: %s<br/>", eventHowOften):"";
		tagPopUpWrapper += tagPopupValue + "<br/>";
	}
	return "<div class='popup-container'>" + tagPopUpWrapper + "</div>";
}

function trimUrl(url) {
	if (url != undefined && url.length > 40) {
		return url.substr(0,40) + "...";
	}
	else {
		return "";
	}
}

function capitaliseFirstLetter(string)
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function getTagValue(tagList, tagKey) {
	tagValue = tagList[tagKey];
	if (tagValue) {
		tagValue = capitaliseFirstLetter(tagValue);
		return tagValue;
	}
	else {
		return undefined;
	}
}

function getTagKey(suffix, number) {
	if(typeof(number)==='undefined') number = 0;
	return sprintf('event:%d:%s', number, suffix);
}

function renderResults(data)
{
	var nodes = data.elements;
	var nodeCategories = getNodeCategories(nodes);
	resultContainer = $("#searchResults")[0];
	$(resultContainer).empty();
	$(resultContainer).append(renderNodeCategories(nodeCategories));
	$(".collapse").collapse();
	associateEventWithMarker();
}


/**
 * Model functions
 * 
 * Changes structure of the data or returns modified data structures
 */

/**
 * Returns categories
 */
function getNodeCategories(nodes) {
	var length = nodes.length;
	var categories = new Array();
	var expectedCategories = ['social', 'sport', 'accident', 'concert', 'conference', 'construction', 'educational', 'exhibition', 'natural',
		'political', 'traffic', 'other'];
	for (var i=0; i<expectedCategories.length; i++) {
		categories[expectedCategories[i]] = new Array();
	}
	for (var i in nodes) {
		var node = nodes[i];
		for (var eventkey in node.events) {
			var eventObj = node.events[eventkey];
			var category = eventObj.category.toLowerCase();
			if (category != undefined && category.length > 0 && expectedCategories.indexOf(category) != -1) {
				categories[category].push(eventObj);
			}
			else {
				categories['other'].push(eventObj);	
			}
		}
	}
	return categories;
}


/********
 View Functions that renders a particular piece of object
 ********/

/**
 * For given nodeCategories, render them inside an accordian
 */
function renderNodeCategories(nodeCategories) {
	var result = "";
	for (var key in nodeCategories) {
		var category = nodeCategories[key];
		var categoryRendered = "";
		if (category.length != 0) {
			var categoryResult = sprintf('<div class="accordion-heading">' + 
				'<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#collapse-%s">' +
				"%s events</a></div>", key, capitaliseFirstLetter(key));
			categoryResult += renderCategory(category, key);
			result += '<div class="accordion-group">' + categoryResult + "</div>";
		}
	}
	return '<div class="accordion" id="accordion2">' + result + '</div>';
}

/**
 * Render one single nodeCategory and return the result as a string
 */
function renderCategory(category, id) {
	var len = category.length;
	var result = "";
	for (var i=0; i<len; i++) {
		result += sprintf("<li class='event-list' data-eventid='%s'>%s<br/>" +
			"<i class='icon-eye-open'/><a href='#' class='event-list-view'>View</a> " + 
			"<i class='icon-list-alt'/><a href='#' class='event-list-relateditems'>Related Items</a></li>", 
			category[i].id, capitaliseFirstLetter(category[i].name.toLowerCase()));
	}
	return sprintf('<div id="collapse-%s" class="accordion-body collapse in mycollapse">' +
		'<div class="accordion-inner">%s</div></div>', id, "<ul>" + result + "</ul>");
}

/**
 * When mouse is over a marker, load the relatedItems and render them
 * on the map
 */
function onMarkerMouseOver(data) {
	var events = data.target.current_node.events;
	getRelatedItemsInOsmFormat(events);
	// grab information on related items
	// render them on the marker
}

/**
 * Renders relatedItems in a separate layer.
 *
 * Uses overpass-api to load the data
 *
 * @param events - array of event object where
 *  one single event is ['way/node', 'wayid/nodeid']
 */
function getRelatedItemsInOsmFormat(events) {
	var nodeTmplate = "node(%s);out;";
	var wayTemplate = "(way(%s);>;);out;";
	var queryStr = "";
	for (var eventKey in events) {
		var anEvent = events[eventKey];
		for (var itemKey in anEvent.related_items) {
			var relatedItem = anEvent.related_items[itemKey];
			if (relatedItem[0] == 'way') {
				queryStr += sprintf(wayTemplate, relatedItem[1]);
			}
			else if (relatedItem[0] == 'node') {
				queryStr += sprintf(wayTemplate, relatedItem[1]);
			}
		}
	}
	if (queryStr.trim() != "") {
		var url = 'http://www.overpass-api.de/api/interpreter?data=' + queryStr;
		$.get(url, renderRelatedItems);	
	}
}

/**
 * When mouse is taken away from a marker, hide the relatedItems
 */
function onMarkerMouseOut(data) {
	if (currentRelElems != undefined) {
		currentRelElems.clearLayers();
	}
}

/**
 * For given relatedItems in data, render their structure in the leaflet map
 */
function renderRelatedItems(data) {
	if (currentRelElems != undefined) {
		currentRelElems.clearLayers();
	}
	var geojsonMarkerOptions = {
		radius: 8,
		fillColor: "#dd3300",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.9
	};
	var decor = {
		pointToLayer: function (feature, latlng) {
    		return L.circleMarker(latlng, geojsonMarkerOptions);
		},
		style: function(feature) {
			return {color: "#ff0000"};
		}
	};
	var geoJsonData = osm2geo(data);
	currentRelElems = L.layerGroup([L.geoJson(geoJsonData, decor)]).addTo(map);
}

/**
 * Changes the given div height to fit the whole browser screen
 *
 * Should be called when browser size is changed $(window).resize()
 */
function updateMapHeight() {
	var mapContainer = $('#result-row');
	mapContainer.height($('body').height() - mapContainer.offset().top);
}

function associateEventWithMarker() {
	$(".event-list-view").click(function(event) {
		console.log("Outside");
		var event_id = $(this).parent().data('eventid');
		console.log(event_id);
		if (event_id && eventMarkerHashMap[event_id]) {
			console.log('Inside');
			var marker = eventMarkerHashMap[event_id];
			console.log(event_id);
			marker.openPopup();
		}
	});

	$(".event-list-relateditems").click(function(event) {
		var event_id = $(this).parent().data('eventid');
		if (event_id && eventMarkerHashMap[event_id]) {
			getRelatedItemsInOsmFormat([eventMarkerHashMap[event_id].current_node.events[event_id]]);
		}
	});
}

function initAngularApp() {
	$("#nominatim-div .btn-open").click(function() {
		$("#nominatim-div").removeClass("closed");
	});
	$("#nominatim-div .btn-close").click(function() {
		$("#nominatim-div").addClass("closed");
	});

	var nApp = angular.module('eventsApp', []);
	nApp.config(function($interpolateProvider) {
	  $interpolateProvider.startSymbol('{[{');
	  $interpolateProvider.endSymbol('}]}');
	});
}

function NominatimCtrl($scope, $http) {
	$scope.searchResults = [];
	
	$scope.searchSuccess = function(data) {
		$scope.searchResults = data;
	}

	$scope.search = function() {
		if ($scope.query != undefined) {
			var url = "http://nominatim.openstreetmap.org/search";
			$http({
				method: 'get',
				url: url,
				params: {format: "json", q: $scope.query}
			}).success($scope.searchSuccess);
		}
	}

	$scope.loadSearchResultInMap = function(resultObj) {
		if (undefined == resultObj) return;
		console.log(resultObj);
		map.fitBounds([
			[resultObj.boundingbox[0], resultObj.boundingbox[2]],
			[resultObj.boundingbox[1], resultObj.boundingbox[3]]
		]);
	}
}

function EventSearchCtrl($scope) {
	$scope.search = function() {
		
	}
}

function main() {
	updateMapHeight();
	var resizeTimer;
	$(window).resize(function() {
		clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateMapHeight, 100);
	});
	initialize();
	map.on('moveend', fetchMarkers);
	fetchMarkers();
	initAngularApp();
}

main();