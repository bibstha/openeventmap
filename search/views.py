from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseRedirect
from django.template import RequestContext
from search.models import *
from decimal import Decimal
from django.core import serializers
from django.db.models import Q

import json

def index(request):
	parameters = {}
	return render_to_response('index.html', parameters, context_instance=RequestContext(request))

def searchapi(request):
	requiredParams = ["e","w","n","s"]
	optionalParams = ["name", "category"]
	
	for param in requiredParams:
		if not request.GET.get(param):
			errorOutput = {"status":"error", "message":"e,w,n,s bounding parameters should not be empty."}
			return HttpResponse(json.dumps(errorOutput), content_type="application/json")

	PRECISION = 7;
	MUL_FACTOR = pow(10, PRECISION);
	# https://trac.openstreetmap.org/browser/applications/utils/osmosis/trunk/src/org/openstreetmap/osmosis/core/util/FixedPrecisionCoordinateConvertor.java?rev=20552

	latMin = int(Decimal(request.GET.get("s")) * MUL_FACTOR)
	latMax = int(Decimal(request.GET.get("n")) * MUL_FACTOR)
	lngMin = int(Decimal(request.GET.get("w")) * MUL_FACTOR)
	lngMax = int(Decimal(request.GET.get("e")) * MUL_FACTOR)

	query = Q(latitude__gt=latMin, latitude__lt=latMax, longitude__gt=lngMin, longitude__lt=lngMax);
	if request.GET.get("name"):
		query = query & Q(name__icontains=request.GET.get("name"))
	if request.GET.get("category"):
		query = query & Q(name__icontains=request.GET.get("category"))

	events = Event.objects.filter(query)

	eventsOutput = {}
	for event in events:
		if event.event_type == "node":
			if not eventsOutput.has_key(event.type_id):
				eventsOutput[event.type_id] = {
					'lat' : float(event.latitude) / MUL_FACTOR,
					'lng' : float(event.longitude) / MUL_FACTOR,
					'events' : {}
				}
			if not eventsOutput[event.type_id]['events'].has_key(event.id):
				eventsOutput[event.type_id]['events'][event.id] = {
					'name' : event.name
				}


	# JSONSerializer = serializers.get_serializer("json")
	# jsonSerializer = JSONSerializer()
	# response_data = jsonSerializer.serialize(events)
	return HttpResponse(json.dumps({'elements':eventsOutput}), content_type="application/json")