using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Management;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class MemStat {
  [StructLayout(LayoutKind.Sequential)]
  public struct MEMORYSTATUSEX { public uint dwLength, dwMemoryLoad; public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual; }
  [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX s);
  public static MEMORYSTATUSEX Get() { var m = new MEMORYSTATUSEX(); m.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX)); GlobalMemoryStatusEx(ref m); return m; }
}

class Info {
  public static string Cpu() { try { foreach (ManagementObject o in new ManagementObjectSearcher("select Name from Win32_Processor").Get()) return ((string)o["Name"]).Trim(); } catch { } return "?"; }
  public static string Virt() {
    try { foreach (ManagementObject o in new ManagementObjectSearcher("select VirtualizationFirmwareEnabled from Win32_Processor").Get()) { object v = o["VirtualizationFirmwareEnabled"]; if (v != null) return ((bool)v) ? "ON (achha)" : "OFF (BIOS me VT-x chalu karo)"; } } catch { }
    return "pata nahi";
  }
  public static string Report() {
    var m = MemStat.Get();
    double tot = m.ullTotalPhys / 1073741824.0, av = m.ullAvailPhys / 1073741824.0;
    var s = "";
    s += "RAM: " + tot.ToString("0.0") + " GB (khali: " + av.ToString("0.0") + " GB)\r\n";
    s += "CPU: " + Cpu() + "\r\n";
    s += "Virtualization: " + Virt() + "\r\n";
    s += "Windows: " + Environment.OSVersion.VersionString + "\r\n\r\n";
    if (tot < 3.5) s += "Salah: RAM kam hai. Emulator me 1 GB hi do.\r\n";
    else if (tot < 6.5) s += "Salah: emulator me 2 GB RAM aur 2 CPU do.\r\n";
    else s += "Salah: emulator me 3-4 GB RAM aur 4 CPU do.\r\n";
    return s;
  }
}

class Emu {
  public string Name, Exe;
  public static List<Emu> Find() {
    var c = new[] {
      new[]{"LDPlayer 9", @"C:\LDPlayer\LDPlayer9\dnplayer.exe"},
      new[]{"LDPlayer 4", @"C:\LDPlayer\LDPlayer4.0\dnplayer.exe"},
      new[]{"BlueStacks 5", @"C:\Program Files\BlueStacks_nxt\HD-Player.exe"},
      new[]{"MSI App Player", @"C:\Program Files\BlueStacks_msi5\HD-Player.exe"},
      new[]{"MEmu", @"C:\Program Files\Microvirt\MEmu\MEmu.exe"},
      new[]{"Nox", @"C:\Program Files (x86)\Nox\bin\Nox.exe"},
    };
    var r = new List<Emu>();
    foreach (var a in c) if (File.Exists(a[1])) r.Add(new Emu { Name = a[0], Exe = a[1] });
    return r;
  }
}

class Form1 : Form {
  TextBox info = new TextBox();
  ListView procs = new ListView();
  Label status = new Label();
  Color BG = Color.FromArgb(11, 16, 32), FG = Color.FromArgb(226, 232, 245), AC = Color.FromArgb(59, 130, 246);
  static readonly HashSet<string> Safe = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
    "explorer","svchost","csrss","winlogon","wininit","services","lsass","system","smss","dwm","taskmgr","fontdrvhost","sihost","ctfmon","searchhost","startmenuexperiencehost","shellexperiencehost","runtimebroker","textinputhost","audiodg","spoolsv","ffhelper","idle","registry","memory compression","securityhealthsystray","msmpeng","nissrv","conhost","dllhost","wudfhost"
  };

  Button Btn(string t, int x, int y, int w, EventHandler h) {
    var b = new Button(); b.Text = t; b.SetBounds(x, y, w, 34); b.FlatStyle = FlatStyle.Flat; b.BackColor = AC; b.ForeColor = Color.White; b.FlatAppearance.BorderSize = 0; b.Click += h; Controls.Add(b); return b;
  }
  public Form1() {
    Text = "Free Fire Helper - Smart Miner Hubs"; Width = 640; Height = 640; BackColor = BG; ForeColor = FG; StartPosition = FormStartPosition.CenterScreen; Font = new Font("Segoe UI", 10);
    var h = new Label(); h.Text = "Free Fire Helper"; h.Font = new Font("Segoe UI", 18, FontStyle.Bold); h.SetBounds(16, 10, 400, 36); Controls.Add(h);
    var sub = new Label(); sub.Text = "Apne PC ko emulator ke liye check karo, RAM khali karo, emulator kholo."; sub.ForeColor = Color.FromArgb(159, 176, 214); sub.SetBounds(18, 46, 600, 22); Controls.Add(sub);
    info.Multiline = true; info.ReadOnly = true; info.BackColor = Color.FromArgb(18, 26, 51); info.ForeColor = FG; info.BorderStyle = BorderStyle.None; info.SetBounds(16, 76, 600, 120); Controls.Add(info);
    Btn("PC dobara check", 16, 204, 150, delegate { Refresh2(); });
    Btn("Emulator kholo", 176, 204, 150, delegate { OpenEmu(); });
    Btn("Emulator download page", 336, 204, 200, delegate { Process.Start("https://www.ldplayer.net/"); });
    var l2 = new Label(); l2.Text = "RAM khane wali apps (jo band karni hain unhe chuno):"; l2.SetBounds(16, 252, 500, 22); Controls.Add(l2);
    procs.View = View.Details; procs.CheckBoxes = true; procs.FullRowSelect = true; procs.BackColor = Color.FromArgb(18, 26, 51); procs.ForeColor = FG; procs.BorderStyle = BorderStyle.None;
    procs.Columns.Add("App", 300); procs.Columns.Add("RAM (MB)", 100); procs.SetBounds(16, 278, 600, 200); Controls.Add(procs);
    Btn("Chuni hui apps band karo", 16, 488, 220, delegate { KillSel(); });
    Btn("List dobara", 246, 488, 120, delegate { LoadProcs(); });
    status.SetBounds(16, 534, 600, 40); status.ForeColor = Color.FromArgb(159, 176, 214); Controls.Add(status);
    Refresh2(); LoadProcs();
  }
  void Refresh2() { info.Text = Info.Report(); var e = Emu.Find(); info.Text += e.Count > 0 ? "Emulator mila: " + e[0].Name : "Koi emulator install nahi mila. Download page se LDPlayer 9 (Android 9) ya BlueStacks lo."; }
  void OpenEmu() {
    var e = Emu.Find();
    if (e.Count == 0) { MessageBox.Show("Koi emulator install nahi mila. 'Emulator download page' dabao."); return; }
    try { Process.Start(e[0].Exe); status.Text = e[0].Name + " khul raha hai..."; } catch (Exception ex) { MessageBox.Show(ex.Message); }
  }
  void LoadProcs() {
    procs.Items.Clear(); int me = Process.GetCurrentProcess().Id; var list = new List<KeyValuePair<Process, long>>();
    foreach (var p in Process.GetProcesses()) {
      try { if (p.Id == me || Safe.Contains(p.ProcessName) || p.MainWindowHandle == IntPtr.Zero) continue; list.Add(new KeyValuePair<Process, long>(p, p.WorkingSet64)); } catch { }
    }
    list.Sort(delegate (KeyValuePair<Process, long> a, KeyValuePair<Process, long> b) { return b.Value.CompareTo(a.Value); });
    foreach (var kv in list) { var it = new ListViewItem(kv.Key.ProcessName + "  -  " + SafeTitle(kv.Key)); it.SubItems.Add((kv.Value / 1048576).ToString()); it.Tag = kv.Key.Id; procs.Items.Add(it); }
    status.Text = "Sirf khuli windows wali apps dikh rahi hain. System ki apps nahi.";
  }
  string SafeTitle(Process p) { try { var t = p.MainWindowTitle; return t.Length > 40 ? t.Substring(0, 40) : t; } catch { return ""; } }
  void KillSel() {
    int n = 0;
    foreach (ListViewItem it in procs.CheckedItems) { try { Process.GetProcessById((int)it.Tag).CloseMainWindow(); n++; } catch { } }
    status.Text = n + " apps ko band karne ko kaha (unsaved kaam par poochh sakti hain). Phir 'List dobara' dabao.";
    var t = new Timer(); t.Interval = 2500; t.Tick += delegate { t.Stop(); LoadProcs(); Refresh2(); }; t.Start();
  }
}

static class Program {
  [STAThread]
  static void Main(string[] args) {
    if (args.Length > 0 && args[0] == "--selftest") { Console.WriteLine(Info.Report()); Console.WriteLine("emulators=" + Emu.Find().Count); return; }
    Application.EnableVisualStyles(); Application.Run(new Form1());
  }
}
