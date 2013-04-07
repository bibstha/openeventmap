from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
	url(r'^$', 'search.views.index'),
	url(r'^about-us$', 'search.views.about_us'),
	url(r'^contact-us$', 'search.views.contact_us'),
	url(r'^searchapi/$', 'search.views.searchapi'),
    # Examples:
    # url(r'^$', 'eventsvisualizer.views.home', name='home'),
    # url(r'^eventsvisualizer/', include('eventsvisualizer.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)
