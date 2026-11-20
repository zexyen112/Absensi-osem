
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};


// STATE APLIKASI
MPK.state = {
    members: [],
    events: [],
    attendance: [],
    activeEvent: null,
    scanner: null,
    scanning: false,
    qrToken: null,
    qrMember: null,
    currentPage: "dashboard",
    loggingOut: false
};


// MENGAMBIL ELEMEN HTML
MPK.$ = function (id) {
    return document.getElementById(id);
};


// NOTIFIKASI
MPK.toast = function (message) {
    var element = MPK.$("toast");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(MPK.toastTimer);

    MPK.toastTimer = setTimeout(function () {
        element.classList.remove("show");
    }, 3200);
};


// PENGAMAN TEKS HTML
MPK.escape = function (value) {
    return String(value == null ? "" : value).replace(
        /[&<>"']/g,
        function (character) {
            var entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        }
    );
};


// FORMAT TANGGAL DAN WAKTU
MPK.dateTime = function (value) {
    if (!value) return "-";

    var date = new Date(value);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short"
    });
};


// FORMAT TANGGAL LOKAL
MPK.localDate = function () {
    var now = new Date();
    var offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 10);
};


// BADGE STATUS
MPK.statusBadge = function (status) {
    return (
        '<span class="status status-' +
        MPK.escape(status) +
        '">' +
        MPK.escape(status) +
        "</span>"
    );
};


// PEMANGGILAN SUPABASE RPC
MPK.rpc = async function (name, args) {
    var client = MPK.requireClient();
    var result = await client.rpc(name, args);

    if (result.error) {
        throw result.error;
    }

    return result.data;
};


// MEMUAT KEGIATAN
MPK.loadEvents = async function () {
    var result = await MPK.requireClient()
        .from("events")
        .select("*")
        .order("event_date", {
            ascending: false
        })
        .limit(100);

    if (result.error) {
        throw result.error;
    }

    MPK.state.events = result.data || [];

    var select = MPK.$("event-select");

    if (!MPK.state.events.length) {
        MPK.state.activeEvent = null;

        if (select) {
            select.innerHTML =
                '<option value="">Belum ada kegiatan</option>';
        }

        return;
    }

    var existingEvent = MPK.state.events.find(
        function (event) {
            return event.id === MPK.state.activeEvent;
        }
    );

    MPK.state.activeEvent = existingEvent
        ? existingEvent.id
        : MPK.state.events[0].id;

    if (!select) return;

    select.innerHTML = "";

    MPK.state.events.forEach(function (event) {
        var option = document.createElement("option");

        option.value = event.id;
        option.textContent =
            event.name + " — " + event.event_date;

        select.appendChild(option);
    });

    select.value = MPK.state.activeEvent;
};


// MEMUAT ANGGOTA
MPK.loadMembers = async function () {
    var result = await MPK.requireClient()
        .from("members")
        .select("*")
        .order("full_name");

    if (result.error) {
        throw result.error;
    }

    MPK.state.members = result.data || [];
};


// MEMUAT DATA ABSENSI
MPK.loadAttendance = async function () {
    if (!MPK.state.activeEvent) {
        MPK.state.attendance = [];
        return;
    }

    var result = await MPK.requireClient()
        .from("attendance")
        .select(
            "id,event_id,member_id,status,reason,recorded_by,created_at,members(full_name,member_code),profiles(email)"
        )
        .eq("event_id", MPK.state.activeEvent)
        .order("created_at", {
            ascending: false
        });

    if (result.error) {
        throw result.error;
    }

    MPK.state.attendance = result.data || [];
};


// MEMUAT ULANG SELURUH DATA
MPK.refresh = async function () {
    await MPK.loadEvents();
    await MPK.loadMembers();
    await MPK.loadAttendance();

    MPK.renderAll();
};


// MENAMPILKAN SELURUH KOMPONEN
MPK.renderAll = function () {
    if (typeof MPK.renderDashboard === "function") {
        MPK.renderDashboard();
    }

    if (typeof MPK.renderMembers === "function") {
        MPK.renderMembers();
    }

    if (typeof MPK.renderQRList === "function") {
        MPK.renderQRList();
    }

    if (typeof MPK.renderAbsenceSelect === "function") {
        MPK.renderAbsenceSelect();
    }

    if (typeof MPK.renderArchive === "function") {
        MPK.renderArchive();
    }
};


// NAVIGASI HALAMAN
MPK.showPage = function (page) {
    var target = MPK.$("page-" + page);

    if (!target) {
        MPK.toast("Halaman tidak ditemukan.");
        return;
    }

    // HENTIKAN SCANNER KETIKA MENINGGALKAN HALAMANNYA
    if (
        MPK.state.currentPage === "scanner" &&
        page !== "scanner" &&
        typeof MPK.stopScanner === "function"
    ) {
        MPK.stopScanner();
    }

    document.querySelectorAll(".page").forEach(
        function (element) {
            element.classList.add("hidden");
        }
    );

    target.classList.remove("hidden");

    document.querySelectorAll(".nav-link").forEach(
        function (element) {
            element.classList.toggle(
                "active",
                element.dataset.page === page
            );
        }
    );

    var titles = {
        dashboard: "Dashboard",
        scanner: "QR Scanner",
        members: "Data Anggota",
        qrcodes: "QR Anggota",
        attendance: "Ketidakhadiran",
        archive: "Arsip & Laporan",
        account: "Pengaturan Akun"
    };

    var title = MPK.$("page-title");

    if (title) {
        title.textContent = titles[page] || "Dashboard";
    }

    MPK.state.currentPage = page;

    if (page === "archive") {
        MPK.renderArchive();
    }
};


// INISIALISASI APLIKASI
document.addEventListener("DOMContentLoaded", async function () {
    try {
        // PERIKSA AUTENTIKASI
        var authenticatedUser = await MPK.requireAuth();

        if (!authenticatedUser) {
            return;
        }

        var loading = MPK.$("app-loading");
        var app = MPK.$("app");

        if (loading) {
            loading.classList.add("hidden");
        }

        if (app) {
            app.classList.remove("hidden");
        }

        if (typeof MPK.renderAccountInfo === "function") {
            MPK.renderAccountInfo();
        }


        // NAVIGASI SIDEBAR
        document.querySelectorAll(".nav-link").forEach(
            function (button) {
                button.addEventListener("click", function () {
                    MPK.showPage(button.dataset.page);
                });
            }
        );


        // NAVIGASI TOMBOL DASHBOARD
        document.querySelectorAll("[data-go]").forEach(
            function (button) {
                button.addEventListener("click", function () {
                    MPK.showPage(button.dataset.go);
                });
            }
        );


        // LOGOUT
        var logoutButton = MPK.$("logout-btn");
        var mobileLogout = MPK.$("mobile-logout");
        var accountLogout = MPK.$("account-logout");

        if (logoutButton) {
            logoutButton.addEventListener(
                "click",
                MPK.logout
            );
        }

        if (mobileLogout) {
            mobileLogout.addEventListener(
                "click",
                MPK.logout
            );
        }

        if (accountLogout) {
            accountLogout.addEventListener(
                "click",
                MPK.logout
            );
        }


        // PERGANTIAN KEGIATAN
        var eventSelect = MPK.$("event-select");

        if (eventSelect) {
            eventSelect.addEventListener(
                "change",
                async function (event) {
                    MPK.state.activeEvent =
                        event.target.value || null;

                    try {
                        await MPK.loadAttendance();
                        MPK.renderAll();

                    } catch (error) {
                        MPK.toast(
                            error.message ||
                            "Gagal memuat absensi."
                        );
                    }
                }
            );
        }


        // MEMBUKA DIALOG KEGIATAN BARU
        var newEventButton = MPK.$("new-event-btn");

        if (newEventButton) {
            newEventButton.addEventListener(
                "click",
                function () {
                    var dateInput = MPK.$("event-date");

                    if (dateInput) {
                        dateInput.value = MPK.localDate();
                    }

                    var dialog = MPK.$("event-dialog");

                    if (dialog) {
                        dialog.showModal();
                    }
                }
            );
        }


        // MENYIMPAN KEGIATAN BARU
        var eventForm = MPK.$("event-form");

        if (eventForm) {
            eventForm.addEventListener(
                "submit",
                async function (event) {
                    event.preventDefault();

                    if (
                        eventForm.dataset.submitting === "true"
                    ) {
                        return;
                    }

                    var nameInput = MPK.$("event-name");
                    var dateInput = MPK.$("event-date");

                    var name = nameInput
                        ? nameInput.value.trim()
                        : "";

                    var date = dateInput
                        ? dateInput.value
                        : "";

                    if (!name || !date) {
                        MPK.toast(
                            "Nama dan tanggal kegiatan wajib diisi."
                        );
                        return;
                    }

                    var button = eventForm.querySelector(
                        'button[type="submit"]'
                    );

                    eventForm.dataset.submitting = "true";

                    if (button) {
                        button.disabled = true;
                        button.textContent = "Menyimpan...";
                    }

                    try {
                        if (!MPK.currentUser) {
                            throw new Error(
                                "Sesi pengguna tidak ditemukan."
                            );
                        }

                        var result = await MPK.requireClient()
                            .from("events")
                            .insert({
                                name: name,
                                event_date: date,
                                created_by: MPK.currentUser.id
                            });

                        if (result.error) {
                            throw result.error;
                        }

                        var dialog = MPK.$("event-dialog");

                        if (dialog) {
                            dialog.close();
                        }

                        eventForm.reset();

                        await MPK.refresh();

                        MPK.toast(
                            "Kegiatan berhasil dibuat."
                        );

                    } catch (error) {
                        MPK.toast(
                            error.message ||
                            "Gagal membuat kegiatan."
                        );

                    } finally {
                        eventForm.dataset.submitting = "false";

                        if (button) {
                            button.disabled = false;
                            button.textContent = "Buat kegiatan";
                        }
                    }
                }
            );
        }


        // MENUTUP DIALOG
        document.querySelectorAll("[data-close]").forEach(
            function (button) {
                button.addEventListener("click", function () {
                    var dialog = MPK.$(button.dataset.close);

                    if (dialog && dialog.open) {
                        dialog.close();
                    }
                });
            }
        );


        // MEMUAT DATA AWAL
        await MPK.refresh();

    } catch (error) {
        console.error(
            "Inisialisasi aplikasi gagal:",
            error
        );

        var loading = MPK.$("app-loading");

        if (loading) {
            loading.classList.remove("hidden");

            loading.textContent =
                "Gagal memuat aplikasi: " +
                (error.message || "Kesalahan tidak diketahui.");
        }

        MPK.toast(
            error.message || "Gagal memuat aplikasi."
        );
    }
});
