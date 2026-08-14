import os
import json
from upstash_redis import Redis

redis = Redis.from_env()

def app(environ, start_response):
    try:
        content_length = int(environ.get('CONTENT_LENGTH', 0))
        body = environ['wsgi.input'].read(content_length).decode('utf-8')
        data = json.loads(body) if body else {}
        session_id = data.get('session_id')
    except:
        session_id = None

    if not session_id:
        status = '400 Bad Request'
        headers = [('Content-Type', 'application/json')]
        start_response(status, headers)
        return [json.dumps({'error': 'session_id required'}).encode('utf-8')]

    key = f"oauth:session:{session_id}"
    token_json = redis.get(key)

    if token_json is None:
        status = '404 Not Found'
        headers = [('Content-Type', 'application/json')]
        start_response(status, headers)
        return [json.dumps({'error': 'Session expired or already used'}).encode('utf-8')]

    redis.delete(key)

    status = '200 OK'
    headers = [('Content-Type', 'application/json')]
    start_response(status, headers)
    return [token_json.encode('utf-8')]