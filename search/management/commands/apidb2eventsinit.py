from django.core.management.base import BaseCommand, CommandError
from search.models import *
from dateutil.parser import parse
from datetime import datetime

class Command(BaseCommand):
	def handle(self, *args, **options):

		nodes = NodeTag.objects.filter(k="event", v="yes")
		for node in nodes:
			events = {}
			nodeTags = NodeTag.objects.filter(node_id=node.node_id)
			for nodeTag in nodeTags:
				(eventId, eventTag) = nodeTag.parseEventKey()
				#eventId has 0,1,2,3
				if None is eventId:
					continue
				if not events.has_key(eventId):
					events[eventId] = Event()
					events[eventId].number = eventId
					events[eventId].k = nodeTag.k
					events[eventId].event_type = "node"
					events[eventId].type_id = node.node_id
					eventCurrentNode = Node.objects.get(id=node.node_id)
					if eventCurrentNode:
						events[eventId].latitude = eventCurrentNode.latitude
						events[eventId].longitude = eventCurrentNode.longitude
				try:
					if eventTag == "name":
						events[eventId].name = nodeTag.v
					elif eventTag == "category":
						events[eventId].category = nodeTag.v
					elif eventTag == "subcategory":
						events[eventId].subcategory = nodeTag.v
					elif eventTag == "startdate":
						events[eventId].startdate = self.parseDate(nodeTag.v)
					elif eventTag == "enddate":
						events[eventId].enddate = self.parseDate(nodeTag.v)
					elif eventTag == "related_items":
						events[eventId].related_items = nodeTag.v
				except ValueError:
					print "Exception occured:", type(nodeTag.v), eventTag, ":", self.parseDate(nodeTag.v)

				# print eventTag, nodeTag.v
			
			for eventId in events:
				events[eventId].save()

		ways = WayTag.objects.filter(k="event", v="yes")
		for way in ways:
			events = {}
			wayTags = WayTag.objects.filter(way_id=way.way_id)
			for wayTag in wayTags:
				(eventId, eventTag) = wayTag.parseEventKey()
				#eventId has 0,1,2,3
				if None is eventId:
					continue
				if not events.has_key(eventId):
					events[eventId] = Event()
					events[eventId].number = eventId
					events[eventId].k = wayTag.k
					events[eventId].event_type = "way"
					events[eventId].type_id = way.way_id

				try:
					if eventTag == "name":
						events[eventId].name = wayTag.v
					elif eventTag == "category":
						events[eventId].category = wayTag.v
					elif eventTag == "subcategory":
						events[eventId].subcategory = wayTag.v
					elif eventTag == "startdate":
						events[eventId].startdate = self.parseDate(wayTag.v)
					elif eventTag == "enddate":
						events[eventId].enddate = self.parseDate(wayTag.v)
					elif eventTag == "related_items":
						events[eventId].related_items = nodeTag.v
				except ValueError:
					print "Exception occured:", type(wayTag.v), eventTag, ":", self.parseDate(wayTag.v)
			
			for eventId in events:
				events[eventId].save()

		self.stdout.write('This is hello world\n')

	def parseDate(self, strDate):
		# remove words like nach and Uhr
		dateValue = None
		try:
			strDate = strDate.lower().replace('uhr', '').replace('nach', '')
			strDate = re.sub("\s+", " ", strDate)
			dateValue = parse(strDate)
		except ValueError:
			try:
				# print strDate
				dateValue = datetime.strptime(strDate, "%d.%m.%Y %H.%M")
			except ValueError:
				# print "Threw error"
				dateValue = None
		return dateValue
