
// @ts-nocheck
"use strict";

window.MPK = window.MPK || {};

/**
 * @typedef {Object} MemberRecord
 * @property {string} id
 * @property {string} full_name
 * @property {string} member_code
 * @property {string|null} commission
 * @property {string|null} position
 * @property {boolean} is_active
 */

// MENAMPILKAN DATA ANGGOTA
MPK.renderMembers = function () {
    var body = MPK.$("members-body");
    var count = MPK.$("member-count");

    if (!body) return;

    var searchInput = MPK.$("member-search");
    var query = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    var members = MPK.state.members || [];

    var filteredMembers = members.filter(function (member) {
        var searchable = [
            member.full_name,
            member.member_code,
            member.commission || "",
            member.position || ""
        ].join(" ").toLowerCase();

        return searchable.indexOf(query) !== -1;
    });

    if (count) {
        count.textContent = filteredMembers.length + " anggota";
    }

    body.innerHTML = filteredMembers.map(function (member) {
        return `
            <tr>
                <td><b>${MPK.escape(member.full_name)}</b></td>
                <td>${MPK.escape(member.member_code)}</td>
                <td>${MPK.escape(member.commission || "-")}</td>
                <td>${MPK.escape(member.position || "-")}</td>
                <td>
                    <span class="status ${
                        member.is_active
                            ? "status-active"
                            : "status-inactive"
                    }">
                        ${member.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                </td>
                <td>
                    <button type="button" class="action-btn"
                        data-edit="${MPK.escape(member.id)}">Edit</button>

                    <button type="button" class="action-btn danger"
                        data-delete="${MPK.escape(member.id)}">Hapus</button>
                </td>
            </tr>
        `;
    }).join("") || `
        <tr>
            <td colspan="6" class="empty">Tidak ada anggota.</td>
        </tr>
    `;

    body.querySelectorAll("[data-edit]").forEach(function (button) {
        button.addEventListener("click", function () {
            MPK.openMember(button.dataset.edit);
        });
    });

    body.querySelectorAll("[data-delete]").forEach(function (button) {
        button.addEventListener("click", function () {
            MPK.deleteMember(button.dataset.delete);
        });
    });
};


// MEMBUKA FORM ANGGOTA
MPK.openMember = function (memberId) {
    var member = null;

    if (memberId) {
        member = MPK.state.members.find(function (record) {
            return record.id === memberId;
        }) || null;
    }

    if (memberId && !member) {
        MPK.toast("Data anggota tidak ditemukan.");
        return;
    }

    MPK.$("member-dialog-title").textContent =
        member ? "Edit anggota" : "Tambah anggota";

    MPK.$("member-id").value = member ? member.id : "";
    MPK.$("member-name").value = member ? member.full_name : "";
    MPK.$("member-code").value = member ? member.member_code : "";
    MPK.$("member-commission").value =
        member ? member.commission || "" : "";
    MPK.$("member-position").value =
        member ? member.position || "" : "";

    MPK.$("member-active").checked =
        member ? member.is_active : true;

    MPK.$("member-dialog").showModal();
};


// MENGHAPUS ATAU MENONAKTIFKAN ANGGOTA
MPK.deleteMember = async function (memberId) {
    var member = MPK.state.members.find(function (record) {
        return record.id === memberId;
    });

    if (!member) {
        MPK.toast("Data anggota tidak ditemukan.");
        return;
    }

    var confirmed = confirm(
        "Hapus anggota " + member.full_name +
        "?\n\nJika anggota memiliki riwayat absensi, " +
        "anggota akan otomatis dinonaktifkan agar arsip tetap aman."
    );

    if (!confirmed) return;

    try {
        var client = MPK.requireClient();

        var deleteResult = await client
            .from("members")
            .delete()
            .eq("id", memberId);

        if (deleteResult.error) {
            if (deleteResult.error.code === "23503") {
                var deactivateResult = await client
                    .from("members")
                    .update({ is_active: false })
                    .eq("id", memberId);

                if (deactivateResult.error) {
                    throw deactivateResult.error;
                }

                await MPK.refresh();

                MPK.toast(
                    "Anggota memiliki riwayat absensi. " +
                    "Anggota berhasil dinonaktifkan."
                );

                return;
            }

            throw deleteResult.error;
        }

        await MPK.refresh();
        MPK.toast("Anggota berhasil dihapus.");

    } catch (error) {
        MPK.toast(
            error.message || "Gagal menghapus anggota."
        );
    }
};


// MENYIMPAN DATA ANGGOTA
document.addEventListener("DOMContentLoaded", function () {
    var addButton = MPK.$("add-member-btn");

    if (addButton) {
        addButton.addEventListener("click", function () {
            MPK.openMember(null);
        });
    }

    var searchInput = MPK.$("member-search");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            MPK.renderMembers();
        });
    }

    var form = MPK.$("member-form");

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (form.dataset.submitting === "true") return;

        var memberId = MPK.$("member-id").value;
        var fullName = MPK.$("member-name").value.trim();
        var memberCode = MPK.$("member-code").value.trim();

        if (!fullName || !memberCode) {
            MPK.toast("Nama dan nomor anggota wajib diisi.");
            return;
        }

        var row = {
            full_name: fullName,
            member_code: memberCode,
            commission:
                MPK.$("member-commission").value.trim() || null,
            position:
                MPK.$("member-position").value.trim() || null,
            is_active: MPK.$("member-active").checked
        };

        var submitButton = form.querySelector(
            'button[type="submit"]'
        );

        form.dataset.submitting = "true";

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Menyimpan...";
        }

        try {
            var result;

            if (memberId) {
                result = await MPK.requireClient()
                    .from("members")
                    .update(row)
                    .eq("id", memberId);
            } else {
                result = await MPK.requireClient()
                    .from("members")
                    .insert(row);
            }

            if (result.error) {
                throw result.error;
            }

            MPK.$("member-dialog").close();
            form.reset();

            await MPK.refresh();
            MPK.toast("Data anggota berhasil disimpan.");

        } catch (error) {
            MPK.toast(
                error.message || "Gagal menyimpan data anggota."
            );

        } finally {
            form.dataset.submitting = "false";

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Simpan anggota";
            }
        }
    });
});
