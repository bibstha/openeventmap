from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseRedirect
from django.template import RequestContext

def index(request):
	parameters = {}
	return render_to_response('index.html', parameters, context_instance=RequestContext(request))
