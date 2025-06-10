// --- CONFIGURE YOUR SUPABASE URL AND ANON KEY ---
const SUPABASE_URL = 'https://oytxhozuqrxeebdlnawb.supabase.co'; // <-- replace with your real URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dHhob3p1cXJ4ZWViZGxuYXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODU0OTEsImV4cCI6MjA2NDM2MTQ5MX0.G18pV_EFVfbtQd62tG_S-ED_TRjCptWp-C8dcO2GEEA';  // <-- replace with your real anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // --- HANDLE SUPABASE OAUTH HASH REDIRECT ---
    if (window.location.hash && window.location.hash.includes('access_token')) {
        // For Supabase v2: use exchangeCodeForSession for OAuth redirect
        try {
            const { data, error } = await supabaseClient.auth.exchangeCodeForSession(window.location.hash);
            if (error) {
                console.error('OAuth session exchange error:', error);
            } else {
                console.log('Session set from URL hash');
            }
        } catch (err) {
            console.error('OAuth session exchange exception:', err);
        }
        // Remove the hash from the URL for cleanliness
        window.location.hash = '';
    }

    // --- AGE GATE LOGIC ---
    const ageGateOverlay = document.getElementById('age-gate-overlay');
    const ageYesBtn = document.getElementById('age-yes');
    const ageNoBtn = document.getElementById('age-no');
    if (localStorage.getItem('ageGatePassed') === 'true') {
        if (ageGateOverlay) ageGateOverlay.style.display = 'none';
    } else {
        if (ageGateOverlay) ageGateOverlay.style.display = 'flex';
    }
    if (ageYesBtn) {
        ageYesBtn.onclick = () => {
            localStorage.setItem('ageGatePassed', 'true');
            if (ageGateOverlay) ageGateOverlay.style.display = 'none';
        };
    }
    if (ageNoBtn) {
        ageNoBtn.onclick = () => {
            window.location.href = 'https://www.begambleaware.org/';
        };
    }

    // --- GLOBAL LOGIN BUTTON LOGIC ---
    const globalLoginBtn = document.getElementById('global-login-btn');
    if (globalLoginBtn) {
        globalLoginBtn.onclick = async () => {
            try {
                await supabaseClient.auth.signInWithOAuth({
                    provider: 'twitch',
                    options: {
                        redirectTo: 'https://osecaadegas.github.io/95/',
                    }
                });
            } catch (err) {
                console.error('Login error:', err);
            }
        };
    }

    let currentUser = null;

    async function checkAuthAndSetupScratch() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            console.log('Supabase getUser:', user, error);
            currentUser = user;
            // Show/hide global login button
            if (globalLoginBtn) globalLoginBtn.style.display = user ? 'none' : '';
            // Remove all scratch-login-required logic
            if (!user) {
                return;
            }
        } catch (err) {
            console.error('Auth error:', err);
        }
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        currentUser = session?.user || null;
        checkAuthAndSetupScratch();
    });

    // --- SIDEBAR LOGIC ---
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }
    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    document.addEventListener('click', (e) => {
        if (
            sidebar &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle
        ) {
            sidebar.classList.remove('active');
        }
    });

    // --- PROFILE CARD LOGIC ---
    const profileCard = document.getElementById('profile-card');
    const profileEmail = document.getElementById('profile-email');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileName = document.getElementById('profile-name');
    const profileBio = document.getElementById('profile-bio');
    const profileSaveBtn = document.getElementById('profile-save-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    const avatarUpload = document.getElementById('avatar-upload');

    let currentProfile = {};

    async function showProfileCard(user) {
        if (!user) {
            if (profileCard) profileCard.style.display = 'none';
            return;
        }
        if (profileCard) profileCard.style.display = 'flex';
        if (profileEmail) profileEmail.textContent = user.email || user.id;
        // Load profile from Supabase
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('name,bio,avatar_url')
            .eq('id', user.id)
            .single();
        if (!error && data) {
            currentProfile = data;
            if (profileName) profileName.value = data.name || '';
            if (profileBio) profileBio.value = data.bio || '';
            if (profileAvatar) {
                profileAvatar.src = data.avatar_url
                    ? data.avatar_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || user.email || 'User')}`;
            }
        } else {
            // Defaults
            if (profileName) profileName.value = '';
            if (profileBio) profileBio.value = '';
            if (profileAvatar) profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'User')}`;
        }
    }

    async function saveProfile() {
        if (!currentUser) return;
        const updates = {
            id: currentUser.id,
            name: profileName ? profileName.value : '',
            bio: profileBio ? profileBio.value : '',
            updated_at: new Date().toISOString()
        };
        // If avatar changed, add avatar_url
        if (currentProfile.avatar_url) {
            updates.avatar_url = currentProfile.avatar_url;
        }
        const { error } = await supabaseClient.from('profiles').upsert(updates, { onConflict: ['id'] });
        if (!error) {
            alert('Profile saved!');
            collapseProfileCard(); // Collapse after saving
        } else {
            alert('Error saving profile.');
        }
    }

    // Collapse profile card to avatar only
    function collapseProfileCard() {
        if (profileCard) {
            profileCard.classList.add('collapsed');
        }
    }

    // Expand profile card for editing
    function expandProfileCard() {
        if (profileCard) {
            profileCard.classList.remove('collapsed');
        }
    }

    // Add click event to avatar to expand card
    if (profileAvatar) {
        profileAvatar.addEventListener('click', () => {
            if (profileCard && profileCard.classList.contains('collapsed')) {
                expandProfileCard();
            }
        });
    }

    // Avatar upload (base64 demo, not for production)
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(evt) {
                if (profileAvatar) profileAvatar.src = evt.target.result;
                currentProfile.avatar_url = evt.target.result; // For demo, store base64 in DB
            };
            reader.readAsDataURL(file);
        });
    }

    if (profileSaveBtn) {
        profileSaveBtn.addEventListener('click', saveProfile);
    }
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
    }

    // Show/hide profile card on auth change
    async function handleProfileUI(user) {
        currentUser = user;
        if (user) {
            await showProfileCard(user);
        } else {
            if (profileCard) profileCard.style.display = 'none';
        }
    }

    // On page load and auth change
    supabaseClient.auth.getUser().then(({ data: { user }, error }) => {
        console.log('Initial getUser:', user, error); // <-- Add this line
        handleProfileUI(user);
    });
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Profile Auth state changed:', event, session); // <-- Add this line
        handleProfileUI(session?.user || null);
    });

    // --- SESSION CHECK (log user or no active session) ---
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('User is logged in:', session.user);
        } else {
            console.log('No active session');
        }
    });

    // --- TRANSLATION LOGIC ---
    const translations = {
        en: {
            everything_here: "Everything you need is here",
            offers: "OFFERS",
            register_cashback: "Register and use the codes to get 15% cashback from me",
            empire_percent: "Open a Discord Ticket",
            empire_condition: "For a Gentle gift",
            newcasino_percent: "1st deposit cashback up to 20€",
            newcasino_condition: "No double accounts are covered",
            infinity_percent: "+100% +200 Free Spins",
            infinity_condition: "+15% cashback for losses over 100€ monthly",
            buran_percent: "1st deposit cashback up to 20€",
            buran_condition: "+15% cashback for losses over 100€ monthly",
            arena_code: "Code: secaadegas",
            arena_condition: "use my code for in-game rewards"
        },
        pt: {
            everything_here: "Tudo o que você precisa está aqui",
            offers: "OFERTAS",
            register_cashback: "Registe-se e use os códigos para receber 15% de cashback meu",
            empire_percent: "Abra um ticket no Discord",
            empire_condition: "Para um presente gentil",
            newcasino_percent: "Cashback de até 20€ no 1º depósito",
            newcasino_condition: "Contas duplicadas não são cobertas",
            infinity_percent: "+100% +200 Rodadas Grátis",
            infinity_condition: "+15% de cashback para perdas acima de 100€ por mês",
            buran_percent: "Cashback de até 20€ no 1º depósito",
            buran_condition: "+15% de cashback para perdas acima de 100€ por mês",
            arena_code: "Código: secaadegas",
            arena_condition: "use meu código para recompensas no jogo"
        }
    };

    function setLanguage(lang) {
        const dict = translations[lang] || translations.en;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });
        // Update toggle UI
        document.getElementById('lang-en')?.classList.toggle('active', lang === 'en');
        document.getElementById('lang-pt')?.classList.toggle('active', lang === 'pt');
    }

    // Language toggle logic
    const langToggle = document.getElementById('lang-toggle');
    function getSavedLang() {
        return localStorage.getItem('lang') || 'en';
    }
    function saveLang(lang) {
        localStorage.setItem('lang', lang);
    }
    function updateLangFromToggle() {
        const lang = langToggle && langToggle.checked ? 'pt' : 'en';
        setLanguage(lang);
        saveLang(lang);
    }
    if (langToggle) {
        // Set initial state from storage
        const savedLang = getSavedLang();
        langToggle.checked = savedLang === 'pt';
        setLanguage(savedLang);
        langToggle.addEventListener('change', updateLangFromToggle);
    } else {
        setLanguage(getSavedLang());
    }

    // --- INITIALIZE ---
    checkAuthAndSetupScratch();
});
