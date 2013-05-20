from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseRedirect
from django.template import RequestContext
from search.models import *
from decimal import Decimal
from django.core import serializers
from django.db.models import Q
from datetime import datetime, time
from dateutil import parser
from dateutil.rrule import *
import pprint

import json

def index(request):
	parameters = {}
	return render_to_response('index.haml', parameters, context_instance=RequestContext(request))

def about_us(request):
	parameters = {}
	return render_to_response('about-us.haml', parameters, context_instance=RequestContext(request))

def contact_us(request):
	parameters = {}
	return render_to_response('contact-us.haml', parameters, context_instance=RequestContext(request))

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

	query = Q(latitude__gt=latMin, latitude__lt=latMax, longitude__gt=lngMin, longitude__lt=lngMax)
	if request.GET.get("name"):
		query = query & Q(name__icontains=request.GET.get("name"))
	if request.GET.get("category"):
		query = query & Q(category__icontains=request.GET.get("category"))
	
	events = Event.objects.filter(query)
	
	if request.GET.get("startdate") or request.GET.get("enddate"):
		startdate = parser.parse(request.GET.get("startdate"))
		query = query & Q(startdate__gte=startdate)
		
		enddate = parser.parse(request.GET.get("enddate") or "")
		query = query & Q(enddate__lte=enddate)
		
		print "StartDate, EndDate :", startdate, enddate
		events = filterDates(events, startdate, enddate)

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
					'id' : event.id,
					'name' : event.name,
					'category' : event.category.capitalize(),
					'subcategory' : event.subcategory.capitalize(),
					'url' : event.url,
					'num_participants' : event.num_participants,
					'howoften' : event.howoften,
					'related_items' : map(lambda x:x.split(":"), event.related_items.lower().split(", ")) if
						event.related_items.strip() != "" else "",
				}
				if event.startdate:
					if event.startdate.strftime("%H:%M") != "00:00":
						eventsOutput[event.type_id]['events'][event.id]['startdate'] = event.startdate.strftime("%d/%m/%Y %H:%M")
					else:
						eventsOutput[event.type_id]['events'][event.id]['startdate'] = event.startdate.strftime("%d/%m/%Y")

				if event.enddate:
					if event.enddate.strftime("%H:%M") != "00:00":
						eventsOutput[event.type_id]['events'][event.id]['enddate'] = event.enddate.strftime("%d/%m/%Y %H:%M")
					else:
						eventsOutput[event.type_id]['events'][event.id]['enddate'] = event.enddate.strftime("%d/%m/%Y")

	return HttpResponse(json.dumps({'elements':eventsOutput}), content_type="application/json")

def feedback_post(request):
	if request.POST.get("message"):
		feedback = Feedback()
		feedback.message = request.POST.get("message")
		feedback.save()
		return HttpResponse("saved")
	else:
		return HttpResponse("notsaved")
	

def feedbacks_list(request):
	feedbacks = Feedback.objects.all()
	return render_to_response('feedbacks_list.haml', {'feedbacks' : feedbacks}, context_instance=RequestContext(request))

def getRule(datetime, howoften):
	howoften = howoften.lower()
	if howoften == "yearly":
		return rrule(YEARLY, dtstart=datetime)
	elif howoften == "monthly":
		return rrule(MONTHLY, dtstart=datetime)
	elif howoften == "bimonthly":
		return rrule(WEEKLY, interval=2)
	elif howoften == "weekly":
		return rrule(WEEKLY)
	elif howoften == "biweekly":
		return rrule(WEEKLY)
	# elif howoften == "daily":
	# 	return rrule(DAILY)
	else:
		return False

def filterDates(events, startdate, enddate):
		result = []
		for event in events:
			if not event.startdate:
				continue

			eStartDate = event.startdate
			eEndDate = event.enddate or eStartDate

			print eStartDate, eEndDate, event.howoften

			if not event.howoften or not getRule(eStartDate, event.howoften):
				if startdate.date() <= eStartDate and eEndDate <= enddate.date():
					result.append(event)
					print "Inside"
				else:
					continue
			else:
				r = getRule(eStartDate, event.howoften)
				l = r.between(startdate, enddate)
				if l:
					print "L", l
					result.append(event)
				else:
					continue

		return result

		# we assume both startdate and enddate are valid datetime
		# result = []
		# elif startdate and enddate:
		# 	perform rrule.between
		# elif not startdate :
		# 	# perform rrule.before(enddate) query
		# else:
		# 	# perform rrule.after(startdate) query

		# set = rruleset()
		# for event in events:
		# 	if not event.startdate:
		# 		continue
		# 	if not event.howoften:
				

		# 	if event.enddate:
		# 	elif not event.howoften:
		# 		if (event.startdate)
		# 		result.append(event)

		# 	 and possible.has_key(event.howoften.lower()):
		# 		r = possible.has_key(event.howoften.lower())
		# 		r._dtstart = 