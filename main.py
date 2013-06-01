
import os
import urllib
import json

from google.appengine.api import users
from google.appengine.ext import ndb
from google.appengine.api.urlfetch import fetch, create_rpc, make_fetch_call

import jinja2
import webapp2

import logging

DEBUG = True
API_KEY = '2be32e012a18e934a254ddcabb8db55455b9349c'

DEVICE_OS = 'BumpFinderApp'
DEVICE_NAME = 'http://bumpfinder.appspot.com/'

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])


def location_key(lat, lon):
    return ndb.Key('Location', "%.4f,%.4f" % (float(lat), float(lon)))


class Location(ndb.Model):
    longitude = ndb.FloatProperty()
    latitude = ndb.FloatProperty()


class Bump(ndb.Model):
    magnitude = ndb.FloatProperty()
    created = ndb.DateTimeProperty(auto_now_add=True)
    reporter = ndb.StringProperty()
    issue_id = ndb.IntegerProperty()


def record_old_bump(bump, email, issue_id):
    payload = {
        'api_key': API_KEY,
        'comment[comment]': "I felt the pothole, too!\n\n[auto-generated via Bump Finder app: http://bumpfinder.appspot.com/]",
        'comment[email]': email,
        'comment[name]': email.split('@')[0],
        'comment[device_os]': DEVICE_OS,
        'comment[device_name]': DEVICE_NAME
    }

    encoded_payload = '&'.join(map(lambda pair: "%s=%s" % pair, payload.items()))

    response = fetch(url='http://test.seeclickfix.com/api/issues/%s/comments.json' % issue_id,
          payload=encoded_payload,
          method="POST")

    logging.info(response.content)

    bump.issue_id = issue_id
    bump.put()


def record_new_bump(bump, lat, lon, email):
    geo_json = fetch("http://maps.googleapis.com/maps/api/geocode/json?latlng=%s,%s&sensor=true" % (lat, lon))
    logging.info(geo_json.content)
    geo_data = json.loads(geo_json.content)['results']

    if geo_data:
        address = geo_data[0]['formatted_address']
    else:
        address = 'Address Unknown'

    payload = {
        'api_key': API_KEY,
        'issue[summary]': 'Pothole alert!',
        'issue[description]': '[auto-generated via Bump Finder app: http://bumpfinder.appspot.com/]',
        'issue[reporter_display]': email.split('@')[0],
        'issue[reporter_email]': email,
        'issue[lat]': lat,
        'issue[lng]': lon,
        'issue[address]': address,
        'issue[device_os]': DEVICE_OS,
        'issue[device_name]': DEVICE_NAME,
    }

    encoded_payload = '&'.join(map(lambda pair: "%s=%s" % pair, payload.items()))

    response = fetch(url="http://test.seeclickfix.com/api/issues.json",
                     payload=encoded_payload,
                     method="POST")

    bump.issue_id = json.loads(response.content)['id']
    bump.put()


class ClientHandler(webapp2.RequestHandler):
    def get(self):
        template_values = {'flash': 'starting up...', 'DEBUG': DEBUG }
        template = JINJA_ENVIRONMENT.get_template('client.html')
        self.response.write(template.render(template_values))

    def post(self):
        lat = self.request.get('latitude')
        lon = self.request.get('longitude')
        if lat and lon:
            loc_key = location_key(lat, lon)
            bump_query = Bump.query(ancestor=loc_key)
            old_bumps = bump_query.fetch(1)

            bump = Bump(parent=loc_key)
            bump.magnitude = float(self.request.get('magnitude'))
            speed = self.request.get('speed', 0.0)
            if speed:
                speed = float(speed)
                bump.speed = speed
            bump.reporter = self.request.remote_addr
            email = self.request.get('email')
            bump.email = email
            flash = 'BUMP RECORDED'

            if old_bumps:
                record_old_bump(bump, email, old_bumps[0].issue_id)
            else:
                record_new_bump(bump, lat, lon, email)
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
