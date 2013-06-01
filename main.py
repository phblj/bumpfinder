
import os
import urllib
import json

from google.appengine.api import users
from google.appengine.ext import ndb
from google.appengine.api.urlfetch import fetch, create_rpc, make_fetch_call

import jinja2
import webapp2

import logging

DEBUG = False

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])

CONSTANTS = {

}


def location_key(lat, lon):
    return ndb.Key('Location', "%.4f,%.4f" % (float(lat), float(lon)))


class Location(ndb.Model):
    longitude = ndb.FloatProperty()
    latitude = ndb.FloatProperty()


class Bump(ndb.Model):
    magnitude = ndb.FloatProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)
    reporter = ndb.StringProperty()


def record_bump(lat, lon, email, bumps):
    geo_json = fetch("http://maps.googleapis.com/maps/api/geocode/json?latlng=%s,%s&sensor=true" % (lat, lon))
    logging.info(geo_json.content)
    geo_data = json.loads(geo_json.content)['results']

    if geo_data:
        address = geo_data[0]['formatted_address']
    else:
        address = 'Address Unknown'

    payload = {
        'api_key': '2be32e012a18e934a254ddcabb8db55455b9349c',
        'issue[summary]': 'A pothole was felt %s times' % len(bumps),
        'issue[description]': '[Auto-generated from bump-finder using the accelerometer of my mobile device.]',
        'issue[reporter_display]': 'Bump Finder',
        'issue[reporter_email]': email,
        'issue[lat]': lat,
        'issue[lng]': lon,
        'issue[address]': address
    }

    encoded_payload = '&'.join(map(lambda pair: "%s=%s" % pair, payload.items()))

    rpc = create_rpc()
    make_fetch_call(rpc=rpc,
                    url="http://test.seeclickfix.com/api/issues.json",
                    payload=encoded_payload,
                    method="POST")

    if DEBUG:
        logging.info(rpc.get_result().content)


class ClientHandler(webapp2.RequestHandler):
    def get(self):
        template_values = {'flash': 'starting up...'}
        template = JINJA_ENVIRONMENT.get_template('client.html')
        self.response.write(template.render(template_values))

    def post(self):
        lat = self.request.get('latitude')
        lon = self.request.get('longitude')
        if lat and lon:
            loc_key = location_key(lat, lon)
            bump = Bump(parent=loc_key)
            bump.magnitude = float(self.request.get('magnitude'))
            speed = self.request.get('speed', 0.0)
            if speed:
                speed = float(speed)
                bump.speed = speed
            bump.reporter = self.request.remote_addr
            email = self.request.get('email')
            bump.email = email
            bump.put()
            flash = 'BUMP RECORDED'

            bump_query = Bump.query(ancestor=loc_key)
            bumps = bump_query.fetch(100)
            flash += "<br>recorded bump #%s here" % len(bumps)
            record_bump(lat, lon, email, bumps)
        else:
            flash = 'no location data-- bump not saved'

        template_values = {
            'flash': flash,
            'DEBUG': DEBUG
        }
        template = JINJA_ENVIRONMENT.get_template('client.html')
        self.response.write(template.render(template_values))

app = webapp2.WSGIApplication([
    ('/', ClientHandler)
], debug=True)
