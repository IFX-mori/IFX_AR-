import http.server
import ssl
import os
import socket

PORT = 8443
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass  # suppress access logs

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except:
        return '127.0.0.1'
    finally:
        s.close()

cert_file = os.path.join(DIRECTORY, 'server.crt')
key_file  = os.path.join(DIRECTORY, 'server.key')

httpd = http.server.HTTPServer(('', PORT), Handler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(certfile=cert_file, keyfile=key_file)
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

ip = get_local_ip()
print('=' * 48)
print('  AR Navigation HTTPS Server')
print('=' * 48)
print()
print('  iPhone URL (Demo):')
print(f'  https://{ip}:{PORT}/ar-navi-demo.html')
print()
print('  iPhone URL (Image Tracking):')
print(f'  https://{ip}:{PORT}/ar-image-tracking.html')
print()
print('  * PC and iPhone must be on the same Wi-Fi')
print('  * iPhone: tap "Advanced" -> "Proceed" at')
print('    the security warning screen')
print()
print('  Press Ctrl+C to stop.')
print('=' * 48)

httpd.serve_forever()
