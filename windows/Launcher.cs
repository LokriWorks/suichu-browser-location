using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Net;

[assembly: AssemblyTitle("随处 · 网页定位")]
[assembly: AssemblyCompany("LokriWorks")]
[assembly: AssemblyProduct("Suichu Browser Location")]
[assembly: AssemblyVersion("__VERSION__.0")]

internal static class Launcher {
    const string Version = "__VERSION__";
    const string ManifestHash = "__MANIFEST_HASH__";
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    static int SearchHttp() {
        try {
            string text = Console.In.ReadToEnd().Trim();
            Uri address;
            if (!Uri.TryCreate(text, UriKind.Absolute, out address) || address.Scheme != "https") throw new InvalidDataException("HTTPS is required");
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
            var request = (HttpWebRequest)WebRequest.Create(address);
            request.Timeout = 15000;
            request.ReadWriteTimeout = 15000;
            request.UserAgent = "SuichuBrowserLocation/1.2.0 (+https://github.com/LokriWorks/suichu-browser-location)";
            request.Accept = "application/json";
            using (var response = request.GetResponse())
            using (var input = response.GetResponseStream())
            using (var output = Console.OpenStandardOutput()) {
                byte[] buffer = new byte[8192]; int length; int total = 0;
                while ((length = input.Read(buffer,0,buffer.Length)) > 0) {
                    total += length;
                    if (total > 2 * 1024 * 1024) throw new InvalidDataException("Search response too large");
                    output.Write(buffer,0,length);
                }
            }
            return 0;
        } catch { return 1; }
    }
    static string HashFile(string file) {
        using (var sha = SHA256.Create()) using (var input = File.OpenRead(file))
            return BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "").ToLowerInvariant();
    }
    static bool Intact(string folder) {
        try {
            string file = Path.Combine(folder, "payload-manifest.json");
            if (!File.Exists(file) || HashFile(file) != ManifestHash) return false;
            var entries = Json.Deserialize<Dictionary<string,string>>(File.ReadAllText(file));
            foreach (var item in entries) {
                string full = Path.GetFullPath(Path.Combine(folder, item.Key));
                if (!full.StartsWith(folder + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || !File.Exists(full) || HashFile(full) != item.Value) return false;
            }
            return true;
        } catch { return false; }
    }
    static void Prepare(string folder) {
        if (Intact(folder)) return;
        Directory.CreateDirectory(folder);
        using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream("Suichu.Payload"))
        using (var archive = new ZipArchive(input, ZipArchiveMode.Read)) {
            foreach (var entry in archive.Entries) {
                string destination = Path.GetFullPath(Path.Combine(folder, entry.FullName));
                if (!destination.StartsWith(folder + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Invalid package path");
                if (entry.FullName.EndsWith("/")) { Directory.CreateDirectory(destination); continue; }
                Directory.CreateDirectory(Path.GetDirectoryName(destination));
                entry.ExtractToFile(destination, true);
            }
        }
        if (!Intact(folder)) throw new InvalidDataException("程序文件校验失败，请重新下载 EXE。");
    }
    [STAThread]
    static int Main(string[] args) {
        if (args.Length == 1 && args[0] == "--search-http") return SearchHttp();
        string requested = Environment.GetEnvironmentVariable("SUICHU_DATA_DIR");
        string data = Path.GetFullPath(String.IsNullOrWhiteSpace(requested) ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Suichu") : requested);
        try {
            Directory.CreateDirectory(data);
            string key;
            using (var hash = SHA256.Create()) key = BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(data.ToLowerInvariant()))).Replace("-", "").Substring(0,16);
            using (var mutex = new Mutex(false, "Local\\Suichu.Launch." + key)) {
                bool locked = false;
                try {
                    try { locked = mutex.WaitOne(60000); } catch (AbandonedMutexException) { locked = true; }
                    if (!locked) throw new TimeoutException("另一次启动仍在处理中，请稍后重试。");
                    string folder = Path.Combine(data, "application", Version);
                    Prepare(folder);
                    string app = Path.Combine(folder, "app");
                    var start = new ProcessStartInfo {
                        FileName = Path.Combine(folder, "runtime", "node.exe"),
                        Arguments = "\"" + Path.Combine(app, "launch.cjs") + "\"",
                        WorkingDirectory = app,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    start.EnvironmentVariables["SUICHU_DATA_DIR"] = data;
                    start.EnvironmentVariables["SUICHU_NATIVE_HTTP_EXE"] = Assembly.GetExecutingAssembly().Location;
                    start.EnvironmentVariables.Remove("NODE_OPTIONS");
                    start.EnvironmentVariables.Remove("NODE_PATH");
                    using (var child = Process.Start(start)) {
                        for (int i = 0; i < 180; i++) {
                            if (child.WaitForExit(250)) {
                                if (child.ExitCode == 0) return 0;
                                string error = Path.Combine(data, "launch-error.txt");
                                throw new Exception(File.Exists(error) ? File.ReadAllText(error) : "后台程序启动失败，请查看本机应用数据目录中的日志。");
                            }
                            string status = Path.Combine(data, "status.json");
                            if (File.Exists(status)) try {
                                var state = Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(status));
                                if (state.ContainsKey("controllerPid") && Convert.ToInt32(state["controllerPid"]) == child.Id && Convert.ToString(state["status"]) == "verified") return 0;
                            } catch { }
                        }
                        throw new TimeoutException("浏览器启动超时。请检查 Edge 是否可正常打开，然后重新双击 EXE。");
                    }
                } finally { if (locked) mutex.ReleaseMutex(); }
            }
        } catch (Exception error) {
            try { File.WriteAllText(Path.Combine(data, "launcher-error.txt"), error.ToString(), Encoding.UTF8); } catch { }
            if (Environment.GetEnvironmentVariable("SUICHU_TEST_NO_DIALOG") != "1") MessageBox.Show("启动失败：" + error.Message, "随处 · 网页定位", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
