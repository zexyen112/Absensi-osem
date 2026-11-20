
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};

// MENAMPILKAN DAFTAR ANGGOTA AKTIF
MPK.renderAbsenceSelect = function () {
    var select = MPK.$("absence-member");

    if (!select) return;

    var previousValue = select.value;
    var members = MPK.state.members || [];

    var activeMembers = members.filter(function (member) {
        return member.is_active;
    });

    select.innerHTML =
        '<option value="">Pilih anggota</option>' +
        activeMembers.map(function (member) {
            return `
                <option value="${MPK.escape(member.id)}">
                    ${MPK.escape(member.full_name)} —
                    ${MPK.escape(member.member_code)}
                </option>
            `;
        }).join("");

    var memberStillExists = activeMembers.some(
        function (member) {
            return member.id === previousValue;
        }
    );

    if (memberStillExists) {
        select.value = previousValue;
    }
};


// MENYIMPAN DATA KETIDAKHADIRAN
document.addEventListener("DOMContentLoaded", function () {
    var form = MPK.$("absence-form");

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (form.dataset.submitting === "true") {
            return;
        }

        if (!MPK.state.activeEvent) {
            MPK.toast(
                "Buat atau pilih kegiatan terlebih dahulu."
            );
            return;
        }

        var memberSelect = MPK.$("absence-member");
        var statusSelect = MPK.$("absence-status");
        var reasonInput = MPK.$("absence-reason");

        var memberId = memberSelect
            ? memberSelect.value
            : "";

        var status = statusSelect
            ? statusSelect.value
            : "";

        var reason = reasonInput
            ? reasonInput.value.trim()
            : "";

        if (!memberId) {
            MPK.toast("Pilih anggota terlebih dahulu.");
            return;
        }

        var validStatuses = ["izin", "sakit", "alfa"];

        if (validStatuses.indexOf(status) === -1) {
            MPK.toast(
                "Status ketidakhadiran tidak valid."
            );
            return;
        }

        if (status !== "alfa" && !reason) {
            MPK.toast(
                "Alasan wajib diisi untuk status Izin atau Sakit."
            );
            return;
        }

        var button = form.querySelector(
            'button[type="submit"]'
        );

        var eventId = MPK.state.activeEvent;

        form.dataset.submitting = "true";

        if (button) {
            button.disabled = true;
            button.textContent = "Menyimpan...";
        }

        try {
            await MPK.rpc(
                "record_member_absence",
                {
                    p_member_id: memberId,
                    p_event_id: eventId,
                    p_status: status,
                    p_reason: reason || null
                }
            );

            form.reset();

            await MPK.loadAttendance();
            MPK.renderAll();

            MPK.toast(
                "Ketidakhadiran berhasil dicatat."
            );

        } catch (error) {
            MPK.toast(
                error.message ||
                "Gagal mencatat ketidakhadiran."
            );

        } finally {
            form.dataset.submitting = "false";

            if (button) {
                button.disabled = false;
                button.textContent =
                    "Simpan Ketidakhadiran";
            }
        }
    });
});
