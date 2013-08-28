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
// var color = ["red", "orange", "green", "blue", "purple", "cadetblue"];
// var color = ["red", "green", "blue", "purple", "cadetblue"];
var color = [
	"red", 
	"orange",
	"green",
	"blue", 
	"purple",
	"darkred", 
	"darkblue",
	"darkgreen", 
	"darkpurple", 
	"cadetblue"
];
var colorMap = {
	"Accident" : "red",
	"Exhibition" : "orange",
	"Educational" : "green",
	"Social" : "blue",
	"Traffic" : "purple",
	"Concert" : "darkred",
	"Construction" : "darkblue",
	"Sport" : "darkgreen",
	"Political" : "darkpurple",
	"Other" : "cadetblue",
};

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
	L.tileLayer('http://{s}.tile.openeventmap.tum.de/osm_tiles/{z}/{x}/{y}.png', 
	{
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
		maxZoom: 18
	}).addTo(map);

	$(document).ready(function() {
		$('#myTab a').click(function (e) {
			e.preventDefault();
			$(this).tab('show');
		})
		$(function() {
			$('#myTab a:last').tab('show');
		});
	});
	
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
		// console.log(node);
		var eventPopup = renderEventPopup(node.events);
		var eventCategories = getEventCategories(node.events);
		// console.log(eventCategories.length);
		// console.log(eventCategories);
		
		if (eventCategories.length == 1) {
			var coloredMarker = L.AwesomeMarkers.icon({
				icon: undefined,
				color: colorMap[eventCategories[0]],
				className: 'awesome-marker-half',
				iconSize: [18, 24],
				iconAnchor:   [9, 21]
			});
			var marker = L.marker([node.lat, node.lng], {icon: coloredMarker}).bindPopup(eventPopup);
		}
		else {
			var marker = L.marker([node.lat, node.lng]).bindPopup(eventPopup);
		}
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

function getEventCategories(events) {
	var categories = [];
	for (var key in events) {
		var category = events[key].category;
		if (category == "") { category = "Other"}
		if (categories.indexOf(category) == -1) {
			categories.push(category);
		}
	}
	return categories;
}

function renderEventPopup(events) {
	var length = events.length;
	var tagPopUpWrapper = "";
	var sortedKeys = [];
	var currentDate = new Date();
	for (var key in events) {
		if (events[key].startdate) {
			var sd = events[key].startdate.split("/");
			sd = Math.abs( currentDate - new Date( [sd[1], sd[0], currentDate.getFullYear()].join("/") ) );	
		}
		else {
			sd = 365000000;
		}
		sortedKeys.push( [key, sd] );
	}
	sortedKeys = sortedKeys.sort(function(a, b) {
		return a[1] - b[1];
	});
	for (var k in sortedKeys) {
		var key = sortedKeys[k][0];
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

/**
 * Returns categories
 */
function getNodeCategories(nodes) {
	var length = nodes.length;
	var categories = {};
	var expectedCategories = ['social', 'sport', 'accident', 'concert', 'conference', 'construction', 'educational', 'exhibition', 'natural',
		'political', 'traffic', 'other'];
	for (var i=0; i<expectedCategories.length; i++) {
		categories[expectedCategories[i]] = [];
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
	for (key in categories) {
		// console.log(categories[key]);
		categories[key].sort(function(a, b) { 
			// console.log(a.name.toLowerCase());
			return a.name.toLowerCase() < b.name.toLowerCase() 
		});
		// console.log("Sorted", categories[key]);
	}
	return categories;
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
function updateDivHeight() {
	var mapContainer = $('#map');
	mapContainer.height($('body').height() - mapContainer.offset().top);

	var searchResultContainer = $('#searchresults');
	searchResultContainer.height($('body').height() - searchResultContainer.offset().top);
}

function initAngularApp() {
	$("#nominatim-div .btn-open").click(function() {
		$("#nominatim-div").removeClass("closed");
	});
	$("#nominatim-div .btn-close").click(function() {
		$("#nominatim-div").addClass("closed");
	});

	var nApp = angular.module('eventsApp', ['$strap.directives']);
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
				params: {
					format: "json", 
					q: $scope.query,
					viewbox: "11.305,48.274,12.482,47.675",
					bounded: 1
				}
			}).success($scope.searchSuccess);
		}
	}

	$scope.loadSearchResultInMap = function(resultObj) {
		if (undefined == resultObj) return;
		map.fitBounds([
			[resultObj.boundingbox[0], resultObj.boundingbox[2]],
			[resultObj.boundingbox[1], resultObj.boundingbox[3]]
		]);
	}
}

function EventSearchCtrl($scope, $http) {
	$scope.resultCategoryEventMap = {};
	$scope.map_center = {};
	$scope.firstSearchFired = false;

	$scope.initialize = function() {
		map.on('moveend', function() {
			$scope.$apply($scope.fetchNodeResults);
		});
	}

	$scope.clearMarkers = function() {
		if (currentMarkers != undefined) {
			currentMarkers.clearLayers();
			currentMarkers = undefined;
		}
		currentMapNodes = undefined;
	}

	$scope.search = function() {
		$scope.firstSearchFired = true;
		$scope.clearMarkers();
		$scope.fetchNodeResults();
	}

	$scope.fetchNodeResults = function() {
		if (!$scope.firstSearchFired) return;
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
		
		var params = {
			'e':e, 'w':w, 'n':n, 's':s,
			'name': $scope.eName,
			'category': $scope.eCategory,
			'startdate': $scope.eStartDate?$scope.eStartDate.toDateString():undefined,
			'enddate': $scope.eEndDate?$scope.eEndDate.toDateString():undefined,
		};
		$scope.map_center = {'lng': lng, 'lat': lat, 'zoom': zoom};

		$http({
			method: 'get',
			url: '/searchapi/',
			params: params
		})
		.success($scope.buildColorMap)
		.success(renderMarkers)
		.success($scope.updateResults);
	}

	$scope.updateResults = function(data) {
		$scope.searchResults = data;
		$scope.resultCategoryEventMap = {};
		var categoryEventMap = getNodeCategories(data.elements);
		for (category in categoryEventMap) {
			if (categoryEventMap[category].length > 0) {
				$scope.resultCategoryEventMap[category] = categoryEventMap[category];
			}
		}
	}

	$scope.getEventsForCategory = function(category) {
		return $scope.resultCategoryEventMap[category];
	}

	$scope.popupNode = function(event) {
		if (event.id && eventMarkerHashMap[event.id]) {
			var marker = eventMarkerHashMap[event.id];
			marker.openPopup();
		}
	}

	$scope.showRelatedItems = function(event) {
		if (event.id && eventMarkerHashMap[event.id]) {
			getRelatedItemsInOsmFormat([eventMarkerHashMap[event.id].current_node.events[event.id]]);
		}
	}

	$scope.colorClass = function(category) {
		category = capitaliseFirstLetter(category);
		return "colorClass" + capitaliseFirstLetter(colorMap[category]);
	}

	$scope.capitalise = function(word) {
		return capitaliseFirstLetter(word);
	}

	$scope.buildColorMap = function(data) {
		// var i = 0;
		// for (var ck in data.categories) {
		// 	colorMap[data.categories[ck]] = color[i % color.length];
		// 	i++;
		// }
	}

	$scope.searchResultDiv = function() {
		if (jQuery.isEmptyObject($scope.resultCategoryEventMap))
			return "hide";
		else
			return "";
	}
}

function main() {
	updateDivHeight();
	var resizeTimer;
	$(window).resize(function() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(updateDivHeight, 100);
	});
	initialize();
	initAngularApp();
}

main();
