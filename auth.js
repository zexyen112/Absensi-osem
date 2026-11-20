
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};


// MEMERIKSA KONEKSI SUPABASE
MPK.requireClient = function () {
    if (!window.supabaseClient) {
        throw new Error(
            "Konfigurasi Supabase belum diisi di js/config.js."
        );
    }

    return window.supabaseClient;
};


// DATA PENGGUNA AKTIF
MPK.currentUser = null;


// MENAMPILKAN INFORMASI AKUN
MPK.renderAccountInfo = function () {
    var email = MPK.currentUser
        ? MPK.currentUser.email || "-"
        : "-";

    var accountEmail = MPK.$("account-email");
    var sideEmail = MPK.$("side-email");

    if (accountEmail) {
        accountEmail.value = email;
    }

    if (sideEmail) {
        sideEmail.textContent = email;
    }
};


// MEMERIKSA SESI LOGIN
MPK.requireAuth = async function () {
    var sb = MPK.requireClient();

    var result = await sb.auth.getSession();

    if (result.error) {
        throw result.error;
    }

    if (!result.data || !result.data.session) {
        MPK.currentUser = null;

        location.replace("login.html");

        return null;
    }

    MPK.currentUser = result.data.session.user;

    MPK.renderAccountInfo();

    return MPK.currentUser;
};


// MENGAMBIL EMAIL AKUN
MPK.getCurrentUserEmail = function () {
    return MPK.currentUser
        ? MPK.currentUser.email || "-"
        : "-";
};


// MEMPERBARUI PASSWORD
MPK.updatePassword = async function (newPassword) {
    var password = String(newPassword || "");

    if (password.length < 8) {
        throw new Error(
            "Password minimal 8 karakter."
        );
    }

    if (!MPK.currentUser) {
        throw new Error(
            "Sesi login tidak ditemukan. Silakan login kembali."
        );
    }

    var sb = MPK.requireClient();

    var result = await sb.auth.updateUser({
        password: password
    });

    if (result.error) {
        throw result.error;
    }

    if (result.data && result.data.user) {
        MPK.currentUser = result.data.user;
    }

    MPK.renderAccountInfo();

    return MPK.currentUser;
};


// LOGOUT
MPK.logout = async function () {
    if (MPK.state && MPK.state.loggingOut) {
        return;
    }

    if (MPK.state) {
        MPK.state.loggingOut = true;
    }

    try {
        var sb = MPK.requireClient();

        var result = await sb.auth.signOut();

        if (result.error) {
            throw result.error;
        }

        MPK.currentUser = null;

        location.replace("login.html");

    } catch (error) {
        if (MPK.state) {
            MPK.state.loggingOut = false;
        }

        MPK.toast(
            error.message || "Gagal keluar dari akun."
        );
    }
};


// FORM PENGATURAN AKUN
document.addEventListener(
    "DOMContentLoaded",
    function () {

        var form = MPK.$("account-password-form");
        var passwordInput = MPK.$("account-password");
        var confirmInput = MPK.$("account-password-confirm");

        if (!form || !passwordInput || !confirmInput) {
            MPK.renderAccountInfo();
            return;
        }

        form.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                if (form.dataset.submitting === "true") {
                    return;
                }

                var password = passwordInput.value;
                var confirmation = confirmInput.value;

                var submitButton = form.querySelector(
                    'button[type="submit"]'
                );

                if (password.length < 8) {
                    MPK.toast(
                        "Password minimal 8 karakter."
                    );

                    passwordInput.focus();
                    return;
                }

                if (password !== confirmation) {
                    MPK.toast(
                        "Konfirmasi password tidak sama."
                    );

                    confirmInput.focus();
                    return;
                }

                form.dataset.submitting = "true";

                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Menyimpan...";
                }

                try {
                    await MPK.updatePassword(password);

                    form.reset();

                    MPK.toast(
                        "Password berhasil diperbarui."
                    );

                } catch (error) {
                    MPK.toast(
                        error.message ||
                        "Gagal memperbarui password."
                    );

                } finally {
                    form.dataset.submitting = "false";

                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent =
                            "Simpan password baru";
                    }
                }
            }
        );

        MPK.renderAccountInfo();
    }
);
