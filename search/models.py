from django.db import models
from compositekey import db
import re

class Event(models.Model):
	# either way or node
	event_type = models.CharField(max_length=4,db_index=True)
	type_id = models.BigIntegerField(db_index=True)
	number = models.BigIntegerField(db_index=True)
	name = models.CharField(max_length=255,db_index=True)
	category = models.CharField(max_length=255,db_index=True)
	subcategory = models.CharField(max_length=255)
	startdate = models.DateField(null=True)
	enddate = models.DateField(null=True)
	related_items = models.CharField(max_length=255)
	url = models.CharField(max_length=255)
	num_participants = models.CharField(max_length=255)
	howoften = models.CharField(max_length=255)
	latitude = models.IntegerField(null=True, db_index=True)
	longitude = models.IntegerField(null=True, db_index=True)
	k = models.CharField(max_length=255)


class NodeTag(models.Model):
	id = db.MultiFieldPK("node_id", "k")
	node_id = models.BigIntegerField()
	k = models.CharField(max_length=255)
	v = models.CharField(max_length=255)

	class Meta:
		db_table = "current_node_tags"
		managed = False

	def parseEventKey(self):
		parsed = re.search("event:([0-9]+):(.+)", self.k)
		if parsed:
			return (int(parsed.group(1)), parsed.group(2))
		else:
			return (None, None)
		

class WayTag(models.Model):
	id = db.MultiFieldPK("way_id", "k")
	way_id = models.BigIntegerField()
	k = models.CharField(max_length=255)
	v = models.CharField(max_length=255)

	class Meta:
		db_table = "current_way_tags"
		managed = False

	def parseEventKey(self):
		parsed = re.search("event:([0-9]+):(.+)", self.k)
		if parsed:
			return (int(parsed.group(1)), parsed.group(2))
		else:
			return (None, None)

class Node(models.Model):
	id = models.BigIntegerField(primary_key=True)
	latitude = models.IntegerField()
	longitude = models.IntegerField()

	class Meta:
		db_table = "current_nodes"
		managed = False

class Way(models.Model):
	id = models.BigIntegerField(primary_key=True)
	latitude = models.IntegerField()
	longitude = models.IntegerField()

	class Meta:
		db_table = "current_ways"
		managed = False

class Feedback(models.Model):
	message = models.TextField()
	created_at = models.DateTimeField(auto_now_add = True)