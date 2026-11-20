
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};

// MENAMPILKAN DAFTAR QR ANGGOTA
MPK.renderQRList = function () {
    var grid = MPK.$("qr-grid");

    if (!grid) return;

    var searchInput = MPK.$("qr-search");
    var query = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    var members = MPK.state.members || [];

    var list = members.filter(function (member) {
        var name = (member.full_name || "").toLowerCase();
        var code = (member.member_code || "").toLowerCase();

        return (
            member.is_active &&
            (name.indexOf(query) !== -1 ||
             code.indexOf(query) !== -1)
        );
    });

    if (!list.length) {
        grid.innerHTML =
            '<p class="empty">Belum ada anggota aktif.</p>';
        return;
    }

    grid.innerHTML = list.map(function (member) {
        return `
            <article class="qr-tile">
                <strong>${MPK.escape(member.full_name)}</strong>
                <small>${MPK.escape(member.member_code)}</small>

                <button
                    type="button"
                    class="btn btn-secondary"
                    data-qr="${MPK.escape(member.id)}">
                    Tampilkan QR
                </button>
            </article>
        `;
    }).join("");

    grid.querySelectorAll("[data-qr]").forEach(function (button) {
        button.addEventListener("click", function () {
            MPK.createMemberQR(button.dataset.qr, false);
        });
    });
};


// MEMBUAT QR ANGGOTA
MPK.createMemberQR = async function (id, rotate) {
    if (typeof rotate !== "boolean") {
        rotate = false;
    }

    var member = MPK.state.members.find(function (item) {
        return item.id === id;
    });

    if (!member) {
        MPK.toast("Data anggota tidak ditemukan.");
        return;
    }

    if (!member.is_active) {
        MPK.toast("Anggota ini sudah nonaktif.");
        return;
    }

    if (typeof QRCode === "undefined") {
        MPK.toast("Library QR Code belum berhasil dimuat.");
        return;
    }

    try {
        var token = await MPK.rpc("issue_member_qr", {
            p_member_id: id,
            p_rotate: rotate
        });

        if (!token || typeof token !== "string") {
            throw new Error("Token QR tidak valid.");
        }

        var title = MPK.$("qr-dialog-name");
        var output = MPK.$("qr-output");
        var dialog = MPK.$("qr-dialog");

        if (!title || !output || !dialog) {
            throw new Error("Komponen QR tidak ditemukan.");
        }

        MPK.state.qrToken = token;
        MPK.state.qrMember = member;

        title.textContent =
            member.full_name + " • " + member.member_code;

        output.innerHTML = "";

        new QRCode(output, {
            text: token,
            width: 220,
            height: 220,
            colorDark: "#08090D",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.M
        });

        if (!dialog.open) {
            dialog.showModal();
        }

    } catch (error) {
        MPK.toast(
            error.message || "Gagal membuat QR."
        );
    }
};


// MEMPERBARUI TOKEN QR
MPK.rotateMemberQR = async function (id) {
    var confirmed = confirm(
        "Perbarui QR anggota ini? QR lama tidak akan berlaku lagi."
    );

    if (!confirmed) return;

    await MPK.createMemberQR(id, true);
};


// MENGUNDUH QR FORMAT PNG
MPK.downloadMemberQR = async function () {
    var output = MPK.$("qr-output");
    var button = MPK.$("download-qr");

    if (!output || !MPK.state.qrToken) {
        MPK.toast("QR belum tersedia.");
        return;
    }

    var canvas = output.querySelector("canvas");

    if (!canvas) {
        MPK.toast("Gambar QR belum selesai dibuat.");
        return;
    }

    if (button && button.disabled) return;

    if (button) {
        button.disabled = true;
        button.textContent = "Menyiapkan...";
    }

    var fileURL = null;

    try {
        var blob = await new Promise(function (resolve, reject) {
            canvas.toBlob(function (result) {
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error("Gagal membuat gambar PNG."));
                }
            }, "image/png");
        });

        fileURL = URL.createObjectURL(blob);

        var link = document.createElement("a");
        var member = MPK.state.qrMember;
        var code = member ? member.member_code : "Anggota";

        link.href = fileURL;
        link.download =
            "QR-MPK-" +
            code.replace(/[^a-zA-Z0-9_-]/g, "_") +
            ".png";

        document.body.appendChild(link);
        link.click();
        link.remove();

        MPK.toast(
            "File QR disiapkan. Periksa folder Download."
        );

    } catch (error) {
        MPK.toast(
            "Unduhan gagal: " + error.message
        );

    } finally {
        if (fileURL) {
            URL.revokeObjectURL(fileURL);
        }

        if (button) {
            button.disabled = false;
            button.textContent = "Unduh QR";
        }
    }
};


// EVENT TOMBOL
document.addEventListener("DOMContentLoaded", function () {
    var searchInput = MPK.$("qr-search");
    var downloadButton = MPK.$("download-qr");

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            MPK.renderQRList
        );
    }

    if (downloadButton) {
        downloadButton.addEventListener(
            "click",
            MPK.downloadMemberQR
        );
    }
});
