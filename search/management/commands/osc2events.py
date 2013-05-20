from django.core.management.base import BaseCommand, CommandError
from search.models import *
from dateutil.parser import parse
from datetime import datetime
from pyosm import OSCXMLFile
from optparse import make_option
import sys

class Command(BaseCommand):
	args = 'filepath'
	help = "filepath\tThe path to the .osc file"

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
			file_contents = f.read()
			osc = OSCXMLFile(content=file_contents)
			osc.statistic()

			# Create first
			for node_id, node in osc.create_nodes.iteritems():
				# Event.objects.filter(event_type='node', type_id=)
				print 'Deleting all events with node_id ', node_id
				# Event.objects.filter(event_type='node', type_id=node_id).delete()

			for node_id, node in osc.modify_nodes.iteritems():
				print 'Modifying all events with node_id', node_id
				# node.tags



		
		