
// KONFIGURASI SUPABASE
// Gunakan Project URL dan Publishable Key.
// Jangan gunakan Service Role Key di frontend.

"use strict";

window.MPK_CONFIG = {
    SUPABASE_URL: "https://ymfjasnqawfteiowsmwz.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_FKUzIEjuaYDtiFzcBNU9qQ_BUyp-ldQ"
};


// INISIALISASI SUPABASE
(function () {

    var config = window.MPK_CONFIG;

    var validURL =
        config.SUPABASE_URL &&
        config.SUPABASE_URL.startsWith("https://");

    var validKey =
        config.SUPABASE_ANON_KEY &&
        config.SUPABASE_ANON_KEY.startsWith("sb_publishable_");

    if (
        window.supabase &&
        validURL &&
        validKey
    ) {
        window.supabaseClient =
            window.supabase.createClient(
                config.SUPABASE_URL,
                config.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

    } else {
        window.supabaseClient = null;

        console.error(
            "Konfigurasi Supabase tidak valid."
        );
    }

})();
