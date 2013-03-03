from django.core.management.base import BaseCommand, CommandError
from search.models import *

class Command(BaseCommand):
	def handle(self, *args, **options):
		Event.objects.all().delete()