import BugHuntFriends from "./BugHuntFriends";
import { CharacterWardrobe, DebuggerCharacter, DEFAULT_LOOK, CLASSIC_TEE_ID, COSTUME_CATALOG, TeeGraphic } from "./DebuggerCharacter";
import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "./supabase";

import "./BugHuntExpansion.css";

export function levelFromXp(xp = 0) {

   return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);

}

function xpFloor(level) {

   return Math.pow(Math.max(0, level - 1), 2) * 100;

}

function xpCeiling(level) {

   return Math.pow(level, 2) * 100;

}

const DROP_CONFIG = {
   halloween26: {
      id: "halloween-26",
      name: "Halloween '26",
      icon: "🎃",
      endsAt: "2026-11-02T05:00:00Z",
   },
   christmas26: {
      id: "christmas-26",
      name: "Christmas '26",
      icon: "🎄",
      startsAt: "2026-11-20T05:00:00Z",
   },
};

const PROFILE_BADGES = [
   { id: "rank-1", icon: "👑", name: "#1 DEBUGGER", detail: "Reach #1 on the global leaderboard.", test: (p, rank) => rank === 1 },
   { id: "rank-3", icon: "🏆", name: "PODIUM", detail: "Reach the global top 3.", test: (p, rank) => rank > 0 && rank <= 3 },
   { id: "rank-5", icon: "⚡", name: "TOP 5", detail: "Reach the global top 5.", test: (p, rank) => rank > 0 && rank <= 5 },
   { id: "first-fix", icon: "🐛", name: "FIRST FIX", detail: "Fix your first bug.", test: (p) => p.bugs_fixed >= 1 },
   { id: "ten-bugs", icon: "🔧", name: "BUG HUNTER", detail: "Fix 10 bugs.", test: (p) => p.bugs_fixed >= 10 },
   { id: "fifty-bugs", icon: "🧠", name: "BUG CRUSHER", detail: "Fix 50 bugs.", test: (p) => p.bugs_fixed >= 50 },
   { id: "hundred-bugs", icon: "💯", name: "CENTURY", detail: "Fix 100 bugs.", test: (p) => p.bugs_fixed >= 100 },
   { id: "first-win", icon: "🥇", name: "FIRST BLOOD", detail: "Win your first multiplayer match.", test: (p) => p.wins >= 1 },
   { id: "ten-wins", icon: "⚔️", name: "10-WIN CLUB", detail: "Win 10 matches.", test: (p) => p.wins >= 10 },
   { id: "twenty-five-wins", icon: "👑", name: "DEBUG ROYALTY", detail: "Win 25 matches.", test: (p) => p.wins >= 25 },
   { id: "streak-3", icon: "🔥", name: "ON FIRE", detail: "Reach a 3-fix streak.", test: (p) => p.best_streak >= 3 },
   { id: "streak-5", icon: "🌶️", name: "HOT STREAK", detail: "Reach a 5-fix streak.", test: (p) => p.best_streak >= 5 },
   { id: "streak-10", icon: "🌋", name: "STREAK MASTER", detail: "Reach a 10-fix streak.", test: (p) => p.best_streak >= 10 },
   { id: "level-5", icon: "◆", name: "DEBUGGER V", detail: "Reach level 5.", test: (p) => levelFromXp(p.xp) >= 5 },
   { id: "level-10", icon: "💠", name: "CODE BREAKER", detail: "Reach level 10.", test: (p) => levelFromXp(p.xp) >= 10 },
   { id: "level-20", icon: "🌟", name: "ELITE HUNTER", detail: "Reach level 20.", test: (p) => levelFromXp(p.xp) >= 20 },
   { id: "fifty-games", icon: "🎮", name: "GRINDER", detail: "Play 50 matches.", test: (p) => p.games_played >= 50 },
   { id: "score-10k", icon: "🚀", name: "10K CLUB", detail: "Earn 10,000 total score.", test: (p) => p.total_score >= 10000 },
];

function earnedBadges(profile, leaderboardRank = 0) {
   if (!profile) return [];
   return PROFILE_BADGES.filter((badge) => badge.test(profile, leaderboardRank));
}

function ProfileBadge({ badgeId, compact = false }) {
   const badge = PROFILE_BADGES.find((item) => item.id === badgeId);
   if (!badge) return null;
   return <span className={`profile-badge-chip ${compact ? "compact" : ""}`} title={badge.detail}><b>{badge.icon}</b>{!compact && <span>{badge.name}</span>}</span>;
}

const AVATAR_ICONS = {
   default: "👩‍💻", caterpillar: "🐛", robot: "🤖", wizard: "🧙", astronaut: "🧑‍🚀", ghost: "👾", crown: "👑", dragon: "🐉",
   ninja: "🥷", alien: "👽", detective: "🕵️", scientist: "🧑‍🔬", fox: "🦊", frog: "🐸", cat: "🐱", owl: "🦉",
   vampire: "🧛", witch: "🧙‍♀️", pumpkin: "🎃", skeleton: "💀", mummy: "🧟", "halloween-master": "🏆", custom: "✨",
   santa: "🎅", elf: "🧝", snowman: "⛄",
};

function formatCountdown(target) {
   const ms = Math.max(0, new Date(target).getTime() - Date.now());
   const days = Math.floor(ms / 86400000);
   const hours = Math.floor((ms % 86400000) / 3600000);
   const minutes = Math.floor((ms % 3600000) / 60000);
   return `${days}d ${hours}h ${minutes}m`;
}

function isLiveCosmetic(item) {
   const now = Date.now();
   const starts = item.available_from ? new Date(item.available_from).getTime() : null;
   const ends = item.available_until ? new Date(item.available_until).getTime() : null;
   return (!starts || now >= starts) && (!ends || now < ends);
}

export default function BugHuntExpansion({

   onBack,

   onQuickMatch,

   onCreateMode,

   initialTab = "play",
   scrollToHalloween = false,

   onEquippedChange = () => {},

}) {

   const [session, setSession] = useState(null);

   const [profile, setProfile] = useState(null);

   const [tab, setTab] = useState(initialTab);

   const [busy, setBusy] = useState(false);

   const [message, setMessage] = useState("");

   const [leaderboard, setLeaderboard] = useState([]);

   const [cosmetics, setCosmetics] = useState([]);

   const [owned, setOwned] = useState([]);

   const [equipped, setEquipped] = useState(null);

   const [matchHistory, setMatchHistory] = useState([]);

   const [achievementClaims, setAchievementClaims] = useState([]);

   const [achievementShopStats, setAchievementShopStats] = useState({

      purchased: 0,

      backgrounds: 0,

      cursors: 0,

      avatars: 0,

      totalBackgrounds: 0,

      totalCursors: 0,

      totalAvatars: 0,

      totalPaid: 0,

   });

   useEffect(() => {

      let mounted = true;

      supabase.auth.getSession().then(({ data }) => {

         if (mounted) setSession(data.session ?? null);

      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {

         setSession(nextSession ?? null);

      });

      return () => {

         mounted = false;

         listener.subscription.unsubscribe();

      };

   }, []);

   useEffect(() => {

      if (!session?.user?.id) {

         setProfile(null);

         setOwned([]);

         setEquipped(null);

         return;

      }

      loadProfile(session.user);

      loadEquipped(session.user.id);

   }, [session?.user?.id]);

   useEffect(() => {

      if (tab === "leaderboard") loadLeaderboard();

      if (tab === "shop") loadShop();

      if (tab === "account" && session?.user?.id) {

         loadProfile(session.user);
         loadLeaderboard();

         loadMatchHistory(session.user.id);

         loadAchievementData(session.user.id);

      }

   }, [tab, session?.user?.id]);

   useEffect(() => {

      setTab(initialTab);

   }, [initialTab]);

   useEffect(() => {
      if (!session?.user) return;
      const refresh = () => loadProfile(session.user);
      window.addEventListener("bughunt-profile-refresh", refresh);
      return () => window.removeEventListener("bughunt-profile-refresh", refresh);
   }, [session?.user?.id]);

   async function loadProfile(user) {

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

      if (error) {

         setMessage("Run the Bug Hunt expansion SQL migration first.");

         return;

      }

      if (data) {

         setProfile(data);

         return;

      }

      const fallback = (user.user_metadata?.display_name || user.email?.split("@")[0] || "Debugger").slice(0, 18);

      const { data: created, error: createError } = await supabase

         .from("profiles")

         .insert({ id: user.id, display_name: fallback })

         .select()

         .single();

      if (createError) setMessage(createError.message);

      else setProfile(created);

   }

   async function loadEquipped(userId) {

      const { data, error } = await supabase

         .from("equipped_cosmetics")

         .select("*")

         .eq("user_id", userId)

         .maybeSingle();

      if (error) {

         console.error("Couldn't restore equipped cosmetics:", error);

         return;

      }

      const restored = data ?? null;

      setEquipped(restored);

      onEquippedChange(restored);

   }

   async function loadLeaderboard() {

      const { data, error } = await supabase

         .from("profiles")

         .select("id,display_name,xp,wins,games_played,bugs_fixed,best_streak,total_score,equipped_badge")

         .order("xp", { ascending: false })

         .order("wins", { ascending: false })

         .limit(50);

      if (error) {

         setMessage(error.message);

      } else {

         const rows = data ?? [];

         if (!rows.length) {

            setLeaderboard([]);

            return;

         }

         const { data: equippedRows } = await supabase

            .from("equipped_cosmetics")

            .select("user_id,avatar_id")

            .in("user_id", rows.map((row) => row.id));

         const avatarByUser = Object.fromEntries(

            (equippedRows ?? []).map((row) => [row.user_id, row.avatar_id])

         );

         setLeaderboard(rows.map((row) => ({

            ...row,

            avatar_id: avatarByUser[row.id] ?? null,

         })));

      }

   }

   async function loadMatchHistory(userId) {

      const { data, error } = await supabase

         .from("match_history")

         .select("*")

         .eq("user_id", userId)

         .order("created_at", { ascending: false })

         .limit(5);

      if (error) {

         console.error("Couldn't load match history:", error);

         setMatchHistory([]);

      } else {

         setMatchHistory(data ?? []);

      }

   }

   async function loadAchievementData(userId) {

      const [itemsResult, ownedResult, claimsResult] = await Promise.all([

         supabase.from("cosmetics").select("id,category,price,collection").eq("active", true),

         supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", userId),

         supabase.from("achievement_claims").select("achievement_id").eq("user_id", userId),

      ]);

      if (itemsResult.error || ownedResult.error || claimsResult.error) {

         console.error("Couldn't load achievement progress:", itemsResult.error || ownedResult.error || claimsResult.error);

         return;

      }

      const items = itemsResult.data ?? [];

      const paidItems = items.filter((item) => Number(item.price ?? 0) > 0 && (item.collection ?? "permanent") === "permanent");

      const ownedIds = new Set((ownedResult.data ?? []).map((row) => row.cosmetic_id));

      const ownedPaid = paidItems.filter((item) => ownedIds.has(item.id));

      setAchievementShopStats({

         purchased: ownedPaid.length,

         backgrounds: ownedPaid.filter((item) => item.category === "background").length,

         cursors: ownedPaid.filter((item) => item.category === "cursor").length,

         avatars: ownedPaid.filter((item) => item.category === "avatar").length,

         totalBackgrounds: paidItems.filter((item) => item.category === "background").length,

         totalCursors: paidItems.filter((item) => item.category === "cursor").length,

         totalAvatars: paidItems.filter((item) => item.category === "avatar").length,

         totalPaid: paidItems.length,
         halloweenOwned: items.filter((item) => item.collection === DROP_CONFIG.halloween26.id && item.id !== "avatar-halloween-master" && ownedIds.has(item.id)).length,
         halloweenTotal: items.filter((item) => item.collection === DROP_CONFIG.halloween26.id && item.id !== "avatar-halloween-master").length,

      });

      setAchievementClaims((claimsResult.data ?? []).map((row) => row.achievement_id));

   }

   async function claimAchievement(achievementId) {

      if (!session?.user?.id || busy) return;

      setBusy(true);

      setMessage("");

      const { data, error } = await supabase.rpc("claim_achievement_reward", {

         p_achievement_id: achievementId,

      });

      if (error) {

         setMessage(error.message);

      } else {

         const result = Array.isArray(data) ? data[0] : data;

         await Promise.all([

            loadProfile(session.user),

            loadAchievementData(session.user.id),

         ]);

         setMessage(`Achievement claimed! +${result?.reward ?? 0} Bug Points 🪙`);

      }

      setBusy(false);

   }

   async function loadShop() {

      const [{ data: items }, ownedResult, equippedResult] = await Promise.all([

         supabase.from("cosmetics").select("*").eq("active", true).order("sort_order"),

         session?.user?.id ? supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", session.user.id) : Promise.resolve({ data: [] }),

         session?.user?.id ? supabase.from("equipped_cosmetics").select("*").eq("user_id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),

      ]);

      setCosmetics(items ?? []);

      setOwned((ownedResult.data ?? []).map((row) => row.cosmetic_id));

      setEquipped(equippedResult.data ?? null);

   }

   async function buy(item) {

      if (!session) {

         setMessage("Create an account to keep cosmetics and Bug Points.");

         setTab("account");

         return;

      }

      setBusy(true);

      setMessage("");

      const { data, error } = await supabase.rpc("buy_cosmetic", { p_cosmetic_id: item.id });

      if (error) setMessage(error.message);

      else {

         const nextProfile = Array.isArray(data) ? data[0] : data;

         if (nextProfile) setProfile(nextProfile);

         await loadShop();

         setMessage(`${item.name} unlocked.`);

      }

      setBusy(false);

   }

   async function equip(item) {

      if (!session) return;

      const nextEquipped = {

         user_id: session.user.id,

         background_id: equipped?.background_id ?? null,

         cursor_id: equipped?.cursor_id ?? null,

         avatar_id: equipped?.avatar_id ?? null,

      };

      if (item.category === "background") nextEquipped.background_id = item.id;

      if (item.category === "cursor") nextEquipped.cursor_id = item.id;

      if (item.category === "avatar") nextEquipped.avatar_id = item.id;

      setEquipped(nextEquipped);

      onEquippedChange(nextEquipped);

      const { data, error } = await supabase

         .from("equipped_cosmetics")

         .upsert(nextEquipped, { onConflict: "user_id" })

         .select("user_id,background_id,cursor_id,avatar_id")

         .single();

      if (error) {

         setMessage(error.message);

         await loadEquipped(session.user.id);

         return;

      }

      setEquipped(data);

      onEquippedChange(data);

      if (tab === "leaderboard") await loadLeaderboard();

      setMessage(`${item.name} equipped.`);

   }

   async function unequip(item) {

      if (!session) return;

      const nextEquipped = {

         user_id: session.user.id,

         background_id: equipped?.background_id ?? null,

         cursor_id: equipped?.cursor_id ?? null,

         avatar_id: equipped?.avatar_id ?? null,

      };

      if (item.category === "background") nextEquipped.background_id = null;

      if (item.category === "cursor") nextEquipped.cursor_id = null;

      if (item.category === "avatar") nextEquipped.avatar_id = null;

      setEquipped(nextEquipped);

      onEquippedChange(nextEquipped);

      const { data, error } = await supabase

         .from("equipped_cosmetics")

         .upsert(nextEquipped, { onConflict: "user_id" })

         .select("user_id,background_id,cursor_id,avatar_id")

         .single();

      if (error) {

         setMessage(error.message);

         await loadEquipped(session.user.id);

         return;

      }

      setEquipped(data);

      onEquippedChange(data);

      if (tab === "leaderboard") await loadLeaderboard();

      setMessage(`${item.name} unequipped.`);

   }

   async function claimCollectionReward(collectionId) {
      if (!session?.user?.id || busy) return;
      setBusy(true);
      setMessage("");
      const { error } = await supabase.rpc("claim_collection_reward", { p_collection_id: collectionId });
      if (error) setMessage(error.message);
      else {
         await Promise.all([loadShop(), loadAchievementData(session.user.id)]);
         setMessage("Halloween '26 complete! Exclusive Collection Master avatar unlocked. 🏆");
      }
      setBusy(false);
   }

   async function saveCustomAvatarEmoji(emoji) {
      if (!session?.user?.id) return;
      const value = Array.from(emoji.trim()).slice(0, 8).join("");
      if (!value) return;
      const { data, error } = await supabase.from("profiles").update({ custom_avatar_emoji: value }).eq("id", session.user.id).select().single();
      if (error) {
         setMessage(error.message);
         return;
      }
      setProfile(data);
      onEquippedChange({ ...(equipped ?? {}), custom_avatar_emoji: value });
      setMessage(`Custom Debugger updated to ${value}`);
   }

   async function equipProfileBadge(badgeId) {
      if (!session?.user?.id || !profile) return;
      const rank = leaderboard.findIndex((row) => row.id === session.user.id) + 1;
      const allowed = earnedBadges(profile, rank).some((badge) => badge.id === badgeId);
      if (!allowed) {
         setMessage("That badge is still locked.");
         return;
      }
      const { data, error } = await supabase.from("profiles").update({ equipped_badge: badgeId }).eq("id", session.user.id).select().single();
      if (error) setMessage(error.message);
      else { setProfile(data); setMessage("Profile badge equipped."); }
   }

   async function claimWelcomeBonus(code) {
      if (!session?.user?.id || busy) return;
      setBusy(true);
      setMessage("");
      const { data, error } = await supabase.rpc("claim_welcome_bonus", { p_code: code });
      if (error) setMessage(error.message);
      else {
         await loadProfile(session.user);
         setMessage(`Welcome bonus claimed! +${Number(data ?? 1000)} Bug Points 🪙`);
      }
      setBusy(false);
   }

   async function signOut() {

      await supabase.auth.signOut();

      setEquipped(null);

      onEquippedChange(null);

      setMessage("Signed out. Guest play is still available.");

   }

   const level = levelFromXp(profile?.xp ?? 0);

   const floor = xpFloor(level);

   const ceiling = xpCeiling(level);

   const progress = profile ? ((profile.xp - floor) / Math.max(1, ceiling - floor)) * 100 : 0;

   return (

      <main className="app expansion-app">

         <nav className="expansion-nav">

            <button className="back-button" onClick={onBack}>← Home</button>

            <button type="button" className="expansion-brand bh-expansion-home-logo" onClick={onBack} aria-label="BugHunt home">🐛 BUG<span>HUNT</span> <small>ARENA</small></button>

            <div className="account-pill account-pill-with-avatar">

               {profile ? (

                  <>

                     <AvatarBadge

                        avatarId={equipped?.avatar_id}

                        fallback={profile.display_name.charAt(0).toUpperCase()}

                        customEmoji={profile.custom_avatar_emoji}

                     />

                     <span>LVL {level} · 🪙 {profile.bug_points}</span>
                     {profile.equipped_badge && <ProfileBadge badgeId={profile.equipped_badge} compact />}

                  </>

               ) : "GUEST"}

            </div>

         </nav>

         <section className="expansion-shell">

            <div className="expansion-tabs">

               {[["play","Play"],["leaderboard","Leaderboard"],["shop","Shop"],["account",profile ? "Profile" : "Sign In"]].map(([key,label]) => (

                  <button key={key} className={tab === key ? "active" : ""} onClick={() => { setMessage(""); setTab(key); }}>{label}</button>

               ))}

            </div>

            {message && <div className="expansion-message">{message}</div>}

            {tab === "play" && (

               <PlayPanel profile={profile} onQuickMatch={onQuickMatch} onCreateMode={onCreateMode} onNeedAccount={() => setTab("account")} />

            )}

            {tab === "leaderboard" && <Leaderboard rows={leaderboard} currentId={session?.user?.id} currentAvatarId={equipped?.avatar_id} />}

            {tab === "shop" && (

               <Shop scrollToHalloween={scrollToHalloween} items={cosmetics} owned={owned} equipped={equipped} profile={profile} busy={busy} onBuy={buy} onEquip={equip} onUnequip={unequip} onClaimCollection={claimCollectionReward} onCustomEmojiChange={saveCustomAvatarEmoji} />

            )}

            {tab === "account" && (

               profile

                  ? <ProfilePanel profile={profile} equipped={equipped} level={level} progress={progress} floor={floor} ceiling={ceiling} matchHistory={matchHistory} achievementClaims={achievementClaims} shopStats={achievementShopStats} busy={busy} leaderboardRank={leaderboard.findIndex((row) => row.id === session?.user?.id) + 1} onClaim={claimAchievement} onEquipBadge={equipProfileBadge} onClaimWelcome={claimWelcomeBonus} onSignOut={signOut} />

                  : <AuthPanel onMessage={setMessage} />

            )}

         </section>

      </main>

   );

}

function PlayPanel({ profile, onQuickMatch, onCreateMode, onNeedAccount }) {

   const [language, setLanguage] = useState("C++");

   const [difficulty, setDifficulty] = useState("Beginner");

   const level = levelFromXp(profile?.xp ?? 0);

   return (

      <div className="mode-layout">

         <div className="mode-hero">

            <p className="eyebrow">// CHOOSE YOUR ARENA</p>

            <h1>DEBUG YOUR WAY<br/><span>TO THE TOP.</span></h1>

            <p>Classic rooms remain available on the home screen. Arena adds progression, ranked discovery, and cosmetics.</p>

         </div>

         <div className="mode-grid">

            <ModeCard icon="⚡" title="Quick Match" tag="ONLINE" text="Find another debugger near your level and jump into a live room." action={profile ? "Find Match" : "Sign In to Match"} onClick={() => profile ? onQuickMatch({ language, difficulty, level, displayName: profile.display_name }) : onNeedAccount()} featured />

            <ModeCard icon="🏁" title="Race" tag="SPEED" text="First correct fix instantly wins the round. Five rapid-fire rounds decide the race." action="Create from Home" onClick={() => onCreateMode?.("race")} />

            <ModeCard icon="⏱" title="Timed" tag="PRESSURE" text="One shared 90-second clock. Solve as many bugs as possible before time runs out." action="Create from Home" onClick={() => onCreateMode?.("timed")} />

         </div>

         <div className="match-preferences">

            <label>Language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option>C++</option><option>Python</option><option>JavaScript</option></select></label>

            <label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>

         </div>

      </div>

   );

}

function ModeCard({ icon,title,tag,text,action,onClick,featured=false }) {
   const slug = title.toLowerCase().replace(/\s+/g, "-");
   return <article className={`mode-card mode-card-${slug} ${featured ? "featured" : ""}`}>
      <div className={`mode-visual mode-visual-${slug}`} aria-hidden="true">
         {slug === "quick-match" && <><span className="duel-player duel-left">DEV</span><i>VS</i><span className="duel-player duel-right">DEV</span><b className="energy-line"></b></>}
         {slug === "race" && <><span className="race-bug">🐛</span><b className="race-track"></b><i className="finish-flag">🏁</i></>}
         {slug === "timed" && <><span className="timer-ring"><b>00:90</b></span><i className="timer-pulse"></i></>}
      </div>
      <div className="mode-icon">{icon}</div><span className="mode-tag">{tag}</span><h2>{title}</h2><p>{text}</p><button

         className={`primary-button full-button arena-mode-button arena-mode-${title.toLowerCase().replace(/\s+/g, "-")}`}

         onClick={onClick}

      >
         {action} <span className="mode-action-arrow">→</span>
      </button>
   </article>;

}

function AvatarBadge({ avatarId, fallback = "D", customEmoji = "✨", large = false }) {
   const styleName = avatarId ? avatarId.replace("avatar-", "") : "default";
   const icon = styleName === "custom" ? (customEmoji || "✨") : (AVATAR_ICONS[styleName] ?? fallback);
   return (
      <span className={`avatar-badge avatar-${styleName} ${large ? "avatar-large" : ""}`}>
         {icon}
      </span>
   );
}

function Leaderboard({ rows, currentId, currentAvatarId }) {

   return (

      <div>

         <p className="eyebrow">// GLOBAL RANKINGS</p>

         <h2 className="expansion-title">Top Debuggers</h2>

         <div className="leaderboard-table">

            {rows.length === 0 && <p className="empty-state">No ranked accounts yet.</p>}

            {rows.map((row, index) => {

               const isCurrentUser = row.id === currentId;

               const avatarId = isCurrentUser

                  ? currentAvatarId ?? row.avatar_id

                  : row.avatar_id;

               return (

                  <div className={`leaderboard-line ${isCurrentUser ? "you" : ""}`} key={row.id}>

                     <b className="leader-rank">#{index + 1}</b>

                     <AvatarBadge

                        avatarId={avatarId}

                        fallback={row.display_name.charAt(0).toUpperCase()}

                     />

                     <span className="leader-name">

                        {row.display_name}{isCurrentUser ? " (You)" : ""}
                        {row.equipped_badge && <ProfileBadge badgeId={row.equipped_badge} compact />}
                     </span>

                     <span className="leader-level">LVL {levelFromXp(row.xp)}</span>

                     <span className="leader-wins">{row.wins} W</span>

                     <strong className="leader-xp">{row.xp} XP</strong>

                  </div>

               );

            })}

         </div>

      </div>

   );

}

function Shop({ scrollToHalloween = false, items, owned, equipped, profile, busy, onBuy, onEquip, onUnequip, onClaimCollection, onCustomEmojiChange }) {
   const halloweenSectionRef = useRef(null);
   const [teeOwned, setTeeOwned] = useState(false);
   const [teeBusy, setTeeBusy] = useState(false);
   const [teeMessage, setTeeMessage] = useState("");
   const [teeLook, setTeeLook] = useState(DEFAULT_LOOK);
   const [costumeOwned, setCostumeOwned] = useState([]);
   const [costumeBusy, setCostumeBusy] = useState(false);
   const [costumeMessage, setCostumeMessage] = useState("");
   useEffect(() => {
      if (!profile?.id) { setCostumeOwned([]); return; }
      let live = true;
      supabase.from("bughunt_costume_ownership").select("costume_id").eq("user_id", profile.id).then(({ data }) => { if (live) setCostumeOwned((data || []).map(item => item.costume_id)); });
      return () => { live = false; };
   }, [profile?.id]);
   async function buyCostume(costume) {
      if (!profile?.id || costumeBusy || costumeOwned.includes(costume.id)) return;
      setCostumeBusy(true); setCostumeMessage("");
      const { error } = await supabase.rpc("bughunt_buy_costume", { p_costume_id: costume.id });
      if (error) setCostumeMessage(error.message);
      else {
         setCostumeOwned(old => [...old, costume.id]);
         setCostumeMessage(`${costume.name} unlocked! Equip it in Profile → Wardrobe.`);
         window.dispatchEvent(new Event("bughunt-costume-purchased"));
         window.dispatchEvent(new Event("bughunt-profile-refresh"));
      }
      setCostumeBusy(false);
   }
   useEffect(() => {
      if (!profile?.id) { setTeeOwned(false); return; }
      let active = true;
      supabase.from("character_clothing_owned").select("item_id").eq("user_id", profile.id).eq("item_id", CLASSIC_TEE_ID).maybeSingle().then(({ data }) => { if (active) setTeeOwned(Boolean(data)); });
      supabase.from("debugger_characters").select("look").eq("user_id", profile.id).maybeSingle().then(({ data }) => { if (active && data?.look) setTeeLook({ ...DEFAULT_LOOK, ...data.look }); });
      return () => { active = false; };
   }, [profile?.id]);
   async function purchaseTee() {
      if (!profile?.id || teeBusy || teeOwned) return;
      setTeeBusy(true);
      setTeeMessage("");
      const { error } = await supabase.rpc("buy_character_clothing", { p_item_id: CLASSIC_TEE_ID });
      if (error) setTeeMessage(error.message);
      else {
         setTeeOwned(true);
         setTeeMessage("Unlocked! Open Profile → Wardrobe to equip your tee. ❤️🐛");
         window.dispatchEvent(new Event("bughunt-clothing-purchased"));
         window.dispatchEvent(new Event("bughunt-profile-refresh"));
      }
      setTeeBusy(false);
   }
   const [, setClock] = useState(0);
   const [customEmoji, setCustomEmoji] = useState(profile?.custom_avatar_emoji || "✨");
   useEffect(() => {
      const timer = window.setInterval(() => setClock((value) => value + 1), 30000);
      return () => window.clearInterval(timer);
   }, []);
   useEffect(() => setCustomEmoji(profile?.custom_avatar_emoji || "✨"), [profile?.custom_avatar_emoji]);

   const equippedId = (item) => {
      if (item.category === "background") return equipped?.background_id === item.id;
      if (item.category === "avatar") return equipped?.avatar_id === item.id;
      return equipped?.cursor_id === item.id;
   };
   const ownedSet = new Set(owned);
   const permanent = items.filter((item) => (item.collection ?? "permanent") === "permanent");
   const permanentBackgrounds = permanent.filter((item) => item.category === "background");
   const permanentCursors = permanent.filter((item) => item.category === "cursor");
   const permanentAvatars = permanent.filter((item) => item.category === "avatar");
   const halloween = items.filter((item) => item.collection === DROP_CONFIG.halloween26.id && item.id !== "avatar-halloween-master");
   useEffect(() => {
      if (!scrollToHalloween || halloween.length === 0 || !halloweenSectionRef.current) return;
      const frame = window.requestAnimationFrame(() => {
         halloweenSectionRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      });
      return () => window.cancelAnimationFrame(frame);
   }, [scrollToHalloween, halloween.length]);
   const halloweenReward = items.find((item) => item.id === "avatar-halloween-master");
   const christmas = items.filter((item) => item.collection === DROP_CONFIG.christmas26.id);
   const halloweenOwned = halloween.filter((item) => ownedSet.has(item.id)).length;
   const eventCollected = halloweenOwned + costumeOwned.filter(id => COSTUME_CATALOG.some(costume => costume.id === id)).length;
   const eventTotal = halloween.length + COSTUME_CATALOG.length;
   const halloweenComplete = halloween.length > 0 && halloweenOwned === halloween.length;
   const rewardOwned = halloweenReward ? ownedSet.has(halloweenReward.id) : false;
   const halloweenEnded = Date.now() >= new Date(DROP_CONFIG.halloween26.endsAt).getTime();
   const christmasStarted = Date.now() >= new Date(DROP_CONFIG.christmas26.startsAt).getTime();

   const renderItem = (item) => {
      const free = item.price === 0;
      const isOwned = free || owned.includes(item.id);
      const isEquipped = equippedId(item);
      const currentBugPoints = Number(profile?.bug_points ?? 0);
      const itemPrice = Number(item.price ?? 0);
      const canAfford = free || currentBugPoints >= itemPrice;
      const bpShort = Math.max(0, itemPrice - currentBugPoints);
      const unaffordable = !isOwned && !free && !canAfford;
      const live = isLiveCosmetic(item);
      const isLimited = (item.collection ?? "permanent") !== "permanent";
      const lockedByTime = !live && !isOwned;
      return (
         <article className={`shop-item cosmetic-${item.css_value} ${unaffordable ? "shop-item-too-expensive" : ""} ${isLimited ? "limited-cosmetic" : ""}`} key={item.id}>
            {isLimited && <span className="limited-badge">{item.limited_label || "LIMITED '26"}</span>}
            <div className="cosmetic-preview fun-cosmetic-preview">
               {item.category === "cursor"
                  ? <CursorPreview styleName={item.css_value} />
                  : item.category === "avatar"
                     ? <AvatarBadge avatarId={item.id} fallback="D" customEmoji={profile?.custom_avatar_emoji} large />
                     : <BackgroundPreview styleName={item.css_value} />}
            </div>
            <span>{item.category.toUpperCase()}</span>
            <h3>{item.name}</h3>
            <p>{free ? "Starter" : `🪙 ${item.price}`}</p>
            {item.id === "avatar-custom" && isOwned && (
               <div className="custom-debugger-editor">
                  <label>YOUR EMOJI</label>
                  <div><input value={customEmoji} maxLength="8" onChange={(e) => setCustomEmoji(e.target.value)} aria-label="Custom debugger emoji" /><button type="button" disabled={busy || !customEmoji.trim()} onClick={() => onCustomEmojiChange(customEmoji)}>Save</button></div>
               </div>
            )}
            {isEquipped
               ? <button className="unequip-button" onClick={() => onUnequip(item)}>Unequip</button>
               : isOwned
                  ? <button onClick={() => onEquip(item)}>Equip</button>
                  : <button className={unaffordable ? "insufficient-bp-button" : ""} disabled={busy || !canAfford || lockedByTime} onClick={() => onBuy(item)}>{lockedByTime ? "Unavailable" : canAfford ? "Unlock" : `🔒 ${bpShort} BP SHORT`}</button>}
         </article>
      );
   };

   return (
      <div>
         <p className="eyebrow">// COSMETIC LOADOUT</p>
         <div className="shop-title-row"><h2 className="expansion-title">Bug Shop</h2><p className="shop-balance">Balance: <strong>🪙 {profile?.bug_points ?? 0} Bug Points</strong></p></div>
         <section className="bughunt-tee-shop" aria-label="I love BUGHUNT Classic Tee">
            <div className="bughunt-tee-shop__preview"><div className="bughunt-tee-stage"><DebuggerCharacter look={{ ...teeLook, costume: "none", accessory: "none", outfit: CLASSIC_TEE_ID }} /></div></div>
            <div className="bughunt-tee-shop__copy">
               <small>💗 NEW · THE FIRST WARDROBE DROP</small>
               <h3>I ♥ BUGHUNT Classic Tee</h3>
               <p>Classic white souvenir-style tee with a red heart, our little green bug inside, and BUGHUNT spelled together. Wear it on your debugger!</p>
               <p className="tee-price">🪙 250 Bug Points</p>
               <button type="button" disabled={teeBusy || teeOwned || !profile || Number(profile.bug_points ?? 0) < 250} onClick={purchaseTee}>{teeBusy ? "Unlocking…" : teeOwned ? "✓ Owned — Equip in Profile" : !profile ? "Sign in to unlock" : Number(profile.bug_points ?? 0) < 250 ? "Not enough Bug Points" : "Unlock for 250 BP"}</button>
               {teeMessage && <p role="status">{teeMessage}</p>}
            </div>
            <div className="bughunt-tee-shop__detail"><span>FRONT DESIGN · CLOSE UP</span><div className="bughunt-tee-flat"><TeeGraphic /></div><span>IN-GAME PREVIEW</span><DebuggerCharacter look={{ ...teeLook, costume: "none", accessory: "none", outfit: CLASSIC_TEE_ID }} compact /></div>
         </section>

         {halloween.length > 0 && (!halloweenEnded || halloweenOwned > 0 || costumeOwned.length > 0) && (
            <section ref={halloweenSectionRef} className="shop-collection-section limited-drop-section halloween-drop shop-top-drop" style={{ scrollMarginTop: "20px" }}>
               <div className="drop-hero">
                  <div><span className="drop-label">🎃 LIMITED DROP · HALLOWEEN '26</span><h3>Night Shift Collection</h3><p>Once the timer hits zero, unowned pieces disappear from the shop. Anything you own stays yours forever.</p></div>
                  <div className="drop-countdown"><small>{halloweenEnded ? "DROP ENDED" : "ENDS IN"}</small><strong>{halloweenEnded ? "OWNED ITEMS ONLY" : formatCountdown(DROP_CONFIG.halloween26.endsAt)}</strong></div>
               </div>
               <div className="collection-progress"><span style={{width:`${Math.min(100, (eventCollected / Math.max(1, eventTotal)) * 100)}%`}}></span></div>
               <div className="collection-progress-copy"><b>{eventCollected}/{eventTotal} collected</b><span>Includes Night Shift costumes. Collection Master reward follows the original collectible requirements.</span></div>
         <section className="bh-costume-shop" aria-label="Night Shift character costumes">
            <div className="shop-section-heading"><div><span className="shop-kicker">🎃 NIGHT SHIFT '26 · CHARACTER COSTUMES</span><h3>Dress for the night</h3><p>Limited-time costumes. Purchased outfits stay in your wardrobe.</p></div></div>
            <div className="bh-costume-shop-grid">{COSTUME_CATALOG.map(costume => {
               const isOwned = costumeOwned.includes(costume.id);
               return <article className={`bh-costume-shop-item bh-costume-${costume.id}`} key={costume.id}>
                  <div className="bh-costume-shop-preview"><DebuggerCharacter look={{ ...teeLook, costume: costume.id, accessory: costume.id === "princess" ? "tiara" : "none" }} compact /></div>
                  <h4>{costume.name}</h4><p>🪙 {costume.price} BP</p>
                  <button type="button" disabled={costumeBusy || isOwned || halloweenEnded || !profile?.id || Number(profile?.bug_points || 0) < costume.price} onClick={() => buyCostume(costume)}>{isOwned ? "✓ Owned" : halloweenEnded ? "Drop ended" : !profile?.id ? "Sign in to buy" : Number(profile.bug_points || 0) < costume.price ? "Not enough BP" : "Unlock costume"}</button>
               </article>;
            })}</div>
            {costumeMessage && <p role="status">{costumeMessage}</p>}
         </section>
               <div className="shop-grid">{halloween.filter((item) => !halloweenEnded || ownedSet.has(item.id)).map(renderItem)}</div>
               {halloweenComplete && halloweenReward && (
                  <div className={`collection-reward-card ${rewardOwned ? "claimed" : ""}`}>
                     <AvatarBadge avatarId="avatar-halloween-master" large />
                     <div><span>COLLECTION REWARD</span><h4>Halloween '26 Collection Master</h4><p>Exclusive avatar for collecting the complete Night Shift set.</p></div>
                     {rewardOwned ? <b>✓ UNLOCKED</b> : <button disabled={busy} onClick={() => onClaimCollection(DROP_CONFIG.halloween26.id)}>Claim Reward</button>}
                  </div>
               )}
            </section>
         )}

         {!christmasStarted && (
            <section className="next-drop-card">
               <div><span>🎄 NEXT DROP</span><h3>Christmas '26</h3><p>Seasonal avatars, a winter background, and a festive cursor arrive November 20.</p></div>
               <div className="next-drop-countdown"><small>UNLOCKS IN</small><strong>{formatCountdown(DROP_CONFIG.christmas26.startsAt)}</strong></div>
            </section>
         )}

         {christmasStarted && christmas.length > 0 && (
            <section className="shop-collection-section limited-drop-section christmas-drop">
               <div className="shop-section-heading"><div><span className="shop-kicker">🎄 LIMITED DROP</span><h3>Christmas '26</h3></div></div>
               <div className="shop-grid">{christmas.map(renderItem)}</div>
            </section>
         )}

         <section className="shop-collection-section permanent-category-section">
            <div className="shop-section-heading"><div><span className="shop-kicker">ALWAYS AVAILABLE</span><h3>Backgrounds</h3></div><span>{permanentBackgrounds.length} backgrounds</span></div>
            <div className="shop-grid">{permanentBackgrounds.map(renderItem)}</div>
         </section>

         <section className="shop-collection-section permanent-category-section">
            <div className="shop-section-heading"><div><span className="shop-kicker">CUSTOMIZE YOUR POINTER</span><h3>Cursors</h3></div><span>{permanentCursors.length} cursors</span></div>
            <div className="shop-grid">{permanentCursors.map(renderItem)}</div>
         </section>

         <section className="shop-collection-section permanent-category-section">
            <div className="shop-section-heading"><div><span className="shop-kicker">CHOOSE YOUR DEBUGGER</span><h3>Avatars</h3></div><span>{permanentAvatars.length} avatars</span></div>
            <div className="shop-grid">{permanentAvatars.map(renderItem)}</div>
         </section>
      </div>
   );
}

function BackgroundPreview({ styleName }) {

   return <div className={`background-preview background-preview-${styleName}`}><span>&lt;/&gt;</span></div>;

}

function CursorPreview({ styleName }) {

   if (styleName === "bug") {

      return (

         <div className="cursor-preview bug-preview" aria-hidden="true">

            <span className="preview-pointer">↖</span>

            <span className="preview-bug">🐛</span>

         </div>

      );

   }

   if (styleName === "crosshair") {

      return (

         <div className="cursor-preview crosshair-preview" aria-hidden="true">

            <span className="crosshair-ring"></span>

            <span className="crosshair-dot"></span>

         </div>

      );

   }

   if (styleName === "spark") {

      return (

         <div className="cursor-preview spark-preview" aria-hidden="true">

            <span className="spark-pointer">➤</span>

            <span className="spark-star spark-one">✦</span>

            <span className="spark-star spark-two">·</span>

            <span className="spark-star spark-three">✧</span>

         </div>

      );

   }

   if (styleName === "pixel") return <div className="cursor-preview pixel-preview" aria-hidden="true">▰</div>;

   if (styleName === "rainbow") return <div className="cursor-preview rainbow-preview" aria-hidden="true">➤ ✦</div>;

   if (styleName === "mini-caterpillar") return <div className="cursor-preview caterpillar-preview" aria-hidden="true">↖🐛</div>;

   if (styleName === "glitch") return <div className="cursor-preview glitch-preview" aria-hidden="true">⌁</div>;

   if (styleName === "bat") return <div className="cursor-preview seasonal-cursor-preview" aria-hidden="true">↖ 🦇</div>;

   if (styleName === "snowflake") return <div className="cursor-preview seasonal-cursor-preview" aria-hidden="true">↖ ❄️</div>;

   return <div className="cursor-preview default-preview" aria-hidden="true">↖</div>;

}

function ProfilePanel({ profile, equipped, level, progress, floor, ceiling, matchHistory, achievementClaims, shopStats, busy, leaderboardRank, onClaim, onEquipBadge, onClaimWelcome, onSignOut }) {

   const [codeOpen, setCodeOpen] = useState(false);
   const allOf = (owned, total) => total > 0 && owned >= total;

   const achievements = [

      { id: "first-fix", icon: "🐛", name: "First Fix", detail: "Fix your first bug.", reward: 25, unlocked: profile.bugs_fixed >= 1, progress: `${Math.min(profile.bugs_fixed, 1)}/1` },

      { id: "first-victory", icon: "🏆", name: "First Victory", detail: "Win your first match.", reward: 40, unlocked: profile.wins >= 1, progress: `${Math.min(profile.wins, 1)}/1` },

      { id: "hot-streak", icon: "🔥", name: "Hot Streak", detail: "Reach a 3-fix streak.", reward: 40, unlocked: profile.best_streak >= 3, progress: `${Math.min(profile.best_streak, 3)}/3` },

      { id: "ten-wins", icon: "⚡", name: "10-Win Club", detail: "Win 10 matches.", reward: 100, unlocked: profile.wins >= 10, progress: `${Math.min(profile.wins, 10)}/10` },

      { id: "bug-crusher", icon: "🧠", name: "Bug Crusher", detail: "Fix 50 bugs.", reward: 100, unlocked: profile.bugs_fixed >= 50, progress: `${Math.min(profile.bugs_fixed, 50)}/50` },

      { id: "debug-royalty", icon: "👑", name: "Debug Royalty", detail: "Win 25 matches.", reward: 200, unlocked: profile.wins >= 25, progress: `${Math.min(profile.wins, 25)}/25` },

      { id: "century-club", icon: "💯", name: "Century Club", detail: "Fix 100 bugs.", reward: 175, unlocked: profile.bugs_fixed >= 100, progress: `${Math.min(profile.bugs_fixed, 100)}/100` },

      { id: "streak-master", icon: "🌋", name: "Streak Master", detail: "Reach a 10-fix streak.", reward: 150, unlocked: profile.best_streak >= 10, progress: `${Math.min(profile.best_streak, 10)}/10` },

      { id: "first-purchase", icon: "🛍️", name: "First Purchase", detail: "Unlock your first paid cosmetic.", reward: 25, unlocked: shopStats.purchased >= 1, progress: `${Math.min(shopStats.purchased, 1)}/1` },

      { id: "collector-five", icon: "🎒", name: "Collector", detail: "Own 5 paid cosmetics.", reward: 75, unlocked: shopStats.purchased >= 5, progress: `${Math.min(shopStats.purchased, 5)}/5` },

      { id: "background-collector", icon: "🌌", name: "World Builder", detail: "Collect every paid background.", reward: 150, unlocked: allOf(shopStats.backgrounds, shopStats.totalBackgrounds), progress: `${shopStats.backgrounds}/${shopStats.totalBackgrounds}` },

      { id: "cursor-collector", icon: "🖱️", name: "Pointer Perfect", detail: "Collect every paid cursor.", reward: 150, unlocked: allOf(shopStats.cursors, shopStats.totalCursors), progress: `${shopStats.cursors}/${shopStats.totalCursors}` },

      { id: "avatar-collector", icon: "🎭", name: "Many Faces", detail: "Collect every paid avatar.", reward: 150, unlocked: allOf(shopStats.avatars, shopStats.totalAvatars), progress: `${shopStats.avatars}/${shopStats.totalAvatars}` },

      { id: "shop-completionist", icon: "💎", name: "Bug Shop Completionist", detail: "Own every paid cosmetic in the Shop.", reward: 500, unlocked: allOf(shopStats.purchased, shopStats.totalPaid), progress: `${shopStats.purchased}/${shopStats.totalPaid}` },

      { id: "halloween-26-completionist", icon: "🎃", name: "Night Shift Collector", detail: "Collect every item from the Halloween '26 Night Shift drop.", reward: 250, unlocked: allOf(shopStats.halloweenOwned ?? 0, shopStats.halloweenTotal ?? 0), progress: `${shopStats.halloweenOwned ?? 0}/${shopStats.halloweenTotal ?? 0}` },

   ];

   const claimable = achievements.filter((item) => item.unlocked && !achievementClaims.includes(item.id)).length;

   return (

      <div className="bh-profile-page">
         <div className="bh-profile-top">
         <p className="eyebrow">// DEVELOPER PROFILE</p>

         <div className="profile-header">

            <div className="profile-avatar"><AvatarBadge avatarId={equipped?.avatar_id} fallback={profile.display_name.charAt(0).toUpperCase()} customEmoji={profile.custom_avatar_emoji} large /></div>

            <div><h2>{profile.display_name}</h2><span>LEVEL {level}</span>{profile.equipped_badge && <ProfileBadge badgeId={profile.equipped_badge} />}</div>

         </div>

         <div className="xp-track"><span style={{width:`${Math.min(100,Math.max(0,progress))}%`}}></span></div>

         <p className="xp-copy">{profile.xp-floor} / {ceiling-floor} XP to next level</p>

         </div>
         <div className="bh-profile-with-friends">
            <aside className="bh-profile-friends-sidebar" aria-label="Friends and friend requests">
               <BugHuntFriends userId={profile.id} />
            </aside>
            <div className="bh-profile-main">
         {!profile.welcome_bonus_claimed && <div className="bh-welcome-reminder" role="status"><div><strong>🎁 Your 1,000 BP welcome gift is waiting!</strong><p>After verifying your email, redeem <b>WELCOME1000</b> to collect your Bug Points.</p></div><button type="button" onClick={() => setCodeOpen(true)}>Claim 1,000 BP →</button></div>}
         <CharacterWardrobe userId={profile.id} />
         {codeOpen && <div className="bh-code-overlay" onClick={() => setCodeOpen(false)}><div onClick={event => event.stopPropagation()}><WelcomeClaimCard busy={busy} welcomeClaimed={Boolean(profile.welcome_bonus_claimed)} onClaim={onClaimWelcome} onClose={() => setCodeOpen(false)} /></div></div>}

         <div className="profile-stats">

            <Stat label="Wins" value={profile.wins}/>

            <Stat label="Games" value={profile.games_played}/>

            <Stat label="Bugs Fixed" value={profile.bugs_fixed}/>

            <Stat label="Best Streak" value={profile.best_streak}/>

            <Stat label="Total Score" value={profile.total_score}/>

            <Stat label="Bug Points" value={`🪙 ${profile.bug_points}`}/>

         </div>


         <section className="profile-section badge-wardrobe-section">
            <div className="profile-section-heading">
               <div><p className="eyebrow">// BADGE WARDROBE</p><strong>Wear your flex in matches.</strong></div>
               <span>{earnedBadges(profile, leaderboardRank).length}/{PROFILE_BADGES.length} earned</span>
            </div>
            <div className="badge-wardrobe-grid">
               {PROFILE_BADGES.map((badge) => {
                  const unlocked = badge.test(profile, leaderboardRank);
                  const equippedNow = profile.equipped_badge === badge.id;
                  return <button type="button" key={badge.id} disabled={!unlocked || busy} className={`badge-wardrobe-card ${unlocked ? "unlocked" : "locked"} ${equippedNow ? "equipped" : ""}`} onClick={() => onEquipBadge(badge.id)}>
                     <span>{unlocked ? badge.icon : "🔒"}</span><strong>{badge.name}</strong><small>{badge.detail}</small><b>{equippedNow ? "✓ EQUIPPED" : unlocked ? "EQUIP" : "LOCKED"}</b>
                  </button>;
               })}
            </div>
         </section>



         <section className="profile-section">

            <div className="profile-section-heading">

               <div><p className="eyebrow">// ACHIEVEMENTS</p>{claimable > 0 && <strong className="claims-waiting">🪙 {claimable} reward{claimable === 1 ? "" : "s"} ready to claim</strong>}</div>

               <span>{achievements.filter((item) => item.unlocked).length}/{achievements.length} unlocked</span>

            </div>

            <div className="achievement-grid achievement-reward-grid">

               {achievements.map((item) => {

                  const claimed = achievementClaims.includes(item.id);

                  return (

                     <article className={`achievement-card ${item.unlocked ? "unlocked" : "locked"} ${claimed ? "claimed" : ""}`} key={item.id}>

                        <span>{item.unlocked ? item.icon : "🔒"}</span>

                        <div className="achievement-copy">

                           <strong>{item.name}</strong>

                           <small>{item.detail}</small>

                           <div className="achievement-meta"><span>{item.progress}</span><b>🪙 {item.reward}</b></div>

                        </div>

                        {item.unlocked && !claimed && <button className="achievement-claim-button" disabled={busy} onClick={() => onClaim(item.id)}>Claim</button>}

                        {claimed && <span className="achievement-claimed-label">✓ Claimed</span>}

                     </article>

                  );

               })}

            </div>

         </section>

         <section className="profile-section">

            <div className="profile-section-heading"><p className="eyebrow">// RECENT MATCHES</p><span>Last 5</span></div>

            <div className="match-history-list">

               {matchHistory.length === 0 && <p className="empty-state">Play a signed-in multiplayer match to start your history.</p>}

               {matchHistory.map((match) => (

                  <div className="match-history-row" key={match.id}>

                     <span className={match.won ? "history-result win" : "history-result loss"}>{match.won ? "🏆 WIN" : `#${match.placement}`}</span>

                     <div><strong>{String(match.mode || "classic").toUpperCase()} · {match.language}</strong><small>{match.difficulty} · {match.bugs_fixed} bugs fixed</small></div>

                     <b>{match.score} PTS</b>

                  </div>

               ))}

            </div>

         </section>

         <button className="leave-button" onClick={onSignOut}>Sign Out</button>
            </div>
         <aside className="bh-profile-code-sidebar" aria-label="Redeem reward codes"><button type="button" className="bh-code-launch" onClick={() => setCodeOpen(true)}>🎟️ Redeem Code <span>→</span></button></aside>
         </div>
      </div>

   );

}

function WelcomeClaimCard({ busy, welcomeClaimed, onClaim, onClose }) {
   const [code, setCode] = useState("");
   return <section className="welcome-claim-card" role="dialog" aria-modal="true" aria-label="Redeem a BugHunt code"><button type="button" className="bh-code-close" onClick={onClose} aria-label="Close">×</button>
      <div>
         <p className="eyebrow">// REDEEM CODE</p>
         <h3>{welcomeClaimed ? "Got another Bug Hunt code?" : "Claim your 1,000 Bug Points"}</h3>
         <p>{welcomeClaimed ? "The code terminal stays open for future drops, events, and rewards." : <>New debugger? Use <strong>WELCOME1000</strong> after verifying your email.</>}</p>
         {welcomeClaimed && <span className="welcome-code-claimed">✓ WELCOME1000 REDEEMED</span>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); onClaim(code.trim().toUpperCase()); }}>
         <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="ENTER CODE" aria-label="Promo code" autoCapitalize="characters" />
         <button disabled={busy || !code.trim()}>{busy ? "Redeeming..." : "Redeem Code"}</button>
      </form>
   </section>;
}

function Stat({label,value}) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function AuthPanel({ onMessage }) {

   const [mode,setMode] = useState("signin");

   const [email,setEmail] = useState("");

   const [password,setPassword] = useState("");

   const [displayName,setDisplayName] = useState("");

   const [busy,setBusy] = useState(false);

   async function submit(e) {

      e.preventDefault(); setBusy(true); onMessage("");

      if (mode === "signup") {

         if (!displayName.trim()) { onMessage("Choose a display name."); setBusy(false); return; }

         const { error } = await supabase.auth.signUp({ email, password, options:{ emailRedirectTo: window.location.origin, data:{ display_name: displayName.trim().slice(0,18) } } });

         onMessage(error ? error.message : "Account created. If email confirmation is enabled, check your inbox, then sign in.");

      } else {

         const { error } = await supabase.auth.signInWithPassword({ email, password });

         if (error) onMessage(error.message);

      }

      setBusy(false);

   }

   return <div className="auth-layout">
      <aside className="signup-bonus-banner">
         <span className="bonus-coin">🪙</span><p className="eyebrow">// NEW DEBUGGER DROP</p><h3>1,000 BP<br/>ON US.</h3><p>Create your account, verify your email, then redeem your New Debugger Bonus.</p><div className="bonus-code-preview">WELCOME1000</div><small>One welcome bonus per verified account.</small>
      </aside>
      <div className="auth-card"><p className="eyebrow">// SAVE YOUR PROGRESS</p><h2>{mode === "signup" ? "Create Account" : "Welcome Back"}</h2><p>Guests can still use Classic and Solo. An account saves XP, rankings, Bug Points, badges and cosmetics.</p><form onSubmit={submit}>{mode === "signup" && <label>Display Name<input value={displayName} maxLength="18" onChange={(e)=>setDisplayName(e.target.value)} /></label>}<label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></label><label>Password<input type="password" minLength="6" required value={password} onChange={(e)=>setPassword(e.target.value)} /></label><button className="primary-button full-button iridescent-button" disabled={busy}>{busy ? "Working..." : mode === "signup" ? "Create Account + Get 1,000 BP" : "Sign In"}</button></form><button className="auth-switch" onClick={()=>setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New debugger? Create an account"}</button></div>
   </div>;

}

export async function findQuickMatch({ language, difficulty, level, displayName }) {

   const { data: { user } } = await supabase.auth.getUser();

   if (!user) throw new Error("Sign in before using Quick Match.");

   await supabase.from("matchmaking_queue").upsert({ user_id:user.id, display_name:displayName, level, language, difficulty, joined_at:new Date().toISOString() });

   const { data: candidates, error } = await supabase.from("matchmaking_queue").select("*").eq("language",language).eq("difficulty",difficulty).neq("user_id",user.id).gte("level",Math.max(1,level-2)).lte("level",level+2).order("joined_at").limit(1);

   if (error) throw error;

   return { user, opponent:candidates?.[0] ?? null };

}
