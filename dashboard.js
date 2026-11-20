
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};

// MENAMPILKAN DASHBOARD
MPK.renderDashboard = function () {

    var attendanceData = MPK.state.attendance || [];
    var memberData = MPK.state.members || [];

    // MEMPERBARUI TEKS
    function updateText(elementId, value) {
        var element = MPK.$(elementId);

        if (element) {
            element.textContent = String(value);
        }
    }

    // MENGHITUNG STATUS ABSENSI
    function countAttendance(status) {
        return attendanceData.filter(function (record) {
            return record.status === status;
        }).length;
    }

    // MENGHITUNG ANGGOTA AKTIF
    var activeMembers = memberData.filter(function (member) {
        return member.is_active === true;
    });

    // STATISTIK DASHBOARD
    updateText("stat-total", activeMembers.length);
    updateText("stat-present", countAttendance("hadir"));
    updateText("stat-permission", countAttendance("izin"));
    updateText("stat-sick", countAttendance("sakit"));
    updateText("stat-absent", countAttendance("alfa"));

    // AKTIVITAS TERBARU
    var tableBody = MPK.$("recent-body");

    if (!tableBody) return;

    if (attendanceData.length === 0) {
        tableBody.innerHTML =
            '<tr><td colspan="4" class="empty">Belum ada data.</td></tr>';
        return;
    }

    // MENGURUTKAN DATA BERDASARKAN WAKTU
    var latestRecords = attendanceData.slice().sort(
        function (a, b) {
            var dateA = new Date(a.created_at || 0).getTime();
            var dateB = new Date(b.created_at || 0).getTime();

            return dateB - dateA;
        }
    ).slice(0, 8);

    var tableHTML = "";

    latestRecords.forEach(function (record) {

        var member = record.members || {};
        var profile = record.profiles || {};

        var name = MPK.escape(member.full_name || "-");
        var code = MPK.escape(member.member_code || "-");
        var email = MPK.escape(profile.email || "-");

        var status = MPK.statusBadge(record.status || "-");
        var date = MPK.escape(
            MPK.dateTime(record.created_at)
        );

        tableHTML +=
            "<tr>" +
                "<td><b>" + name + "</b><br>" +
                    "<small>" + code + "</small></td>" +
                "<td>" + status + "</td>" +
                "<td>" + date + "</td>" +
                "<td>" + email + "</td>" +
            "</tr>";
    });

    tableBody.innerHTML = tableHTML;
};
