from django.core.management.base import BaseCommand, CommandError
from search.models import *
from dateutil.parser import parse
from datetime import datetime
from pyosm import OSCXMLFile
from optparse import make_option
import sys
import logging
from apidb2eventsinit import ApiToEvent

logger = logging.getLogger(__name__)

class Command(BaseCommand):
	args = 'filepath'
	help = "filepath\tThe path to the .osc file"
	apiToEvent = ApiToEvent()

	def handle(self, *args, **options):
		if len(args) != 1:
			self.print_help(sys.argv[0], sys.argv[1])
			exit(-1)

		filename = args[0]
		ext = filename[-3:]
		if ext != 'osc':
			print "ERROR: Invalid file type, please pass a .osc file."
			exit(-1)
		else:
			f = open(filename)
			osc = OSCXMLFile(f)

			logger.info("Starting OSC2EVENTS ***********")
			
			# DELETION
			# logger.debug("Deleting...")
			for k in osc.delete_nodes:
				logger.info("Deleting node %d" % k)
				self.delete('node', k)

			for k in osc.delete_ways:
				logger.info("Deleting way %d" % k)
				self.delete('way', k)

			# CREATION
			logger.info("Total %d create_nodes" % (len(osc.create_nodes)))
			for k in osc.create_nodes:
				if "event" in osc.create_nodes[k].tags and osc.create_nodes[k].tags["event"] == "yes":
					logger.debug("Creating node %d" % k)
					self.create('node', k)

			logger.info("Total %d create_ways" % (len(osc.create_ways)))
			for k in osc.create_ways:
				if "event" in osc.create_ways[k].tags and osc.create_ways[k].tags["event"] == "yes":
					logger.debug("Creating way %d" % k)
					self.create('way', k)

			# MODIFICATION
			logger.info("Total %d modify_nodes" % len(osc.modify_nodes))
			for k in osc.modify_nodes:
				if "event" in osc.modify_nodes[k].tags and osc.modify_nodes[k].tags["event"] == "yes":
					logger.debug("Modifying node with id %d" % k)
					self.delete('node', k)
					self.create('node', k)

			logger.info("Total %d modify_ways" % len(osc.modify_ways))
			for k in osc.modify_ways:
				if "event" in osc.modify_ways[k].tags and osc.modify_ways[k].tags["event"] == "yes":
					logger.debug("Modifying way with id %d" % k)
					self.delete('way', k)
					self.create('way', k)

			logger.info("Ending OSC2EVENTS *********")


	def delete(self, event_type, type_id):
		q = Event.objects.filter(event_type=event_type, type_id=type_id)
		if len(q):
			logger.info("Deleting '%s' with id %d" % (event_type, type_id))
			q.delete()
		else:
			logger.debug("Deletion : '%s' not found in events table %d" % (event_type, type_id))

	def create(self, event_type, type_id):
		events = {}
		if event_type == "node":
			events = self.apiToEvent.parseApiNodeToEventArray(type_id)

		elif event_type == "way":
			events = self.apiToEvent.parseApiWayToEventArray(type_id)

		logger.info("%s %d has %d events" % (event_type, type_id, len(events)))
		for eventId in events:
			events[eventId].save()
	