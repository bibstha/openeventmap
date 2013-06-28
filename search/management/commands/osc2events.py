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
			osc = OSCXMLFile(f)
			
			# Take care of deletion first
			for k in osc.delete_nodes:
				q = Event.objects.filter(event_type="node")
				print(q)

			# Insertion, always comes before modification

			# Modification


		
		