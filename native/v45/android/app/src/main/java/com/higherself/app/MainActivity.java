package com.higherself.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // v41: local plugin for two-way sync with the phone's own calendar (CalendarContract). No network.
        registerPlugin(HSCalendarPlugin.class);
        // v42: on-device-only speech to text for diary voice notes (no network recognizer).
        registerPlugin(HSSpeechPlugin.class);
        // v43: "Read aloud" with the phone's own on-device text-to-speech voices (WebView has no speechSynthesis).
        registerPlugin(HSSayPlugin.class);
        // v45: encrypted backup through the system document picker (Drive is one choice there). No Google sign-in.
        registerPlugin(HSBackupPlugin.class);
        // v45: optional fingerprint unlock. The passphrase is wrapped in the Android Keystore.
        registerPlugin(HSBiometricPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
