#!/usr/bin/env python3
"""Smart OS helper: Smart OS ko localhost par serve karta hai + allowlist wale Linux apps launch karta hai.
Sirf 127.0.0.1 par sunta hai. Har kaam ke liye secret token chahiye (har boot par naya)."""
import re, os, http.server, socketserver, json, os, secrets, shutil, subprocess, urllib.parse
ROOT = os.environ.get("SMARTOS_ROOT", "/opt/smartos")
PORT = int(os.environ.get("SMARTOS_PORT", "8080"))
TOKEN = secrets.token_urlsafe(24)
HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}
APPS = {  # id: (naam, command)  -- sirf yahi apps khul sakte hain
  "chrome": ("Google Chrome", ["google-chrome-stable"]),
  "firefox": ("Firefox", ["firefox"]),
  "xterm": ("Terminal", ["xterm"]),
  "files": ("Files", ["pcmanfm-qt"]),
  "editor": ("Text Editor", ["featherpad"]),
  "terminal": ("Terminal", ["qterminal"]),
  "office": ("LibreOffice", ["libreoffice"]),
  "vlc": ("VLC", ["vlc"]),
  "settings": ("Settings", ["lxqt-config"]),
  "software": ("Software", ["discover"]),
  "installer": ("Install to disk", ["calamares_polkit"]),
}
def installed():
    return [{"id": k, "name": v[0]} for k, v in APPS.items() if shutil.which(v[1][0])]
def nm(*a):
    try:
        return subprocess.run(["nmcli", *a], capture_output=True, text=True, timeout=40)
    except Exception as e:
        return subprocess.CompletedProcess(a, 1, "", "nmcli nahi mila: %s" % e)
def live_disk():
    try:
        src = subprocess.run(["findmnt", "-no", "SOURCE", "/mnt/iso"], capture_output=True, text=True).stdout.strip()
        if not src: return ""
        pk = subprocess.run(["lsblk", "-no", "PKNAME", src], capture_output=True, text=True).stdout.split()
        return "/dev/" + pk[0] if pk else src
    except Exception: return ""
def disks():
    try:
        o = json.loads(subprocess.run(["lsblk", "-J", "-b", "-d", "-o", "NAME,SIZE,MODEL,TYPE,TRAN"], capture_output=True, text=True).stdout)
    except Exception: return []
    live = live_disk(); L = []
    for d in o.get("blockdevices", []):
        dev = "/dev/" + d["name"]
        if d.get("type") != "disk" or dev == live or int(d.get("size") or 0) < 3500000000: continue
        if not re.match(r"^/dev/(sd[a-z]+|vd[a-z]+|hd[a-z]+|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$", dev): continue
        L.append({"dev": dev, "size": int(d["size"]), "model": (d.get("model") or "Disk").strip(), "tran": d.get("tran") or ""})
    return L
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
    def end_headers(s):
        s.send_header("Cache-Control", "no-store"); super().end_headers()
    def j(s, o, c=200):
        b = json.dumps(o).encode(); s.send_response(c)
        s.send_header("Content-Type", "application/json"); s.send_header("Content-Length", str(len(b)))
        s.end_headers(); s.wfile.write(b)
    def host_ok(s):
        return s.headers.get("Host", "") in HOSTS
    def origin_ok(s):
        o = s.headers.get("Origin")
        return o is None or o in {f"http://{h}" for h in HOSTS}
    def authed(s):
        return s.host_ok() and s.origin_ok() and secrets.compare_digest(s.headers.get("X-Token", ""), TOKEN)
    def body(s):
        try: return json.loads(s.rfile.read(int(s.headers.get("Content-Length", 0))) or b"{}")
        except Exception: return {}
    def do_GET(s):
        u = urllib.parse.urlparse(s.path)
        if not s.host_ok(): return s.send_error(403)
        if u.path == "/api/token":
            if s.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none"): return s.send_error(403)
            return s.j({"token": TOKEN})
        if u.path.startswith("/api/"):
            if not s.authed(): return s.send_error(403)
            if u.path == "/api/apps": return s.j(installed())
            if u.path == "/api/install/disks": return s.j(disks())
            if u.path == "/api/install/status":
                try: pc, msg = open("/run/smartos-install.progress").read().strip().split("|", 1)
                except Exception: pc, msg = "0", ""
                return s.j({"pct": int(pc), "msg": msg})
            if u.path == "/api/wifi/scan":
                nm("device", "wifi", "rescan")
                r = nm("-t", "-f", "SSID,SIGNAL,SECURITY,IN-USE", "device", "wifi", "list"); L = []
                for l in r.stdout.splitlines():
                    p = l.replace("\\:", "\x00").split(":")
                    if len(p) >= 4 and p[0]: L.append({"ssid": p[0].replace("\x00", ":"), "signal": int(p[1] or 0), "sec": p[2], "on": p[3] == "*"})
                return s.j(L)
            return s.send_error(404)
        return super().do_GET()
    def do_POST(s):
        if not s.authed(): return s.send_error(403)
        d = s.body()
        if s.path == "/api/launch":
            a = APPS.get(str(d.get("app", "")))
            if not a or not shutil.which(a[1][0]): return s.j({"ok": False, "msg": "app nahi mila"}, 404)
            subprocess.Popen(a[1], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
            return s.j({"ok": True})
        if s.path == "/api/install/start":
            dev = str(d.get("disk", ""))
            if dev not in [x["dev"] for x in disks()] or d.get("confirm") != "ERASE": return s.j({"ok": False, "msg": "galat disk ya confirm"}, 400)
            try: os.remove("/run/smartos-install.progress")
            except Exception: pass
            subprocess.Popen(["sudo", "-n", "/usr/local/bin/smartos-install", dev], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
            return s.j({"ok": True})
        if s.path == "/api/desktop":   # kiosk browser band => asli Lubuntu desktop dikhega
            subprocess.run(["pkill", "-f", "smartos-kiosk"]); return s.j({"ok": True})
        if s.path == "/api/power":
            act = d.get("action")
            if act in ("poweroff", "reboot"):
                subprocess.run(["sync"]); subprocess.Popen((["sudo","-n","systemctl",act] if shutil.which("sudo") and os.geteuid()!=0 else ["systemctl",act])); return s.j({"ok": True})
            return s.j({"ok": False}, 400)
        if s.path == "/api/wifi/connect":
            ssid = str(d.get("ssid", ""))[:64]; pw = str(d.get("password", ""))[:100]
            r = nm(*(["device", "wifi", "connect", ssid] + (["password", pw] if pw else [])))
            return s.j({"ok": r.returncode == 0, "msg": (r.stdout + r.stderr).strip()})
        s.send_error(404)
class T(socketserver.ThreadingMixIn, http.server.HTTPServer): allow_reuse_address = True; daemon_threads = True
if __name__ == "__main__":
    T(("127.0.0.1", PORT), H).serve_forever()
