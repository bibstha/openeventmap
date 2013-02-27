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
		eventPopup = "<b>" + element.tags['event:0:name'] + "</b>";
		eventPopup += (element.tags['event:0:startdate'] != undefined)?"</br>Starts: " + element.tags['event:0:startdate']:"";
		eventPopup += (element.tags['event:0:enddate'] != undefined)?"</br>Ends: " + element.tags['event:0:startdate']:"";
		markers[i] = L.marker([element.lat, element.lon]).bindPopup(eventPopup);
		// element = nodes[i];
		// console.log(sprintf("Search: [%f,%f]", element.lat, element.lon));
		// var marker = L.marker([element.lat, element.lon]).addTo(map);
		// marker.bindPopup(element.tags['event:0:name']);
		// console.log("Adding:" + element.tags['event:0:name']);
	}
	if (window['currentMarkers'] != undefined) { currentMarkers.clearLayers(); }
	currentMarkers = L.layerGroup(markers).addTo(map);
}

function renderResults(data)
{
	odes = data.elements;
	var length = nodes.length;
	var markers = [];
	resultContainer = $("#searchResults")[0];
	$(resultContainer).empty();
	var resultTmpl = "<tr><td>%d</td><td>%s</td></tr>";
	var result = "";
	for (var i=0; i<length; i++)
	{
		element = nodes[i];
		result += sprintf(resultTmpl, i+1, element.tags['event:0:name']);
	}
	$(resultContainer).append("<table class='table table-bordered'>" + result + "</table>");
}

map.on('moveend', fetchMarkers);
map.on('click', function(e) { console.log(sprintf("[%f,%f]", e.latlng.lat, e.latlng.lng))});

fetchMarkers();