#!/usr/bin/env python3
"""Smart OS helper: Smart OS ko localhost par serve karta hai + allowlist wale Linux apps launch karta hai.
Sirf 127.0.0.1 par sunta hai. Har kaam ke liye secret token chahiye (har boot par naya)."""
import time, pty, fcntl, termios, struct, select, threading, base64, signal, re, os, http.server, socketserver, json, os, secrets, shutil, subprocess, urllib.parse
ROOT = os.environ.get("SMARTOS_ROOT", "/opt/smartos")
PORT = int(os.environ.get("SMARTOS_PORT", "8080"))
TOKEN = secrets.token_urlsafe(24)
HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}
APPS = {  # id: (naam, command)  -- sirf yahi apps khul sakte hain
  "chrome": ("Google Chrome", ["google-chrome-stable", "--user-data-dir=" + os.path.expanduser("~/.chrome-app"), "--class=SmartApp", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--enable-unsafe-swiftshader", "--enable-low-end-device-mode", "--renderer-process-limit=1", "--js-flags=--max-old-space-size=256", "--disk-cache-size=1", "--start-maximized", "--window-position=0,0", "--window-size={W},{H}", "https://www.google.com"]),
  "xterm": ("xterm", ["xterm", "-class", "SmartApp", "-geometry", "{COLS}x{ROWS}"]),
  "firefox": ("Firefox", ["firefox-esr"]),
  "files": ("Files", ["pcmanfm"]),
  "editor": ("Text Editor", ["featherpad"]),
  "terminal": ("Terminal", ["qterminal"]),
  "office": ("LibreOffice", ["libreoffice"]),
  "vlc": ("VLC", ["vlc"]),
  "settings": ("Settings", ["lxqt-config"]),
  "software": ("Software", ["discover"]),
  "installer": ("Install to disk", ["calamares_polkit"]),
}
import glob, shlex, configparser
CATS = [("Network", "net"), ("Office", "office"), ("AudioVideo", "media"), ("Graphics", "gfx"), ("Development", "dev"), ("Game", "game"), ("System", "sys"), ("Utility", "util")]
def desk_apps():
    """Jo Linux apps install honge (/usr/share/applications) unhe apne aap list me laata hai."""
    reserved = {os.path.basename(v[1][0]) for v in APPS.values()} | {"google-chrome", "google-chrome-stable", "xterm", "uxterm", "x-terminal-emulator", "openbox", "lxterminal"}
    out = {}
    for f in sorted(glob.glob("/usr/share/applications/*.desktop") + glob.glob("/usr/local/share/applications/*.desktop")):
        try:
            c = configparser.ConfigParser(interpolation=None, strict=False); c.optionxform = str
            c.read(f, encoding="utf-8")
            e = c["Desktop Entry"]
            if e.get("Type") != "Application" or e.get("NoDisplay", "").lower() == "true" or e.get("Hidden", "").lower() == "true": continue
            if e.get("Terminal", "").lower() == "true" or not e.get("Name") or not e.get("Exec"): continue
            cmd = [t for t in shlex.split(e["Exec"]) if not re.match(r"^%[a-zA-Z]$", t)]
            cmd = [t.replace("%%", "%") for t in cmd]
            if not cmd or os.path.basename(cmd[0]) in reserved or not shutil.which(cmd[0]): continue
            cats = e.get("Categories", "").split(";")
            cat = next((v for k, v in CATS if k in cats), "app")
            did = os.path.basename(f)[:-8]
            out["d:" + did] = (e["Name"], cmd, cat)
        except Exception: continue
    return out
def app_lookup(aid):
    if aid in APPS and shutil.which(APPS[aid][1][0]): return APPS[aid][0], APPS[aid][1]
    d = desk_apps().get(aid)
    return (d[0], d[1]) if d else None
def installed():
    L = [{"id": k, "name": v[0], "cat": "app"} for k, v in APPS.items() if shutil.which(v[1][0]) and k != "xterm"]
    seen = {x["name"] for x in L}
    for k, (n, c, cat) in desk_apps().items():
        if n not in seen: L.append({"id": k, "name": n, "cat": cat}); seen.add(n)
    return L
def nm(*a):
    try:
        return subprocess.run(["nmcli", *a], capture_output=True, text=True, timeout=40)
    except Exception as e:
        return subprocess.CompletedProcess(a, 1, "", "nmcli nahi mila: %s" % e)
PKGS = {  # key: (naam, packages, MB jagah, kya hai)
  "libreoffice": ("LibreOffice", ["libreoffice-writer", "libreoffice-calc", "libreoffice-impress"], 450, "Word, Excel, PowerPoint jaisa office (bhaari)"),
  "vlc": ("VLC Player", ["vlc"], 150, "Video aur music player"),
  "gimp": ("GIMP", ["gimp"], 220, "Photo editor"),
  "thunderbird": ("Thunderbird", ["thunderbird"], 230, "Email app"),
  "evince": ("PDF Viewer", ["evince"], 40, "PDF kholne ke liye"),
  "mpv": ("MPV Player", ["mpv"], 90, "Halka video player"),
  "geany": ("Geany Code Editor", ["geany"], 30, "Code likhne ka editor"),
}
PKG_STATE = {}
def pkg_installed(pk):
    try: return "install ok installed" in subprocess.run(["dpkg-query", "-W", "-f=${Status}", pk], capture_output=True, text=True).stdout
    except Exception: return False
def pkg_run(key):
    name, pkgs, mb, _ = PKGS[key]
    env = dict(os.environ, DEBIAN_FRONTEND="noninteractive")
    st = PKG_STATE[key]
    try:
        r = subprocess.run(["sudo", "-n", "apt-get", "update", "-qq"], capture_output=True, text=True, env=env, timeout=300)
        r = subprocess.run(["sudo", "-n", "apt-get", "install", "-y", "--no-install-recommends"] + pkgs, capture_output=True, text=True, env=env, timeout=1800)
        if r.returncode == 0: st.update(status="done", msg="Install ho gaya")
        else: st.update(status="fail", msg=((r.stderr or r.stdout).strip().splitlines() or ["error"])[-1][:200])
    except Exception as e: st.update(status="fail", msg=str(e)[:200])
import urllib.request, hashlib
UPD_URL = os.environ.get("SMARTOS_UPDATE_URL", "https://github.com/harisumair112026-design/smartos/releases/download/updates/update.json")
UPD_PREFIX = os.environ.get("SMARTOS_UPDATE_PREFIX", "https://github.com/harisumair112026-design/smartos/releases/download/")
UPD = {"status": "", "msg": "", "pct": 0}
APT = {"status": "", "msg": ""}
def local_version():
    try: return int(open(os.environ.get("SMARTOS_VERSION_FILE", "/etc/smartos-version")).read().strip() or 0)
    except Exception: return 0
def fetch_manifest():
    r = urllib.request.urlopen(urllib.request.Request(UPD_URL, headers={"User-Agent": "SmartOS-Updater"}), timeout=12)
    m = json.loads(r.read(200000).decode("utf-8")); int(m["version"]); return m
def sudo_cmd(c):
    return c if (os.geteuid() == 0 or os.environ.get("SMARTOS_NOSUDO")) else ["sudo", "-n"] + c
def upd_run(m):
    try:
        url = str(m["url"])
        if not url.startswith(UPD_PREFIX): raise Exception("update ka link bharosemand nahi")
        UPD.update(status="running", msg="Download ho raha hai...", pct=2)
        dst = "/var/tmp/smartos-update.tar.gz" if not os.environ.get("SMARTOS_TMP") else os.environ["SMARTOS_TMP"]
        h = hashlib.sha256(); got = 0
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "SmartOS-Updater"}), timeout=30) as r, open(dst, "wb") as f:
            tot = int(r.headers.get("Content-Length") or m.get("size") or 0)
            while True:
                b = r.read(65536)
                if not b: break
                f.write(b); h.update(b); got += len(b)
                if tot: UPD["pct"] = 2 + int(got * 80 / tot)
                if got > 300 * 1048576: raise Exception("file bahut badi")
        if h.hexdigest() != str(m.get("sha256", "")).lower(): raise Exception("download kharab (sha256 match nahi hua)")
        UPD.update(msg="Install ho raha hai...", pct=88)
        r = subprocess.run(sudo_cmd([os.environ.get("SMARTOS_APPLY", "/usr/local/bin/smartos-update-apply"), dst, str(int(m["version"]))]), capture_output=True, text=True, timeout=300)
        if r.returncode != 0: raise Exception("update lagne me dikkat (purana version wapas rakha gaya)")
        UPD.update(status="done", msg="Update ho gaya. Smart OS restart karo.", pct=100)
    except Exception as e: UPD.update(status="fail", msg=str(e)[:200])
def apt_run():
    env = dict(os.environ, DEBIAN_FRONTEND="noninteractive")
    try:
        subprocess.run(sudo_cmd(["apt-get", "update", "-qq"]), capture_output=True, env=env, timeout=300)
        r = subprocess.run(sudo_cmd(["apt-get", "-y", "-o", "Dpkg::Options::=--force-confold", "upgrade"]), capture_output=True, text=True, env=env, timeout=3000)
        APT.update(status="done" if r.returncode == 0 else "fail", msg="Debian updates lag gaye" if r.returncode == 0 else ((r.stderr or r.stdout).strip().splitlines() or ["error"])[-1][:200])
    except Exception as e: APT.update(status="fail", msg=str(e)[:200])
TERMS = {}
GUIS = {}
XAPPS = {}
def xdo(*a):
    try: return subprocess.run(["xdotool", *map(str, a)], capture_output=True, text=True, timeout=5, env=dict(os.environ, DISPLAY=os.environ.get("DISPLAY", ":0"))).stdout
    except Exception: return ""
def xwids():
    try:
        o = subprocess.run(["wmctrl", "-l"], capture_output=True, text=True, timeout=5, env=dict(os.environ, DISPLAY=os.environ.get("DISPLAY", ":0"))).stdout
        return {l.split()[0] for l in o.splitlines() if l.strip()}
    except Exception: return set()
class XApp:
    """Asli Linux app ko main screen par Smart OS ki window ki jagah par rakhta hai (window ke saath move/resize)."""
    def __init__(s, cmd0, x, y, w, h):
        s.wid = None; s.shown = False
        before = xwids()
        sub = {"{W}": str(w), "{H}": str(h), "{COLS}": str(max(20, w // 8)), "{ROWS}": str(max(5, h // 17))}
        def fix(c):
            for k, v in sub.items(): c = c.replace(k, v)
            return c
        cmd = [fix(c) for c in cmd0]
        s.proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        for _ in range(150):
            time.sleep(0.1)
            if s.proc.poll() is not None: break
            new = xwids() - before
            if new: s.wid = sorted(new)[0]; break
        if s.wid:
            try:
                env = dict(os.environ, DISPLAY=os.environ.get("DISPLAY", ":0"))
                subprocess.run(["xprop", "-id", s.wid, "-f", "_MOTIF_WM_HINTS", "32c", "-set", "_MOTIF_WM_HINTS", "2, 0, 0, 0, 0"], env=env, timeout=5, capture_output=True)
                subprocess.run(["wmctrl", "-ir", s.wid, "-b", "add,above"], env=env, timeout=5, capture_output=True)
            except Exception: pass
            s.geom(x, y, w, h, True)
    def alive(s): return s.proc.poll() is None and s.wid is not None
    def geom(s, x, y, w, h, show):
        if not s.wid: return
        if show:
            xdo("windowmove", s.wid, x, y); xdo("windowsize", s.wid, max(w, 50), max(h, 50))
            if not s.shown: xdo("windowmap", s.wid); s.shown = True
            xdo("windowraise", s.wid)
        elif s.shown:
            xdo("windowunmap", s.wid); s.shown = False
    def close(s):
        try: os.killpg(s.proc.pid, signal.SIGTERM)
        except Exception: pass
        try: s.proc.wait(timeout=2)
        except Exception:
            try: os.killpg(s.proc.pid, signal.SIGKILL)
            except Exception: pass
class Gui:
    """Linux app ko virtual screen (Xvfb) me chalata hai aur noVNC se Smart OS window me dikhata hai."""
    def __init__(s, app, w, h):
        a = APPS[app]; s.procs = []
        s.n = next(n for n in range(20, 80) if not os.path.exists("/tmp/.X11-unix/X%d" % n) and n not in [g.n for g in GUIS.values()])
        n = s.n; s.port = 6100 + n; s.pw = secrets.token_hex(4); vp = 5900 + n
        env = dict(os.environ, DISPLAY=":%d" % n)
        def sp(cmd): 
            p = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True); s.procs.append(p); return p
        sp(["Xvfb", ":%d" % n, "-screen", "0", "%dx%dx24" % (w, h), "-nolisten", "tcp", "-ac"])
        for _ in range(60):
            if os.path.exists("/tmp/.X11-unix/X%d" % n): break
            time.sleep(0.1)
        if shutil.which("openbox"): sp(["openbox"])
        sp([c.replace("{W}", str(w)).replace("{H}", str(h)) for c in a[1]])
        sp(["x11vnc", "-display", ":%d" % n, "-rfbport", str(vp), "-localhost", "-passwd", s.pw, "-forever", "-shared", "-noxdamage", "-quiet"])
        web = "/usr/share/novnc"
        sp(["websockify", "--web", web, "127.0.0.1:%d" % s.port, "127.0.0.1:%d" % vp])
    def close(s):
        for p in reversed(s.procs):
            try: os.killpg(p.pid, signal.SIGTERM)
            except Exception: pass
        for p in s.procs:
            try: p.wait(timeout=2)
            except Exception:
                try: os.killpg(p.pid, signal.SIGKILL)
                except Exception: pass
class Term:
    def __init__(s, rows, cols):
        pid, fd = pty.fork()
        if pid == 0:
            os.environ.update(TERM="xterm-256color", LANG="C.UTF-8")
            h = os.path.expanduser("~")
            try: os.chdir(h if os.path.isdir(h) else "/")
            except Exception: pass
            os.execvp("bash", ["bash", "-l"])
        s.pid, s.fd, s.buf, s.alive = pid, fd, bytearray(), True
        s.cv = threading.Condition(); s.resize(rows, cols)
        threading.Thread(target=s.pump, daemon=True).start()
    def pump(s):
        while True:
            try:
                r, _, _ = select.select([s.fd], [], [], 1)
                if r:
                    d = os.read(s.fd, 4096)
                    if not d: break
                    with s.cv: s.buf += d; s.cv.notify_all()
            except OSError: break
        s.alive = False
        with s.cv: s.cv.notify_all()
    def read(s, wait=20):
        with s.cv:
            if not s.buf and s.alive: s.cv.wait(wait)
            d = bytes(s.buf); s.buf.clear()
        return d, s.alive
    def write(s, b):
        try: os.write(s.fd, b)
        except OSError: pass
    def resize(s, rows, cols):
        try: fcntl.ioctl(s.fd, termios.TIOCSWINSZ, struct.pack("HHHH", max(2, min(rows, 500)), max(2, min(cols, 500)), 0, 0))
        except Exception: pass
    def close(s):
        try: os.kill(s.pid, signal.SIGHUP)
        except Exception: pass
        try: os.close(s.fd)
        except Exception: pass
        try: os.waitpid(s.pid, os.WNOHANG)
        except Exception: pass
def live_disk():
    try:
        src = subprocess.run(["findmnt", "-no", "SOURCE", "/mnt/iso"], capture_output=True, text=True).stdout.strip()
        if not src: return ""
        pk = subprocess.run(["lsblk", "-no", "PKNAME", src], capture_output=True, text=True).stdout.split()
        return "/dev/" + pk[0] if pk else src
    except Exception: return ""
def is_live(): return os.path.isdir("/mnt/ro") and os.path.isdir("/mnt/iso")
def disks():
    if not is_live(): return []
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
            if u.path == "/api/info": return s.j({"live": is_live(), "version": local_version()})
            if u.path == "/api/update/check":
                try: m = fetch_manifest()
                except Exception as e: return s.j({"ok": False, "msg": "Internet ya server nahi mila", "current": local_version(), "live": is_live()})
                return s.j({"ok": True, "current": local_version(), "latest": int(m["version"]), "available": int(m["version"]) > local_version(), "notes": str(m.get("notes", ""))[:500], "size": m.get("size", 0), "iso_url": str(m.get("iso_url", "")), "live": is_live()})
            if u.path == "/api/update/status": return s.j({"app": UPD, "apt": APT})
            if u.path == "/api/pkg/list":
                return s.j([{"key": k, "name": v[0], "mb": v[2], "desc": v[3], "installed": all(pkg_installed(p) for p in v[1]), "status": PKG_STATE.get(k, {}).get("status", ""), "msg": PKG_STATE.get(k, {}).get("msg", "")} for k, v in PKGS.items()])
            if u.path == "/api/sysinfo":
                def rd(f):
                    try: return open(f).read()
                    except Exception: return ""
                osr = dict(l.split("=", 1) for l in rd("/etc/os-release").splitlines() if "=" in l)
                mem = {l.split(":")[0]: int(l.split()[1]) for l in rd("/proc/meminfo").splitlines() if l.split()[1:2] and l.split()[1].isdigit()}
                cpu = next((l.split(":", 1)[1].strip() for l in rd("/proc/cpuinfo").splitlines() if l.startswith("model name")), "")
                st = os.statvfs("/")
                return s.j({"os": "Smart OS", "kernel_brand": osr.get("KERNEL_BRAND", "").strip('"') or "Dios Kernel 1.1.1", "kernel": os.uname().release, "base": osr.get("PRETTY_NAME", "").strip('"'),
                  "ram_total_mb": mem.get("MemTotal", 0) // 1024, "ram_free_mb": mem.get("MemAvailable", 0) // 1024, "cpu": cpu, "cores": os.cpu_count(),
                  "disk_total_gb": round(st.f_blocks * st.f_frsize / 1e9, 1), "disk_free_gb": round(st.f_bavail * st.f_frsize / 1e9, 1),
                  "uptime_min": int(float(rd("/proc/uptime").split()[0] or 0) // 60), "mode": "live" if is_live() else "installed"})
            if u.path == "/api/install/disks": return s.j(disks())
            if u.path == "/api/term/read":
                t = TERMS.get(urllib.parse.parse_qs(u.query).get("id", [""])[0])
                if not t: return s.j({"data": "", "alive": False})
                d, al = t.read(20)
                if not al and not d: TERMS.pop(next((k for k, v in TERMS.items() if v is t), None), None); t.close()
                return s.j({"data": base64.b64encode(d).decode(), "alive": al or bool(d)})
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
        if s.path == "/api/update/apply":
            if is_live() and not os.environ.get("SMARTOS_ALLOW_LIVE_UPDATE"): return s.j({"ok": False, "msg": "Live mode me update nahi lagta. Naya ISO download karo ya Smart OS ko disk par install karo."}, 400)
            if UPD.get("status") == "running": return s.j({"ok": True})
            try: m = fetch_manifest()
            except Exception: return s.j({"ok": False, "msg": "Internet ya server nahi mila"}, 502)
            if int(m["version"]) <= local_version(): return s.j({"ok": False, "msg": "Aap latest version par ho"}, 400)
            threading.Thread(target=upd_run, args=(m,), daemon=True).start(); return s.j({"ok": True})
        if s.path == "/api/update/apt":
            if is_live(): return s.j({"ok": False, "msg": "Live mode me nahi. Disk par install karo."}, 400)
            if APT.get("status") == "running": return s.j({"ok": True})
            APT.update(status="running", msg="Debian updates lag rahe hain (internet chahiye)..."); threading.Thread(target=apt_run, daemon=True).start(); return s.j({"ok": True})
        if s.path == "/api/update/restart":
            subprocess.Popen(["sh", "-c", "sleep 1; " + ("pkill -x Xorg" if os.geteuid() == 0 else "sudo -n pkill -x Xorg")], start_new_session=True); return s.j({"ok": True})
        if s.path == "/api/pkg/install":
            k = str(d.get("key", ""))
            if k not in PKGS: return s.j({"ok": False, "msg": "galat app"}, 404)
            if PKG_STATE.get(k, {}).get("status") == "running": return s.j({"ok": True})
            if any(v.get("status") == "running" for v in PKG_STATE.values()): return s.j({"ok": False, "msg": "pehle wala install khatam hone do"}, 400)
            st = os.statvfs("/"); free = st.f_bavail * st.f_frsize // 1048576
            if free < PKGS[k][2] * 1.6: return s.j({"ok": False, "msg": "Jagah kam hai (%d MB free, %d MB chahiye). Smart OS ko disk par install karo." % (free, PKGS[k][2] * 1.6)}, 400)
            PKG_STATE[k] = {"status": "running", "msg": "Install ho raha hai (internet chahiye)..."}
            threading.Thread(target=pkg_run, args=(k,), daemon=True).start()
            return s.j({"ok": True})
        if s.path == "/api/x/open":
            a = app_lookup(str(d.get("app", "")))
            if not a or not shutil.which("xdotool"): return s.j({"ok": False, "msg": "app ya xdotool nahi mila"}, 404)
            if len(XAPPS) >= 3: return s.j({"ok": False, "msg": "3 se zyada apps ek saath nahi (RAM)"}, 400)
            g = [int(d.get(k, 0)) for k in ("x", "y", "w", "h")]
            xa = XApp(a[1], *g)
            if not xa.wid: xa.close(); return s.j({"ok": False, "msg": "app ki window nahi bani"}, 500)
            xid = secrets.token_hex(8); XAPPS[xid] = xa
            return s.j({"ok": True, "id": xid})
        if s.path in ("/api/x/geom", "/api/x/close"):
            xa = XAPPS.get(str(d.get("id", "")))
            if not xa: return s.j({"ok": False, "alive": False}, 404)
            if s.path.endswith("close"): XAPPS.pop(str(d["id"]), None); xa.close(); return s.j({"ok": True})
            xa.geom(int(d.get("x", 0)), int(d.get("y", 0)), int(d.get("w", 100)), int(d.get("h", 100)), bool(d.get("show")))
            if not xa.alive(): XAPPS.pop(str(d["id"]), None); xa.close(); return s.j({"ok": True, "alive": False})
            return s.j({"ok": True, "alive": True})
        if s.path == "/api/gui/open":
            a = APPS.get(str(d.get("app", "")))
            if not a or not shutil.which(a[1][0]): return s.j({"ok": False, "msg": "app nahi mila"}, 404)
            if not (shutil.which("Xvfb") and shutil.which("x11vnc") and shutil.which("websockify")): return s.j({"ok": False, "msg": "Xvfb/x11vnc/websockify install nahi hai"}, 500)
            if len(GUIS) >= 3: return s.j({"ok": False, "msg": "3 se zyada Linux apps ek saath nahi chal sakte (RAM)"}, 400)
            w = max(320, min(int(d.get("w", 1024)), 1920)); h = max(240, min(int(d.get("h", 640)), 1080))
            try: g = Gui(str(d["app"]), w, h)
            except Exception as e: return s.j({"ok": False, "msg": str(e)}, 500)
            gid = secrets.token_hex(8); GUIS[gid] = g
            return s.j({"ok": True, "id": gid, "port": g.port, "pw": g.pw})
        if s.path == "/api/gui/close":
            g = GUIS.pop(str(d.get("id", "")), None)
            if g: g.close()
            return s.j({"ok": bool(g)})
        if s.path == "/api/term/open":
            for k in [k for k, v in TERMS.items() if not v.alive]: TERMS.pop(k).close()
            if len(TERMS) >= 4: return s.j({"ok": False, "msg": "bahut terminal khule hain"}, 400)
            tid = secrets.token_hex(8); TERMS[tid] = Term(int(d.get("rows", 24)), int(d.get("cols", 80)))
            return s.j({"ok": True, "id": tid})
        if s.path in ("/api/term/write", "/api/term/resize", "/api/term/close"):
            t = TERMS.get(str(d.get("id", "")))
            if not t: return s.j({"ok": False}, 404)
            if s.path.endswith("write"):
                try: t.write(base64.b64decode(str(d.get("data", ""))))
                except Exception: return s.j({"ok": False}, 400)
            elif s.path.endswith("resize"): t.resize(int(d.get("rows", 24)), int(d.get("cols", 80)))
            else: TERMS.pop(str(d.get("id")), None); t.close()
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
