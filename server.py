import http.server
import json
import os
import sys
import time

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(__file__), 'database.json')

# Global Database cache
db = {
    "bloodBanks": [],
    "donors": [],
    "sosRequests": []
}

# Load database from database.json
def load_database():
    global db
    try:
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                db = json.load(f)
            print("Database loaded successfully from database.json")
            print(f"- Blood Banks: {len(db.get('bloodBanks', []))}")
            print(f"- Donors: {len(db.get('donors', []))}")
            print(f"- SOS Requests: {len(db.get('sosRequests', []))}")
        else:
            print("database.json not found. Initializing empty arrays.")
    except Exception as e:
        print(f"Error loading database.json: {e}")

# Persist database back to database.json
def save_database():
    try:
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        print("Database successfully persisted to database.json")
    except Exception as e:
        print(f"Failed to write database.json: {e}")

class RadarAPIRequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # Inject CORS Headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # Route path parsing
        clean_path = self.path.split('?')[0].split('#')[0]

        # --- REST API ROUTES ---
        if clean_path == '/api/blood-banks':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(db.get("bloodBanks", [])).encode('utf-8'))
            return
            
        elif clean_path == '/api/donors':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(db.get("donors", [])).encode('utf-8'))
            return
            
        elif clean_path == '/api/sos':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(db.get("sosRequests", [])).encode('utf-8'))
            return

        # --- STATIC FILES ROUTING ---
        if clean_path == '/' or clean_path == '/index.html':
            filename = 'index.html'
            content_type = 'text/html'
        elif clean_path == '/style.css':
            filename = 'style.css'
            content_type = 'text/css'
        elif clean_path == '/script.js':
            filename = 'script.js'
            content_type = 'text/javascript'
        elif clean_path == '/database.json':
            filename = 'database.json'
            content_type = 'application/json'
        else:
            # Serve other clean static files if they exist in the root folder
            filename = clean_path.lstrip('/')
            ext = os.path.splitext(filename)[1].lower()
            if ext == '.js': content_type = 'text/javascript'
            elif ext == '.css': content_type = 'text/css'
            elif ext == '.json': content_type = 'application/json'
            elif ext == '.png': content_type = 'image/png'
            elif ext == '.jpg' or ext == '.jpeg': content_type = 'image/jpeg'
            elif ext == '.svg': content_type = 'image/svg+xml'
            elif ext == '.ico': content_type = 'image/x-icon'
            else: content_type = 'text/plain'

        filepath = os.path.join(os.path.dirname(__file__), filename)
        if os.path.exists(filepath) and os.path.isfile(filepath):
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'404 File Not Found')

    def do_POST(self):
        clean_path = self.path.split('?')[0].split('#')[0]

        # POST /api/sos
        if clean_path == '/api/sos':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))

                # Validate data fields
                if not payload.get('patient') or not payload.get('hospital') or not payload.get('phone') or not payload.get('location'):
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing required fields."}).encode('utf-8'))
                    return

                # Append record
                new_request = {
                    "id": int(time.time() * 1000),
                    "patient": payload['patient'],
                    "group": payload.get('group', 'O-'),
                    "units": int(payload.get('units', 1)),
                    "hospital": payload['hospital'],
                    "phone": payload['phone'],
                    "location": payload['location'],
                    "time": "Just now",
                    "active": True
                }

                db["sosRequests"].insert(0, new_request)
                save_database() # Persist to file

                self.send_response(201)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "request": new_request}).encode('utf-8'))
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'404 File Not Found')

if __name__ == '__main__':
    load_database()
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, RadarAPIRequestHandler)
    print(f"\n=======================================================")
    print(f"Blood Bank Live Radar Python API server active.")
    print(f"Serving local endpoints at http://localhost:{PORT}")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping API server...")
        sys.exit(0)
