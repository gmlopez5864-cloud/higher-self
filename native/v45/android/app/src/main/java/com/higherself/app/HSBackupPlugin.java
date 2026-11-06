package com.higherself.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * v45: save an already-encrypted Higher Self backup through Android's document provider.
 * The system sheet is where the person picks Google Drive, Files, or another app.
 * This plugin does not sign in to Google, hold a cloud token, or upload by itself.
 */
@CapacitorPlugin(name = "HSBackup")
public class HSBackupPlugin extends Plugin {
    @PluginMethod
    public void saveEncrypted(PluginCall call) {
        String text = call.getString("text");
        String name = call.getString("name", "higher-self-backup.hsbak");
        if (text == null || text.isEmpty()) {
            call.reject("Nothing to save");
            return;
        }
        if (name == null || name.isEmpty()) name = "higher-self-backup.hsbak";
        getBridge().saveCall(call);
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/octet-stream");
        intent.putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject out = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            out.put("saved", false);
            out.put("cancelled", true);
            call.resolve(out);
            return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) {
            out.put("saved", false);
            out.put("cancelled", true);
            call.resolve(out);
            return;
        }
        String text = call.getString("text", "");
        try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
            if (os == null) throw new IllegalStateException("no stream");
            os.write(text.getBytes(StandardCharsets.UTF_8));
            os.flush();
        } catch (Exception e) {
            call.reject("Couldn't write the backup");
            return;
        }
        out.put("saved", true);
        out.put("cancelled", false);
        call.resolve(out);
    }
}
