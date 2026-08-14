import os
import json
import uuid
import requests
from urllib.parse import parse_qs
from datetime import datetime, timedelta
from upstash_redis import Redis

redis = Redis.from_env()

def app(environ, start_response):
    query_string = environ.get('QUERY_STRING', '')
    params = parse_qs(query_string)

    code = params.get('code', [None])[0]
    state = params.get('state', [None])[0]

    if not code:
        status = '400 Bad Request'
        headers = [('Content-Type', 'text/html')]
        start_response(status, headers)
        return [b'<h1>Error: No code received from Google</h1>']

    if not state:
        status = '400 Bad Request'
        headers = [('Content-Type', 'text/html')]
        start_response(status, headers)
        return [b'<h1>Error: Missing state parameter</h1>']

    service = redis.get(f"oauth:state:{state}")
    if not service:
        status = '400 Bad Request'
        headers = [('Content-Type', 'text/html')]
        start_response(status, headers)
        return [b'<h1>Error: Invalid or expired state parameter</h1>']

    redis.delete(f"oauth:state:{state}")

    client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')

    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': os.environ.get('REDIRECT_URI', ''),
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=data)

    if response.status_code != 200:
        status = '500 Internal Server Error'
        headers = [('Content-Type', 'text/html')]
        start_response(status, headers)
        error_msg = f"<h1>Error: Failed to exchange code with Google</h1><p><b>Google's Exact Error:</b> {response.text}</p>"
        return [error_msg.encode('utf-8')]

    tokens = response.json()

    formatted_tokens = {
        "token": tokens.get("access_token"),
        "refresh_token": tokens.get("refresh_token"),
        "token_uri": token_url,
        "client_id": client_id,
        "client_secret": client_secret,
        "scopes": ["https://www.googleapis.com/auth/calendar"] if service == 'calendar' else ['https://mail.google.com/', 'https://www.googleapis.com/auth/pubsub']
    }

    if "expires_in" in tokens:
        expiry_dt = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
        formatted_tokens["expiry"] = expiry_dt.isoformat() + "Z"

    session_id = str(uuid.uuid4())
    redis.setex(
        f"oauth:session:{session_id}",
        300,
        json.dumps(formatted_tokens)
    )

    jarvis_url = f'jarvis://callback?session_id={session_id}&service={service}'

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Successful · JARVIS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
            body {{
                background: #000000;
                font-family: 'Plus Jakarta Sans', sans-serif;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 20px;
                position: relative;
                overflow-x: hidden;
            }}
            /* Subtle enterprise grid */
            .grid-bg {{
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                background-image: 
                    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
                background-size: 30px 30px;
                mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
                -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
            }}
            .glow {{
                position: absolute;
                width: 50vw;
                height: 50vw;
                border-radius: 50%;
                filter: blur(80px);
                opacity: 0.15;
                pointer-events: none;
                z-index: 0;
            }}
            .glow-indigo {{
                background: #6366f1;
                top: -20%;
                right: -10%;
            }}
            .glow-cyan {{
                background: #22d3ee;
                bottom: -20%;
                left: -10%;
                opacity: 0.08;
            }}
            .card {{
                position: relative;
                z-index: 10;
                background: rgba(10, 10, 10, 0.85);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 24px;
                max-width: 480px;
                width: 100%;
                padding: 48px 40px;
                text-align: center;
                box-shadow: 0 30px 60px -20px rgba(0,0,0,0.8);
                transition: border-color 0.3s ease;
            }}
            .card:hover {{
                border-color: rgba(99, 102, 241, 0.25);
            }}
            .icon-ring {{
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: rgba(52, 211, 153, 0.08);
                border: 1px solid rgba(52, 211, 153, 0.2);
                margin-bottom: 24px;
                animation: pulse-glow 3s ease-in-out infinite;
            }}
            @keyframes pulse-glow {{
                0% {{ transform: scale(1); opacity: 0.8; }}
                50% {{ transform: scale(1.06); opacity: 1; }}
                100% {{ transform: scale(1); opacity: 0.8; }}
            }}
            .icon-ring svg {{
                width: 34px;
                height: 34px;
                stroke: #34d399;
                stroke-width: 2;
                fill: none;
            }}
            h1 {{
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.02em;
                margin-bottom: 8px;
                background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            .subtitle {{
                font-size: 16px;
                color: #8888a0;
                margin-bottom: 32px;
                line-height: 1.5;
            }}
            .subtitle strong {{
                color: #e0e0f0;
                font-weight: 600;
            }}
            .url-box {{
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 12px;
                padding: 14px 18px;
                margin: 24px 0 28px;
                text-align: left;
                overflow-x: auto;
                white-space: nowrap;
                font-size: 13px;
                font-family: 'JetBrains Mono', monospace;
                color: #c0c0d0;
                letter-spacing: 0.02em;
            }}
            .url-box .prefix {{
                color: #6366f1;
                font-weight: 500;
            }}
            .btn-group {{
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            }}
            .btn {{
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 28px;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                background: #ffffff;
                color: #000000;
                border: none;
                cursor: pointer;
                transition: all 0.25s ease;
                text-decoration: none;
                min-width: 140px;
                box-shadow: 0 4px 16px rgba(255, 255, 255, 0.08);
            }}
            .btn:hover {{
                background: #e5e5e5;
                transform: translateY(-2px);
                box-shadow: 0 8px 28px rgba(255, 255, 255, 0.12);
            }}
            .btn:active {{
                transform: translateY(0);
            }}
            .btn-secondary {{
                background: rgba(255, 255, 255, 0.06);
                box-shadow: none;
                color: #c0c0d0;
                border: 1px solid rgba(255, 255, 255, 0.06);
            }}
            .btn-secondary:hover {{
                background: rgba(255, 255, 255, 0.12);
                box-shadow: none;
                transform: translateY(-2px);
            }}
            .footnote {{
                margin-top: 32px;
                font-size: 13px;
                color: #555;
            }}
            .footnote a {{
                color: #6366f1;
                text-decoration: none;
                transition: color 0.2s;
            }}
            .footnote a:hover {{
                color: #818cf8;
                text-decoration: underline;
            }}
            @media (max-width: 480px) {{
                .card {{
                    padding: 32px 20px;
                }}
                h1 {{
                    font-size: 24px;
                }}
                .btn {{
                    min-width: 100%;
                }}
                .url-box {{
                    font-size: 12px;
                    padding: 10px 14px;
                }}
            }}
        </style>
    </head>
    <body>
        <!-- Background grid and glows -->
        <div class="grid-bg"></div>
        <div class="glow glow-indigo"></div>
        <div class="glow glow-cyan"></div>

        <div class="card">
            <div class="icon-ring">
                <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            </div>
            <h1>Authentication successful</h1>
            <p class="subtitle">
                Your <strong>{service.capitalize()}</strong> account has been connected to JARVIS.
            </p>
            <div class="url-box">
                <span class="prefix">jarvis://</span><span>{jarvis_url.replace('jarvis://', '')}</span>
            </div>
            <div class="btn-group">
                <button class="btn" onclick="copyAndClose()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy &amp; Close
                </button>
                <button class="btn btn-secondary" onclick="window.close()">
                    Close
                </button>
            </div>
            <p class="footnote">
                You can safely close this window. Jarvis will open automatically.
            </p>
        </div>

        <script>
            // Auto-redirect to Jarvis
            window.location.href = '{jarvis_url}';

            function copyAndClose() {{
                const url = '{jarvis_url}';
                navigator.clipboard.writeText(url).then(() => {{
                    window.close();
                }}).catch(() => {{
                    // Fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = url;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    window.close();
                }});
            }}
        </script>
    </body>
    </html>
    """

    status = '200 OK'
    headers = [('Content-Type', 'text/html')]
    start_response(status, headers)
    return [html.encode('utf-8')]