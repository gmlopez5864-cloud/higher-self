package com.higherself.app;

import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;

/**
 * v45: optional fingerprint unlock. The passphrase is wrapped by an Android Keystore key
 * that requires biometric authentication and is invalidated when biometrics change.
 * The passphrase is never written to disk in the clear. Password unlock always remains.
 */
@CapacitorPlugin(name = "HSBiometric")
public class HSBiometricPlugin extends Plugin {
    private static final String STORE = "AndroidKeyStore";
    private static final String ALIAS = "higher-self-vault-bio";
    private static final String PREFS = "higher-self-bio";
    private static final String K_IV = "iv";
    private static final String K_CT = "ct";
    private static final String K_ON = "on";

    @PluginMethod
    public void available(PluginCall call) {
        JSObject out = new JSObject();
        int code = can();
        out.put("hardware", code != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE && code != BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED);
        out.put("enrolled", code == BiometricManager.BIOMETRIC_SUCCESS);
        out.put("available", code == BiometricManager.BIOMETRIC_SUCCESS && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
        out.put("enabled", enabled());
        call.resolve(out);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("enabled", enabled());
        call.resolve(out);
    }

    @PluginMethod
    public void enable(PluginCall call) {
        String pass = call.getString("passphrase");
        if (pass == null || pass.isEmpty()) {
            call.reject("Missing passphrase");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || can() != BiometricManager.BIOMETRIC_SUCCESS) {
            rejectCode(call, "unavailable");
            return;
        }
        try {
            deleteQuiet();
            SecretKey key = createKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            prompt(call, cipher, "Turn on fingerprint unlock", "Higher Self will still open with your passphrase.", true, pass);
        } catch (Exception e) {
            deleteQuiet();
            rejectCode(call, "unavailable");
        }
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        if (!enabled()) {
            rejectCode(call, "off");
            return;
        }
        try {
            byte[] iv = Base64.decode(prefs().getString(K_IV, ""), Base64.NO_WRAP);
            SecretKey key = key();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            prompt(call, cipher, "Unlock Higher Self", "Use your fingerprint. Your passphrase still works.", false, null);
        } catch (KeyPermanentlyInvalidatedException e) {
            deleteQuiet();
            rejectCode(call, "invalidated");
        } catch (Exception e) {
            deleteQuiet();
            rejectCode(call, "invalidated");
        }
    }

    @PluginMethod
    public void disable(PluginCall call) {
        deleteQuiet();
        JSObject out = new JSObject();
        out.put("enabled", false);
        call.resolve(out);
    }

    private void prompt(PluginCall call, Cipher cipher, String title, String subtitle, boolean enroll, String pass) {
        FragmentActivity activity = (FragmentActivity) getActivity();
        activity.runOnUiThread(() -> {
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setNegativeButtonText("Use passphrase")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build();
            BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(getContext()),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        try {
                            Cipher c = result.getCryptoObject().getCipher();
                            if (enroll) {
                                byte[] ct = c.doFinal(pass.getBytes(StandardCharsets.UTF_8));
                                prefs().edit()
                                    .putString(K_IV, Base64.encodeToString(c.getIV(), Base64.NO_WRAP))
                                    .putString(K_CT, Base64.encodeToString(ct, Base64.NO_WRAP))
                                    .putBoolean(K_ON, true)
                                    .apply();
                                JSObject out = new JSObject();
                                out.put("enabled", true);
                                call.resolve(out);
                            } else {
                                byte[] ct = Base64.decode(prefs().getString(K_CT, ""), Base64.NO_WRAP);
                                String unlocked = new String(c.doFinal(ct), StandardCharsets.UTF_8);
                                JSObject out = new JSObject();
                                out.put("passphrase", unlocked);
                                call.resolve(out);
                            }
                        } catch (KeyPermanentlyInvalidatedException e) {
                            deleteQuiet();
                            rejectCode(call, "invalidated");
                        } catch (Exception e) {
                            rejectCode(call, "failed");
                        }
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                            || errorCode == BiometricPrompt.ERROR_USER_CANCELED
                            || errorCode == BiometricPrompt.ERROR_CANCELED) {
                            rejectCode(call, "cancelled");
                            return;
                        }
                        if (errorCode == BiometricPrompt.ERROR_LOCKOUT || errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT) {
                            rejectCode(call, "lockout");
                            return;
                        }
                        rejectCode(call, "failed");
                    }
                });
            prompt.authenticate(info, new BiometricPrompt.CryptoObject(cipher));
        });
    }

    private int can() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED;
        return BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
    }

    private boolean enabled() {
        return prefs().getBoolean(K_ON, false) && prefs().contains(K_CT);
    }

    private android.content.SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance(STORE);
        ks.load(null);
        return (SecretKey) ks.getKey(ALIAS, null);
    }

    private SecretKey createKey() throws Exception {
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE);
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(
            ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) b.setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        } else {
            b.setUserAuthenticationValidityDurationSeconds(-1);
        }
        gen.init(b.build());
        return gen.generateKey();
    }

    private void deleteQuiet() {
        try {
            KeyStore ks = KeyStore.getInstance(STORE);
            ks.load(null);
            ks.deleteEntry(ALIAS);
        } catch (Exception ignored) {}
        prefs().edit().clear().apply();
    }

    private void rejectCode(PluginCall call, String code) {
        JSObject err = new JSObject();
        err.put("code", code);
        call.reject(code, code, err);
    }
}
