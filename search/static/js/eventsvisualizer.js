// By default always Munich map
var map = L.map('map').setView([48.1742, 11.5453], 13);
L.tileLayer('http://{s}.tile.cloudmade.com/8afbe1354ec0452da96ac774a8dc4403/1/256/{z}/{x}/{y}.png', {
attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
maxZoom: 18
}).addTo(map);

eventName = "";
eventCategory = "";
$("form button").click(function(event) {
    event.preventDefault(); 
    eventName = $("input[name=eventName]").val();
    eventCategory = $("input[name=eventCategory]").val();
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
	opQryTpml = '[out:json];node["event"="yes"]%s(%f,%f,%f,%f);out;';
	var nameQuery = "";
	if (eventName != "") { nameQuery = sprintf('["event:0:name"~"%s"]', eventName); }
	nameQuery += (eventCategory != "")?sprintf('["event:0:category"~"%s"]', eventCategory):"";

	$.getJSON('http://localhost/overpassapi/interpreter',
	{
		'data':sprintf(opQryTpml, nameQuery, s, w, n, e)
	})
	.success(renderMarkers)
	.success(renderResults);
}

function renderMarkers(data)
{
	nodes = data.elements;
	var length = nodes.length;
	var markers = [];
	for (var i=0; i<length; i++)
	{
		element = nodes[i];
		eventPopup = renderEventPopup(element.tags);
		markers[i] = L.marker([element.lat, element.lon]).bindPopup(eventPopup);
	}
	if (window['currentMarkers'] != undefined) { currentMarkers.clearLayers(); }
	currentMarkers = L.layerGroup(markers).addTo(map);
}

function renderEventPopup(tags) {
	// var length = tags.length;
	// Only consider 0th event for now.

	var tagPopupValue = "";
	// for (var i=0; i<length; i++) {
	var eventName = getTagValue(tags, getTagKey('name'));
	tagPopupValue += (eventName)?sprintf("<b>%s</b><br/>", eventName):"";
	var eventCat = getTagValue(tags, getTagKey('category'));
	var eventSubCat = getTagValue(tags, getTagKey('subcategory'));
	tagPopupValue += (eventCat && eventSubCat)?sprintf("Category: %s > %s<br/>", eventCat, eventSubCat):"";
	var eventStartDate = getTagValue(tags, getTagKey('startdate'));
	var eventEndDate = getTagValue(tags, getTagKey('enddate'));
	tagPopupValue += (eventStartDate && eventEndDate)?sprintf("From: %s to %s<br/>", eventStartDate, eventEndDate):"";
	var eventUrl = tags[getTagKey('url')];
	if (eventUrl != undefined && eventUrl.charAt(0) != "h") eventUrl = "http://" + eventUrl;
	tagPopupValue += (eventUrl)?sprintf("Url: <a href='%s' target='_blank'>%s</a><br/>", eventUrl, trimUrl(eventUrl)):"";
	var eventNumParticipants = getTagValue(tags, getTagKey('num_participants'));
	tagPopupValue += (eventNumParticipants)?sprintf("Number of Participants: %s<br/>", eventNumParticipants):"";
	var eventHowOften = getTagValue(tags, getTagKey('howoften'));
	tagPopupValue += (eventHowOften)?sprintf("How often: %s<br/>", eventHowOften):"";
	// }
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
function getNodeCategories(nodeList) {
	var length = nodeList.length;
	var category = new Array();
	var expectedCategories = ['social', 'sport', 'accident', 'concert', 'conference', 'construction', 'educational', 'exhibition', 'natural',
		'political', 'traffic', 'other'];
	for (var i=0; i<expectedCategories.length; i++) {
		category[expectedCategories[i]] = new Array();
	}
	for (var i=0; i<length; i++) {
		var node = nodeList[i];
		var nodeTag = getTagValue(node.tags, getTagKey('category'));
		if (nodeTag) {
			if (expectedCategories.indexOf(nodeTag.toLowerCase()) != -1) {

				category[nodeTag.toLowerCase()].push(node);
			}
			else {
				category['other'].push(node);
			}
		}
	}
	// console.log(category);
	return category;
}


/********
 View Functions that renders a particular piece of object
 ********/

/**
 * Renders a list of Nodes inside Categories
 */
function renderNodeCategories(nodeCategories) {
	console.log(nodeCategories);
	var result = "";
	for (var key in nodeCategories) {
		console.log(key);
		var category = nodeCategories[key];
		if (category.length != 0) {
			var categoryResult = "<b>" + capitaliseFirstLetter(key) + " events</b><br/>";
			categoryResult += renderCategory(category);
			result += "<div class='node-category'>" + categoryResult + "</div>";
		}
	}
	return result;
}

function renderCategory(category) {
	var len = category.length;
	var result = "";
	for (var i=0; i<len; i++) {
		result += "<div>" + capitaliseFirstLetter(category[i].tags[getTagKey("name")]) + "</div>";
	}
	return result;
}