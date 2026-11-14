using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace AlMaraseem.Desktop
{
    public class LauncherForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private ProgressBar progressBar;
        private string projectRoot = "";
        private int checkCount = 0;

        public LauncherForm()
        {
            InitializeComponent();
            DetermineProjectRoot();
            StartServerAndApp();
        }

        private void InitializeComponent()
        {
            this.Text = "مطاعم المراسيم - حوكمة الجودة";
            this.Size = new Size(520, 270);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.None;
            this.BackColor = Color.FromArgb(27, 17, 17); // #1B1111 AlMaraseem Deep Burgundy
            this.TopMost = true;

            // Paint Gold Border (#D49A3D)
            this.Paint += (s, e) =>
            {
                using (Pen goldPen = new Pen(Color.FromArgb(212, 154, 61), 3))
                {
                    e.Graphics.DrawRectangle(goldPen, 1, 1, this.Width - 3, this.Height - 3);
                }
            };

            lblTitle = new Label();
            lblTitle.Text = "مطاعم المراسيم - AL-MARASEEM";
            lblTitle.Font = new Font("Segoe UI", 15, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(255, 194, 23); // #FFC217 Gold
            lblTitle.TextAlign = ContentAlignment.MiddleCenter;
            lblTitle.Size = new Size(480, 36);
            lblTitle.Location = new Point(20, 30);
            this.Controls.Add(lblTitle);

            lblSubtitle = new Label();
            lblSubtitle.Text = "منظومة الرقابة والتفتيش وحوكمة الجودة الشاملة (CAPA)";
            lblSubtitle.Font = new Font("Segoe UI", 10, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(240, 220, 190);
            lblSubtitle.TextAlign = ContentAlignment.MiddleCenter;
            lblSubtitle.Size = new Size(480, 25);
            lblSubtitle.Location = new Point(20, 72);
            this.Controls.Add(lblSubtitle);

            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;
            progressBar.Size = new Size(440, 10);
            progressBar.Location = new Point(40, 130);
            this.Controls.Add(progressBar);

            lblStatus = new Label();
            lblStatus.Text = "جاري التحقق من جاهزية النظام والاتصال بالخادم...";
            lblStatus.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(210, 210, 210);
            lblStatus.TextAlign = ContentAlignment.MiddleCenter;
            lblStatus.Size = new Size(480, 25);
            lblStatus.Location = new Point(20, 155);
            this.Controls.Add(lblStatus);

            Label lblFooter = new Label();
            lblFooter.Text = "الإصدار المكتبي v2.0 - بيئة العمل المحلية والسحابية";
            lblFooter.Font = new Font("Segoe UI", 8, FontStyle.Italic);
            lblFooter.ForeColor = Color.FromArgb(150, 130, 120);
            lblFooter.TextAlign = ContentAlignment.MiddleCenter;
            lblFooter.Size = new Size(480, 20);
            lblFooter.Location = new Point(20, 225);
            this.Controls.Add(lblFooter);
        }

        private void DetermineProjectRoot()
        {
            string current = AppDomain.CurrentDomain.BaseDirectory;
            // 1. Check parent (if running from Releases/ folder)
            if (File.Exists(Path.Combine(current, "..", "package.json")))
            {
                projectRoot = Path.GetFullPath(Path.Combine(current, ".."));
            }
            // 2. Check current directory
            else if (File.Exists(Path.Combine(current, "package.json")))
            {
                projectRoot = Path.GetFullPath(current);
            }
            // 3. Fallback to known installed directory
            else if (Directory.Exists(@"C:\Users\مطعم المراسيم\Downloads\مجلد جديد (5)\marasim_app_latest_ready"))
            {
                projectRoot = @"C:\Users\مطعم المراسيم\Downloads\مجلد جديد (5)\marasim_app_latest_ready";
            }
            else
            {
                projectRoot = current;
            }
        }

        private bool IsServerResponsive()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://localhost:3000/login");
                req.Timeout = 2500;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK || resp.StatusCode == HttpStatusCode.TemporaryRedirect;
                }
            }
            catch
            {
                return false;
            }
        }

        private void StartServerAndApp()
        {
            new Thread(() =>
            {
                // Check if server is already running
                if (!IsServerResponsive())
                {
                    UpdateStatus("جاري تشغيل خادم المنظومة المحلي في الخلفية...");
                    try
                    {
                        string npmPath = @"C:\Program Files\nodejs\npm.cmd";
                        if (!File.Exists(npmPath)) npmPath = "npm.cmd";

                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = npmPath;
                        // Use production start if built, otherwise dev
                        bool hasBuild = Directory.Exists(Path.Combine(projectRoot, ".next"));
                        psi.Arguments = hasBuild ? "run start" : "run dev";
                        psi.WorkingDirectory = projectRoot;
                        psi.WindowStyle = ProcessWindowStyle.Hidden;
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                    }
                    catch (Exception ex)
                    {
                        UpdateStatus("تنبيه: " + ex.Message);
                    }
                }

                // Poll until server is ready (max 30 seconds)
                while (!IsServerResponsive() && checkCount < 30)
                {
                    checkCount++;
                    Thread.Sleep(1000);
                    UpdateStatus("جاري تشغيل المنظومة (" + checkCount + "/30)...");
                }

                UpdateStatus("تم الاتصال بنجاح! جاري فتح نافذة التطبيق...");
                Thread.Sleep(500);

                if (this.IsHandleCreated)
                {
                    this.Invoke((MethodInvoker)delegate
                    {
                        LaunchAppWindow();
                        this.Close();
                    });
                }
                else
                {
                    LaunchAppWindow();
                }
            }).Start();
        }

        private void UpdateStatus(string message)
        {
            if (this.IsHandleCreated)
            {
                try
                {
                    this.Invoke((MethodInvoker)delegate
                    {
                        lblStatus.Text = message;
                    });
                }
                catch { }
            }
        }

        private void LaunchAppWindow()
        {
            string url = "http://localhost:3000/login";

            // Find Edge or Chrome to run in pure App-Mode (No browser toolbars, pure desktop window)
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath)) edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";

            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath)) chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";

            string browserPath = File.Exists(edgePath) ? edgePath : (File.Exists(chromePath) ? chromePath : null);

            if (browserPath != null)
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browserPath;
                // Chromium --app mode turns any web app into a native borderless desktop window
                psi.Arguments = "--app=\"" + url + "\" --window-size=1366,850";
                Process.Start(psi);
            }
            else
            {
                // Fallback to default browser
                ProcessStartInfo psi = new ProcessStartInfo(url);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }
}
