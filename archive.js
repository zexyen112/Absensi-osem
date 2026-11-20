
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};


// MENGAMBIL DATA ARSIP SESUAI FILTER
MPK.getFilteredArchive = function () {
    var searchInput = MPK.$("archive-search");
    var dateInput = MPK.$("archive-date");
    var statusInput = MPK.$("archive-status");

    var search = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    var date = dateInput ? dateInput.value : "";
    var status = statusInput ? statusInput.value : "";

    var attendance = MPK.state.attendance || [];

    return attendance.filter(function (record) {
        var name = (
            record.members && record.members.full_name
                ? record.members.full_name
                : ""
        ).toLowerCase();

        var code = (
            record.members && record.members.member_code
                ? record.members.member_code
                : ""
        ).toLowerCase();

        var recordDate = record.created_at
            ? record.created_at.slice(0, 10)
            : "";

        var matchesSearch =
            !search ||
            name.indexOf(search) !== -1 ||
            code.indexOf(search) !== -1;

        var matchesDate =
            !date || recordDate === date;

        var matchesStatus =
            !status || record.status === status;

        return (
            matchesSearch &&
            matchesDate &&
            matchesStatus
        );
    });
};


// MENAMPILKAN ARSIP
MPK.renderArchive = function () {
    var body = MPK.$("archive-body");

    if (!body) return;

    var rows = MPK.getFilteredArchive();

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    Tidak ada data pada filter ini.
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = rows.map(function (record) {
        var memberName =
            record.members && record.members.full_name
                ? record.members.full_name
                : "-";

        var operator =
            record.profiles && record.profiles.email
                ? record.profiles.email
                : record.recorded_by || "-";

        var date = record.created_at
            ? new Date(record.created_at).toLocaleDateString("id-ID")
            : "-";

        return `
            <tr>
                <td>
                    ${MPK.escape(date)}
                </td>

                <td>
                    ${MPK.escape(memberName)}
                </td>

                <td>
                    ${MPK.statusBadge(record.status)}
                </td>

                <td>
                    ${MPK.escape(record.reason || "-")}
                </td>

                <td>
                    ${MPK.escape(MPK.dateTime(record.created_at))}
                </td>

                <td>
                    ${MPK.escape(operator)}
                </td>
            </tr>
        `;
    }).join("");
};


// MENGEKSPOR ARSIP KE CSV
MPK.exportArchive = function () {
    var rows = MPK.getFilteredArchive();

    if (!rows.length) {
        MPK.toast("Tidak ada data untuk diekspor.");
        return;
    }

    var data = [
        [
            "Tanggal",
            "Nama Anggota",
            "Nomor Anggota",
            "Status",
            "Alasan",
            "Waktu",
            "Dicatat Oleh"
        ]
    ];

    rows.forEach(function (record) {
        var memberName =
            record.members && record.members.full_name
                ? record.members.full_name
                : "";

        var memberCode =
            record.members && record.members.member_code
                ? record.members.member_code
                : "";

        var operator =
            record.profiles && record.profiles.email
                ? record.profiles.email
                : record.recorded_by || "";

        data.push([
            record.created_at
                ? record.created_at.slice(0, 10)
                : "",

            memberName,
            memberCode,
            record.status || "",
            record.reason || "",
            record.created_at || "",
            operator
        ]);
    });

    var csv = data.map(function (row) {
        return row.map(function (value) {
            var safeValue = String(value == null ? "" : value)
                .replace(/"/g, '""');

            return '"' + safeValue + '"';
        }).join(",");
    }).join("\r\n");

    var blob = new Blob(
        ["\ufeff" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = "arsip-absensi-mpk-osis.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 30000);

    MPK.toast("File CSV berhasil disiapkan.");
};


// INISIALISASI FILTER DAN EKSPOR
document.addEventListener("DOMContentLoaded", function () {
    var filterIds = [
        "archive-search",
        "archive-date",
        "archive-status"
    ];

    filterIds.forEach(function (id) {
        var element = MPK.$(id);

        if (!element) return;

        element.addEventListener(
            "input",
            MPK.renderArchive
        );

        element.addEventListener(
            "change",
            MPK.renderArchive
        );
    });

    var exportButton = MPK.$("export-btn");

    if (exportButton) {
        exportButton.addEventListener(
            "click",
            MPK.exportArchive
        );
    }
});
