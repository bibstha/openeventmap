from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseRedirect
from django.template import RequestContext
from search.models import *
from decimal import Decimal
from django.core import serializers
from django.db.models import Q
from datetime import datetime, time, timedelta
from dateutil import parser
from dateutil.rrule import *
import pprint
import json

import logging
logger = logging.getLogger(__name__)

def index(request):
	"""
	GET /
	Renders the base homepage consisiting of search forms and map.
	Only renders the structure and most of the dynamic portions are handled by
	javascript/angular through eventsvisualizer.js
	"""
	parameters = {}
	return render_to_response('index.haml', parameters, context_instance=RequestContext(request))

def about_us(request):
	"""
	GET /about-us
	Displays the AboutUs Page
	"""
	parameters = {}
	return render_to_response('about-us.haml', parameters, context_instance=RequestContext(request))

def contact_us(request):
	"""
	GET /contact-us
	Displays the ContactUs Page
	"""
	parameters = {}
	return render_to_response('contact-us.haml', parameters, context_instance=RequestContext(request))

def searchapi(request):
	"""
	GET /searchapi
	Handler for Search requests. Possible parameters are
	e,w,n,s with respective latitude and longitude values
	name : the name of the event, it does a partial text match
	category : category text to match inside primary and secondary category fields
	"""
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
		startdate = parser.parse(request.GET.get("startdate"), dayfirst=True)
		query = query & Q(startdate__gte=startdate)
		
		enddate = parser.parse(request.GET.get("enddate") or "", dayfirst=True)
		query = query & Q(enddate__lte=enddate)
		
		print "StartDate, EndDate :", startdate, enddate
		events = filterDates(events, startdate, enddate)

	# order these events closest to today
	# events = _sortEvents(events)

	eventsOutput = {}
	eventCategories = []
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
					'category' : event.category.strip().capitalize(),
					'subcategory' : event.subcategory.strip().capitalize(),
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
		category = event.category.strip().capitalize()
		if category != "" and category not in eventCategories:
			eventCategories.append(category)
	eventCategories.sort()
	eventCategories.append("Other")
	return HttpResponse(json.dumps({'elements':eventsOutput, 'categories':eventCategories}), content_type="application/json")

def feedback_post(request):
	"""
	POST /feedback/post
	Saves the data through feedback into database
	"""
	if request.POST.get("message"):
		feedback = Feedback()
		feedback.message = request.POST.get("message")
		feedback.save()
		return HttpResponse("saved")
	else:
		return HttpResponse("notsaved")
	

def feedbacks_list(request):
	"""
	GET /feedbacks/list
	Displays all feedbacks
	"""
	feedbacks = Feedback.objects.all()
	return render_to_response('feedbacks_list.haml', {'feedbacks' : feedbacks}, context_instance=RequestContext(request))

def getRule(datetime, howoften):
	"""
	helper function
	
	Returns respective rrule formula for given string
	rrule is explained in more detail here http://labix.org/python-dateutil
	"""
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
	"""
	helper function

	Filters out events which belong in between startdate and EndDate
	Users rrule from getRule to calculate date opening and closing limits
	"""
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

# def _sortEvents(events, date=datetime.now()):
# 	q = sorted(events, key=lambda event:_getDateDiff(event.startdate))
# 	print q
# 	return q

# def _getDateDiff(d):
# 	# print abs(datetime.now().date() - datetime(datetime.now().year, d.month, d.day).date()) if d != None else timedelta(days=366)
# 	return abs(datetime.now().date() - datetime(datetime.now().year, d.month, d.day).date()) if d != None else timedelta(days=366)