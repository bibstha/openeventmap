// By default always Munich map
var map;
var currentMarkers; // MapLayer to store markers
var currentRelElems; // Highlight Objects
var eventName = "";
var eventCategory = "";
var eventStartDate = "";
var eventEndDate = "";
$("form button[type=submit]").click(function(event) {
	event.preventDefault(); 
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
	L.tileLayer('http://{s}.tile.cloudmade.com/8afbe1354ec0452da96ac774a8dc4403/1/256/{z}/{x}/{y}.png', 
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
	var nodes = data.elements;
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
	}
	if (currentMarkers != undefined) { currentMarkers.clearLayers(); }
	currentMarkers = L.layerGroup(markers).addTo(map);
}

function renderEventPopup(events) {
	var length = events.length;
	for (var key in events) {
		event = events[key];
		var tagPopupValue = "";
		// for (var i=0; i<length; i++) {
		var eventName = event.name;
		tagPopupValue += (eventName)?sprintf("<b>%s</b><br/>", eventName):"";
		// console.log(tagPopupValue);
		var eventCat = event.category;
		// console.log("EventCat", eventCat);
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

	}
	return "<div class='popup-container'>" + tagPopupValue + "</div>";
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
		// console.log("Events", node.events);
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
 * Renders a list of Nodes inside Categories
 */
function renderNodeCategories(nodeCategories) {
	var result = "";
	for (var key in nodeCategories) {
		// console.log(key);
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

function renderCategory(category, id) {
	var len = category.length;
	var result = "";
	for (var i=0; i<len; i++) {
		result += "<li>" + capitaliseFirstLetter(category[i].name.toLowerCase()) + "</li>";
	}
	return sprintf('<div id="collapse-%s" class="accordion-body collapse in mycollapse">' +
		'<div class="accordion-inner">%s</div></div>', id, "<ul>" + result + "</ul>");
}

function onMarkerMouseOver(data) {
	var events = data.target.current_node.events;
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
	// grab information on related items
	// render them on the marker
}

function onMarkerMouseOut(data) {
	if (currentRelElems != undefined) {
		currentRelElems.clearLayers();
	}
}

function renderRelatedItems(data) {
	if (currentRelElems != undefined) {
		currentRelElems.clearLayers();
	}
	var geojsonMarkerOptions = {
		radius: 16,
		fillColor: "#ff7800",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
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
	// console.log("XML", data);
	// console.log("JSON", b);
	currentRelElems = L.layerGroup([L.geoJson(geoJsonData, decor)]).addTo(map);
}

// var url = 'http://www.overpass-api.de/api/interpreter?data=(way(116767683);>;);out;(way(4060419);>;);out;';
// var url = 'http://www.overpass-api.de/api/interpreter?data=(way(116767683);>;);out;node(269698991);out;';
// $.get(url, myFunc);

function main() {
	initialize();
	map.on('moveend', fetchMarkers);
	fetchMarkers();
}

main();