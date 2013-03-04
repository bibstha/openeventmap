// By default always Munich map
var map = L.map('map').setView([48.1742, 11.5453], 13);
L.tileLayer('http://{s}.tile.cloudmade.com/8afbe1354ec0452da96ac774a8dc4403/1/256/{z}/{x}/{y}.png', {
attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
maxZoom: 18
}).addTo(map);

eventName = "";
eventCategory = "";
eventStartDate = "";
eventEndDate = "";
$("form button[type=submit]").click(function(event) {
    event.preventDefault(); 
    eventName = $("input[name=eventName]").val();
    eventCategory = $("input[name=eventCategory]").val();
    eventStartDate = $("input[name=eventStartDate]").val();
    eventEndDate = $("input[name=eventEndDate]").val();
    fetchMarkers();
});

function fetchMarkers(e) {
	// How to get the values
	// zoom = map.getZoom()
	n = map.getBounds().getNorthEast().lat;
	e = map.getBounds().getNorthEast().lng;
	s = map.getBounds().getSouthWest().lat;
	w = map.getBounds().getSouthWest().lng;
	
	// var marker = L.marker([48.1742, 11.5453]).addTo(map);
	// marker.bindPopup("This is cool");
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
	nodes = data.elements;
	var length = nodes.length;
	var markers = [];
	for (var key in nodes) {
		node = nodes[key];
		eventPopup = renderEventPopup(node.events);
		markers.push(L.marker([node.lat, node.lng]).bindPopup(eventPopup));
	}
	if (window['currentMarkers'] != undefined) { currentMarkers.clearLayers(); }
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
	// var length = nodes.length;
	// var markers = [];
	// resultContainer = $("#searchResults")[0];
	// $(resultContainer).empty();
	// var resultTmpl = "<div class='search-result-item'>%s</div>";
	// var result = "<div class='search-result-header'>Search Results</div>";
	// for (var i=0; i<length; i++)
	// {
	// 	element = nodes[i];
	// 	if (!element.tags['event:0:name']) continue;
	// 	result += sprintf(resultTmpl, element.tags['event:0:name']);
	// }
	// $(resultContainer).append(result);
}

map.on('moveend', fetchMarkers);
// map.on('click', function(e) { console.log(sprintf("[%f,%f]", e.latlng.lat, e.latlng.lng))});

fetchMarkers();


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
	console.log("asdf", nodeCategories);
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