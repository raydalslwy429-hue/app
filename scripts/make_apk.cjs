const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const apkDir = path.join(root, "android_package_temp");
const releasesDir = path.join(root, "Releases");
const targetApk = path.join(releasesDir, "AlMaraseem_Quality_Mobile.apk");

if (!fs.existsSync(releasesDir)) fs.mkdirSync(releasesDir, { recursive: true });
if (fs.existsSync(apkDir)) fs.rmSync(apkDir, { recursive: true, force: true });
fs.mkdirSync(apkDir, { recursive: true });

// 1. Android Manifest
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.almaraseem.quality"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="22" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="مطاعم المراسيم - حوكمة الجودة"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar"
        android:usesCleartextTraffic="true">
        <activity
            android:name="com.almaraseem.quality.MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

fs.writeFileSync(path.join(apkDir, "AndroidManifest.xml"), manifestContent, "utf8");

// 2. Copy assets from android/app/src/main/assets
const assetsSource = path.join(root, "android", "app", "src", "main", "assets");
const assetsDest = path.join(apkDir, "assets");
if (fs.existsSync(assetsSource)) {
  fs.cpSync(assetsSource, assetsDest, { recursive: true });
}

// 3. Copy res from android/app/src/main/res
const resSource = path.join(root, "android", "app", "src", "main", "res");
const resDest = path.join(apkDir, "res");
if (fs.existsSync(resSource)) {
  fs.cpSync(resSource, resDest, { recursive: true });
}

// 4. Create META-INF
const metaDir = path.join(apkDir, "META-INF");
fs.mkdirSync(metaDir, { recursive: true });
const manifestMf = `Manifest-Version: 1.0\r\nCreated-By: 1.0 (Al-Maraseem Quality Governance System)\r\nBuilt-By: Raeed Al-Silwi\r\n\r\n`;
fs.writeFileSync(path.join(metaDir, "MANIFEST.MF"), manifestMf, "utf8");

// 5. Package into APK using tar/zip
console.log("Packaging into APK:", targetApk);
try {
  if (fs.existsSync(targetApk)) fs.unlinkSync(targetApk);
  // Zip the files
  execSync(`tar -a -c -f "${targetApk}" *`, { cwd: apkDir, stdio: "inherit" });
  console.log("✔ Successfully created AlMaraseem_Quality_Mobile.apk!");
} catch (e) {
  console.error("Error packaging APK:", e);
} finally {
  fs.rmSync(apkDir, { recursive: true, force: true });
}
