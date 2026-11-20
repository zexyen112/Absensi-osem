
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};

var scannerProcessing = false;


// MEMULAI QR SCANNER
MPK.startScanner = async function () {
    if (!MPK.state.activeEvent) {
        MPK.toast("Buat atau pilih kegiatan terlebih dahulu.");
        return;
    }

    if (MPK.state.scanning || scannerProcessing) {
        return;
    }

    var startButton = MPK.$("start-scan");
    var resultElement = MPK.$("scan-result");

    if (!resultElement || !startButton) {
        MPK.toast("Komponen scanner tidak ditemukan.");
        return;
    }

    if (typeof Html5Qrcode === "undefined") {
        MPK.toast("Library QR Scanner belum berhasil dimuat.");
        resultElement.textContent =
            "Library QR Scanner tidak tersedia.";
        return;
    }

    try {
        if (!MPK.state.scanner) {
            MPK.state.scanner = new Html5Qrcode("reader");
        }

        MPK.state.scanning = true;
        startButton.disabled = true;

        resultElement.textContent = "Meminta izin kamera...";

        await MPK.state.scanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: {
                    width: 240,
                    height: 240
                }
            },

            async function (decoded) {
                if (!MPK.state.scanning || scannerProcessing) {
                    return;
                }

                var token = String(decoded || "").trim();

                if (!token) {
                    return;
                }

                scannerProcessing = true;
                MPK.state.scanning = false;

                resultElement.textContent =
                    "Memvalidasi QR...";

                try {
                    await MPK.stopScanner();

                    // Kunci tombol selama proses pencatatan.
                    startButton.disabled = true;

                    var eventId = MPK.state.activeEvent;

                    if (!eventId) {
                        throw new Error(
                            "Kegiatan tidak ditemukan."
                        );
                    }

                    var result = await MPK.rpc(
                        "record_attendance_qr",
                        {
                            p_token: token,
                            p_event_id: eventId
                        }
                    );

                    var memberName =
                        result && result.member_name
                            ? result.member_name
                            : "Anggota";

                    resultElement.textContent =
                        "Berhasil: " +
                        memberName +
                        " tercatat HADIR.";

                    MPK.toast(
                        "Absensi berhasil dicatat."
                    );

                    await MPK.loadAttendance();
                    MPK.renderAll();

                } catch (error) {
                    resultElement.textContent =
                        "QR ditolak: " +
                        (error.message || "Terjadi kesalahan.");

                    MPK.toast(
                        error.message || "QR gagal diproses."
                    );

                } finally {
                    scannerProcessing = false;
                    startButton.disabled = false;
                }
            },

            function () {
                // Pesan kegagalan pembacaan frame diabaikan.
            }
        );

        resultElement.textContent =
            "Kamera aktif. Arahkan ke QR anggota.";

    } catch (error) {
        MPK.state.scanning = false;
        scannerProcessing = false;

        resultElement.textContent =
            "Kamera tidak dapat dibuka: " +
            (error.message || "Periksa izin kamera.");

        startButton.disabled = false;

        MPK.toast(
            "Gagal membuka kamera. Periksa izin kamera dan koneksi HTTPS."
        );
    }
};


// MENGHENTIKAN QR SCANNER
MPK.stopScanner = async function () {
    MPK.state.scanning = false;

    var scanner = MPK.state.scanner;

    if (scanner) {
        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
        } catch (error) {
            console.warn(
                "Gagal menghentikan kamera:",
                error
            );
        }
    }

    var startButton = MPK.$("start-scan");

    if (startButton && !scannerProcessing) {
        startButton.disabled = false;
    }
};


// EVENT TOMBOL SCANNER
document.addEventListener("DOMContentLoaded", function () {
    var startButton = MPK.$("start-scan");
    var stopButton = MPK.$("stop-scan");

    if (startButton) {
        startButton.addEventListener(
            "click",
            MPK.startScanner
        );
    }

    if (stopButton) {
        stopButton.addEventListener(
            "click",
            MPK.stopScanner
        );
    }
});
