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
	# https://trac.openstreetmap.org/browser/applications/utils/osmosis/trunk/src/org/openstreetmap/osmosis/core/util/FixedPrecisionCoordinateConvertor.java?rev=20552

	latMin = int(Decimal(request.GET.get("s")) * pow(10, PRECISION))
	latMax = int(Decimal(request.GET.get("n")) * pow(10, PRECISION))
	lngMin = int(Decimal(request.GET.get("w")) * pow(10, PRECISION))
	lngMax = int(Decimal(request.GET.get("e")) * pow(10, PRECISION))

	query = Q(latitude__gt=latMin, latitude__lt=latMax, longitude__gt=lngMin, longitude__lt=lngMax);
	if request.GET.get("name"):
		query = query & Q(name__icontains=request.GET.get("name"))
	if request.GET.get("category"):
		query = query & Q(name__icontains=request.GET.get("category"))

	events = Event.objects.filter(query)

	JSONSerializer = serializers.get_serializer("json")
	jsonSerializer = JSONSerializer()

	response_data = jsonSerializer.serialize(events)
	return HttpResponse(json.dumps(response_data), content_type="application/json")