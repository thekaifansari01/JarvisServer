import os
import uuid
from urllib.parse import urlencode
from upstash_redis import Redis

redis = Redis.from_env()

def app(environ, start_response):
    query_string = environ.get('QUERY_STRING', '')
    params = {}
    if query_string:
        for pair in query_string.split('&'):
            if '=' in pair:
                k, v = pair.split('=', 1)
                params[k] = v

    service = params.get('service', 'calendar')

    if service == 'calendar':
        scopes = 'https://www.googleapis.com/auth/calendar'
    else:
        scopes = 'https://mail.google.com/ https://www.googleapis.com/auth/pubsub'

    state = str(uuid.uuid4())
    redis.setex(f"oauth:state:{state}", 300, service)

    auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode({
        'client_id': os.environ.get('GOOGLE_CLIENT_ID', ''),
        'redirect_uri': os.environ.get('REDIRECT_URI', ''),
        'response_type': 'code',
        'scope': scopes,
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state
    })

    status = '302 Found'
    headers = [('Location', auth_url)]
    start_response(status, headers)
    return []