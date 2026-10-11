import EXTRA_QUESTION_BANKS from "./questionBanks.json";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import BugHuntExpansion, { levelFromXp } from "./BugHuntExpansion";
import "./App.css";
import "./BPButton.css";
import "./CompetitionPolish.css";
import "./GameLobby.css";
import "./BattleRoom.css";
import { DebuggerCharacter, useDebuggerLook, DEFAULT_LOOK } from "./DebuggerCharacter";
// Lightweight vector icons for the lobby; no icon library required.
function LobbyIcon({ name, size = 26, className = "" }) {
   const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", className, "aria-hidden": true };
   const paths = {
      play: <><path d="M8 5.5 19 12 8 18.5V5.5Z"/><path d="M4 5v14"/></>,
      shop: <><path d="M4 9h16l-1.3 11H5.3L4 9Z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/><path d="M9 13v2m6-2v2"/></>,
      create: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 10h8M12 6v8"/><path d="M7 16h10"/></>,
      join: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M4 12h12m-4-4 4 4-4 4"/><path d="M8 4H6a2 2 0 0 0-2 2v2m0 8v2a2 2 0 0 0 2 2h2"/></>,
      arena: <><path d="m7 4 5 3 5-3v7l-5 3-5-3V4Z"/><path d="M12 14v6m-5 0h10"/><path d="m4 9-2 2 3 3m15-5 2 2-3 3"/></>,
      solo: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
      rookie: <><path d="M12 21v-9m0 5c-6 0-9-4-9-10 6 0 9 3 9 8m0-3c0-5 3-8 9-8 0 6-3 10-9 10"/></>,
      arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
      customize: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 17 .8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/></>
   };
   return <svg {...common}>{paths[name] || paths.play}</svg>;
}

function AppContent({ equippedCosmetics, setEquippedCosmetics, globalPointer, setGlobalPointer }) {
   const [screen, setScreen] = useState("home");
   const [playerName, setPlayerName] = useState("");
   const [roomCode, setRoomCode] = useState("");
   const [language, setLanguage] = useState("C++");
   const [difficulty, setDifficulty] = useState("Beginner");
   const [rounds, setRounds] = useState("5");
   const [gameMode, setGameMode] = useState("classic");
   const [currentRoom, setCurrentRoom] = useState(null);
   const [players, setPlayers] = useState([]);
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);
   const [currentPlayer, setCurrentPlayer] = useState(null);
   const [answers, setAnswers] = useState([]);
   const [playerNotice, setPlayerNotice] = useState("");
   const playersRef = useRef([]);
   const [accountUser, setAccountUser] = useState(null);
   const [accountProfile, setAccountProfile] = useState(null);
   const [characterLook] = useDebuggerLook(accountUser?.id);
   const [guestActive, setGuestActive] = useState(false);
   const [guestModal, setGuestModal] = useState(false);
   const [guestLook, setGuestLook] = useState(() => ({ ...DEFAULT_LOOK }));
   const [guestNickname, setGuestNickname] = useState("");
   const [guestStep, setGuestStep] = useState(0);
   const [accountMenuOpen, setAccountMenuOpen] = useState(false);
   const [guestNextScreen, setGuestNextScreen] = useState("home");
   const guestDisplayLook = !accountUser && guestActive ? guestLook : characterLook;
   // Missions only complete from finished gameplay, never from clicking a shortcut.
   const missionDay = () => new Date().toISOString().slice(0, 10);
   const [missionClock, setMissionClock] = useState(() => Date.now());
   const [activeMissionDay, setActiveMissionDay] = useState(missionDay);
   const nextMissionReset = Date.parse(`${activeMissionDay}T00:00:00Z`) + 86400000;
   const missionRemaining = Math.max(0, nextMissionReset - missionClock);
   const missionCountdown = [Math.floor(missionRemaining / 3600000), Math.floor((missionRemaining % 3600000) / 60000), Math.floor((missionRemaining % 60000) / 1000)].map(value => String(value).padStart(2, "0")).join(":");
   const missionStorageKey = `bh-daily-missions-v3:${accountUser?.id || (guestActive ? "guest" : "visitor")}`;
   const [missionProgress, setMissionProgress] = useState({});
   const [missionNotice, setMissionNotice] = useState("");
   const [missionBusy, setMissionBusy] = useState(false);
   const missionClaimLock = useRef(new Set());
   const [topPlayers, setTopPlayers] = useState([]);
   const [leadersLoading, setLeadersLoading] = useState(true);
   const [leadersError, setLeadersError] = useState(false);
   // Matches the Shop's DROP_CONFIG.halloween26.endsAt (absolute UTC instant).
   const NIGHT_SHIFT_END = "2026-11-02T05:00:00Z";
   const [eventTime, setEventTime] = useState(() => Date.now());
   const eventRemaining = Math.max(0, new Date(NIGHT_SHIFT_END).getTime() - eventTime);
   const eventDays = Math.floor(eventRemaining / 86400000);
   const eventHours = Math.floor((eventRemaining % 86400000) / 3600000);
   const eventMinutes = Math.floor((eventRemaining % 3600000) / 60000);
   useEffect(() => {
      try {
         const saved = JSON.parse(localStorage.getItem(missionStorageKey) || "null");
         setMissionProgress(saved?.day === activeMissionDay ? Object.fromEntries(
            Object.entries(saved.progress || {}).map(([key, value]) => [key, {
               ...value, completed: Boolean(value?.completed || value?.claimed || value?.earned !== undefined),
               // Never trust localStorage as evidence that a server paid BP.
               claimed: false, credited: false, serverRecorded: false,
            }])
         ) : {});
      } catch { setMissionProgress({}); }
      missionClaimLock.current.clear();
   }, [missionStorageKey, activeMissionDay]);
   useEffect(() => {
      localStorage.setItem(missionStorageKey, JSON.stringify({ day: activeMissionDay, progress: missionProgress }));
   }, [missionProgress, missionStorageKey, activeMissionDay]);
   // Completing a game unlocks a reward; BP is only granted after an explicit claim.
   function completeMission(key, details = {}) {
      setMissionProgress(old => ({
         ...old,
         [key]: old[key]?.claimed ? old[key] : {
            ...old[key], completed: true, roomId: details.roomId || old[key]?.roomId || null,
         },
      }));
      setMissionNotice("Challenge complete! Press Claim BP to collect your reward.");
   }
   async function refreshMissionProfile() {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", accountUser.id).maybeSingle();
      if (error || !data) throw error || new Error("Couldn't read your BP balance");
      setAccountProfile(data);
      return data;
   }
   // Permanent match_history is the source of truth for completed games.
   // The server RPC independently validates it before awarding any BP.
   async function findVerifiedTeamRoom(preferredRoomId) {
      const { data: history, error: historyError } = await supabase
         .from("match_history")
         .select("room_id, match_key")
         .eq("user_id", accountUser.id)
         .order("id", { ascending: false })
         .limit(100);
      if (historyError) throw historyError;
      const candidates = [...new Set([preferredRoomId, ...(history || []).map(row => row.room_id)].filter(Boolean))];
      if (!candidates.length) return null;
      const dayStart = `${activeMissionDay}T00:00:00Z`;
      const dayEnd = new Date(Date.parse(dayStart) + 86400000).toISOString();
      const { data: rooms, error: roomsError } = await supabase
         .from("rooms").select("id").in("id", candidates)
         .eq("status", "finished")
         .gte("created_at", dayStart).lt("created_at", dayEnd);
      if (roomsError) throw roomsError;
      const eligible = new Set((rooms || []).map(room => room.id));
      const historical = new Set((history || []).map(row => row.room_id));
      return candidates.find(id => eligible.has(id) && historical.has(id)) || null;
   }

   async function claimMission(key) {
      const mission = missionProgress[key];
      if (!mission?.completed || mission.claimed || missionBusy || missionClaimLock.current.has(key)) return;
      if (!accountUser) { setMissionNotice("Sign in to claim BP."); return; }
      missionClaimLock.current.add(key);
      setMissionBusy(true);
      try {
         const verifiedRoomId = key === "team"
            ? await findVerifiedTeamRoom(mission.roomId)
            : null;
         if (key === "team" && !verifiedRoomId) {
            throw new Error("No completed multiplayer match was found in your saved match history for a room created today (UTC).");
         }
         const before = await refreshMissionProfile();
         const { data, error } = await supabase.rpc("claim_daily_mission", {
            p_mission: key, p_room_id: key === "team" ? verifiedRoomId : null,
         });
         if (error) throw error;
         const awarded = Number(data?.awarded_bp ?? 0);
         const after = await refreshMissionProfile();
         const difference = Number(after.bug_points ?? 0) - Number(before.bug_points ?? 0);
         if (awarded > 0 && difference >= awarded) {
            setMissionProgress(old => ({ ...old, [key]: { ...old[key], completed: true, claimed: true, credited: true, serverRecorded: true, earned: awarded } }));
            setMissionNotice(`Success! +${awarded} BP added. Balance: ${Number(after.bug_points).toLocaleString()} BP.`);
         } else {
            // A zero award may mean an earlier auto-claim. Never pretend it paid now.
            setMissionProgress(old => ({ ...old, [key]: { ...old[key], completed: true, claimed: false, credited: false, serverRecorded: awarded === 0 } }));
            setMissionNotice(awarded === 0
               ? "This mission was previously recorded by Supabase, but no BP was awarded by this click. Check your reward history before retrying."
               : `Claim returned ${awarded} BP, but the visible balance changed by ${difference}. Payment isn't verified. Please check Supabase.`);
         }
      } catch (error) {
         setMissionNotice(`Couldn't verify BP payment: ${error.message}`);
      } finally {
         setMissionBusy(false);
         missionClaimLock.current.delete(key);
      }
   }
   async function claimDailyBonus() {
      if (missionBusy || !accountUser || !["rookie", "solo", "team"].every(key => missionProgress[key]?.claimed) || missionProgress.bonus?.claimed) return;
      setMissionBusy(true);
      try {
         const before = await refreshMissionProfile();
         const { data, error } = await supabase.rpc("claim_daily_completion_bonus");
         if (error) throw error;
         const awarded = Number(data?.awarded_bp ?? 0);
         const after = await refreshMissionProfile();
         const difference = Number(after.bug_points ?? 0) - Number(before.bug_points ?? 0);
         if (awarded > 0 && difference >= awarded) {
            setMissionProgress(old => ({ ...old, bonus: { completed: true, claimed: true, credited: true, serverRecorded: true, earned: awarded } }));
            setMissionNotice(`Bonus credited! +${awarded} BP. Balance: ${Number(after.bug_points).toLocaleString()} BP.`);
         } else {
            setMissionNotice(awarded === 0 ? "Bonus already recorded by the server; no BP awarded now." : "Bonus payment wasn't verified in your BP balance. Please check Supabase.");
         }
      } catch (error) {
         setMissionNotice(`Bonus couldn't be verified: ${error.message}`);
      } finally { setMissionBusy(false); }
   }
   function MissionReward({ missionKey, reward }) {
      const state = missionProgress[missionKey];
      return <button type="button" className={`bh-mission-claim ${state?.claimed ? "is-claimed" : ""}`}
         disabled={!state?.completed || Boolean(state?.claimed) || missionBusy}
         onClick={() => claimMission(missionKey)}>
         {state?.claimed ? "✓ Claimed" : state?.serverRecorded ? "↗ Check BP" : state?.completed ? `✦ Claim ${reward} BP` : "🔒 Locked"}
      </button>;
   }
   useEffect(() => {
      const interval = window.setInterval(() => {
         const now = Date.now();
         setEventTime(now);
         setMissionClock(now);
         const today = new Date(now).toISOString().slice(0, 10);
         setActiveMissionDay(previous => previous === today ? previous : today);
      }, 1000);
      return () => window.clearInterval(interval);
   }, []);
   // Refresh server-backed claims on sign-in, including claims from other devices.
   useEffect(() => {
      if (!accountUser?.id) return;
      let active = true;
      supabase.from("daily_mission_claims").select("mission_key,bp_awarded").eq("user_id", accountUser.id).eq("mission_date", missionDay()).then(({ data, error }) => {
         if (!active || error) return;
         setMissionProgress(old => ({ ...old, ...Object.fromEntries((data || []).map(item => [item.mission_key, { completed: true, claimed: Number(item.bp_awarded) > 0, credited: Number(item.bp_awarded) > 0, serverRecorded: true, earned: item.bp_awarded }])) }));
      });
      supabase.from("daily_completion_bonus_claims").select("bp_awarded").eq("user_id", accountUser.id).eq("mission_date", missionDay()).maybeSingle().then(({ data, error }) => {
         if (!active || error || !data) return;
         setMissionProgress(old => ({ ...old, bonus: { completed: true, claimed: Number(data.bp_awarded) > 0, credited: Number(data.bp_awarded) > 0, serverRecorded: true, earned: data.bp_awarded } }));
      });
      return () => { active = false; };
   }, [accountUser?.id, activeMissionDay]);
   useEffect(() => {
      let active = true;
      async function loadTopPlayers() {
         const { data, error } = await supabase.from("profiles")
            .select("id,display_name,xp,wins")
            .order("xp", { ascending: false }).order("wins", { ascending: false }).limit(3);
         if (!active) return;
         setLeadersLoading(false);
         setLeadersError(Boolean(error));
         if (!error) setTopPlayers(data || []);
      }
      loadTopPlayers();
      const interval = window.setInterval(loadTopPlayers, 120000);
      return () => { active = false; window.clearInterval(interval); };
   }, []);

   function startGuest(nextScreen = "home") {
      setGuestNextScreen(nextScreen);
      setGuestNickname("");
      setGuestStep(0);
      setGuestLook({ ...DEFAULT_LOOK });
      setGuestModal(true);
   }
   function finishGuest(event) {
      event.preventDefault();
      const name = guestNickname.trim();
      if (!name) return;
      setPlayerName(name);
      setGuestActive(true);
      setGuestModal(false);
      setScreen(guestNextScreen);
   }
   async function signOutFromLobby() {
      setAccountMenuOpen(false);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) { setError(signOutError.message); return; }
      setGuestActive(false);
      setPlayerName("");
      setScreen("home");
   }
   function inviteFriends() {
      setAccountMenuOpen(false);
      const link = window.location.origin + window.location.pathname;
      if (navigator.share) {
         navigator.share({ title: "Play Bug Hunt with me", url: link }).catch(() => {});
      } else if (navigator.clipboard?.writeText) {
         navigator.clipboard.writeText(link).then(() => window.alert("Game link copied! Share it with your friends.")).catch(() => window.prompt("Copy your game link:", link));
      } else {
         window.prompt("Copy your game link:", link);
      }
   }
   useEffect(() => {
      playersRef.current = players;
   }, [players]);

   const [showTutorial, setShowTutorial] = useState(
      () => window.localStorage.getItem("bughunt-tutorial-seen") !== "1"
   );

   useEffect(() => {
      let active = true;
      async function syncAccount(session) {
         const user = session?.user ?? null;
         if (!active) return;
         setAccountUser(user);
         if (!user) {
            setAccountProfile(null);
            setEquippedCosmetics(null);
            return;
         }
         const { data: equippedData, error: equippedError } = await supabase
            .from("equipped_cosmetics")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
         if (!active) return;
         if (equippedError) {
            console.error("Couldn't load equipped cosmetics:", equippedError);
         } else {
            setEquippedCosmetics(equippedData ?? null);
         }
         const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
         if (!active) return;
         if (profileError) {
            console.error("Couldn't load Bug Hunt profile:", profileError);
            return;
         }
         setAccountProfile(data ?? null);
         if (data?.display_name) {
            setPlayerName(data.display_name);
         }
      }
      supabase.auth.getSession().then(({ data }) => syncAccount(data.session));
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
         syncAccount(session);
      });
      return () => {
         active = false;
         authListener.subscription.unsubscribe();
      };
   }, []);
   function generateRoomCode() {
      const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
         code += characters.charAt(
            Math.floor(Math.random() * characters.length)
         );
      }
      return `BUG-${code}`;
   }
   async function createGame(event) {
      event.preventDefault();
      const effectiveName = accountProfile?.display_name || playerName.trim();
      if (!effectiveName) {
         setError("Enter your name before creating a room.");
         return;
      }
      setLoading(true);
      setError("");
      try {
         const code = generateRoomCode();
         const { data: room, error: roomError } = await supabase
            .from("rooms")
            .insert({
               code: code,
               language: language,
               difficulty: difficulty,
               rounds: Number(rounds),
               status: "waiting",
               game_mode: gameMode,
            })
            .select()
            .single();
         if (roomError) {
            throw roomError;
         }
         const { data: host, error: playerError } = await supabase
            .from("players")
            .insert({
               room_id: room.id,
               name: effectiveName,
               score: 0,
               is_host: true,
               user_id: accountUser?.id ?? null,
            })
            .select()
            .single();
         if (playerError) {
            throw playerError;
         }
         setCurrentRoom(room);
         setCurrentPlayer(host);
         setPlayers([host]);
         setScreen("lobby");
      } catch (err) {
         console.error(err);
         setError("Couldn't create the room. Please try again.");
      } finally {
         setLoading(false);
      }
   }
    async function joinGame(event) {
      event.preventDefault();
      const effectiveName = accountProfile?.display_name || playerName.trim();
      if (!effectiveName) {
          setError("Enter your name before joining a room.");
          return;
      }
      if (!roomCode.trim()) {
          setError("Enter a room code.");
          return;
      }
      setLoading(true);
      setError("");
      try {
          const formattedCode = roomCode.trim().toUpperCase();
          const { data: room, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .eq("code", formattedCode)
            .single();
          if (roomError || !room) {
            setError("Room not found. Check the code and try again.");
            return;
          }
          if (room.status !== "waiting") {
            setError("This game has already started.");
            return;
          }
          const { data: existingPlayers, error: playersError } =
            await supabase
                .from("players")
                .select("*")
                .eq("room_id", room.id);
          if (playersError) {
            throw playersError;
          }
          if (existingPlayers.length >= 4) {
            setError("This room is full.");
            return;
          }
          const duplicateName = existingPlayers.some(
            (player) =>
                player.name.toLowerCase() ===
                effectiveName.toLowerCase()
          );
          if (duplicateName) {
            setError("That name is already being used in this room.");
            return;
          }
          const { data: newPlayer, error: playerError } = await supabase
            .from("players")
            .insert({
                room_id: room.id,
                name: effectiveName,
                score: 0,
                is_host: false,
                user_id: accountUser?.id ?? null,
            })
            .select()
            .single();
          if (playerError) {
            throw playerError;
          }
          setCurrentRoom(room);
          setCurrentPlayer(newPlayer);
          setPlayers([...existingPlayers, newPlayer]);
          setRoomCode(formattedCode);
          setScreen("lobby");
      } catch (err) {
          console.error(err);
          setError("Couldn't join the room. Please try again.");
      } finally {
          setLoading(false);
      }
    }
   async function startGame() {
      if (!currentPlayer?.is_host || !currentRoom || players.length < 2) {
         return;
      }
      setLoading(true);
      setError("");
      try {
         const startedAt = new Date();
         const timedEndsAt = new Date(startedAt.getTime() + 90 * 1000).toISOString();
         // The host reserves unseen questions for this room before anyone begins.
         // Supabase stores the order, so every client sees the exact same questions.
         const questionSequence = reserveQuestionSequence(
            currentRoom.language, currentRoom.difficulty,
            Math.max(Number(currentRoom.rounds) || 5, 5),
            `room-${currentRoom.id}-${startedAt.toISOString()}`
         );
         const { data: updatedRoom, error: roomError } = await supabase
            .from("rooms")
            .update({
               status: "playing",
               phase: "answering",
               current_round: 1,
               question_sequence: questionSequence,
               round_started_at: startedAt.toISOString(),
               mode_ends_at: currentRoom.game_mode === "timed" ? timedEndsAt : null,
            })
            .eq("id", currentRoom.id)
            .select()
            .single();
         if (roomError) {
            throw roomError;
         }
         setCurrentRoom(updatedRoom);
         setAnswers([]);
         setScreen("game");
      } catch (err) {
         console.error("Couldn't start game:", err);
         setError("Couldn't start the game. Please try again.");
      } finally {
         setLoading(false);
      }
   }
   async function leaveRoom() {
      if (!currentRoom) {
         setCurrentPlayer(null);
         setCurrentRoom(null);
         setPlayers([]);
         setRoomCode("");
         setError("");
         setScreen("home");
         return;
      }
      setLoading(true);
      setError("");
      try {
         if (currentPlayer?.id) {
            const { error: deletePlayerError } = await supabase
               .from("players")
               .delete()
               .eq("id", currentPlayer.id)
               .eq("room_id", currentRoom.id);
            if (deletePlayerError) throw deletePlayerError;
         }
         const { data: remaining, error: remainingError } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("created_at", { ascending: true });
         if (remainingError) throw remainingError;
         if (!remaining?.length) {
            const { error: deleteRoomError } = await supabase
               .from("rooms")
               .delete()
               .eq("id", currentRoom.id);
            if (deleteRoomError) throw deleteRoomError;
         } else if (!remaining.some((player) => player.is_host)) {
            const { error: hostUpdateError } = await supabase
               .from("players")
               .update({ is_host: true })
               .eq("id", remaining[0].id);
            if (hostUpdateError) throw hostUpdateError;
         }
         setCurrentPlayer(null);
         setCurrentRoom(null);
         setPlayers([]);
         setAnswers([]);
         setRoomCode("");
         setPlayerName(accountProfile?.display_name ?? (guestActive ? playerName : ""));
         setError("");
         setScreen("home");
      } catch (err) {
         console.error("Couldn't leave room:", err);
         setError("Couldn't leave the room. Please try again.");
      } finally {
         setLoading(false);
      }
   }
   async function quickMatch({ language: matchLanguage, difficulty: matchDifficulty }) {
      setLoading(true);
      setError("");
      try {
         const { data, error: matchError } = await supabase.rpc("bughunt_quick_match", {
            p_language: matchLanguage,
            p_difficulty: matchDifficulty,
         });
         if (matchError) throw matchError;
         const room = data?.room;
         const player = data?.player;
         if (!room?.id || !player?.id) throw new Error("Matchmaking returned an incomplete room.");

         const { data: occupants, error: occupantsError } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", room.id)
            .order("created_at", { ascending: true });
         if (occupantsError) throw occupantsError;

         setPlayerName(player.name);
         setCurrentRoom(room);
         setCurrentPlayer(player);
         setPlayers(occupants ?? [player]);
         setAnswers([]);
         setRoomCode(room.code);
         setScreen("lobby");
      } catch (matchError) {
         console.error("Quick Match failed:", matchError);
         setError(matchError.message || "Couldn't start Quick Match.");
      } finally {
         setLoading(false);
      }
   }

   useEffect(() => {
      if ((screen !== "lobby" && screen !== "game") || !currentRoom?.id) {
         return;
      }
      async function refreshPlayers() {
         const { data, error: playersError } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", currentRoom.id)
            .order("is_host", { ascending: false })
            .order("created_at", { ascending: true });
         if (playersError) {
            console.error("Couldn't refresh players:", playersError);
            return;
         }
         const refreshedPlayers = data ?? [];
         setPlayers(refreshedPlayers);
         setCurrentPlayer((previousPlayer) => {
            if (accountUser?.id) {
               return (
                  refreshedPlayers.find((player) => player.user_id === accountUser.id) ??
                  null
               );
            }
            if (!previousPlayer) return null;
            return refreshedPlayers.find((player) => player.id === previousPlayer.id) ?? null;
         });
      }
      refreshPlayers();
      const channel = supabase
         .channel(`room-${currentRoom.id}-players`)
         .on(
            "postgres_changes",
            {
               event: "*",
               schema: "public",
               table: "players",
               filter: `room_id=eq.${currentRoom.id}`,
            },
            (payload) => {
               if (payload.eventType === "DELETE") {
                  const departed = playersRef.current.find(
                     (player) => player.id === payload.old?.id
                  );
                  if (departed && departed.id !== currentPlayer?.id) {
                     setPlayerNotice(`${departed.name} has left the game`);
                     window.setTimeout(() => setPlayerNotice(""), 3600);
                  }
               }
               refreshPlayers();
            }
         )
         .subscribe();
      return () => {
         supabase.removeChannel(channel);
      };
   }, [screen, currentRoom?.id, accountUser?.id, currentPlayer?.id]);

   useEffect(() => {
      if ((screen !== "lobby" && screen !== "game") || !currentRoom?.id || !currentPlayer?.id) {
         return;
      }
      async function heartbeat() {
         const { error: heartbeatError } = await supabase
            .from("players")
            .update({ last_seen: new Date().toISOString() })
            .eq("id", currentPlayer.id)
            .eq("room_id", currentRoom.id);
         if (heartbeatError) console.error("Presence heartbeat failed:", heartbeatError);
      }
      heartbeat();
      const heartbeatTimer = window.setInterval(heartbeat, 10000);
      return () => window.clearInterval(heartbeatTimer);
   }, [screen, currentRoom?.id, currentPlayer?.id]);

   useEffect(() => {
      if (!currentRoom?.id || (screen !== "lobby" && screen !== "game")) {
         return;
      }
      const roomChannel = supabase
         .channel(`room-${currentRoom.id}-state`)
         .on(
            "postgres_changes",
            {
               event: "UPDATE",
               schema: "public",
               table: "rooms",
               filter: `id=eq.${currentRoom.id}`,
            },
            (payload) => {
               const updatedRoom = payload.new;
               setCurrentRoom(updatedRoom);
               if (updatedRoom.status === "playing") {
                  setScreen("game");
               }
               if (updatedRoom.status === "waiting") {
                  setScreen("lobby");
               }
            }
         )
         .subscribe();
      return () => {
         supabase.removeChannel(roomChannel);
      };
   }, [screen, currentRoom?.id]);
   useEffect(() => {
      if (screen !== "game" || !currentRoom?.id) {
         return;
      }
      async function refreshAnswers() {
         const { data, error: answersError } = await supabase
            .from("answers")
            .select("*")
            .eq("room_id", currentRoom.id)
            .eq("round_number", currentRoom.current_round);
         if (answersError) {
            console.error("Couldn't refresh answers:", answersError);
            return;
         }
         setAnswers(data ?? []);
      }
      refreshAnswers();
      const answersChannel = supabase
         .channel(`room-${currentRoom.id}-answers`)
         .on(
            "postgres_changes",
            {
               event: "*",
               schema: "public",
               table: "answers",
            },
            refreshAnswers
         )
         .subscribe();
      return () => {
         supabase.removeChannel(answersChannel);
      };
   }, [screen, currentRoom?.id, currentRoom?.current_round]);
   if (screen === "create") {
      return (
         <GameSetup
            playerName={playerName}
            setPlayerName={setPlayerName}
            language={language}
            setLanguage={setLanguage}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            rounds={rounds}
            setRounds={setRounds}
            gameMode={gameMode}
            setGameMode={setGameMode}
            error={error}
            loading={loading}
            onSubmit={createGame}
            onBack={() => setScreen("mode-select")}
            characterLook={guestDisplayLook}
         />
      );
   }
    if (screen === "join") {
      return (
          <JoinGame
            playerName={playerName}
            setPlayerName={setPlayerName}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            error={error}
            loading={loading}
            onSubmit={joinGame}
            onBack={() => {
                setError("");
                setScreen("mode-select");
            }}
            characterLook={guestDisplayLook}
          />
      );
    }
   if (screen === "arena" || screen.startsWith("hub-")) {
      const initialTab = screen === "hub-halloween" ? "shop" : screen.startsWith("hub-") ? screen.replace("hub-", "") : "play";
      return (
         <BugHuntExpansion
            initialTab={initialTab}
            scrollToHalloween={screen === "hub-halloween"}
            onBack={() => setScreen("home")}
            onQuickMatch={quickMatch}
            onCreateMode={(mode) => {
               setError("");
               setGameMode(mode);
               setScreen("create");
            }}
            onEquippedChange={setEquippedCosmetics}
         />
      );
   }

   if (screen === "mode-select" || screen === "multiplayer-select") {
      return <ModeSelection onChoose={(mode) => {
         setError("");
         if (mode.startsWith("create-")) {
            setGameMode(mode.slice("create-".length));
            setScreen("create");
         } else if (mode === "quick") {
            if (!accountUser) {
               setError("Sign in to use Quick Join matchmaking.");
               setScreen("hub-account");
            } else {
               void quickMatch({
                  language,
                  difficulty: difficulty === "Rookie" ? "Beginner" : difficulty,
                  level: levelFromXp(accountProfile?.xp ?? 0),
                  displayName: accountProfile?.display_name || accountUser.email?.split("@")[0] || "Debugger",
               });
            }
         } else if (mode === "rookie-multi") {
            setDifficulty("Rookie");
            setGameMode("classic");
            setScreen("create");
         } else {
            setScreen(mode);
         }
      }} onBack={() => setScreen("home")} characterLook={guestDisplayLook} initialPanel={screen === "multiplayer-select" ? "multiplayer" : "main"} loading={loading} error={error} />;
   }
   if (screen === "solo") {
      return (
         <SoloSetup
            playerName={playerName}
            setPlayerName={setPlayerName}
            language={language}
            setLanguage={setLanguage}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            rounds={rounds}
            setRounds={setRounds}
            onBack={() => {
               setError("");
               setScreen("home");
            }}
            onCompleted={(mode) => completeMission(mode)}
            characterLook={guestDisplayLook}
         />
      );
   }
   if (screen === "lobby") {
      return (
         <Lobby
            room={currentRoom}
            players={players}
            currentPlayer={currentPlayer}
            loading={loading}
            error={error}
            onStart={startGame}
            onLeave={leaveRoom}
            showTutorial={showTutorial}
            setShowTutorial={setShowTutorial}
            playerNotice={playerNotice}
         />
      );
   }
   if (screen === "game") {
      return (
         <GameArena
            room={currentRoom}
            players={players}
            currentPlayer={currentPlayer}
            answers={answers}
            onLeave={leaveRoom}
            playerNotice={playerNotice}
            onMatchCompleted={(roomId) => completeMission("team", { roomId })}
            localCharacterLook={guestDisplayLook}
         />
      );
   }
   return (
      <main className="app">
         {guestModal && <div className="bh-guest-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuestModal(false); }}>
            <section className="bh-guest-dialog" role="dialog" aria-modal="true" aria-labelledby="bh-guest-heading">
               <button type="button" className="bh-guest-close" aria-label="Close" onClick={() => setGuestModal(false)}>×</button>
               <span className="bh-guest-kicker">// YOUR FIRST MISSION</span>
               <h2 id="bh-guest-heading">Build your debugger</h2>
               <p>Choose a character and nickname. No account needed, and your guest look won't be saved.</p>
               <div className="bh-guest-editor">
                  <div className="bh-guest-preview"><DebuggerCharacter look={guestLook} /></div>
                  <form onSubmit={finishGuest} className="bh-guest-form">
                     <label htmlFor="bh-guest-name">YOUR NICKNAME</label>
                     <input id="bh-guest-name" autoFocus maxLength={22} required value={guestNickname} onChange={(event) => setGuestNickname(event.target.value)} placeholder="e.g. BugSlayer" />
                     {[
                        ["gender", "Character style", [["female", "Female"], ["male", "Male"]]],
                        ["hairstyle", guestLook.gender === "male" ? "Male hairstyles" : "Female hairstyles", (guestLook.gender === "male" ? ["short", "fade", "side-part", "quiff", "curly", "straight", "wavy", "braids", "bun", "curtain", "bob", "pigtails", "messy-bun"] : ["curtain", "wavy", "straight", "bob", "curly", "braids", "bun", "messy-bun", "pigtails", "short", "fade", "side-part", "quiff"]).map(id => [id, ({ short: "Classic Short", fade: "Textured Fade", "side-part": "Side Part", quiff: "Soft Quiff", curtain: "Curtain Bangs", wavy: "Long Wavy", bob: "Short Bob", "messy-bun": "Messy Bun" })[id] || id[0].toUpperCase() + id.slice(1)])],
                        ["skin", "Skin tone", [["#f4d4b4", "Light"], ["#e9b18b", "Warm"], ["#ba785a", "Tan"], ["#794632", "Deep"]]],
                        ["hair", "Hair color", [["#30253d", "Midnight"], ["#9d5b34", "Copper"], ["#f2c76b", "Gold"], ["#a982e9", "Lilac"]]],
                        ["outfit", "Outfit", [["mint", "Mint"], ["violet", "Violet"], ["coral", "Coral"], ["night", "Night"]]],
                        ["accessory", "Accessories", [["headphones", "Headphones"], ["glasses", "Glasses"], ["none", "None"], ["bunny-ears", "Bunny ears"]]]
                     ].filter((_, index) => index === guestStep).map(([key, title, options]) => <fieldset key={key}><legend>{title}</legend><div className="bh-guest-options">{options.map(([value, label]) => <button type="button" key={value} className={guestLook[key] === value ? "is-selected" : ""} aria-pressed={guestLook[key] === value} onClick={() => setGuestLook((look) => ({ ...look, [key]: value, ...(key === "gender" ? { hairstyle: value === "male" ? "short" : "curtain" } : {}) }))}>{label}</button>)}</div></fieldset>)}
                     <div className="bh-wizard-actions"><button type="button" disabled={guestStep === 0} onClick={() => setGuestStep(step => Math.max(0, step - 1))}>← Back</button><span>Step {guestStep + 1} of 6</span>{guestStep < 5 ? <button type="button" onClick={() => setGuestStep(step => step + 1)}>Save & continue →</button> : <button type="submit" className="bh-guest-start">START PLAYING →</button>}</div>
                  </form>
               </div>
            </section>
         </div>}
         <nav className="navbar bh-lobby-navbar">
            <Logo />
            <div className="global-game-nav">
               <button onClick={() => setScreen("home")} className="active">Play</button>
               <button onClick={() => setScreen("hub-leaderboard")}>Leaderboard</button>
               <button onClick={() => setScreen("hub-shop")}>Shop</button>
               {accountUser ? (
                  <div className="bh-account-dropdown">
                     <button type="button" className="bh-account-trigger" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(!accountMenuOpen)}>{accountProfile?.display_name || accountUser.email?.split("@")[0] || "My Account"} <span aria-hidden="true">⌄</span></button>
                     {accountMenuOpen && <div className="bh-account-menu">
                        <button type="button" onClick={() => { setAccountMenuOpen(false); setScreen("hub-account"); }}>My profile & wardrobe</button>
                        <button type="button" onClick={inviteFriends}>Invite friends</button>
                        <button type="button" onClick={signOutFromLobby}>Sign out</button>
                     </div>}
                  </div>
               ) : guestActive ? (
                  <div className="bh-account-dropdown">
                     <button type="button" className="bh-account-trigger" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(!accountMenuOpen)}>Guest: {playerName} <span aria-hidden="true">⌄</span></button>
                     {accountMenuOpen && <div className="bh-account-menu">
                        <button type="button" onClick={() => { setAccountMenuOpen(false); startGuest("home"); }}>Change guest character</button>
                        <button type="button" onClick={inviteFriends}>Invite friends</button>
                        <button type="button" onClick={() => { setAccountMenuOpen(false); setGuestActive(false); setPlayerName(""); }}>End guest session</button>
                        <button type="button" onClick={() => { setAccountMenuOpen(false); setScreen("hub-account"); }}>Sign in / Create account</button>
                     </div>}
                  </div>
               ) : (
                  <div className="bh-auth-actions">
                     <button type="button" className="bh-guest-nav" onClick={() => startGuest("home")}>Play as Guest</button>
                     <button type="button" className="bh-signin-nav" onClick={() => setScreen("hub-account")}>Sign In</button>
                  </div>
               )}
            </div>
            <div className="bh-navbar-right">
               <button type="button" className="bh-navbar-bp" onClick={() => setScreen("hub-shop")} title="View Bug Points in the Shop" aria-label={`Bug Points balance: ${Number(accountProfile?.bug_points ?? 0).toLocaleString()}. Open shop.`}>
                  <span aria-hidden="true">🪙</span><strong>{accountUser ? Number(accountProfile?.bug_points ?? 0).toLocaleString() : "—"}</strong><span>BP</span>
               </button>
               <div className="status">
                  <span className="status-dot"></span>
                  Servers Online
               </div>
            </div>
         </nav>
         <button
            type="button"
            className="seasonal-drop-banner"
            onClick={() => setScreen("hub-halloween")}
            aria-label="View the Halloween 2026 limited drop in the Bug Shop"
         >
            <span className="seasonal-drop-banner-icon">🎃</span>
            <span className="seasonal-drop-banner-copy">
               <small>LIMITED DROP · HALLOWEEN '26</small>
               <strong>Night Shift Collection is live</strong>
               <span>Limited cosmetics are haunting the Bug Shop. Collect the full set before they disappear.</span>
            </span>
            <span className="seasonal-drop-banner-action">VIEW DROP →</span>
         </button>
         {(!accountProfile || !accountProfile.welcome_bonus_claimed) && (
            <button
               type="button"
               className="welcome-bp-banner"
               onClick={() => setScreen("hub-account")}
               aria-label={accountProfile ? "Redeem WELCOME1000 for 1,000 Bug Points" : "Sign up and redeem WELCOME1000 for 1,000 Bug Points"}
            >
               <span className="welcome-bp-banner-icon">🪙</span>
               <span className="welcome-bp-banner-copy">
                  <small>NEW DEBUGGER BONUS · FREE 1,000 BP</small>
                  <strong>{accountProfile ? "Your welcome reward is waiting" : "Join Bug Hunt with 1,000 Bug Points"}</strong>
                  <span>{accountProfile ? "Open Profile and redeem the code" : "Create an account, verify your email, then redeem"} <b>WELCOME1000</b></span>
               </span>
               <span className="welcome-bp-banner-code">WELCOME1000</span>
               <span className="welcome-bp-banner-action">{accountProfile ? "REDEEM →" : "SIGN UP →"}</span>
            </button>
         )}
         <div className="bh-lobby-layout">
            <aside className="bh-lobby-sidebar bh-lobby-sidebar--left" aria-label="Daily challenges">
               <div className="bh-side-panel">
                  <div className="bh-side-panel__eyebrow">// YOUR MISSIONS</div>
                  <h2><LobbyIcon name="solo" size={20} /> Daily Challenges</h2>
                  <div className="bh-daily-reset" role="timer" aria-label={`Daily challenges refresh in ${missionCountdown}`}><span className="bh-daily-reset__dot" />Refresh in <strong>{missionCountdown}</strong><small>UTC midnight</small></div>
                  <p>Finish a full session to complete a mission. Signed-in players earn bonus BP.</p>
                  <button type="button" className={`bh-side-mission ${missionProgress.rookie?.completed ? "is-complete" : ""}`} onClick={() => { setDifficulty("Rookie"); if (!accountUser && !guestActive) startGuest("solo"); else setScreen("mode-select"); }}>
                     <span className="bh-side-mission__index">{missionProgress.rookie?.completed ? "✓" : "01"}</span><span><strong>Warm-up Run</strong><small>Finish a Rookie session · +20 BP</small></span><LobbyIcon name="arrow" size={15} />
                  </button>
                  <MissionReward missionKey="rookie" reward={20} />
                  <button type="button" className={`bh-side-mission ${missionProgress.solo?.completed ? "is-complete" : ""}`} onClick={() => { setDifficulty("Beginner"); if (!accountUser && !guestActive) startGuest("solo"); else setScreen("mode-select"); }}>
                     <span className="bh-side-mission__index">{missionProgress.solo?.completed ? "✓" : "02"}</span><span><strong>Solo Debugger</strong><small>Finish a Solo session · +30 BP</small></span><LobbyIcon name="arrow" size={15} />
                  </button>
                  <MissionReward missionKey="solo" reward={30} />
                  <button type="button" className={`bh-side-mission ${missionProgress.team?.completed ? "is-complete" : ""}`} onClick={() => { if (!accountUser && !guestActive) startGuest("create"); else setScreen("mode-select"); }}>
                     <span className="bh-side-mission__index">{missionProgress.team?.completed ? "✓" : "03"}</span><span><strong>Team Up</strong><small>Finish a multiplayer match · +50 BP</small></span><LobbyIcon name="arrow" size={15} />
                  </button>
                  <MissionReward missionKey="team" reward={50} />
                  <div className="bh-mission-progress">
                     <div><strong>{["rookie", "solo", "team"].filter(key => missionProgress[key]?.completed).length}/3</strong> missions completed today</div>
                     <div className="bh-mission-track"><span style={{ width: `${["rookie", "solo", "team"].filter(key => missionProgress[key]?.completed).length / 3 * 100}%` }} /></div>
                     <div className="bh-mission-bonus">
                        <span>🏆 Complete all 3 · <strong>+100 BP bonus</strong></span>
                        <button type="button" className="bh-mission-claim bh-mission-claim--bonus"
                           disabled={missionBusy || !accountUser || missionProgress.bonus?.claimed || !["rookie", "solo", "team"].every(key => missionProgress[key]?.claimed)}
                           onClick={claimDailyBonus}>
                           {missionProgress.bonus?.claimed ? "✓ Bonus Claimed" : ["rookie", "solo", "team"].every(key => missionProgress[key]?.claimed) ? "✦ Claim 100 BP" : "🔒 Finish all 3"}
                        </button>
                     </div>
                     <small>{missionBusy ? "Claiming reward…" : "Complete a game, then claim its BP. Sign in to receive rewards."}</small>
                     {missionNotice && <small role="status" className="bh-mission-notice">{missionNotice}</small>}
                  </div>
               </div>

            </aside>
         <section className="game-hq" aria-label="Bug Hunt game lobby">
            <div className="game-hq__topline"><span>✦ YOUR DEBUGGING HQ</span><span>🐛 READY TO HUNT?</span></div>
            <div className="game-hq__main">
               <CaterpillarMascot mode="hero-orbit" />
               <div className="game-hq__stage">
                  <div className="shuttle-cockpit" aria-hidden="true">
                     <div className="shuttle-cockpit__frame" />
                     <div className="shuttle-cockpit__stars" />
                     <div className="shuttle-cockpit__planet" />
                     <div className="shuttle-cockpit__orbit" />
                     <div className="shuttle-cockpit__header"><span>BH // ORBITAL COMMAND</span><span className="shuttle-cockpit__live">● SYSTEM ONLINE</span></div>
                     <div className="shuttle-cockpit__readout shuttle-cockpit__readout--left"><i /><i /><i /><small>SYS / 01</small></div>
                     <div className="shuttle-cockpit__readout shuttle-cockpit__readout--right"><b>98.7</b><small>SYNC READY</small><span>▂ ▄ ▆ ▃ ▇</span></div>
                     <div className="shuttle-cockpit__floor" />
                     <div className="shuttle-cockpit__footer"><span>CREW ID // DEBUGGER</span><span>SECTOR 07</span></div>
                  </div>
                  <div className="game-hq__halo" aria-hidden="true" />
                  <div className="game-hq__avatar"><DebuggerCharacter look={guestDisplayLook} /></div>
                  <div className="game-hq__pedestal" aria-hidden="true" />
               </div>
               <div className="game-hq__stage-action"><button type="button" className="game-hq__customize" onClick={() => { sessionStorage.setItem("bughunt-open-character-studio", "yes"); accountUser ? setScreen("hub-account") : startGuest("home"); }}><LobbyIcon name="customize" size={17} /> Customize your look <LobbyIcon name="arrow" size={16} /></button></div>
               <div className="game-hq__welcome">
                  <span className="game-hq__eyebrow">WELCOME TO YOUR LOBBY</span>
                  <div className="game-hq__greeting">{accountProfile?.display_name ? `HEY, ${accountProfile.display_name.toUpperCase()}!` : guestActive ? `HEY, ${playerName.toUpperCase()}!` : "HEY, DEBUGGER!"}</div>
                  <h1 className="game-hq__hero-title"><span>FIND THE BUG.</span><span>BEAT THE CLOCK.</span></h1>
                  <p>Race against other developers to find bugs, fix broken code, and climb the leaderboard.</p>
                  <div className="game-hq__statrow">
                     <span>🪙 <b>{Number(accountProfile?.bug_points || 0).toLocaleString()}</b> Bug Points</span>
                     <span>🏆 <b>{Number(accountProfile?.wins || 0)}</b> Wins</span>
                     <span>🐛 <b>{Number(accountProfile?.bugs_fixed || 0)}</b> Fixes</span>
                  </div>
                  <div className="game-hq__quickactions game-hq__classic-actions">
                     <button type="button" onClick={() => { setError(""); if (!accountUser && !guestActive) startGuest("mode-select"); else setScreen("mode-select"); }}><LobbyIcon name="play" size={19} /> PLAY NOW <LobbyIcon name="arrow" size={17} /></button>
                     <button type="button" onClick={() => setScreen("hub-shop")}><LobbyIcon name="shop" size={19} /> VISIT SHOP <LobbyIcon name="arrow" size={17} /></button>
                  </div>
               </div>
            </div>
            <div className="game-hq__modes-heading"><div><small>// CHOOSE YOUR ADVENTURE</small><h2>What are we playing?</h2></div><span>✦ PICK A MODE TO START ✦</span></div>
            <div className="game-hq__modes">
               <button type="button" className="game-mode-card game-mode-card--multi" onClick={() => { setError(""); if (!accountUser && !guestActive) startGuest("create"); else setScreen("create"); }}><span className="game-mode-card__icon"><LobbyIcon name="create" size={30} /></span><strong>CREATE GAME</strong><small>Host a multiplayer room</small><span className="game-mode-card__go">PLAY →</span></button>
               <button type="button" className="game-mode-card game-mode-card--join" onClick={() => { setError(""); if (!accountUser && !guestActive) startGuest("join"); else setScreen("join"); }}><span className="game-mode-card__icon"><LobbyIcon name="join" size={30} /></span><strong>JOIN FRIENDS</strong><small>Enter a room code</small><span className="game-mode-card__go">JOIN →</span></button>
               <button type="button" className="game-mode-card game-mode-card--arena" onClick={() => { setError(""); if (!accountUser && !guestActive) startGuest("arena"); else setScreen("arena"); }}><span className="game-mode-card__icon"><LobbyIcon name="arena" size={30} /></span><strong>ARENA</strong><small>Quick match and competitive modes</small><span className="game-mode-card__go">COMPETE →</span></button>
               <button type="button" className="game-mode-card game-mode-card--solo" onClick={() => { setError(""); setDifficulty("Beginner"); if (!accountUser && !guestActive) startGuest("solo"); else setScreen("solo"); }}><span className="game-mode-card__icon"><LobbyIcon name="solo" size={30} /></span><strong>SOLO PRACTICE</strong><small>Sharpen your bug-hunting skills</small><span className="game-mode-card__go">PRACTICE →</span></button>
               <button type="button" className="game-mode-card game-mode-card--rookie" onClick={() => { setError(""); setDifficulty("Rookie"); if (!accountUser && !guestActive) startGuest("solo"); else setScreen("solo"); }}><span className="game-mode-card__icon"><LobbyIcon name="rookie" size={30} /></span><strong>ROOKIE MODE</strong><small>New to code? Start here!</small><span className="game-mode-card__go">LEARN →</span></button>
            </div>
            <div className="game-hq__bottom">
               <button type="button" onClick={() => setScreen("hub-leaderboard")}>🏆 <b>Leaderboard</b><span>See the top debuggers →</span></button>
               <button type="button" onClick={() => setScreen("hub-shop")}>🎃 <b>Night Shift Collection</b><span>Explore the limited drop →</span></button>
               <button type="button" onClick={() => setScreen("hub-account")}>✨ <b>Your Profile</b><span>Badges, rewards & wardrobe →</span></button>
            </div>
            <div className="game-hq__code"><div className="code-window"><CaterpillarMascot mode="roam" /><div className="window-header"><div className="window-dots"><span></span><span></span><span></span></div><p>challenge.cpp</p></div><div className="code"><p><span className="purple">int</span> calculateSum(<span className="purple">int</span> a, <span className="purple">int</span> b) {"{"}</p><p className="indent"><span className="blue">return</span> a <span className="error">-</span> b;</p><p>{"}"}</p><div className="bug-message"><span>🐛</span> BUG DETECTED</div></div></div><div><small>// THE HUNT IS ON</small><h3>FIND THE BUG. BEAT THE CLOCK.</h3><p>Think fast. Fix smart. Have fun.</p></div></div>
         </section>
            <aside className="bh-lobby-sidebar bh-lobby-sidebar--right" aria-label="Leaderboard and competitions">
               <div className="bh-side-panel bh-side-panel--leaderboard">
                  <div className="bh-side-panel__eyebrow">// COMMUNITY</div>
                  <h2><LobbyIcon name="arena" size={20} /> Leaderboard</h2>
                  <div className="bh-live-leaders" aria-label="Current top three players">
                     {leadersLoading && <p>Loading rankings…</p>}
                     {leadersError && <p>Rankings temporarily unavailable.</p>}
                     {!leadersLoading && !leadersError && topPlayers.length === 0 && <p>No ranked players yet.</p>}
                     {topPlayers.map((player, index) => <div className="bh-live-leader" key={player.id}>
                        <span className="bh-live-leader__rank">#{index + 1}</span>
                        <span className="bh-live-leader__name" title={player.display_name || "Debugger"}>{player.display_name || "Debugger"}</span>
                        <span className="bh-live-leader__xp">{Number(player.xp || 0).toLocaleString()} XP</span>
                     </div>)}
                  </div>
                  <p>Ranked by XP, then wins.</p>
                  <button type="button" className="bh-side-cta bh-side-cta--blue" onClick={() => setScreen("hub-leaderboard")}>VIEW LEADERBOARD <LobbyIcon name="arrow" size={15} /></button>
               </div>
               <div className="bh-side-panel bh-side-panel--event">
                  <div className="bh-side-panel__eyebrow">// CURRENT EVENT</div>
                  <h2><LobbyIcon name="customize" size={20} /> Events</h2>
                  <div className="bh-event-pill">SEASONAL DROP</div>
                  <strong className="bh-event-title">NIGHT SHIFT '26</strong>
                  <p>Explore the Halloween collection and limited-time looks.</p>
                  <div className="bh-event-countdown" aria-live="off"><small>ENDS IN</small><strong>{eventRemaining ? `${eventDays}d ${String(eventHours).padStart(2, "0")}h ${String(eventMinutes).padStart(2, "0")}m` : "EVENT ENDED"}</strong></div>
                  <button type="button" className="bh-side-cta bh-side-cta--pink" onClick={() => setScreen("hub-halloween")}>EXPLORE EVENT <LobbyIcon name="arrow" size={15} /></button>
               </div>
               <div className="bh-side-panel bh-side-panel--arena">
                  <div className="bh-side-panel__eyebrow">// READY TO COMPETE?</div>
                  <h2><LobbyIcon name="arena" size={20} /> Arena</h2>
                  <p>Jump into competitive modes and put your debugging speed to the test.</p>
                  <button type="button" className="bh-side-cta bh-side-cta--green" onClick={() => { if (!accountUser && !guestActive) startGuest("arena"); else setScreen("arena"); }}>ENTER ARENA <LobbyIcon name="arrow" size={15} /></button>
               </div>
            </aside>
         </div>
         <footer className="bughunt-copyright">© 2026 Sude Sayyan · BUG HUNT · All rights reserved.</footer>
      </main>
   );
}
function SoundToggle() {
   const [muted, setMuted] = useState(() => window.localStorage.getItem("bughunt-sound-muted") === "1");
   function toggle() {
      const next = !muted;
      setMuted(next);
      window.localStorage.setItem("bughunt-sound-muted", next ? "1" : "0");
   }
   return <button className="global-sound-toggle" onClick={toggle} title={muted ? "Turn sound on" : "Mute game sounds"}>{muted ? "🔇" : "🔊"}</button>;
}
function App() {
   const [equippedCosmetics, setEquippedCosmetics] = useState(null);
   const [globalPointer, setGlobalPointer] = useState({ x: -100, y: -100, visible: false });
   const [rainbowTrail, setRainbowTrail] = useState([]);
   const cursorStyle = equippedCosmetics?.cursor_id
      ? equippedCosmetics.cursor_id.replace("cursor-", "")
      : "native";
   const backgroundStyle = equippedCosmetics?.background_id
      ? equippedCosmetics.background_id.replace("bg-", "")
      : "native";
   return (
      <div
         className={`global-cosmetic-root equipped-cursor-${cursorStyle} equipped-background-${backgroundStyle}`}
         onPointerMove={(event) => {
            const nextPointer = { x: event.clientX, y: event.clientY, visible: true };
            setGlobalPointer(nextPointer);
            if (cursorStyle === "rainbow") {
               setRainbowTrail((previous) => [nextPointer, ...previous].slice(0, 5));
            }
         }}
         onPointerLeave={() => {
            setGlobalPointer((previous) => ({ ...previous, visible: false }));
            setRainbowTrail([]);
         }}
      >
         <GlobalCursorEffect styleName={cursorStyle} pointer={globalPointer} trail={rainbowTrail} />
         <AppContent
            equippedCosmetics={equippedCosmetics}
            setEquippedCosmetics={setEquippedCosmetics}
            globalPointer={globalPointer}
            setGlobalPointer={setGlobalPointer}
         />
      </div>
   );
}
function GlobalCursorEffect({ styleName, pointer, trail = [] }) {
   if (!pointer.visible || styleName === "native") return null;
   const position = {
      transform: `translate3d(${pointer.x}px, ${pointer.y}px, 0)`,
   };
   if (styleName === "default") {
      return (
         <div className="equipped-pointer-effect classic-pointer-effect" style={position} aria-hidden="true">
            ↖
         </div>
      );
   }
   if (styleName === "bug") {
      return (
         <div className="equipped-pointer-effect bug-cursor-effect" style={position} aria-hidden="true">
            <span className="bug-cursor-pointer">↖</span>
            <span className="bug-cursor-buddy">🐛</span>
         </div>
      );
   }
   if (styleName === "crosshair") {
      return (
         <div className="equipped-pointer-effect live-crosshair" style={position} aria-hidden="true">
            <span></span>
         </div>
      );
   }
   if (styleName === "spark") {
      return (
         <div className="equipped-pointer-effect live-spark" style={position} aria-hidden="true">
            <b>✦</b><i>✧</i><em>·</em>
         </div>
      );
   }
   if (styleName === "pixel") {
      return <div className="equipped-pointer-effect expanded-cursor pixel-cursor" style={position} aria-hidden="true">▰</div>;
   }
   if (styleName === "rainbow") {
      const head = trail[0] ?? pointer;
      const tail = trail[trail.length - 1] ?? head;
      const dx = head.x - tail.x;
      const dy = head.y - tail.y;
      const distance = Math.min(110, Math.hypot(dx, dy) * 1.45);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const trailStyle = {
         left: head.x + 7,
         top: head.y + 8,
         width: Math.max(18, distance),
         transform: `translateX(-100%) rotate(${angle}deg)`,
      };
      return (
         <>
            {distance > 2 && <span className="rainbow-comet-trail" style={trailStyle} aria-hidden="true" />}
            <div
               className="equipped-pointer-effect expanded-cursor rainbow-cursor"
               style={{
                  ...position,
                  "--rainbow-cursor-angle": `${angle}deg`,
               }}
               aria-hidden="true"
            >
               <b className="rainbow-arrow-direction">➤</b><span>✦</span>
            </div>
         </>
      );
   }
   if (styleName === "mini-caterpillar") {
      return <div className="equipped-pointer-effect expanded-cursor mini-caterpillar-cursor" style={position} aria-hidden="true"><b>↖</b><span>🐛</span></div>;
   }
   if (styleName === "glitch") {
      return <div className="equipped-pointer-effect expanded-cursor glitch-live-cursor" style={position} aria-hidden="true">⌁</div>;
   }
   return null;
}
function Logo() {
   return (
      <div className="logo">
         <span className="bug">🐛</span>
         BUG<span>HUNT</span>
      </div>
   );
}
function CaterpillarMascot({ mode = "roam" }) {
   return (
      <div
         className={`bug-runner-track bug-runner-${mode}`}
         aria-hidden="true"
      >
         <div className="bug-runner">
            <span className="cute-bug-body">
               <span className="cute-bug-segment segment-one"></span>
               <span className="cute-bug-segment segment-two"></span>
               <span className="cute-bug-segment segment-three"></span>
               <span className="cute-bug-head">
                  <span className="cute-bug-eye eye-one"></span>
                  <span className="cute-bug-eye eye-two"></span>
               </span>
               <span className="cute-bug-antenna antenna-one"></span>
               <span className="cute-bug-antenna antenna-two"></span>
               <span className="cute-bug-foot foot-one"></span>
               <span className="cute-bug-foot foot-two"></span>
               <span className="cute-bug-foot foot-three"></span>
            </span>
            {mode === "trophy" && (
               <span className="bug-runner-trophy">🏆</span>
            )}
         </div>
      </div>
   );
}
function Feature({ value, label }) {
   return (
      <div>
         <strong>{value}</strong>
         <span>{label}</span>
      </div>
   );
}
// Preserve cutscene progress if live room updates briefly remount the arena.
const arenaIntroStartedAt = new Map();
function AnimatedDebugRoom({ playerLook = DEFAULT_LOOK, opponentLook = DEFAULT_LOOK, multiplayer = false, onReady, title = "ENTERING THE ARENA", playerName = "Debugger", opponentName = "Opponent", introKey = null }) {
   const [phase, setPhase] = useState("enter");
   // Keep the newest callback without restarting the cutscene timers on each parent render.
   const onReadyRef = useRef(onReady);
   onReadyRef.current = onReady;
   useEffect(() => {
      const key = introKey || title;
      const startedAt = arenaIntroStartedAt.get(key) ?? Date.now();
      arenaIntroStartedAt.set(key, startedAt);
      const elapsed = Date.now() - startedAt;
      const schedule = (ms, callback) => window.setTimeout(callback, Math.max(0, ms - elapsed));
      const timers = [
         schedule(150, () => setPhase("walking")),
         schedule(2100, () => setPhase("sitting")),
         schedule(3000, () => setPhase("typing")),
         schedule(4200, () => onReadyRef.current?.()),
      ];
      return () => timers.forEach(window.clearTimeout);
   }, [introKey, title]);
   return <main className={`bh-room-cutscene bh-room-${phase}${multiplayer ? " bh-room-multiplayer" : ""}`} role="status">
      <header className="bh-room-header"><span>● BUG HUNT HQ</span><strong>{title}</strong><span>{phase === "typing" ? "READY!" : "ENTERING..."}</span></header>
      <div className="bh-room-window">✦ &nbsp; ✧ &nbsp; ✦</div><div className="bh-room-neon">DEBUG ARENA</div><div className="bh-room-floor"/>
      <div className="bh-room-desk bh-room-desk-left"><span className="bh-room-nameplate">{playerName}</span><div className="bh-room-monitor">&lt;/&gt;</div><div className="bh-room-chair"/></div>
      {multiplayer && <div className="bh-room-desk bh-room-desk-right"><span className="bh-room-nameplate">{opponentName}</span><div className="bh-room-monitor">&lt;/&gt;</div><div className="bh-room-chair"/></div>}
      <div className="bh-room-avatar bh-room-avatar-left"><div className="bh-room-avatar-inner"><DebuggerCharacter look={playerLook}/></div></div>
      {multiplayer && <div className="bh-room-avatar bh-room-avatar-right"><div className="bh-room-avatar-inner"><DebuggerCharacter look={opponentLook}/></div></div>}
      <div className="bh-room-caption">{phase === "enter" ? "Opening the arena doors..." : phase === "walking" ? "Debuggers, take your stations!" : phase === "sitting" ? "Connecting to your workstation..." : "Systems online. Let's debug!"}</div>
      <button className="bh-room-skip" type="button" onClick={onReady}>Skip intro →</button>
   </main>;
}

// Keep the same arena visible underneath the live question interface.
// This is visual-only: all existing game timers, scoring and inputs stay in their original components.
function ActiveArenaBackdrop({ playerLook = DEFAULT_LOOK, opponentLook = DEFAULT_LOOK, multiplayer = false, playerResult = null, opponentResult = null, winnerSide = null, playerName = "Debugger", opponentName = "Opponent" }) {
   return (
      <div className={`bh-active-arena bh-reveal-scene ${winnerSide ? "bh-victory-scene" : ""}`} aria-hidden="true">
         <div className={`bh-room-cutscene bh-room-typing${multiplayer ? " bh-room-multiplayer" : ""}`}>
            <div className="bh-room-window">✦ &nbsp; ✧ &nbsp; ✦</div>
            <div className="bh-room-neon">DEBUG ARENA</div>
            <div className="bh-room-floor" />
            <div className={`bh-room-desk bh-room-desk-left ${playerResult ? `bh-desk-${playerResult}` : ""}`}><span className="bh-room-nameplate">{playerName}</span><div className="bh-room-monitor">&lt;/&gt;</div><div className="bh-room-chair" /></div>
            {multiplayer && <div className={`bh-room-desk bh-room-desk-right ${opponentResult ? `bh-desk-${opponentResult}` : ""}`}><span className="bh-room-nameplate">{opponentName}</span><div className="bh-room-monitor">&lt;/&gt;</div><div className="bh-room-chair" /></div>}
            <div className={`bh-room-avatar bh-room-avatar-left ${winnerSide === "left" ? "bh-avatar-champion" : ""}`}><div className="bh-room-avatar-inner"><DebuggerCharacter look={playerLook}/></div></div>
            {multiplayer && <div className={`bh-room-avatar bh-room-avatar-right ${winnerSide === "right" ? "bh-avatar-champion" : ""}`}><div className="bh-room-avatar-inner"><DebuggerCharacter look={opponentLook}/></div></div>}
            {winnerSide && <div className={`bh-victory-confetti bh-victory-confetti--${winnerSide}`}>✦ 🏆 ✦</div>}
         </div>
      </div>
   );
}

function ArenaReveal({ title, subtitle, playerLook, opponentLook, multiplayer, playerResult, opponentResult, winnerSide, leaderboard, onContinue, buttonLabel = "Continue", countdown = false, playerName = "Debugger", opponentName = "Opponent" }) {
   const [secondsRemaining, setSecondsRemaining] = useState(3);
   useEffect(() => {
      if (!countdown) return;
      setSecondsRemaining(3);
      const interval = window.setInterval(() => {
         setSecondsRemaining((remaining) => Math.max(1, remaining - 1));
      }, 1000);
      return () => window.clearInterval(interval);
   }, [countdown]);
   return (
      <div className="bh-arena-reveal" role="status" aria-live="polite">
         <ActiveArenaBackdrop playerLook={playerLook} opponentLook={opponentLook} multiplayer={multiplayer} playerResult={playerResult} opponentResult={opponentResult} winnerSide={winnerSide} playerName={playerName} opponentName={opponentName} />
         <div className="bh-reveal-message">
            <div className="bh-reveal-title">{title}</div>
            <p>{subtitle}</p>
            {leaderboard && <div className="bh-reveal-leaderboard">{leaderboard.map((entry, index) => <div key={entry.id || index}><span>#{index + 1} {entry.name}</span><strong>{entry.score} PTS</strong></div>)}</div>}
            {countdown ? <div className="bh-reveal-countdown" aria-label={`Next round in ${secondsRemaining} seconds`}>
               <span>NEXT ROUND IN</span><strong key={secondsRemaining}>{secondsRemaining}</strong>
            </div> : onContinue && <button type="button" className="bh-reveal-continue" onClick={onContinue}>{buttonLabel} →</button>}
         </div>
      </div>
   );
}

function ModeSelection({ onChoose, onBack, characterLook, initialPanel = "main", loading = false, error = "" }) {
   const [panel, setPanel] = useState("main");
   const options = panel === "multiplayer"
      ? [
         { id: "quick", icon: "⚡", title: "Quick Join", detail: "Find an available match. Fastest way to play.", featured: true },
         { id: "create-classic", icon: "🎮", title: "Create Classic", detail: "Host a traditional round-based debugging battle." },
         { id: "create-race", icon: "🏁", title: "Create Race", detail: "Compete to solve the bugs first." },
         { id: "create-timed", icon: "⏱️", title: "Create Timed", detail: "Challenge friends against the clock." },
         { id: "join", icon: "🔑", title: "Join with Code", detail: "Enter a private room code from a friend." },
         { id: "rookie-multi", icon: "🌱", title: "Rookie Multiplayer", detail: "Host a beginner-friendly Classic match with Rookie questions." },
      ]
      : [
         { id: "solo", icon: "🎯", title: "Solo", detail: "Practice at your own pace. Choose level, language and rounds.", featured: true },
         { id: "multiplayer", icon: "⚔️", title: "Multiplayer", detail: "Quick match, join friends, or host Classic, Race or Timed." },
      ];
   const select = (id) => id === "multiplayer" ? setPanel("multiplayer") : onChoose(id);
   return (
      <main className="app bh-mode-lobby bh-game-menu">
         <div className="bh-game-menu__stars" aria-hidden="true" />
         <nav className="navbar"><Logo /></nav>
         <section className="bh-mode-lobby__content bh-game-menu__content">
            <button type="button" className="back-button" onClick={() => panel === "multiplayer" ? setPanel("main") : onBack()}>← {panel === "multiplayer" ? "Solo or Multiplayer" : "Back to HQ"}</button>
            <div className="bh-game-menu__room">
               <div className="bh-game-menu__wall-sign">BUG HUNT <span>HQ</span></div>
               <div className="bh-game-menu__window">✦ &nbsp; ✧ &nbsp; ✦</div>
               <div className="bh-game-menu__desk"><div className="bh-game-menu__monitor">{"</>"}</div></div>
               <div className="bh-game-menu__avatar"><DebuggerCharacter look={characterLook} /></div>
               <div className="bh-game-menu__floor" />
            </div>
            <div className="bh-game-menu__intro"><span>// SELECT YOUR PATH</span><h1>{panel === "multiplayer" ? "PLAY TOGETHER" : "HOW WILL YOU PLAY?"}</h1><p>{panel === "multiplayer" ? "Join instantly, enter a code, or choose the kind of room you want to host." : "Two ways to play. All game types live inside them."}</p></div>
            {loading && <p className="bh-game-menu__status" role="status">⚡ Finding an available match…</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className={`bh-mode-lobby__choices bh-game-menu__choices ${panel === "multiplayer" ? "bh-game-menu__choices--multi" : "bh-game-menu__choices--primary"}`}>
               {options.map(option => <button key={option.id} type="button" disabled={loading} className={`bh-mode-lobby__choice bh-game-menu__choice ${option.featured ? "bh-game-menu__choice--featured" : ""}`} onClick={() => select(option.id)}>
                  <span className="bh-mode-lobby__icon">{option.icon}</span><strong>{option.title}</strong><small>{option.detail}</small><span className="bh-mode-lobby__arrow">{option.id === "multiplayer" ? "EXPLORE →" : "PLAY →"}</span>
               </button>)}
            </div>
         </section>
      </main>
   );
}

function GameSetup({
   playerName,
   setPlayerName,
   language,
   setLanguage,
   difficulty,
   setDifficulty,
   rounds,
   setRounds,
   gameMode,
   setGameMode,
   error,
   loading,
   onSubmit,
   onBack,
   characterLook = DEFAULT_LOOK,
}) {
   return (
      <main className="app">
         <nav className="navbar">
            <Logo />
         </nav>
         <section className="setup-page">
            <button className="back-button" onClick={onBack}>
               ← Back
            </button>
            <div className="bh-setup-character" aria-hidden="true"><DebuggerCharacter look={characterLook} /></div>
            <div className="setup-card">
               <p className="eyebrow">// CREATE PRIVATE ROOM</p>
               <h2>Create Game</h2>
               <p className="setup-description">
                  Configure your arena and invite other developers to compete.
               </p>
               <form onSubmit={onSubmit}>
                  <fieldset className="bh-create-modes">
                     <legend>Choose Game Mode</legend>
                     <div className="bh-create-modes__grid">
                        {[
                           { value: "classic", icon: "🎮", title: "Classic", description: "Round-by-round battle" },
                           { value: "race", icon: "🏁", title: "Race", description: "First to finish wins" },
                           { value: "timed", icon: "⏱️", title: "Timed", description: "Beat the clock" },
                        ].map(mode => (
                           <button
                              type="button"
                              key={mode.value}
                              className={`bh-create-mode ${gameMode === mode.value ? "bh-create-mode--selected" : ""}`}
                              aria-pressed={gameMode === mode.value}
                              onClick={() => setGameMode(mode.value)}
                           >
                              <span className="bh-create-mode__icon">{mode.icon}</span>
                              <strong>{mode.title}</strong>
                              <small>{mode.description}</small>
                           </button>
                        ))}
                     </div>
                  </fieldset>
                  <label>
                     Your Name
                     <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(event) =>
                           setPlayerName(event.target.value)
                        }
                        maxLength="18"
                     />
                  </label>
                  <label>
                     Language
                     <select
                        value={language}
                        onChange={(event) =>
                           setLanguage(event.target.value)
                        }
                     >
                        <option>C++</option>
                        <option>Python</option>
                        <option>JavaScript</option>
                     </select>
                  </label>
                  <label>
                     Difficulty
                     <select
                        value={difficulty}
                        onChange={(event) =>
                           setDifficulty(event.target.value)
                        }
                     >
                        <option value="Rookie">Rookie · No experience needed</option>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                     </select>
                  </label>

                  <label>
                     Number of Rounds
                     <select
                        value={rounds}
                        onChange={(event) =>
                           setRounds(event.target.value)
                        }
                     >
                        <option value="3">3 Rounds</option>
                        <option value="5">5 Rounds</option>
                        <option value="10">10 Rounds</option>
                     </select>
                  </label>
                  {error && (
                     <p className="form-error">
                        {error}
                     </p>
                  )}
                  <button
                     className="primary-button full-button"
                     disabled={loading}
                  >
                     {loading ? "Creating Room..." : "Create Room"}
                  </button>
               </form>
            </div>
         </section>
      </main>
   );
}
function JoinGame({
   playerName,
   setPlayerName,
   roomCode,
   setRoomCode,
   error,
   loading,
   onSubmit,
   onBack,
   characterLook = DEFAULT_LOOK,
}) {
   return (
      <main className="app">
         <nav className="navbar">
            <Logo />
         </nav>
         <section className="setup-page">
            <button className="back-button" onClick={onBack}>
               ← Back
            </button>
            <div className="bh-setup-character" aria-hidden="true"><DebuggerCharacter look={characterLook} /></div>
            <div className="setup-card">
               <p className="eyebrow">// ENTER THE ARENA</p>
               <h2>Join Game</h2>
               <p className="setup-description">
                  Enter the room code shared by the host.
               </p>
               <form onSubmit={onSubmit}>
                  <label>
                     Your Name
                     <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(event) =>
                           setPlayerName(event.target.value)
                        }
                        maxLength="18"
                     />
                  </label>
                  <label>
                     Room Code
                     <input
                        className="room-code-input"
                        type="text"
                        placeholder="BUG-4821"
                        value={roomCode}
                        onChange={(event) =>
                           setRoomCode(event.target.value.toUpperCase())
                        }
                        maxLength="8"
                     />
                  </label>
                  {error && (
                     <p className="form-error">
                        {error}
                     </p>
                  )}
                  <button
                     className="primary-button full-button"
                     disabled={loading}
                  >
                     {loading ? "Joining Room..." : "Join Room"}
                  </button>
               </form>
            </div>
         </section>
      </main>
   );
}
function SoloSetup({
   playerName,
   setPlayerName,
   language,
   setLanguage,
   difficulty,
   setDifficulty,
   rounds,
   setRounds,
   onBack,
   onCompleted,
   characterLook = DEFAULT_LOOK,
}) {
   const [started, setStarted] = useState(false);
   const [showSoloTutorial, setShowSoloTutorial] = useState(false);
   if (started) {
      return (
         <SoloGame
            playerName={playerName.trim() || "Developer"}
            language={language}
            difficulty={difficulty}
            rounds={Number(rounds)}
            onExit={onBack}
            onCompleted={onCompleted}
            characterLook={characterLook}
         />
      );
   }
   return (
      <main className="app">
         {showSoloTutorial && (
            <GameModeTutorial
               mode="solo"
               onStart={() => {
                  window.localStorage.setItem("bughunt-tutorial-seen-solo", "1");
                  setShowSoloTutorial(false);
                  setStarted(true);
               }}
            />
         )}
         <nav className="navbar">
            <Logo />
            <div className="status">
               <span className="status-dot"></span>
               PRACTICE MODE
            </div>
         </nav>
         <section className="setup-page solo-setup-page">
            <button className="back-button" onClick={onBack}>
               ← Back
            </button>
            <div className="bh-setup-character" aria-hidden="true"><DebuggerCharacter look={characterLook} /></div>
            <div className="setup-card solo-setup-card">
               <p className="eyebrow">// SOLO DEBUG SESSION</p>
               <h2>Solo Practice</h2>
               <p className="setup-description">
                  Sharpen your debugging skills, chase a streak, and beat your own time.
               </p>
               <form
                  onSubmit={(event) => {
                     event.preventDefault();
                     if (window.localStorage.getItem("bughunt-tutorial-seen-solo") !== "1") {
                        setShowSoloTutorial(true);
                        return;
                     }
                     setStarted(true);
                  }}
               >
                  <label>
                     Your Name
                     <input
                        type="text"
                        placeholder="Developer"
                        value={playerName}
                        onChange={(event) => setPlayerName(event.target.value)}
                        maxLength="18"
                     />
                  </label>
                  <label>
                     Language
                     <select
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                     >
                        <option>C++</option>
                        <option>Python</option>
                        <option>JavaScript</option>
                     </select>
                  </label>
                  <label>
                     Difficulty
                     <select
                        value={difficulty}
                        onChange={(event) => setDifficulty(event.target.value)}
                     >
                        <option value="Rookie">Rookie · No experience needed</option>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                     </select>
                  </label>
                  <label>
                     Number of Rounds
                     <select
                        value={rounds}
                        onChange={(event) => setRounds(event.target.value)}
                     >
                        <option value="3">3 Rounds</option>
                        <option value="5">5 Rounds</option>
                        <option value="10">10 Rounds</option>
                     </select>
                  </label>
                  <button className="primary-button full-button solo-start-button">
                     Start Practice
                  </button>
               </form>
            </div>
         </section>
      </main>
   );
}

function AnswerReview({ rounds, open, onToggle }) {
   const missed = rounds.filter(item => !item.isCorrect).length;
   return (
      <section className="bh-answer-review">
         <button type="button" className="bh-answer-review__toggle" aria-expanded={open} onClick={onToggle}>
            <span>📖 {open ? "Hide Answer Review" : "Check Answers"}</span>
            <small>{rounds.length} questions · {missed} missed {open ? "▲" : "▼"}</small>
         </button>
         {open && (
            <div className="bh-answer-review__content">
               <p className="bh-answer-review__intro">Review your answers, see the correct fixes, and learn why they work.</p>
               {rounds.length === 0 && <p>No answers recorded for this session.</p>}
               {[...rounds].sort((a, b) => a.roundNumber - b.roundNumber).map((item, index) => (
                  <article className={`bh-answer-review__item ${item.isCorrect ? "bh-answer-review__item--correct" : "bh-answer-review__item--wrong"}`} key={`${item.roundNumber}-${index}`}>
                     <div className="bh-answer-review__heading"><strong>Round {item.roundNumber}: {item.title || "Debugging Challenge"}</strong><span>{item.isCorrect ? "✓ Correct" : item.timedOut ? "⌛ Timed out" : "✕ Incorrect"}</span></div>
                     {item.code && <pre className="bh-answer-review__code"><code>{item.code}</code></pre>}
                     <p className="bh-answer-review__question">{item.question}</p>
                     <div className="bh-answer-review__answers">
                        <p><b>Your answer:</b> {item.timedOut ? "No answer (time expired)" : item.selectedAnswer ?? "Not recorded"}</p>
                        <p><b>Correct answer:</b> <span className="bh-answer-review__correct">{item.correctAnswer ?? "Not available"}</span></p>
                     </div>
                     <p className="bh-answer-review__explanation"><b>Why:</b> {item.explanation || "Explanation not available for this question."}</p>
                  </article>
               ))}
            </div>
         )}
      </section>
   );
}

function SoloGame({
   playerName,
   language,
   difficulty,
   rounds,
   onExit,
   onCompleted,
   characterLook = DEFAULT_LOOK,
}) {
   const [introDone, setIntroDone] = useState(false);
   const [roundNumber, setRoundNumber] = useState(1);
   const [phase, setPhase] = useState("answering");
   const [selectedChoice, setSelectedChoice] = useState(null);
   const [secondsLeft, setSecondsLeft] = useState(getRoundSeconds(difficulty));
   const [score, setScore] = useState(0);
   const [streak, setStreak] = useState(0);
   const [bestStreak, setBestStreak] = useState(0);
   const [roundHistory, setRoundHistory] = useState([]);
   const [showAnswerReview, setShowAnswerReview] = useState(false);
   const [soloFlash, setSoloFlash] = useState(null);
   const [showHelp, setShowHelp] = useState(false);
   const [sessionSeed] = useState(
      () => `solo-${Date.now()}-${Math.random().toString(36).slice(2)}`
   );
   const [soloQuestionSequenceIds] = useState(() => reserveQuestionSequence(
      language, difficulty, Number(rounds) || 5,
      `solo-${Date.now()}-${Math.random()}`
   ));

   const roundSeconds = getRoundSeconds(difficulty);
   const roomLike = {
      id: sessionSeed,
      code: sessionSeed,
      language,
      difficulty,
      rounds,
      current_round: roundNumber,
      question_sequence: soloQuestionSequenceIds,
   };
   const challenge = getChallenge(roomLike);
   const correctRounds = roundHistory.filter((round) => round.isCorrect).length;
   const accuracy = roundHistory.length
      ? Math.round((correctRounds / roundHistory.length) * 100)
      : 0;
   const averageResponse = roundHistory.length
      ? (
           roundHistory.reduce((total, round) => total + round.responseSeconds, 0) /
           roundHistory.length
        ).toFixed(1)
      : "0.0";
   const fastestFix = roundHistory.length
      ? Math.min(...roundHistory.map((round) => round.responseSeconds)).toFixed(1)
      : "—";

   useEffect(() => {
      if (!introDone || phase !== "answering") return;
      if (secondsLeft <= 0) {
         finishRound(-1, true);
         return;
      }
      const timer = window.setTimeout(() => {
         setSecondsLeft((previous) => Math.max(0, previous - 1));
      }, 1000);
      return () => window.clearTimeout(timer);
   }, [phase, secondsLeft]);

   function finishRound(choiceIndex, timedOut = false) {
      if (phase !== "answering") return;
      const isCorrect = !timedOut && choiceIndex === challenge.correct;
      const points = isCorrect
         ? getBasePoints(difficulty) + Math.max(0, secondsLeft * 2)
         : 0;
      const responseSeconds = Math.max(0, roundSeconds - secondsLeft);
      setScore((previous) => previous + points);
      setRoundHistory((previous) => [
         ...previous,
         {
            roundNumber,
            isCorrect,
            points,
            responseSeconds,
            timedOut,
            title: challenge.title,
            code: challenge.code,
            question: challenge.question,
            selectedAnswer: timedOut ? null : challenge.choices[choiceIndex],
            correctAnswer: challenge.choices[challenge.correct],
            explanation: challenge.explanation,
         },
      ]);
      if (isCorrect) {
         setStreak((previous) => {
            const next = previous + 1;
            setBestStreak((best) => Math.max(best, next));
            return next;
         });
      } else {
         setStreak(0);
      }
      setSoloFlash(isCorrect ? "correct" : "wrong");
      window.setTimeout(() => setSoloFlash(null), 650);
      setPhase("results");
      playGameSound(isCorrect ? "correct" : "reveal");
   }

   useEffect(() => {
      if (phase !== "results") return;
      const timeout = window.setTimeout(() => {
         if (roundNumber >= Number(rounds)) setPhase("finished");
         else nextRound();
      }, 3000);
      return () => window.clearTimeout(timeout);
   }, [phase, roundNumber, rounds]);

   function nextRound() {
      if (roundNumber >= rounds) {
         setPhase("finished");
         playGameSound("win");
         return;
      }
      setRoundNumber((previous) => previous + 1);
      setSelectedChoice(null);
      setSecondsLeft(roundSeconds);
      setPhase("answering");
   }

   function restartPractice() {
      setRoundNumber(1);
      setPhase("answering");
      setSelectedChoice(null);
      setSecondsLeft(roundSeconds);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setRoundHistory([]);
      completedSoloMissionRef.current = false;
      setShowAnswerReview(false);
   }

   const completedSoloMissionRef = useRef(false);
   useEffect(() => {
      if (phase !== "finished" || completedSoloMissionRef.current) return;
      completedSoloMissionRef.current = true;
      onCompleted?.("solo");
      if (difficulty === "Rookie") onCompleted?.("rookie");
   }, [phase, difficulty, onCompleted]);
   const [showFinalReport, setShowFinalReport] = useState(false);
   useEffect(() => {
      if (phase !== "finished") { setShowFinalReport(false); return; }
      const timeout = window.setTimeout(() => setShowFinalReport(true), 3400);
      return () => window.clearTimeout(timeout);
   }, [phase]);
   if (phase === "finished" && !showFinalReport) {
      return <ArenaReveal title="🏆 PRACTICE COMPLETE" subtitle={`${playerName} · ${score} points · ${correctRounds}/${rounds} bugs fixed`} playerLook={characterLook} playerResult="correct" winnerSide="left" leaderboard={[{id:"solo",name:playerName,score}]} onContinue={() => setShowFinalReport(true)} buttonLabel="View practice report" />;
   }
   if (phase === "finished") {
      return (
         <main className="app result-app solo-result-app">
            <div className="mode-action-controls">
               <ModeHelpButton onClick={() => setShowHelp(true)} />
               <button type="button" className="mode-leave-button" onClick={onExit}>← Leave</button>
            </div>
            {showHelp && <GameModeTutorial mode="solo" onStart={() => setShowHelp(false)} />}
            <nav className="navbar">
               <Logo />
               <div className="status">
                  <span className="status-dot"></span>
                  SOLO RUN COMPLETE
               </div>
            </nav>
            <section className="game-page final-game-page">
               <CaterpillarMascot mode="trophy" />
               <div className="game-shell final-shell">
                  <p className="eyebrow">// PRACTICE REPORT</p>
                  <h2 className="game-title victory-title">RUN COMPLETE</h2>
                  <div className="winner-card personal-finish win-finish">
                     <span className="winner-crown">🐛</span>
                     <p>Solo Debugger</p>
                     <h2>{playerName}</h2>
                     <strong>{score} PTS</strong>
                     <span className="finish-message">
                        Practice complete. Review the report and run it back.
                     </span>
                  </div>
                  <div className="match-stats-grid">
                     <div className="match-stat-card">
                        <span>BUGS FIXED</span>
                        <strong>{correctRounds}/{rounds}</strong>
                     </div>
                     <div className="match-stat-card">
                        <span>ACCURACY</span>
                        <strong>{accuracy}%</strong>
                     </div>
                     <div className="match-stat-card">
                        <span>BEST STREAK</span>
                        <strong>🔥 {bestStreak}</strong>
                     </div>
                     <div className="match-stat-card">
                        <span>FASTEST FIX</span>
                        <strong>⚡ {fastestFix}s</strong>
                     </div>
                  </div>
                  <div className="performance-award">
                     <span>⚡</span>
                     <div>
                        <small>DEBUG REPORT</small>
                        <strong>
                           {correctRounds === rounds
                              ? "FLAWLESS DEBUGGER"
                              : bestStreak >= 3
                                 ? "HOT STREAK"
                                 : accuracy >= 60
                                    ? "BUG SQUASHER"
                                    : "KEEP DEBUGGING"}
                        </strong>
                        <p>Average response time: {averageResponse}s</p>
                     </div>
                  </div>
                  <AnswerReview rounds={roundHistory} open={showAnswerReview} onToggle={() => setShowAnswerReview(value => !value)} />
                  <div className="solo-result-actions">
                     <button
                        className="primary-button full-button"
                        onClick={restartPractice}
                     >
                        Practice Again
                     </button>
                     <button
                        className="leave-button full-button"
                        onClick={onExit}
                     >
                        Back Home
                     </button>
                  </div>
               </div>
            </section>
         </main>
      );
   }

   if (introDone && phase === "results") {
      const last = roundHistory[roundHistory.length - 1];
      return <ArenaReveal title={last?.isCorrect ? "✓ BUG SQUASHED!" : last?.timedOut ? "⌛ TIME'S UP!" : "✕ NOT QUITE!"} subtitle={`${last?.isCorrect ? `+${last.points} points` : "0 points"} · Correct fix: ${challenge.choices[challenge.correct]}`} playerLook={characterLook} playerResult={last?.isCorrect ? "correct" : "wrong"} countdown={true} />;
   }
   const latestRound = roundHistory[roundHistory.length - 1];
   if (!introDone) return <AnimatedDebugRoom playerLook={characterLook} onReady={() => setIntroDone(true)} title="SOLO PRACTICE" introKey={`solo-${playerName}-${rounds}`} playerName={playerName} />;

   return (
      <main className={`app home-app bh-room-gameplay solo-game-feedback ${soloFlash ? `answer-flash-${soloFlash}` : ""} ${secondsLeft <= 5 && phase === "answering" ? "solo-timer-critical" : ""}`}>
         <ActiveArenaBackdrop playerLook={characterLook} />
         {soloFlash && (
            <div className={`answer-feedback-pop answer-feedback-${soloFlash}`}>
               {soloFlash === "correct" ? `🐛 BUG SQUASHED · +${latestRound?.points ?? 0}` : "✕ BUG ESCAPED"}
            </div>
         )}
         <div className="mode-action-controls">
            <ModeHelpButton onClick={() => setShowHelp(true)} />
            <button type="button" className="mode-leave-button" onClick={onExit}>← Leave</button>
         </div>
         {showHelp && <GameModeTutorial mode="solo" onStart={() => setShowHelp(false)} />}
         <nav className="navbar">
            <Logo />
            <div className="status">
               <span className="status-dot"></span>
               SOLO PRACTICE
            </div>
         </nav>
         <section className="game-page">
            <div className="game-shell">
               <div className="bh-battle-stage bh-solo-stage" aria-label="Solo debugger in the arena">
                  <div className="bh-battle-stage__player bh-battle-stage__player--left">
                     <div className="bh-battle-stage__avatar"><DebuggerCharacter look={characterLook} /></div>
                     <div className="bh-battle-stage__info"><strong>{playerName}</strong><span>{score} PTS</span></div>
                  </div>
                  <div className="bh-battle-stage__center"><span>⚡</span><strong>SOLO DEBUG</strong><small>Find it. Fix it. Improve.</small></div>
               </div>
               <div className="round-topbar">
                  <div>
                     <p className="eyebrow">
                        // {difficulty.toUpperCase()} • {language.toUpperCase()} • SOLO
                     </p>
                     <h2 className="game-title">
                        ROUND {roundNumber} / {rounds}
                     </h2>
                  </div>
                  <div className={secondsLeft <= 10 ? "timer timer-danger" : "timer"}>
                     {secondsLeft}s
                  </div>
               </div>
               <div className="round-progress">
                  <span
                     style={{
                        width: `${(roundNumber / rounds) * 100}%`,
                     }}
                  ></span>
               </div>
               <div className="game-grid">
                  <div className="challenge-card">
                     <div className="challenge-heading">
                        <div>
                           <span className="challenge-number">BUG #{roundNumber}</span>
                           <h2>{challenge.title}</h2>
                        </div>
                        <div className="challenge-badges">
                           <span className="concept-chip">{challenge.concept}</span>
                           <span className={`difficulty-chip difficulty-${difficulty.toLowerCase()}`}>
                              {difficulty}
                           </span>
                           <span className="bug-chip">🐛 FIND THE BUG</span>
                        </div>
                     </div>
                     <pre className="game-code"><code>{challenge.code}</code></pre>
                     {phase === "answering" ? (
                        <>
                           {challenge.lesson && (
                              <div className="rookie-primer">
                                 <span className="rookie-primer-label">🌱 QUICK TIP</span>
                                 <p>{challenge.lesson}</p>
                              </div>
                           )}
                           <h3 className="question">{challenge.question}</h3>
                           <div className="answer-grid">
                              {challenge.choices.map((choice, index) => (
                                 <button
                                    className={selectedChoice === index ? "answer-option selected" : "answer-option"}
                                    key={`${index}-${choice}`}
                                    onClick={() => setSelectedChoice(index)}
                                 >
                                    <span>{String.fromCharCode(65 + index)}</span>
                                    {choice}
                                 </button>
                              ))}
                           </div>
                           <button
                              className="primary-button submit-answer"
                              disabled={selectedChoice === null}
                              onClick={() => finishRound(selectedChoice)}
                           >
                              Lock In Answer
                           </button>
                        </>
                     ) : (
                        <div className="result-panel">
                           <CaterpillarMascot
                              mode={roundNumber >= rounds ? "trophy" : "sprint"}
                           />
                           <p className="eyebrow">// BUG EXPLAINED</p>
                           <div className="explanation-meta">
                              <span className="concept-chip">CONCEPT: {challenge.concept}</span>
                              {streak >= 2 && (
                                 <span className="streak-chip">🔥 {streak} BUG STREAK</span>
                              )}
                           </div>
                           <h3>Correct fix: {challenge.choices[challenge.correct]}</h3>
                           <p>{challenge.explanation}</p>
                           <div className={latestRound?.isCorrect ? "personal-result correct" : "personal-result incorrect"}>
                              {latestRound?.isCorrect
                                 ? `✓ Correct! +${latestRound.points} points`
                                 : latestRound?.timedOut
                                    ? "⌛ Time expired — 0 points"
                                    : "✕ Not quite — 0 points"}
                           </div>
                           <button className="primary-button submit-answer" onClick={nextRound}>
                              {roundNumber >= rounds ? "View Practice Report" : "Next Round →"}
                           </button>
                        </div>
                     )}
                  </div>
                  <aside className="match-sidebar">
                     <div className="sidebar-card solo-score-card">
                        <div className="sidebar-heading">
                           <h3>Solo Run</h3>
                           <span>{correctRounds}/{roundHistory.length} fixed</span>
                        </div>
                        <div className="solo-live-score">
                           <small>SCORE</small>
                           <strong>{score}</strong>
                           <span>PTS</span>
                        </div>
                     </div>
                     <div className="sidebar-card mini-rules">
                        <h3>Practice Goals</h3>
                        <p>Fix bugs accurately</p>
                        <p>Answer faster for bonus points</p>
                        <p>Build a correct-answer streak</p>
                        <div className={streak >= 2 ? "streak-status active" : "streak-status"}>
                           <span>🔥</span>
                           <strong>{streak} BUG STREAK</strong>
                           <small>Consecutive correct fixes</small>
                        </div>
                     </div>
                  </aside>
               </div>
            </div>
         </section>
      </main>
   );
}

function PlayerAvatar({ player, avatarMap = {}, large = false }) {
   const avatarId = player?.user_id ? avatarMap[player.user_id] : null;
   const fallback = player?.name?.charAt(0)?.toUpperCase() || "D";
   const icons = {
      "avatar-default": "👩‍💻",
      "avatar-caterpillar": "🐛",
      "avatar-robot": "🤖",
      "avatar-wizard": "🧙",
      "avatar-astronaut": "🧑‍🚀",
      "avatar-ghost": "👾",
      "avatar-crown": "👑",
      "avatar-dragon": "🐉",
   };
   return (
      <span className={`match-player-avatar ${large ? "match-player-avatar-large" : ""}`}>
         {avatarId ? (icons[avatarId] ?? fallback) : fallback}
      </span>
   );
}
function MatchProfileBadge({ badgeId }) {
   const badges = {
      "rank-1": ["👑", "#1"], "rank-3": ["🏆", "TOP 3"], "rank-5": ["⚡", "TOP 5"],
      "first-fix": ["🐛", "FIRST FIX"], "ten-bugs": ["🔧", "BUG HUNTER"], "fifty-bugs": ["🧠", "BUG CRUSHER"],
      "hundred-bugs": ["💯", "CENTURY"], "first-win": ["🥇", "FIRST WIN"], "ten-wins": ["⚔️", "10 WINS"],
      "twenty-five-wins": ["👑", "ROYALTY"], "streak-3": ["🔥", "ON FIRE"], "streak-5": ["🌶️", "HOT STREAK"],
      "streak-10": ["🌋", "STREAK MASTER"], "level-5": ["◆", "LVL 5"], "level-10": ["💠", "CODE BREAKER"],
      "level-20": ["🌟", "ELITE"], "fifty-games": ["🎮", "GRINDER"], "score-10k": ["🚀", "10K CLUB"],
   };
   const badge = badges[badgeId];
   if (!badge) return null;
   return <span className="match-profile-badge" title={badge[1]}><b>{badge[0]}</b>{badge[1]}</span>;
}

function usePlayerBadges(players = []) {
   const [badgeMap, setBadgeMap] = useState({});
   useEffect(() => {
      const ids = [...new Set(players.map((player) => player.user_id).filter(Boolean))];
      if (!ids.length) { setBadgeMap({}); return; }
      let active = true;
      supabase.from("profiles").select("id,equipped_badge").in("id", ids).then(({ data, error }) => {
         if (!active) return;
         if (error) { console.error("Couldn't load match badges:", error); return; }
         setBadgeMap(Object.fromEntries((data ?? []).map((row) => [row.id, row.equipped_badge])));
      });
      return () => { active = false; };
   }, [players.map((player) => `${player.id}:${player.user_id ?? ""}`).join("|")]);
   return badgeMap;
}

function usePlayerAvatars(players = []) {
   const [avatarMap, setAvatarMap] = useState({});
   useEffect(() => {
      const ids = [...new Set(players.map((player) => player.user_id).filter(Boolean))];
      if (!ids.length) {
         setAvatarMap({});
         return;
      }
      let active = true;
      supabase
         .from("equipped_cosmetics")
         .select("user_id,avatar_id")
         .in("user_id", ids)
         .then(({ data, error }) => {
            if (!active) return;
            if (error) {
               console.error("Couldn't load match avatars:", error);
               return;
            }
            setAvatarMap(Object.fromEntries((data ?? []).map((row) => [row.user_id, row.avatar_id])));
         });
      return () => {
         active = false;
      };
   }, [players.map((player) => `${player.id}:${player.user_id ?? ""}`).join("|")]);
   return avatarMap;
}
function GameModeTutorial({ mode = "classic", onStart }) {
   const tutorials = {
      classic: {
         eyebrow: "// CLASSIC MODE",
         title: "Find it. Fix it. Beat them to it.",
         steps: [
            "Read the broken code and find the bug.",
            "Choose the correct fix and lock in your answer.",
            "Correct + fast answers score more points. Build streaks and win.",
         ],
      },
      quick: {
         eyebrow: "// QUICK MATCH",
         title: "Jump in. Debug fast. Climb higher.",
         steps: [
            "Quick Match pairs you with other developers automatically.",
            "Read each broken snippet and lock in the correct fix.",
            "Fast, correct answers earn more points. Finish with the highest score.",
         ],
      },
      race: {
         eyebrow: "// RACE MODE",
         title: "First correct fix wins the round.",
         steps: [
            "Everyone receives the same bug at the same time.",
            "Find the correct fix and lock it in before your opponents.",
            "The first correct debugger takes the round. Race through all 5 bugs.",
         ],
      },
      timed: {
         eyebrow: "// TIMED MODE",
         title: "Fix as many bugs as you can in 90 seconds.",
         steps: [
            "Your 90-second clock keeps running while you debug.",
            "Correct fixes add points and immediately move you to the next bug.",
            "Wrong answers cost points. Fix the most bugs before time expires.",
         ],
      },
      solo: {
         eyebrow: "// SOLO PRACTICE",
         title: "Sharpen your debugging skills at your own pace.",
         steps: [
            "Read the broken code and identify what is wrong.",
            "Choose the correct fix before the round timer expires.",
            "Practice accuracy, speed, and streaks without multiplayer pressure.",
         ],
      },
   };
   const content = tutorials[mode] ?? tutorials.classic;
   return (
      <div className="tutorial-backdrop">
         <div className="tutorial-card">
            <span className="tutorial-bug">🐛</span>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2>{content.title}</h2>
            <div className="tutorial-steps">
               {content.steps.map((step, index) => (
                  <div key={step}><b>{index + 1}</b><span>{step}</span></div>
               ))}
            </div>
            <button className="primary-button tutorial-start-button" onClick={onStart}>
               Start Debugging
            </button>
         </div>
      </div>
   );
}
function ModeHelpButton({ onClick, label = "How to play" }) {
   return (
      <button
         type="button"
         className="mode-help-button"
         onClick={onClick}
         title={label}
         aria-label={label}
      >
         ?
      </button>
   );
}
function PlayerLeftNotice({ message }) {
   if (!message) return null;
   return <div className="player-left-notice">🐛 {message}</div>;
}
function Lobby({
   room,
   players,
   currentPlayer,
   loading,
   error,
   onStart,
   onLeave,
   showTutorial,
   setShowTutorial,
   playerNotice,
   localCharacterLook,
}) {
   const [copied, setCopied] = useState(false);
   const tutorialMode = room?.game_mode || "classic";
   const tutorialKey = `bughunt-tutorial-seen-${tutorialMode}`;
   const [showModeTutorial, setShowModeTutorial] = useState(
      () => window.localStorage.getItem(tutorialKey) !== "1"
   );
   const avatarMap = usePlayerAvatars(players);
   const badgeMap = usePlayerBadges(players);
   const [battleLooks, setBattleLooks] = useState({});
   const [entranceOpen, setEntranceOpen] = useState(true);
   useEffect(() => {
      if (!entranceOpen) return;
      const introTimer = window.setTimeout(() => setEntranceOpen(false), 2200);
      return () => window.clearTimeout(introTimer);
   }, [entranceOpen]);
   const matchIdentity = `${room?.id ?? "room"}-${room?.match_number ?? 1}`;
   const lastMatchIdentity = useRef(matchIdentity);
   useEffect(() => {
      if (lastMatchIdentity.current !== matchIdentity) {
         lastMatchIdentity.current = matchIdentity;
         setEntranceOpen(true);
      }
   }, [matchIdentity]);
   useEffect(() => {
      const ids = [...new Set(players.map((player) => player.user_id).filter(Boolean))];
      if (!ids.length) { setBattleLooks({}); return; }
      let active = true;
      supabase.from("debugger_characters").select("user_id,look").in("user_id", ids)
         .then(({ data, error }) => {
            if (!active) return;
            if (error) { console.error("Couldn't load match characters:", error); return; }
            setBattleLooks(Object.fromEntries((data ?? []).map((row) => [row.user_id, row.look])));
         });
      return () => { active = false; };
   }, [players.map((player) => `${player.id}:${player.user_id ?? ""}`).join("|")]);
   const characterForPlayer = (player) => player?.id === currentPlayer?.id
      ? localCharacterLook || DEFAULT_LOOK
      : (player?.user_id && battleLooks[player.user_id]) || DEFAULT_LOOK;
   const battlePlayers = [currentPlayer, ...players.filter((player) => player.id !== currentPlayer?.id)].filter(Boolean).slice(0, 2);

   async function copyRoomCode() {
      try {
         await navigator.clipboard.writeText(room?.code ?? "");
         setCopied(true);
         window.setTimeout(() => setCopied(false), 1600);
      } catch (copyError) {
         console.error("Couldn't copy room code:", copyError);
      }
   }
   return (
      <main className="app">
         <PlayerLeftNotice message={playerNotice} />
         <ModeHelpButton onClick={() => setShowModeTutorial(true)} />
         {showModeTutorial && (
            <GameModeTutorial
               mode={tutorialMode}
               onStart={() => {
                  window.localStorage.setItem(tutorialKey, "1");
                  setShowModeTutorial(false);
               }}
            />
         )}
         <nav className="navbar">
            <Logo />
         </nav>
         <section className="lobby-page mascot-lobby-page">
            <CaterpillarMascot mode="lobby" />
            <div className="lobby-heading">
               <p className="eyebrow">
                  // WAITING FOR DEVELOPERS
               </p>
               <h2>Game Lobby</h2>
               <div className="room-code-share">
                  <span>ROOM CODE</span>
                  <strong>{room?.code}</strong>
                  <button
                     type="button"
                     className={copied ? "copy-code-button copied" : "copy-code-button"}
                     onClick={copyRoomCode}
                  >
                     {copied ? "✓ COPIED" : "COPY"}
                  </button>
               </div>
            </div>
            <div className="lobby-grid">
               <div className="players-panel">
                  <div className="panel-heading">
                     <h3>Players</h3>
                     <span>{players.length} / 4</span>
                  </div>
                  {players.map((player) => (
                     <div
                        className="player-row"
                        key={player.id}
                     >
                        <div className="player-avatar">
                           <PlayerAvatar player={player} avatarMap={avatarMap} />
                        </div>
                        <div>
                           <strong className="player-name-with-badge">{player.name}{player.user_id && <MatchProfileBadge badgeId={badgeMap[player.user_id]} />}</strong>
                           <p>
                              {player.is_host ? "Host" : "Player"}
                           </p>
                        </div>
                        <span className="ready">
                           READY
                        </span>
                     </div>
                  ))}
                  {players.length < 2 && (
                     <div className="waiting-player">
                        Waiting for another developer...
                     </div>
                  )}
               </div>
               <div className="game-settings-panel">
                  <h3>Game Settings</h3>
                  <Setting
                     label="Language"
                     value={room?.language}
                  />
                  <Setting
                     label="Difficulty"
                     value={room?.difficulty}
                  />
                  <Setting
                     label="Rounds"
                     value={room?.rounds}
                  />
                  <Setting
                     label="Mode"
                     value={(room?.game_mode ?? "classic").toUpperCase()}
                  />
                  {error && (
                     <p className="form-error">
                        {error}
                     </p>
                  )}
                  {currentPlayer?.is_host ? (
                     <button
                        className="primary-button full-button"
                        onClick={onStart}
                        disabled={players.length < 2 || loading}
                     >
                        {loading
                           ? "Starting Game..."
                           : players.length < 2
                              ? "Waiting for Players"
                              : "Start Game"}
                     </button>
                  ) : (
                     <button
                        className="primary-button full-button"
                        disabled
                     >
                        Waiting for Host
                     </button>
                  )}
                  <button
                     className="leave-button"
                     onClick={onLeave}
                     disabled={loading}
                  >
                     {loading ? "Leaving..." : "Leave Room"}
                  </button>
               </div>
            </div>
         </section>
      </main>
   );
}
const CHALLENGES = {
   "C++": [
      {
         title: "Off-by-One Vector",
         code: "vector<int> v = {4, 7, 9};\ncout << v[3];",
         question: "What is wrong?",
         choices: ["Index 3 is out of bounds", "Vectors start at 1", "cout needs a string", "v must be const"],
         correct: 0,
         explanation: "A three-element vector has valid indexes 0 through 2.",
      },
      {
         title: "Wrong Loop Bound",
         code: "for (int i = 0; i <= 5; i++) {\n   cout << items[i];\n}",
         question: "If items has 5 elements, what should the condition be?",
         choices: ["i < 5", "i <= 5", "i > 5", "i == 5"],
         correct: 0,
         explanation: "The last valid index is 4, so the loop must stop before 5.",
      },
      {
         title: "Assignment in If",
         code: "int score = 0;\nif (score = 10) cout << \"win\";",
         question: "What operator should test equality?",
         choices: ["==", "=", "!=", "=>"],
         correct: 0,
         explanation: "= assigns; == compares.",
      },
      {
         title: "Integer Division",
         code: "double average = 5 / 2;",
         question: "Why is average 2 instead of 2.5?",
         choices: ["Both operands are integers", "double cannot store decimals", "/ rounds all doubles", "5 must be a string"],
         correct: 0,
         explanation: "Integer division occurs before the result is converted to double.",
      },
      {
         title: "Missing Semicolon",
         code: "int total = 5\ncout << total;",
         question: "What is missing after the first statement?",
         choices: [";", "{}", ":", ","],
         correct: 0,
         explanation: "C++ statements such as this declaration end with a semicolon.",
      },
      {
         title: "Uninitialized Variable",
         code: "int total;\ncout << total;",
         question: "What is the problem?",
         choices: ["total has not been initialized", "cout initializes total", "int must be a float", "total is private"],
         correct: 0,
         explanation: "A local fundamental variable can contain an indeterminate value until initialized.",
      },
      {
         title: "Wrong String Compare",
         code: "string name = \"Ada\";\nif (name = \"Bob\") cout << \"Hi\";",
         question: "What should the condition use?",
         choices: ["name == \"Bob\"", "name = \"Bob\"", "name != \"Bob\"", "name += \"Bob\""],
         correct: 0,
         explanation: "Use == to compare std::string values.",
      },
      {
         title: "Empty Vector Front",
         code: "vector<int> nums;\ncout << nums.front();",
         question: "Why is this unsafe?",
         choices: ["The vector is empty", "front() removes the first item", "front() only works on strings", "nums must be sorted"],
         correct: 0,
         explanation: "front() requires the vector to contain an element.",
      },
      {
         title: "Wrong Increment",
         code: "for (int i = 0; i < 5; i--) {\n   cout << i;\n}",
         question: "What likely causes the loop to run forever?",
         choices: ["i is decreasing instead of increasing", "i starts at zero", "cout changes i", "5 is too small"],
         correct: 0,
         explanation: "With i starting at 0, decrementing keeps i below 5.",
      },
      {
         title: "Char vs String",
         code: "char grade = \"A\";",
         question: "What should be used for a single char?",
         choices: ["'A'", "\"A\"", "A", "char(A)"],
         correct: 0,
         explanation: "Single quotes create a char; double quotes create a string literal.",
      },
      {
         title: "Missing Return",
         code: "int add(int a, int b) {\n   a + b;\n}",
         question: "What is missing?",
         choices: ["return a + b;", "cout << a + b;", "break;", "void;"],
         correct: 0,
         explanation: "A non-void function must return its result.",
      },
      {
         title: "Wrong Boolean Operator",
         code: "if (age >= 18 || hasTicket) enter();",
         question: "If BOTH conditions are required, what should replace ||?",
         choices: ["&&", "!", "==", "^"],
         correct: 0,
         explanation: "&& requires both operands to be true.",
      },
      {
         title: "Array Size",
         code: "int nums[3] = {1,2,3};\nnums[3] = 4;",
         question: "Which index is invalid?",
         choices: ["3", "2", "1", "0"],
         correct: 0,
         explanation: "A size-3 array has indexes 0, 1, and 2.",
      },
      {
         title: "Pass by Value",
         code: "void doubleIt(int x) { x *= 2; }\nint n = 4;\ndoubleIt(n);",
         question: "Why is n still 4?",
         choices: ["x is a copy of n", "multiplication cannot modify ints", "functions cannot change variables", "n is const"],
         correct: 0,
         explanation: "Pass-by-value modifies only the local copy.",
      },
      {
         title: "Case Sensitive Name",
         code: "int totalScore = 8;\ncout << totalscore;",
         question: "Why does this fail?",
         choices: ["C++ identifiers are case-sensitive", "cout lowercases names", "Variables cannot contain capitals", "score is reserved"],
         correct: 0,
         explanation: "totalScore and totalscore are different identifiers.",
      },
      {
         title: "Wrong Input Type",
         code: "int age;\ncin >> name;",
         question: "Assuming name was never declared, what is the bug?",
         choices: ["The input targets an undeclared variable", "cin cannot read text", "age must be double", "cin needs parentheses"],
         correct: 0,
         explanation: "The declared variable is age, but the code reads into name.",
      },
      {
         title: "Switch Fallthrough",
         code: "switch (choice) {\n case 1: cout << \"A\";\n case 2: cout << \"B\";\n}",
         question: "How do you normally stop case 1 from continuing into case 2?",
         choices: ["Add break;", "Add return 0 before switch", "Use continue", "Use else"],
         correct: 0,
         explanation: "break exits the switch case.",
      },
      {
         title: "Vector Push",
         code: "vector<int> nums;\nnums.push(5);",
         question: "Which vector function should add an item?",
         choices: ["push_back(5)", "append(5)", "insert_back(5)", "add(5)"],
         correct: 0,
         explanation: "std::vector uses push_back to append an element.",
      },
      {
         title: "String Length Call",
         code: "string word = \"bug\";\ncout << word.length;",
         question: "What is missing?",
         choices: ["Parentheses: word.length()", "A semicolon before length", "An index", "The keyword new"],
         correct: 0,
         explanation: "length is a member function and must be called.",
      },
      {
         title: "Modulo Check",
         code: "if (n % 2 == 1) cout << \"even\";",
         question: "What value should identify an even integer?",
         choices: ["0", "1", "2", "-1"],
         correct: 0,
         explanation: "Even integers have remainder 0 when divided by 2.",
      },
      {
         title: "Wrong Max Initialization",
         code: "vector<int> v = {-8,-3,-5};\nint maxVal = 0;",
         question: "Why can this produce the wrong maximum?",
         choices: ["0 is not from the all-negative data", "Negative ints cannot be compared", "Vectors sort automatically", "maxVal must be unsigned"],
         correct: 0,
         explanation: "Starting at 0 incorrectly beats every negative value.",
      },
      {
         title: "Divide by Zero",
         code: "int d = 0;\ncout << 10 / d;",
         question: "What must be checked first?",
         choices: ["d is not zero", "d is positive only", "10 is even", "cout is open"],
         correct: 0,
         explanation: "Division by zero is invalid.",
      },
      {
         title: "While Never Changes",
         code: "int x = 0;\nwhile (x < 5) {\n   cout << x;\n}",
         question: "What is missing to let the loop finish?",
         choices: ["Update x", "Delete cout", "Make x const", "Change while to if only"],
         correct: 0,
         explanation: "The loop condition never changes because x stays 0.",
      },
      {
         title: "Wrong Function Argument Count",
         code: "int add(int a, int b);\ncout << add(5);",
         question: "What is wrong?",
         choices: ["add expects two arguments", "add must return void", "5 must be double", "cout cannot call functions"],
         correct: 0,
         explanation: "The declared function requires two arguments.",
      },
      {
         title: "Const Modification",
         code: "const int limit = 10;\nlimit = 20;",
         question: "Why does this fail?",
         choices: ["A const variable cannot be reassigned", "20 is too large", "limit is a function", "const only accepts zero"],
         correct: 0,
         explanation: "const prevents reassignment after initialization.",
      },
      {
         title: "String Index",
         code: "string s = \"cat\";\ncout << s[3];",
         question: "What is the last valid index?",
         choices: ["2", "3", "1", "4"],
         correct: 0,
         explanation: "A three-character string uses indexes 0 through 2.",
      },
      {
         title: "Else Pairing",
         code: "if (ready)\n   start();\n   log();\nelse\n   wait();",
         question: "Why is this invalid?",
         choices: ["else no longer directly follows its if statement", "log must return bool", "else needs parentheses", "ready must be int"],
         correct: 0,
         explanation: "Without braces, only start() belongs to the if; log() separates else from its if.",
      },
      {
         title: "Scope Error",
         code: "if (ready) {\n   int code = 7;\n}\ncout << code;",
         question: "Why can't code be printed there?",
         choices: ["code is scoped to the if block", "cout cannot print ints", "code is reserved", "ready deletes code"],
         correct: 0,
         explanation: "A variable declared inside braces is not visible outside that block.",
      },
      {
         title: "Wrong Logical Negation",
         code: "bool loggedIn = false;\nif (loggedIn) showLogin();",
         question: "If showLogin should run when NOT logged in, what condition fits?",
         choices: ["!loggedIn", "loggedIn == true", "loggedIn && true", "loggedIn++"],
         correct: 0,
         explanation: "! reverses the boolean value.",
      },
      {
         title: "Reference Update",
         code: "void increment(int n) { n++; }\nint score = 1;\nincrement(score);",
         question: "Which parameter lets the function update score directly?",
         choices: ["int& n", "const int n", "double n", "int* n = nullptr only"],
         correct: 0,
         explanation: "A non-const reference parameter aliases the caller's variable.",
      },
      {
         title: "Erase Iterator",
         code: "for (auto it=v.begin(); it!=v.end(); ++it)\n if (*it==0) v.erase(it);",
         question: "What must be handled after erase?",
         choices: ["Use the iterator returned by erase", "Restart the program", "Sort v", "Convert it to an index"],
         correct: 0,
         explanation: "erase invalidates the erased iterator and returns the next valid one.",
      },
      {
         title: "Unsigned Reverse Loop",
         code: "for (size_t i=v.size()-1; i>=0; --i) use(v[i]);",
         question: "Why can this fail to terminate?",
         choices: ["size_t is unsigned and wraps below zero", "size_t cannot decrement", "v.size() is signed", "use changes i"],
         correct: 0,
         explanation: "Unsigned zero decremented wraps to a very large value.",
      },
      {
         title: "Dangling Pointer",
         code: "int* p;\n{ int x=5; p=&x; }\ncout << *p;",
         question: "What is wrong?",
         choices: ["p points to an object whose lifetime ended", "Pointers cannot point to ints", "x becomes zero", "cout owns p"],
         correct: 0,
         explanation: "x is destroyed at the end of its block.",
      },
      {
         title: "Shallow Raw Pointer Copy",
         code: "struct Box { int* p; };\nBox a{new int(3)};\nBox b=a;",
         question: "What danger exists if both destructors delete p?",
         choices: ["Double deletion", "Integer overflow", "Object slicing", "Deadlock"],
         correct: 0,
         explanation: "The default copy duplicates the pointer value, not the allocation.",
      },
      {
         title: "Lambda Capture",
         code: "int x=1;\nauto f=[x]() mutable { x++; };\nf();\ncout<<x;",
         question: "Why is outer x still 1?",
         choices: ["x was captured by value", "mutable makes x global", "Lambdas cannot change ints", "cout resets x"],
         correct: 0,
         explanation: "A value capture modifies the lambda's own copy.",
      },
      {
         title: "Map Missing Key",
         code: "map<string,int> m;\ncout << m[\"bugs\"];",
         question: "What side effect does operator[] have?",
         choices: ["It inserts the missing key with a default value", "It throws always", "It deletes the map", "It sorts descending"],
         correct: 0,
         explanation: "map::operator[] inserts a value-initialized entry when the key is absent.",
      },
      {
         title: "Move After Use",
         code: "string a=\"debug\";\nstring b=std::move(a);\ncout<<a;",
         question: "What can you safely assume about a?",
         choices: ["It is valid but its value is unspecified", "It still equals debug", "It is destroyed", "It is null"],
         correct: 0,
         explanation: "Moved-from standard objects remain valid but have an unspecified value.",
      },
      {
         title: "Vector Reallocation",
         code: "int* p=&v[0];\nv.push_back(99);\ncout<<*p;",
         question: "Why might p become invalid?",
         choices: ["push_back may reallocate the vector", "Pointers cannot target vectors", "99 is temporary", "v[0] is const"],
         correct: 0,
         explanation: "Vector growth can move its storage and invalidate pointers/references.",
      },
      {
         title: "Base Nonvirtual Call",
         code: "Base* p=new Derived;\np->run();",
         question: "If Base::run is called instead of Derived::run, what is likely missing?",
         choices: ["virtual on Base::run", "static on Derived", "const on p", "friend on Base"],
         correct: 0,
         explanation: "Virtual dispatch is required for runtime polymorphism through a base pointer.",
      },
      {
         title: "Catch By Value",
         code: "catch (MyError e) { ... }",
         question: "Why prefer catch (const MyError& e)?",
         choices: ["Avoid copying and slicing", "References catch fewer errors", "const rethrows automatically", "Value catches are illegal"],
         correct: 0,
         explanation: "Catching by const reference avoids copying and preserves polymorphic information.",
      },
      {
         title: "Shared Ptr Cycle",
         code: "a->next=b;\nb->next=a;",
         question: "If both links are shared_ptr, what issue can occur?",
         choices: ["A reference cycle prevents destruction", "A compile-time loop", "Stack overflow immediately", "Pointers become unique"],
         correct: 0,
         explanation: "Mutual shared ownership can keep reference counts above zero.",
      },
      {
         title: "Optional Access",
         code: "optional<int> x;\ncout << x.value();",
         question: "What can happen?",
         choices: ["value() throws if x has no value", "It always prints zero", "optional becomes an int", "value deletes x"],
         correct: 0,
         explanation: "value() on an empty optional throws bad_optional_access.",
      },
      {
         title: "String View Lifetime",
         code: "string_view view;\n{ string s=\"hi\"; view=s; }\nuse(view);",
         question: "What is wrong?",
         choices: ["view outlives the string storage", "string_view copies all text", "view owns s", "s becomes static"],
         correct: 0,
         explanation: "string_view is non-owning and can dangle.",
      },
      {
         title: "Range For Copy",
         code: "for (auto item : objects) item.fix();",
         question: "If fix should mutate elements in objects, what should item be?",
         choices: ["auto& item", "const auto item", "auto* item always", "static auto item"],
         correct: 0,
         explanation: "The current loop variable is a copy; a reference mutates the original.",
      },
      {
         title: "Reserve vs Resize",
         code: "vector<int> v;\nv.reserve(10);\nv[0]=5;",
         question: "Why is v[0] still invalid?",
         choices: ["reserve changes capacity, not size", "reserve clears storage", "Indexes start at 1", "reserve returns a new vector"],
         correct: 0,
         explanation: "reserve allocates capacity without creating elements.",
      },
      {
         title: "Comparison Chain",
         code: "if (0 < x < 10) use(x);",
         question: "Why is this not the intended range check in C++?",
         choices: ["The first comparison becomes bool before comparing with 10", "C++ has no < operator", "x is converted to string", "10 becomes zero"],
         correct: 0,
         explanation: "C++ does not interpret chained comparisons like mathematics.",
      },
      {
         title: "Constructor Shadow",
         code: "Box(int value) { value = value; }",
         question: "Why doesn't the member get assigned?",
         choices: ["The parameter shadows the member", "Constructors cannot assign", "value is const", "Members require malloc"],
         correct: 0,
         explanation: "Both names resolve to the parameter; use this->value or an initializer list.",
      },
      {
         title: "Temporary Reference",
         code: "const char* p = string(\"hello\").c_str();",
         question: "Why can p dangle?",
         choices: ["The temporary string is destroyed after the statement", "c_str allocates nothing ever", "char pointers cannot hold text", "const destroys p"],
         correct: 0,
         explanation: "The pointer refers to storage owned by a temporary string.",
      },
      {
         title: "Wrong Sort Comparator",
         code: "sort(v.begin(),v.end(),[](int a,int b){ return a<=b; });",
         question: "Why is <= a bad comparator?",
         choices: ["sort requires a strict weak ordering", "Lambdas cannot compare ints", "sort requires ==", "<= sorts only strings"],
         correct: 0,
         explanation: "The comparator must be strict; an element must not compare less than itself.",
      },
      {
         title: "Unique Ptr Copy",
         code: "unique_ptr<int> a=make_unique<int>(3);\nauto b=a;",
         question: "Why does this fail?",
         choices: ["unique_ptr cannot be copied", "make_unique returns raw int", "auto cannot infer pointers", "3 is temporary"],
         correct: 0,
         explanation: "unique_ptr represents exclusive ownership and is move-only.",
      },
      {
         title: "Null Dereference",
         code: "Widget* w=nullptr;\nw->run();",
         question: "What must happen before dereferencing?",
         choices: ["Verify w is non-null", "Cast w to int", "Delete w", "Make run static"],
         correct: 0,
         explanation: "Calling through a null pointer is invalid.",
      },
      {
         title: "Reference Member Init",
         code: "struct S { int& ref; S(int& x) { ref=x; } };",
         question: "Why is this constructor invalid?",
         choices: ["Reference members must be initialized in the initializer list", "References cannot be members", "x must be const", "ref must be static"],
         correct: 0,
         explanation: "References must be bound during initialization.",
      },
      {
         title: "Slicing Vector",
         code: "vector<Base> items;\nitems.push_back(Derived{});",
         question: "What happens to Derived-specific state?",
         choices: ["It is sliced off", "It is heap allocated", "It becomes virtual", "It is copied into a side table"],
         correct: 0,
         explanation: "Storing derived objects by value in a base container slices them.",
      },
      {
         title: "Mutex Missing Guard",
         code: "mutex m;\nm.lock();\nwork();\nm.unlock();",
         question: "What is safer if work throws?",
         choices: ["lock_guard<mutex> guard(m);", "Call unlock first", "Use a raw pointer", "Make m const"],
         correct: 0,
         explanation: "RAII releases the mutex automatically even on exceptions.",
      },
      {
         title: "Wrong Delete",
         code: "int* p=new int[10];\ndelete p;",
         question: "What should release this allocation?",
         choices: ["delete[] p", "free(p) only", "delete &p", "p.clear()"],
         correct: 0,
         explanation: "Arrays created with new[] must be released with delete[].",
      },
      {
         title: "Copy Assignment Self",
         code: "Buffer& operator=(const Buffer& other) {\n delete[] data;\n data=new char[other.n];\n copy(other.data, other.data+other.n, data);\n return *this;\n}",
         question: "What case can break this implementation?",
         choices: ["Self-assignment", "Assigning empty strings only", "Returning *this", "Using char"],
         correct: 0,
         explanation: "If other is *this, deleting data destroys the source before copying.",
      },
      {
         title: "Narrowing Init",
         code: "int x{3.7};",
         question: "Why does brace initialization reject this?",
         choices: ["It prevents narrowing conversion", "int cannot be initialized", "Braces require strings", "3.7 is NaN"],
         correct: 0,
         explanation: "List initialization rejects narrowing from double to int.",
      },
      {
         title: "Overload Const",
         code: "struct X { int get(); };\nconst X x;\nx.get();",
         question: "Why may this fail?",
         choices: ["get is not declared const", "x cannot call methods", "int is mutable", "const objects require static methods"],
         correct: 0,
         explanation: "Methods called on const objects need a const-qualified overload.",
      },
      {
         title: "EOF Loop",
         code: "while (!file.eof()) {\n file >> value;\n use(value);\n}",
         question: "What is a safer loop condition?",
         choices: ["while (file >> value)", "while (file.eof())", "while (value)", "for (;;) only"],
         correct: 0,
         explanation: "Test the extraction itself so the body runs only after a successful read.",
      },
      {
         title: "Signed Unsigned Compare",
         code: "int i=-1;\nif (i < v.size()) use(i);",
         question: "What conversion can make this surprising?",
         choices: ["i may convert to a large unsigned value", "v.size() becomes negative", "i becomes double", "use changes size"],
         correct: 0,
         explanation: "Comparing signed int with unsigned size_type can convert the negative value to unsigned.",
      },
      {
         title: "Virtual Destructor",
         code: "// Virtual Destructor\n// Debug the behavior described.",
         question: "Deleting Derived through Base* requires what?",
         choices: ["A virtual Base destructor", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Without it, derived destruction through the base pointer is undefined.",
      },
      {
         title: "Data Race",
         code: "// Data Race\n// Debug the behavior described.",
         question: "Two threads increment the same non-atomic int. What bug is possible?",
         choices: ["A data race", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Unsynchronized concurrent writes create a data race.",
      },
      {
         title: "Deadlock Order",
         code: "// Deadlock Order\n// Debug the behavior described.",
         question: "Two threads lock mutex A/B in opposite order. What risk?",
         choices: ["Deadlock", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Opposite lock order can create circular waiting.",
      },
      {
         title: "Double Checked Locking",
         code: "// Double Checked Locking\n// Debug the behavior described.",
         question: "What primitive is usually safer for one-time initialization?",
         choices: ["std::call_once", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "call_once provides synchronized one-time initialization.",
      },
      {
         title: "ABA Problem",
         code: "// ABA Problem\n// Debug the behavior described.",
         question: "Which area commonly encounters the ABA problem?",
         choices: ["Lock-free atomic algorithms", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "ABA is a classic compare-and-swap hazard.",
      },
      {
         title: "Rule of Five",
         code: "// Rule of Five\n// Debug the behavior described.",
         question: "Owning a raw resource usually requires careful copy/move/destruction. What guideline?",
         choices: ["Rule of Five", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Resource-owning types need coherent special member behavior.",
      },
      {
         title: "Perfect Forwarding",
         code: "// Perfect Forwarding\n// Debug the behavior described.",
         question: "Which cast preserves a forwarding reference's value category?",
         choices: ["std::forward<T>(x)", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "std::forward conditionally preserves lvalue/rvalue category.",
      },
      {
         title: "Object Lifetime Placement",
         code: "// Object Lifetime Placement\n// Debug the behavior described.",
         question: "After placement new, what must be managed manually?",
         choices: ["The object's lifetime/destructor", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Placement new constructs without managing storage lifetime automatically.",
      },
      {
         title: "Strict Aliasing",
         code: "// Strict Aliasing\n// Debug the behavior described.",
         question: "Reading an object through an unrelated pointer type can violate what?",
         choices: ["Strict aliasing rules", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Unrelated typed access can produce undefined behavior.",
      },
      {
         title: "Dangling Lambda Reference",
         code: "// Dangling Lambda Reference\n// Debug the behavior described.",
         question: "A returned lambda captures a local by reference. What happens?",
         choices: ["The capture dangles", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "The local dies when its function returns.",
      },
      {
         title: "Condition Variable",
         code: "// Condition Variable\n// Debug the behavior described.",
         question: "Why must wait normally use a predicate/loop?",
         choices: ["Spurious wakeups", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Condition variables may wake without the condition becoming true.",
      },
      {
         title: "Atomic Ordering",
         code: "// Atomic Ordering\n// Debug the behavior described.",
         question: "Which ordering is weakest when only atomicity is needed?",
         choices: ["memory_order_relaxed", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Relaxed ordering provides atomicity without synchronization ordering.",
      },
      {
         title: "Exception Safety",
         code: "// Exception Safety\n// Debug the behavior described.",
         question: "What guarantee leaves program state unchanged if an operation throws?",
         choices: ["Strong exception guarantee", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "The strong guarantee commits fully or has no observable effect.",
      },
      {
         title: "Covariant Return",
         code: "// Covariant Return\n// Debug the behavior described.",
         question: "Overridden virtual functions may vary return type in what limited way?",
         choices: ["Covariant pointer/reference returns", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Derived pointer/reference return types can be covariant.",
      },
      {
         title: "Diamond Inheritance",
         code: "// Diamond Inheritance\n// Debug the behavior described.",
         question: "What can prevent duplicate shared base subobjects in a diamond?",
         choices: ["Virtual inheritance", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Virtual inheritance shares the common base.",
      },
      {
         title: "Template Dependent Name",
         code: "// Template Dependent Name\n// Debug the behavior described.",
         question: "What keyword may be required before a dependent nested type?",
         choices: ["typename", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "typename tells the parser a dependent name denotes a type.",
      },
      {
         title: "ODR",
         code: "// ODR\n// Debug the behavior described.",
         question: "Defining the same non-inline function in multiple translation units violates what?",
         choices: ["One Definition Rule", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "The ODR governs program-wide definitions.",
      },
      {
         title: "Static Init Order",
         code: "// Static Init Order\n// Debug the behavior described.",
         question: "Globals across translation units can suffer what initialization issue?",
         choices: ["Static initialization order fiasco", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Cross-unit initialization order is not generally controllable.",
      },
      {
         title: "Iterator Category",
         code: "// Iterator Category\n// Debug the behavior described.",
         question: "Which iterator category is required for std::sort?",
         choices: ["Random-access iterator", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "std::sort requires random-access iterators.",
      },
      {
         title: "Weak Pointer",
         code: "// Weak Pointer\n// Debug the behavior described.",
         question: "What smart pointer observes shared ownership without increasing refcount?",
         choices: ["weak_ptr", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "weak_ptr breaks ownership cycles and observes shared objects.",
      },
      {
         title: "CRTP",
         code: "// CRTP\n// Debug the behavior described.",
         question: "Which pattern passes Derived as a template argument to Base?",
         choices: ["CRTP", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "The Curiously Recurring Template Pattern uses Base<Derived>.",
      },
      {
         title: "VTable During Constructor",
         code: "// VTable During Constructor\n// Debug the behavior described.",
         question: "Why can virtual calls in a base constructor surprise you?",
         choices: ["They dispatch to the current construction level", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "More-derived portions are not yet constructed.",
      },
      {
         title: "Memory Leak Exception",
         code: "// Memory Leak Exception\n// Debug the behavior described.",
         question: "new succeeds, then a later operation throws before delete. Better ownership?",
         choices: ["RAII smart pointer", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "RAII ties cleanup to object lifetime.",
      },
      {
         title: "Use After Move",
         code: "// Use After Move\n// Debug the behavior described.",
         question: "What is guaranteed about most moved-from standard objects?",
         choices: ["Valid but unspecified state", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "They can be destroyed/assigned, but exact value is unspecified.",
      },
      {
         title: "False Sharing",
         code: "// False Sharing\n// Debug the behavior described.",
         question: "Threads update separate variables on the same cache line. What can hurt performance?",
         choices: ["False sharing", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Cache coherence traffic can occur despite logically separate variables.",
      },
      {
         title: "Alignment",
         code: "// Alignment\n// Debug the behavior described.",
         question: "What operator reports a type's alignment requirement?",
         choices: ["alignof", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "alignof yields the required alignment.",
      },
      {
         title: "Variant Access",
         code: "// Variant Access\n// Debug the behavior described.",
         question: "What can std::get<T> throw for the wrong active alternative?",
         choices: ["bad_variant_access", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "std::get checks the active alternative.",
      },
      {
         title: "Noexcept Move",
         code: "// Noexcept Move\n// Debug the behavior described.",
         question: "Why can noexcept move constructors matter to vector reallocation?",
         choices: ["They let containers prefer moving safely", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Containers may avoid throwing moves to preserve guarantees.",
      },
      {
         title: "Coroutine Lifetime",
         code: "// Coroutine Lifetime\n// Debug the behavior described.",
         question: "A coroutine frame may outlive the initial call. What must captured references avoid?",
         choices: ["Dangling referenced objects", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Referenced external objects must remain alive.",
      },
      {
         title: "Undefined Signed Overflow",
         code: "// Undefined Signed Overflow\n// Debug the behavior described.",
         question: "What does the standard say about signed integer overflow?",
         choices: ["It is undefined behavior", "It is always safe", "The compiler inserts a mutex", "It only affects formatting"],
         correct: 0,
         explanation: "Signed overflow is not defined to wrap in standard C++.",
      },
   ],
   "Python": [
      {
         title: "Index Too Far",
         code: "items = [\"a\",\"b\",\"c\"]\nprint(items[3])",
         question: "What happens?",
         choices: ["IndexError", "Prints c", "Prints None", "SyntaxError"],
         correct: 0,
         explanation: "Valid indexes are 0, 1, and 2.",
      },
      {
         title: "Assignment vs Compare",
         code: "score = 5\nif score = 5:\n   print(\"win\")",
         question: "What should the condition use?",
         choices: ["score == 5", "score := 5", "score = 5", "score != 5"],
         correct: 0,
         explanation: "== compares values in an if condition.",
      },
      {
         title: "Mutable Default",
         code: "def add(item, items=[]):\n   items.append(item)\n   return items",
         question: "Why can calls share old values?",
         choices: ["The default list is created once", "append is global", "Lists reset only on restart", "item is mutable"],
         correct: 0,
         explanation: "Mutable default arguments persist across calls.",
      },
      {
         title: "Integer String Add",
         code: "age = \"20\"\nprint(age + 1)",
         question: "What is the issue?",
         choices: ["str and int cannot be added directly", "Python converts 1 to text automatically", "age is undefined", "print only accepts strings"],
         correct: 0,
         explanation: "Convert age to int or 1 to str depending on intent.",
      },
      {
         title: "Missing Colon",
         code: "if ready\n   start()",
         question: "What is missing?",
         choices: [":", ";", ")", "{}"],
         correct: 0,
         explanation: "Compound statements such as if end the header with a colon.",
      },
      {
         title: "Wrong Indentation",
         code: "if ready:\nprint(\"go\")",
         question: "What does the body need?",
         choices: ["Indentation", "A semicolon", "Braces", "The keyword then"],
         correct: 0,
         explanation: "Python uses indentation to define blocks.",
      },
      {
         title: "Range Stop",
         code: "for i in range(5):\n   print(i)",
         question: "What is the final value printed?",
         choices: ["4", "5", "6", "0 only"],
         correct: 0,
         explanation: "range(5) stops before 5.",
      },
      {
         title: "List Alias",
         code: "a=[1,2]\nb=a\nb.append(3)",
         question: "Why does a also change?",
         choices: ["a and b reference the same list", "append edits every list", "Integers are references", "b is global"],
         correct: 0,
         explanation: "Assignment does not clone a list.",
      },
      {
         title: "Key Missing",
         code: "user={\"name\":\"Ada\"}\nprint(user[\"age\"])",
         question: "What error is raised?",
         choices: ["KeyError", "IndexError", "TypeError", "NameError"],
         correct: 0,
         explanation: "Bracket lookup raises KeyError for a missing dict key.",
      },
      {
         title: "None Math",
         code: "value=None\nprint(value + 1)",
         question: "Why does this fail?",
         choices: ["None cannot be added to int", "None equals zero", "print blocks math", "1 is a string"],
         correct: 0,
         explanation: "None is not a numeric zero.",
      },
      {
         title: "Wrong Boolean",
         code: "if age > 18 and < 65:\n   pass",
         question: "What is a valid condition?",
         choices: ["18 < age < 65", "age > 18 < 65", "age and 18 and 65", "18 && age && 65"],
         correct: 0,
         explanation: "Python supports chained comparisons such as 18 < age < 65.",
      },
      {
         title: "Append Result",
         code: "nums=[1,2]\nnums = nums.append(3)",
         question: "Why does nums become None?",
         choices: ["append mutates the list and returns None", "append deletes lists", "3 is invalid", "nums must be tuple"],
         correct: 0,
         explanation: "list.append changes the list in place and returns None.",
      },
      {
         title: "Sort Result",
         code: "nums=[3,1,2]\nsorted_nums = nums.sort()",
         question: "Why is sorted_nums None?",
         choices: ["list.sort returns None", "sort cannot order ints", "nums is immutable", "sort returns bool"],
         correct: 0,
         explanation: "sort mutates the list in place.",
      },
      {
         title: "Function Call",
         code: "def greet():\n   return \"hi\"\nprint(greet)",
         question: "Why doesn't this print hi?",
         choices: ["The function was not called", "return cannot hold text", "print needs await", "greet is private"],
         correct: 0,
         explanation: "Use greet() to call the function.",
      },
      {
         title: "Case Sensitive",
         code: "total = 5\nprint(Total)",
         question: "Why does this fail?",
         choices: ["Names are case-sensitive", "Python capitalizes variables", "print changes case", "total is reserved"],
         correct: 0,
         explanation: "total and Total are different names.",
      },
      {
         title: "Loop Variable",
         code: "for i in range(3):\n   print(j)",
         question: "What is wrong?",
         choices: ["j is undefined", "i cannot be printed", "range creates j", "j equals i automatically"],
         correct: 0,
         explanation: "The loop variable is i, not j.",
      },
      {
         title: "Dictionary Method",
         code: "d={\"a\":1}\nprint(d.keys)",
         question: "What is missing to get the keys view?",
         choices: ["Parentheses: d.keys()", "An index", "await", "A colon"],
         correct: 0,
         explanation: "keys is a method and must be called.",
      },
      {
         title: "String Index",
         code: "word=\"bug\"\nprint(word[3])",
         question: "What is the last valid index?",
         choices: ["2", "3", "1", "4"],
         correct: 0,
         explanation: "Three characters use indexes 0 through 2.",
      },
      {
         title: "Division Zero",
         code: "x=0\nprint(10/x)",
         question: "What exception occurs?",
         choices: ["ZeroDivisionError", "ValueError", "KeyError", "ImportError"],
         correct: 0,
         explanation: "Division by numeric zero raises ZeroDivisionError.",
      },
      {
         title: "Tuple Mutation",
         code: "point=(1,2)\npoint[0]=9",
         question: "Why does this fail?",
         choices: ["Tuples are immutable", "Indexes start at 1", "9 must be float", "point is a function"],
         correct: 0,
         explanation: "Tuple elements cannot be reassigned.",
      },
      {
         title: "Set Duplicate",
         code: "values={1,1,2}",
         question: "How many elements are in values?",
         choices: ["2", "3", "1", "0"],
         correct: 0,
         explanation: "Sets keep unique values.",
      },
      {
         title: "Input Number",
         code: "age=input(\"Age: \")\nprint(age + 1)",
         question: "What should happen before numeric addition?",
         choices: ["Convert age with int(age)", "Call age.append", "Use len(age)", "Make 1 a list"],
         correct: 0,
         explanation: "input returns a string.",
      },
      {
         title: "Wrong Membership",
         code: "if item == items:\n   print(\"found\")",
         question: "If items is a list, what usually tests membership?",
         choices: ["item in items", "item is items", "item => items", "items has item"],
         correct: 0,
         explanation: "in checks whether a collection contains a value.",
      },
      {
         title: "While Update",
         code: "x=0\nwhile x<3:\n   print(x)",
         question: "Why doesn't the loop finish?",
         choices: ["x never changes", "print resets x", "while runs once", "3 is invalid"],
         correct: 0,
         explanation: "The condition remains true because x stays 0.",
      },
      {
         title: "Return Placement",
         code: "def first(nums):\n   for n in nums:\n      return n\n      print(n)",
         question: "Why is print unreachable?",
         choices: ["It comes after return", "for blocks print", "n is local", "return only exits loop"],
         correct: 0,
         explanation: "return exits the function immediately.",
      },
      {
         title: "List Extend",
         code: "nums=[1,2]\nnums.append([3,4])",
         question: "If the goal is [1,2,3,4], what should be used?",
         choices: ["nums.extend([3,4])", "nums.add(3,4)", "nums.push([3,4])", "nums += 3"],
         correct: 0,
         explanation: "extend adds each element from the iterable.",
      },
      {
         title: "Identity vs Equality",
         code: "a=[1]\nb=[1]\nprint(a is b)",
         question: "Why is this False?",
         choices: ["is tests object identity, not equal contents", "Lists cannot be compared", "1 is immutable", "is means equals"],
         correct: 0,
         explanation: "Use == for value equality.",
      },
      {
         title: "Open File Mode",
         code: "open(\"log.txt\",\"w\")",
         question: "What can mode w do to an existing file?",
         choices: ["Truncate it before writing", "Make it read-only", "Append only", "Encrypt it"],
         correct: 0,
         explanation: "w opens for writing and truncates an existing file.",
      },
      {
         title: "Slice End",
         code: "nums=[0,1,2,3]\nprint(nums[1:3])",
         question: "What does this produce?",
         choices: ["[1, 2]", "[1, 2, 3]", "[0, 1, 2]", "[3]"],
         correct: 0,
         explanation: "The slice stop index is excluded.",
      },
      {
         title: "Boolean Text",
         code: "flag=\"False\"\nif flag:\n   print(\"yes\")",
         question: "Why does this print yes?",
         choices: ["A non-empty string is truthy", "False text becomes bool False", "if ignores strings", "Quotes create None"],
         correct: 0,
         explanation: "Non-empty strings are truthy regardless of their text.",
      },
      {
         title: "Shared Nested Lists",
         code: "# Shared Nested Lists\n# Debug the behavior described.",
         question: "Why does [[0]*3]*3 share row mutations?",
         choices: ["The inner list reference is repeated", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "List multiplication repeats references for nested mutable objects.",
      },
      {
         title: "Late Binding Closure",
         code: "# Late Binding Closure\n# Debug the behavior described.",
         question: "Why do lambdas in a loop often see the final loop value?",
         choices: ["They look up the captured variable when called", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Closures capture the variable rather than freezing each value.",
      },
      {
         title: "Missing Await",
         code: "# Missing Await\n# Debug the behavior described.",
         question: "What does calling an async function without await return?",
         choices: ["A coroutine object", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Async functions produce coroutine objects until awaited.",
      },
      {
         title: "Modify While Iterating",
         code: "# Modify While Iterating\n# Debug the behavior described.",
         question: "Why can removing list items inside a for loop skip values?",
         choices: ["Indexes shift during iteration", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Mutation changes positions under the iterator.",
      },
      {
         title: "Exception Order",
         code: "# Exception Order\n# Debug the behavior described.",
         question: "Why put ValueError before Exception?",
         choices: ["Exception would catch ValueError first", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Specific handlers must precede broad parent handlers.",
      },
      {
         title: "Generator Exhaustion",
         code: "# Generator Exhaustion\n# Debug the behavior described.",
         question: "Why is list(gen) empty the second time?",
         choices: ["The generator was already exhausted", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Generators are one-pass iterators.",
      },
      {
         title: "Shallow Copy",
         code: "# Shallow Copy\n# Debug the behavior described.",
         question: "Why can copy.copy preserve shared nested objects?",
         choices: ["It only copies the outer container", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Shallow copies retain nested references.",
      },
      {
         title: "Class Attribute",
         code: "# Class Attribute\n# Debug the behavior described.",
         question: "Why can a mutable class attribute be shared by instances?",
         choices: ["It belongs to the class unless shadowed", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Class attributes are shared lookup state.",
      },
      {
         title: "Finally Return",
         code: "# Finally Return\n# Debug the behavior described.",
         question: "Why is return inside finally dangerous?",
         choices: ["It can suppress an active exception or earlier return", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "finally executes during function exit.",
      },
      {
         title: "Dict During Iteration",
         code: "# Dict During Iteration\n# Debug the behavior described.",
         question: "What happens if dictionary size changes while iterating it?",
         choices: ["RuntimeError may be raised", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Changing dictionary size invalidates active iteration.",
      },
      {
         title: "Unpacking Count",
         code: "# Unpacking Count\n# Debug the behavior described.",
         question: "a,b = [1,2,3] fails for what reason?",
         choices: ["Too many values to unpack", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Two targets cannot receive three values.",
      },
      {
         title: "Default Binding",
         code: "# Default Binding\n# Debug the behavior described.",
         question: "When are ordinary default argument expressions evaluated?",
         choices: ["At function definition time", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Defaults are evaluated once when def executes.",
      },
      {
         title: "Global Assignment",
         code: "# Global Assignment\n# Debug the behavior described.",
         question: "Why does assigning x inside a function make x local by default?",
         choices: ["Assignment creates a local binding unless global/nonlocal is declared", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Python determines local names from assignments.",
      },
      {
         title: "Nonlocal",
         code: "# Nonlocal\n# Debug the behavior described.",
         question: "Which keyword updates a variable in the nearest enclosing function scope?",
         choices: ["nonlocal", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "nonlocal targets an enclosing lexical scope.",
      },
      {
         title: "Hashable Key",
         code: "# Hashable Key\n# Debug the behavior described.",
         question: "Why can't a list be a dict key?",
         choices: ["Lists are mutable and unhashable", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Dictionary keys require hashable objects.",
      },
      {
         title: "NaN Equality",
         code: "# NaN Equality\n# Debug the behavior described.",
         question: "Why can float('nan') == float('nan') be False?",
         choices: ["NaN is defined as unequal to values including itself", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "IEEE NaN comparisons are unusual by design.",
      },
      {
         title: "Zip Truncation",
         code: "# Zip Truncation\n# Debug the behavior described.",
         question: "What happens when zip receives iterables of different lengths?",
         choices: ["It stops at the shortest", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Default zip truncates to the shortest input.",
      },
      {
         title: "Comprehension Scope",
         code: "# Comprehension Scope\n# Debug the behavior described.",
         question: "In Python 3, does a list-comprehension loop variable leak outward?",
         choices: ["No", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Comprehensions have their own scope in Python 3.",
      },
      {
         title: "Property Recursion",
         code: "# Property Recursion\n# Debug the behavior described.",
         question: "A property setter assigns self.x = value inside setter for x. Risk?",
         choices: ["Infinite recursive setter calls", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "It invokes the same property setter repeatedly.",
      },
      {
         title: "Dataclass Mutable Default",
         code: "# Dataclass Mutable Default\n# Debug the behavior described.",
         question: "Why use default_factory=list?",
         choices: ["To create a fresh list per instance", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "A factory avoids sharing one mutable default.",
      },
      {
         title: "Context Manager",
         code: "# Context Manager\n# Debug the behavior described.",
         question: "What does with open(...) guarantee on normal/exceptional exit?",
         choices: ["The file is closed", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "The context manager runs cleanup.",
      },
      {
         title: "Bare Except",
         code: "# Bare Except\n# Debug the behavior described.",
         question: "Why avoid except: when possible?",
         choices: ["It catches very broad exceptions including control-flow ones", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Narrow exceptions prevent hiding unrelated failures.",
      },
      {
         title: "Mutable Dict Get",
         code: "# Mutable Dict Get\n# Debug the behavior described.",
         question: "d.get('x', []).append(1) doesn't store x. Why?",
         choices: ["The temporary default isn't inserted", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "get returns the provided default without adding it.",
      },
      {
         title: "List While Iterating",
         code: "# List While Iterating\n# Debug the behavior described.",
         question: "What safer pattern filters values instead of remove-in-loop?",
         choices: ["Build a filtered list/comprehension", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Constructing a new filtered list avoids iterator mutation.",
      },
      {
         title: "Recursive Base Case",
         code: "# Recursive Base Case\n# Debug the behavior described.",
         question: "What happens if recursion never reaches a base case?",
         choices: ["RecursionError", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Python eventually hits the recursion depth limit.",
      },
      {
         title: "Timezone Naive",
         code: "# Timezone Naive\n# Debug the behavior described.",
         question: "Why can comparing naive and aware datetimes fail?",
         choices: ["They have incompatible timezone awareness", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Python protects against ambiguous datetime ordering.",
      },
      {
         title: "Bytes String",
         code: "# Bytes String\n# Debug the behavior described.",
         question: "Why does b'abc' == 'abc' return False?",
         choices: ["bytes and str are different types", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Text and encoded bytes are distinct.",
      },
      {
         title: "Iterator Reuse",
         code: "# Iterator Reuse\n# Debug the behavior described.",
         question: "iter(file) read to EOF then reused gives what?",
         choices: ["No further lines until repositioned", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "The iterator remains at EOF.",
      },
      {
         title: "Sort Key",
         code: "# Sort Key\n# Debug the behavior described.",
         question: "What should sorted(users, key=lambda u: u.age) return?",
         choices: ["A new sorted list", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "sorted returns a new list rather than mutating input.",
      },
      {
         title: "Deep Recursion",
         code: "# Deep Recursion\n# Debug the behavior described.",
         question: "Why might an iterative algorithm be safer for huge depth?",
         choices: ["Python has a recursion depth limit", "Python automatically fixes it", "It only affects comments", "The interpreter retries the line"],
         correct: 0,
         explanation: "Very deep recursion can raise RecursionError.",
      },
      {
         title: "GIL CPU Threads",
         code: "# GIL CPU Threads\n# Debug the behavior described.",
         question: "Why may CPU-bound Python threads not scale across cores in standard CPython?",
         choices: ["The GIL limits simultaneous Python bytecode execution", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "The GIL affects CPU-bound threading.",
      },
      {
         title: "Async Blocking Call",
         code: "# Async Blocking Call\n# Debug the behavior described.",
         question: "What happens if synchronous blocking I/O runs directly in an event loop?",
         choices: ["It can block other async tasks", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Blocking work stalls the loop.",
      },
      {
         title: "Task Cancellation",
         code: "# Task Cancellation\n# Debug the behavior described.",
         question: "Why should coroutine cleanup handle cancellation?",
         choices: ["Cancellation can raise CancelledError at await points", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Cancellation interrupts coroutine execution.",
      },
      {
         title: "Descriptor Protocol",
         code: "# Descriptor Protocol\n# Debug the behavior described.",
         question: "Which method participates in descriptor attribute reads?",
         choices: ["__get__", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Descriptors customize attribute access.",
      },
      {
         title: "MRO Diamond",
         code: "# MRO Diamond\n# Debug the behavior described.",
         question: "Which algorithm determines Python multiple-inheritance method order?",
         choices: ["C3 linearization", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Python uses C3 method resolution order.",
      },
      {
         title: "Metaclass",
         code: "# Metaclass\n# Debug the behavior described.",
         question: "What creates class objects by default?",
         choices: ["type", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "type is Python's default metaclass.",
      },
      {
         title: "Weak Reference",
         code: "# Weak Reference\n# Debug the behavior described.",
         question: "Why use weakref for caches?",
         choices: ["It does not keep the target alive by itself", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Weak references avoid extending object lifetime.",
      },
      {
         title: "Cycle Finalization",
         code: "# Cycle Finalization\n# Debug the behavior described.",
         question: "What system detects many unreachable reference cycles?",
         choices: ["Cyclic garbage collector", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Reference counting is supplemented by cycle detection.",
      },
      {
         title: "Pickle Risk",
         code: "# Pickle Risk\n# Debug the behavior described.",
         question: "Why should untrusted pickle data not be loaded?",
         choices: ["Unpickling can execute arbitrary code", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "pickle is not a safe untrusted-data format.",
      },
      {
         title: "Import Cycle",
         code: "# Import Cycle\n# Debug the behavior described.",
         question: "Why can circular imports expose partially initialized modules?",
         choices: ["Each module may access the other before initialization completes", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Imports execute module top-level code.",
      },
      {
         title: "Monkey Patch Race",
         code: "# Monkey Patch Race\n# Debug the behavior described.",
         question: "Why can global monkey patching be risky in concurrent code?",
         choices: ["Other code can observe changing global behavior", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Global mutation can affect unrelated tasks.",
      },
      {
         title: "Async Gather",
         code: "# Async Gather\n# Debug the behavior described.",
         question: "What does asyncio.gather coordinate?",
         choices: ["Multiple awaitables concurrently", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "gather awaits a group of awaitables.",
      },
      {
         title: "ContextVar",
         code: "# ContextVar\n# Debug the behavior described.",
         question: "What is ContextVar useful for in async systems?",
         choices: ["Task-local contextual state", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "It carries context without one shared global.",
      },
      {
         title: "Slots",
         code: "# Slots\n# Debug the behavior described.",
         question: "What can __slots__ reduce for many instances?",
         choices: ["Per-instance attribute dictionary overhead", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Slots can constrain/storage-optimize attributes.",
      },
      {
         title: "Memoryview",
         code: "# Memoryview\n# Debug the behavior described.",
         question: "What benefit can memoryview provide?",
         choices: ["Zero-copy access to buffer data", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "It can view compatible buffers without copying.",
      },
      {
         title: "Decorator Metadata",
         code: "# Decorator Metadata\n# Debug the behavior described.",
         question: "What helper preserves wrapped function metadata?",
         choices: ["functools.wraps", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "wraps copies metadata such as name/docstring.",
      },
      {
         title: "Generator Send",
         code: "# Generator Send\n# Debug the behavior described.",
         question: "What does generator.send(value) do?",
         choices: ["Resumes a generator and supplies a value to yield", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "send communicates into a suspended generator.",
      },
      {
         title: "Async Generator",
         code: "# Async Generator\n# Debug the behavior described.",
         question: "How is an async generator iterated?",
         choices: ["async for", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Async generators implement asynchronous iteration.",
      },
      {
         title: "Exception Chaining",
         code: "# Exception Chaining\n# Debug the behavior described.",
         question: "What syntax explicitly chains one exception from another?",
         choices: ["raise NewError() from exc", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "from records the causal exception.",
      },
      {
         title: "Dataclass Frozen",
         code: "# Dataclass Frozen\n# Debug the behavior described.",
         question: "Does frozen=True make nested mutable members deeply immutable?",
         choices: ["No", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Frozen prevents field assignment, not deep mutation.",
      },
      {
         title: "Hash Equality Contract",
         code: "# Hash Equality Contract\n# Debug the behavior described.",
         question: "If a == b, what must be true for hashable objects?",
         choices: ["hash(a) == hash(b)", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Equal hashable objects must share a hash.",
      },
      {
         title: "Multiprocessing Pickle",
         code: "# Multiprocessing Pickle\n# Debug the behavior described.",
         question: "Why can a nested local function fail with some multiprocessing start methods?",
         choices: ["It may not be picklable", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Worker arguments/functions often need serialization.",
      },
      {
         title: "Signal Main Thread",
         code: "# Signal Main Thread\n# Debug the behavior described.",
         question: "Where are Python signal handlers executed?",
         choices: ["The main Python thread", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Python delivers signal handlers in the main thread.",
      },
      {
         title: "Decimal Float",
         code: "# Decimal Float\n# Debug the behavior described.",
         question: "Why use Decimal for exact base-10 financial arithmetic?",
         choices: ["Binary float cannot exactly represent many decimal fractions", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Decimal models base-10 arithmetic.",
      },
      {
         title: "Protocol Typing",
         code: "# Protocol Typing\n# Debug the behavior described.",
         question: "What does typing.Protocol support?",
         choices: ["Structural subtyping", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Protocols describe interfaces by structure.",
      },
      {
         title: "Async Lock",
         code: "# Async Lock\n# Debug the behavior described.",
         question: "Why use asyncio.Lock rather than threading.Lock around awaited async critical sections?",
         choices: ["It cooperates with the event loop", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Async locks suspend tasks without blocking the event loop thread.",
      },
      {
         title: "Memo Mutable Input",
         code: "# Memo Mutable Input\n# Debug the behavior described.",
         question: "Why can't a normal list be an lru_cache argument?",
         choices: ["It is unhashable", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "lru_cache keys require hashable arguments.",
      },
      {
         title: "Closure Cell",
         code: "# Closure Cell\n# Debug the behavior described.",
         question: "Multiple closures can share what when closing over one outer variable?",
         choices: ["The same closure cell", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Closures can reference a shared lexical binding.",
      },
      {
         title: "Reference Cycle",
         code: "# Reference Cycle\n# Debug the behavior described.",
         question: "Why can __del__ complicate object finalization semantics?",
         choices: ["Finalization order in cycles can be subtle", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Cycles and finalizers require careful lifetime reasoning.",
      },
      {
         title: "Import Side Effects",
         code: "# Import Side Effects\n# Debug the behavior described.",
         question: "Why keep heavy side effects out of module import time?",
         choices: ["Imports may occur in unexpected contexts and only once per interpreter cache", "Python disables the feature", "It always becomes a SyntaxError", "It only changes indentation"],
         correct: 0,
         explanation: "Import-time execution couples loading with behavior.",
      },
   ],
   "JavaScript": [
      {
         title: "Strict Equality",
         code: "console.log(5 === \"5\");",
         question: "Why is this false?",
         choices: ["The types differ", "Strings cannot contain digits", "=== assigns values", "5 is NaN"],
         correct: 0,
         explanation: "Strict equality compares type and value.",
      },
      {
         title: "Loose Equality",
         code: "console.log(0 == false);",
         question: "Why can this be true?",
         choices: ["== performs type coercion", "false equals 1", "0 is a string", "== is assignment"],
         correct: 0,
         explanation: "Loose equality can coerce operands.",
      },
      {
         title: "Undefined Property",
         code: "const user={name:\"Ada\"};\nconsole.log(user.age);",
         question: "What is printed?",
         choices: ["undefined", "null", "0", "ReferenceError"],
         correct: 0,
         explanation: "Reading a missing object property yields undefined.",
      },
      {
         title: "Array Index",
         code: "const a=[1,2,3];\nconsole.log(a[3]);",
         question: "What is printed?",
         choices: ["undefined", "3", "0", "IndexError"],
         correct: 0,
         explanation: "Index 3 is beyond the three-element array.",
      },
      {
         title: "Const Reassign",
         code: "const score=1;\nscore=2;",
         question: "Why does this fail?",
         choices: ["A const binding cannot be reassigned", "Numbers are immutable", "score is reserved", "2 is undefined"],
         correct: 0,
         explanation: "const prevents rebinding.",
      },
      {
         title: "Let Scope",
         code: "if (true) { let x=1; }\nconsole.log(x);",
         question: "Why does this fail?",
         choices: ["let is block-scoped", "console.log deletes x", "if creates a module", "x becomes null"],
         correct: 0,
         explanation: "let bindings exist only in their block.",
      },
      {
         title: "Missing Return",
         code: "const add=(a,b)=>{ a+b; };\nconsole.log(add(1,2));",
         question: "Why is the result undefined?",
         choices: ["The block body does not return a+b", "Arrow functions cannot add", "console.log blocks return", "a and b are strings"],
         correct: 0,
         explanation: "With braces, an explicit return is required.",
      },
      {
         title: "Falsy Zero",
         code: "const count=0;\nconst shown=count || 10;",
         question: "How can 0 be preserved while defaulting only null/undefined?",
         choices: ["count ?? 10", "count && 10", "!count", "count == 10"],
         correct: 0,
         explanation: "?? uses the fallback only for null or undefined.",
      },
      {
         title: "String Number Plus",
         code: "console.log(\"5\" + 1);",
         question: "What is produced?",
         choices: ["\"51\"", "6", "NaN", "undefined"],
         correct: 0,
         explanation: "With a string operand, + concatenates.",
      },
      {
         title: "String Number Minus",
         code: "console.log(\"5\" - 1);",
         question: "What is produced?",
         choices: ["4", "\"51\"", "NaN always", "undefined"],
         correct: 0,
         explanation: "The numeric subtraction operator coerces the string to a number.",
      },
      {
         title: "NaN Compare",
         code: "console.log(NaN === NaN);",
         question: "What is printed?",
         choices: ["false", "true", "undefined", "0"],
         correct: 0,
         explanation: "NaN is not equal to itself.",
      },
      {
         title: "Parse Int",
         code: "console.log(parseInt(\"12px\",10));",
         question: "What is produced?",
         choices: ["12", "NaN", "12px", "0"],
         correct: 0,
         explanation: "parseInt parses the leading integer portion.",
      },
      {
         title: "Array Length",
         code: "const a=[1,2,3];\nconsole.log(a.length);",
         question: "What is printed?",
         choices: ["3", "2", "4", "undefined"],
         correct: 0,
         explanation: "length is the number of elements.",
      },
      {
         title: "Push Result",
         code: "const a=[1,2];\nconst result=a.push(3);",
         question: "What is result?",
         choices: ["3", "[1,2,3]", "undefined", "2"],
         correct: 0,
         explanation: "push returns the new array length.",
      },
      {
         title: "Map Return",
         code: "const out=[1,2].map(x=>{ x*2; });",
         question: "Why is out [undefined, undefined]?",
         choices: ["The callback has no return", "map mutates x to undefined", "Arrow functions cannot multiply", "map only works on strings"],
         correct: 0,
         explanation: "A braced arrow callback needs return.",
      },
      {
         title: "For Of vs In",
         code: "const a=[\"x\",\"y\"];\nfor (const i in a) console.log(i);",
         question: "What does for...in iterate here?",
         choices: ["Property keys/indexes", "Array values", "Only y", "Nothing"],
         correct: 0,
         explanation: "for...in enumerates property keys; for...of iterates values.",
      },
      {
         title: "Object Equality",
         code: "console.log({a:1} === {a:1});",
         question: "Why is this false?",
         choices: ["They are different object references", "Objects cannot be compared", "a differs", "=== compares JSON text"],
         correct: 0,
         explanation: "Distinct object literals have different identities.",
      },
      {
         title: "Null Typeof",
         code: "console.log(typeof null);",
         question: "What historical result is returned?",
         choices: ["\"object\"", "\"null\"", "\"undefined\"", "\"boolean\""],
         correct: 0,
         explanation: "typeof null returns 'object' due to a long-standing JavaScript quirk.",
      },
      {
         title: "Function Reference",
         code: "button.addEventListener(\"click\", handleClick());",
         question: "What should normally be passed?",
         choices: ["handleClick", "handleClick() result", "new handleClick", "'handleClick()'"],
         correct: 0,
         explanation: "Pass the function reference so the event system can call it later.",
      },
      {
         title: "Template Literal",
         code: "const name=\"Ada\";\nconsole.log(\"Hi ${name}\");",
         question: "Why isn't name interpolated?",
         choices: ["Interpolation requires backticks", "name must be global", "${} works only in HTML", "console.log escapes variables"],
         correct: 0,
         explanation: "Template interpolation works in template literals delimited by backticks.",
      },
      {
         title: "Missing Await",
         code: "async function run(){\n const data=fetchData();\n console.log(data.name);\n}",
         question: "What is data before awaiting?",
         choices: ["A Promise", "The final object", "Always undefined", "A generator"],
         correct: 0,
         explanation: "Async operations commonly return Promises that must be awaited.",
      },
      {
         title: "Optional Chaining",
         code: "const user=null;\nconsole.log(user.name);",
         question: "What avoids the property-access error?",
         choices: ["user?.name", "user!.name", "user::name", "user->name"],
         correct: 0,
         explanation: "Optional chaining returns undefined when the receiver is nullish.",
      },
      {
         title: "Array Copy",
         code: "const a=[1,2];\nconst b=a;\nb.push(3);",
         question: "Why does a change?",
         choices: ["Both variables reference the same array", "push edits every array", "const arrays are global", "Assignment deep copies"],
         correct: 0,
         explanation: "Assignment copies the array reference.",
      },
      {
         title: "Spread Copy",
         code: "const a=[1,2];\nconst b=[...a];\nb.push(3);",
         question: "Why doesn't a gain 3?",
         choices: ["b is a new outer array", "Spread freezes a", "push copies a", "a becomes const twice"],
         correct: 0,
         explanation: "Array spread creates a shallow outer copy.",
      },
      {
         title: "Switch Strict",
         code: "switch (\"1\") { case 1: console.log(\"yes\"); }",
         question: "Why doesn't the case match?",
         choices: ["switch cases use strict comparison", "case converts strings", "1 is invalid", "switch needs break first"],
         correct: 0,
         explanation: "JavaScript switch matching uses strict equality semantics.",
      },
      {
         title: "Increment String",
         code: "let x=\"1\";\nx++;\nconsole.log(x);",
         question: "What is x after ++?",
         choices: ["2", "\"11\"", "NaN", "undefined"],
         correct: 0,
         explanation: "The numeric increment operator coerces the numeric string.",
      },
      {
         title: "Boolean Empty Array",
         code: "if ([]) console.log(\"yes\");",
         question: "Why does this run?",
         choices: ["Arrays are truthy objects", "Empty arrays are false", "[] equals null", "if ignores arrays"],
         correct: 0,
         explanation: "Objects, including empty arrays, are truthy.",
      },
      {
         title: "Object Key Coercion",
         code: "const o={};\no[1]=\"x\";\nconsole.log(o[\"1\"]);",
         question: "Why is this x?",
         choices: ["Ordinary object keys are strings/symbols", "1 and '1' are strictly equal", "Arrays are involved", "Numbers cannot be keys"],
         correct: 0,
         explanation: "Property keys on ordinary objects are coerced to strings unless symbols.",
      },
      {
         title: "Delete Array",
         code: "const a=[1,2,3];\ndelete a[1];",
         question: "What surprising result remains?",
         choices: ["The array length stays 3 with a hole", "The array becomes [1,3]", "length becomes 2", "delete throws"],
         correct: 0,
         explanation: "delete removes the property but does not compact an array.",
      },
      {
         title: "Default Parameter",
         code: "function greet(name=\"Debugger\"){ return name; }\nconsole.log(greet(undefined));",
         question: "What is returned?",
         choices: ["\"Debugger\"", "undefined", "null", "An error"],
         correct: 0,
         explanation: "Passing undefined activates the default parameter.",
      },
      {
         title: "Closure Var Loop",
         code: "// Closure Var Loop\n// Debug the behavior described.",
         question: "Why do var-loop callbacks often share the final i?",
         choices: ["var creates one function-scoped binding", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Callbacks close over the same binding.",
      },
      {
         title: "Object Reference Copy",
         code: "// Object Reference Copy\n// Debug the behavior described.",
         question: "Why does b=a share object mutations?",
         choices: ["Assignment copies the object reference", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Objects are reference values.",
      },
      {
         title: "Promise Array",
         code: "// Promise Array\n// Debug the behavior described.",
         question: "What does array.map(async ...) produce?",
         choices: ["An array of Promises", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Async callbacks return Promises.",
      },
      {
         title: "Lost This",
         code: "// Lost This\n// Debug the behavior described.",
         question: "Why can const f=obj.method; f() lose obj as this?",
         choices: ["The call no longer has obj as its receiver", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "this depends on the call site.",
      },
      {
         title: "Shallow Spread",
         code: "// Shallow Spread\n// Debug the behavior described.",
         question: "Why can {...obj} share nested objects?",
         choices: ["Spread is shallow", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Nested references are retained.",
      },
      {
         title: "Promise Error",
         code: "// Promise Error\n// Debug the behavior described.",
         question: "Where should an awaited rejected Promise be handled?",
         choices: ["try/catch around await", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Rejected awaits throw into the async function.",
      },
      {
         title: "Event Loop",
         code: "// Event Loop\n// Debug the behavior described.",
         question: "Why does setTimeout(fn,0) not run immediately before synchronous code?",
         choices: ["The callback waits for a later event-loop turn", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Current synchronous work completes first.",
      },
      {
         title: "Microtask Order",
         code: "// Microtask Order\n// Debug the behavior described.",
         question: "Promise.then callbacks generally run before what queued callbacks?",
         choices: ["Timers such as setTimeout", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Promise reactions use the microtask queue.",
      },
      {
         title: "Mutation Sort",
         code: "// Mutation Sort\n// Debug the behavior described.",
         question: "Why can arr.sort() unexpectedly change the original array?",
         choices: ["sort mutates the array in place", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "sort returns the same mutated array.",
      },
      {
         title: "Lexical This Arrow",
         code: "// Lexical This Arrow\n// Debug the behavior described.",
         question: "How does arrow-function this differ?",
         choices: ["It is captured lexically", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Arrow functions do not bind their own this.",
      },
      {
         title: "Destructure Missing",
         code: "// Destructure Missing\n// Debug the behavior described.",
         question: "const {x}=obj gives what if x is absent?",
         choices: ["undefined", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Missing properties destructure to undefined.",
      },
      {
         title: "Default Or Zero",
         code: "// Default Or Zero\n// Debug the behavior described.",
         question: "Why is x || 10 wrong if 0 is valid?",
         choices: ["0 is falsy", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "|| treats any falsy value as fallback-worthy.",
      },
      {
         title: "Nullish",
         code: "// Nullish\n// Debug the behavior described.",
         question: "Which values trigger ?? fallback?",
         choices: ["null and undefined", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Nullish coalescing is narrower than ||.",
      },
      {
         title: "Optional Chain Call",
         code: "// Optional Chain Call\n// Debug the behavior described.",
         question: "obj.method?.() protects against what?",
         choices: ["A missing/nullish method", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Optional call skips when the function property is nullish.",
      },
      {
         title: "Async ForEach",
         code: "// Async ForEach\n// Debug the behavior described.",
         question: "Why doesn't await arr.forEach(async ...) wait for callbacks?",
         choices: ["forEach ignores returned Promises", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "forEach is not Promise-aware.",
      },
      {
         title: "Promise All",
         code: "// Promise All\n// Debug the behavior described.",
         question: "What happens to Promise.all if one input rejects?",
         choices: ["The returned Promise rejects", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Promise.all fails fast on rejection.",
      },
      {
         title: "Promise AllSettled",
         code: "// Promise AllSettled\n// Debug the behavior described.",
         question: "What does allSettled preserve?",
         choices: ["Each Promise's fulfillment/rejection outcome", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "It waits for all inputs without failing fast.",
      },
      {
         title: "Fetch Status",
         code: "// Fetch Status\n// Debug the behavior described.",
         question: "Why may fetch not reject on HTTP 404?",
         choices: ["HTTP error status is still a fulfilled Response", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Network success and HTTP success are distinct.",
      },
      {
         title: "JSON Undefined",
         code: "// JSON Undefined\n// Debug the behavior described.",
         question: "What happens to undefined object properties in JSON.stringify?",
         choices: ["They are omitted", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "JSON has no undefined value.",
      },
      {
         title: "Map Object Key",
         code: "// Map Object Key\n// Debug the behavior described.",
         question: "Why can Map distinguish object keys better than plain object property coercion?",
         choices: ["Map keys retain identity and type", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Map supports arbitrary key values.",
      },
      {
         title: "Set Object",
         code: "// Set Object\n// Debug the behavior described.",
         question: "Why do two identical object literals occupy two Set entries?",
         choices: ["They are distinct references", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Set equality for objects uses identity.",
      },
      {
         title: "Temporal Dead Zone",
         code: "// Temporal Dead Zone\n// Debug the behavior described.",
         question: "Why does reading let x before declaration throw?",
         choices: ["x is in the temporal dead zone", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "let is scoped but uninitialized before declaration.",
      },
      {
         title: "Hoisted Var",
         code: "// Hoisted Var\n// Debug the behavior described.",
         question: "What value does var x often have before its assignment line?",
         choices: ["undefined", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "var declarations are hoisted and initialized undefined.",
      },
      {
         title: "Prototype Mutation",
         code: "// Prototype Mutation\n// Debug the behavior described.",
         question: "Why can changing a prototype affect many existing instances?",
         choices: ["They delegate property lookup to that prototype", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Prototype lookup is shared.",
      },
      {
         title: "Reduce Empty",
         code: "// Reduce Empty\n// Debug the behavior described.",
         question: "Why can [].reduce(fn) throw without an initial value?",
         choices: ["There is no first accumulator value", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "An empty array provides no starting element.",
      },
      {
         title: "Regex Global State",
         code: "// Regex Global State\n// Debug the behavior described.",
         question: "Why can repeated test() with a global regex alternate unexpectedly?",
         choices: ["lastIndex is stateful", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Global regexes track lastIndex.",
      },
      {
         title: "Date Mutation",
         code: "// Date Mutation\n// Debug the behavior described.",
         question: "Why can date.setDate(...) affect all references to that Date?",
         choices: ["Date objects are mutable references", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Date setter methods mutate the instance.",
      },
      {
         title: "Number Precision",
         code: "// Number Precision\n// Debug the behavior described.",
         question: "Why is 0.1 + 0.2 not exactly 0.3?",
         choices: ["Binary floating-point representation", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Many decimal fractions are not exact in binary float.",
      },
      {
         title: "BigInt Mix",
         code: "// BigInt Mix\n// Debug the behavior described.",
         question: "Why does 1n + 1 throw?",
         choices: ["BigInt and Number cannot be mixed directly", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Explicit conversion is required.",
      },
      {
         title: "Module Live Binding",
         code: "// Module Live Binding\n// Debug the behavior described.",
         question: "What is special about ES module imports?",
         choices: ["They are live read-only bindings to exports", "JavaScript retries automatically", "It only affects CSS", "The browser converts it to JSON"],
         correct: 0,
         explanation: "Imports reflect updates to exported bindings.",
      },
      {
         title: "Prototype Pollution",
         code: "// Prototype Pollution\n// Debug the behavior described.",
         question: "Why is merging untrusted __proto__ keys dangerous?",
         choices: ["It can alter inherited object behavior", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Prototype pollution can affect many objects.",
      },
      {
         title: "Event Listener Leak",
         code: "// Event Listener Leak\n// Debug the behavior described.",
         question: "What can happen when components repeatedly add listeners without removing them?",
         choices: ["Duplicate callbacks and retained memory", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Listeners can retain objects and fire repeatedly.",
      },
      {
         title: "WeakMap",
         code: "// WeakMap\n// Debug the behavior described.",
         question: "Why can WeakMap help attach metadata without keeping object keys alive?",
         choices: ["Its keys are weakly held", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "WeakMap does not prevent key garbage collection.",
      },
      {
         title: "AbortController",
         code: "// AbortController\n// Debug the behavior described.",
         question: "What can AbortController cancel in modern web APIs such as fetch?",
         choices: ["An in-flight operation using its signal", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Abort signals coordinate cancellation.",
      },
      {
         title: "Race Condition Async",
         code: "// Race Condition Async\n// Debug the behavior described.",
         question: "Two async saves read then write shared state. What can occur?",
         choices: ["Lost updates", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Interleaving can overwrite newer state.",
      },
      {
         title: "Stale Closure",
         code: "// Stale Closure\n// Debug the behavior described.",
         question: "Why can a callback use an old state value in UI frameworks?",
         choices: ["Its closure captured an earlier render's binding", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Closures preserve lexical bindings from creation.",
      },
      {
         title: "Structured Clone",
         code: "// Structured Clone\n// Debug the behavior described.",
         question: "Why use structuredClone over JSON stringify/parse for richer data?",
         choices: ["It supports more built-in types and cycles", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "JSON cloning loses unsupported types and cycles.",
      },
      {
         title: "Transferable",
         code: "// Transferable\n// Debug the behavior described.",
         question: "What can transferring an ArrayBuffer do?",
         choices: ["Move ownership and detach the source buffer", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Transfer avoids copying eligible data.",
      },
      {
         title: "Worker Boundary",
         code: "// Worker Boundary\n// Debug the behavior described.",
         question: "Can a Web Worker directly mutate the page DOM?",
         choices: ["No", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Workers run outside the document's DOM context.",
      },
      {
         title: "SharedArrayBuffer",
         code: "// SharedArrayBuffer\n// Debug the behavior described.",
         question: "What is needed for safe coordination on shared numeric memory?",
         choices: ["Atomics", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Atomics provide synchronization operations.",
      },
      {
         title: "Promise Finally",
         code: "// Promise Finally\n// Debug the behavior described.",
         question: "Does finally receive the fulfillment value as an argument by default?",
         choices: ["No", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Promise finally is for cleanup and normally passes through outcome.",
      },
      {
         title: "Then Return",
         code: "// Then Return\n// Debug the behavior described.",
         question: "Why must a then callback return a nested Promise to chain it?",
         choices: ["Otherwise the outer chain does not wait for it", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Returning adopts the nested Promise.",
      },
      {
         title: "Unhandled Rejection",
         code: "// Unhandled Rejection\n// Debug the behavior described.",
         question: "What is an unhandled rejection?",
         choices: ["A rejected Promise with no timely rejection handler", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Unhandled async failures can surface globally.",
      },
      {
         title: "Proxy Invariant",
         code: "// Proxy Invariant\n// Debug the behavior described.",
         question: "Can a Proxy trap freely violate non-configurable property invariants?",
         choices: ["No", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Proxy traps must respect specified object invariants.",
      },
      {
         title: "Property Descriptor",
         code: "// Property Descriptor\n// Debug the behavior described.",
         question: "What does writable:false prevent on a data property?",
         choices: ["Changing its value through normal assignment", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Descriptors control property behavior.",
      },
      {
         title: "Getter Side Effect",
         code: "// Getter Side Effect\n// Debug the behavior described.",
         question: "Why can side effects in getters be risky?",
         choices: ["Simple property reads can unexpectedly mutate state", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Getters run during property access.",
      },
      {
         title: "Symbol Key",
         code: "// Symbol Key\n// Debug the behavior described.",
         question: "Why are Symbols useful as property keys?",
         choices: ["They avoid ordinary string-key collisions", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Each Symbol can be unique.",
      },
      {
         title: "Iterator Protocol",
         code: "// Iterator Protocol\n// Debug the behavior described.",
         question: "What method produces an iterator for for...of?",
         choices: ["[Symbol.iterator]()", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Iterable objects expose Symbol.iterator.",
      },
      {
         title: "Async Iterator",
         code: "// Async Iterator\n// Debug the behavior described.",
         question: "What syntax consumes an async iterable?",
         choices: ["for await...of", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Async iteration awaits successive values.",
      },
      {
         title: "Tail Recursion",
         code: "// Tail Recursion\n// Debug the behavior described.",
         question: "Can you rely on tail-call optimization across common JS engines?",
         choices: ["No", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Proper tail calls are not broadly available in common engines.",
      },
      {
         title: "Typed Array View",
         code: "// Typed Array View\n// Debug the behavior described.",
         question: "Can two typed arrays view the same ArrayBuffer?",
         choices: ["Yes", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Views can share underlying binary storage.",
      },
      {
         title: "Detached Buffer",
         code: "// Detached Buffer\n// Debug the behavior described.",
         question: "What can happen to a transferred ArrayBuffer in the sender?",
         choices: ["It becomes detached", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Transfer moves the backing memory.",
      },
      {
         title: "CSP Eval",
         code: "// CSP Eval\n// Debug the behavior described.",
         question: "Why can eval/new Function conflict with strict Content Security Policy?",
         choices: ["Dynamic code execution may be blocked", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "CSP can prohibit unsafe-eval.",
      },
      {
         title: "XSS innerHTML",
         code: "// XSS innerHTML\n// Debug the behavior described.",
         question: "Why is assigning untrusted text to innerHTML dangerous?",
         choices: ["It can create executable markup/script contexts", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Untrusted HTML can enable XSS.",
      },
      {
         title: "Prototype Chain",
         code: "// Prototype Chain\n// Debug the behavior described.",
         question: "What terminates an ordinary prototype chain?",
         choices: ["null", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Prototype traversal ends at null.",
      },
      {
         title: "Private Field",
         code: "// Private Field\n// Debug the behavior described.",
         question: "Can obj['#secret'] access a class #secret private field?",
         choices: ["No", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Private fields are syntax-level private names.",
      },
      {
         title: "Top Level Await",
         code: "// Top Level Await\n// Debug the behavior described.",
         question: "Where is top-level await supported?",
         choices: ["ES modules", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Top-level await is an ES module feature.",
      },
      {
         title: "Module Cycle",
         code: "// Module Cycle\n// Debug the behavior described.",
         question: "Why can circular ES module dependencies expose uninitialized bindings?",
         choices: ["Evaluation order can reach a binding before initialization", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Cyclic modules have linked live bindings with initialization timing.",
      },
      {
         title: "Floating Safe Integer",
         code: "// Floating Safe Integer\n// Debug the behavior described.",
         question: "What boundary helper tests exact safe integer range?",
         choices: ["Number.isSafeInteger", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "It checks whether an integer is exactly representable in the safe range.",
      },
      {
         title: "Finalization Registry",
         code: "// Finalization Registry\n// Debug the behavior described.",
         question: "Why should FinalizationRegistry not drive essential program logic?",
         choices: ["Cleanup timing is nondeterministic", "The runtime always repairs it", "It only changes console output", "It is guaranteed synchronous"],
         correct: 0,
         explanation: "Garbage collection/finalization timing is not guaranteed.",
      },
   ],
};
const ROOKIE_CHALLENGES = {
   "C++": [
      { title: "Equality Check", code: 'int age = 20;\nif (age = 18) {\n   cout << "Adult";\n}', lesson: '= stores a value. == asks whether two values are equal.', question: 'The code is supposed to check whether age equals 18. What should change?', choices: ['Change = to ==', 'Change 18 to "18"', 'Remove if', 'Change int to cout'], correct: 0, explanation: 'The condition needs == for comparison. A single = assigns 18 to age instead.' },
      { title: "Array Position", code: 'string players[3] = {"Mia", "Leo", "Zoe"};\ncout << players[3];', lesson: 'C++ array positions start at 0. Three items use indexes 0, 1, and 2.', question: 'Which part causes the bug?', choices: ['players[3]', 'cout', 'string', 'The commas'], correct: 0, explanation: 'Index 3 would mean a fourth item, but this array only contains three.' },
      { title: "Loop Direction", code: 'for (int lives = 3; lives > 0; lives++) {\n   cout << lives;\n}', lesson: '++ adds 1. -- subtracts 1.', question: 'The loop should count 3, 2, 1 and stop. What fixes it?', choices: ['Use lives--', 'Use lives++ twice', 'Start at 0', 'Remove lives > 0'], correct: 0, explanation: 'The counter must decrease toward 0, so lives-- is the correct update.' },
      { title: "True or False", code: 'bool gameOver = false;\nif (gameOver) {\n   cout << "Keep playing";\n}', lesson: 'A bool is either true or false. if (gameOver) runs only when gameOver is true.', question: 'What is wrong with the message?', choices: ['It should describe the game being over', 'bool cannot be false', 'if cannot use a bool', 'cout changes gameOver'], correct: 0, explanation: 'That block runs when gameOver is true, so “Keep playing” contradicts the condition.' },
      { title: "Missing Return", code: 'int add(int a, int b) {\n   a + b;\n}', lesson: 'A function declared int must return an integer result.', question: 'What line should replace a + b;?', choices: ['return a + b;', 'cout = a + b;', 'int = return;', 'add(a, b);'], correct: 0, explanation: 'return sends the calculated integer back to the code that called the function.' },
      { title: "Wrong Comparison", code: 'int score = 80;\nif (score < 50) {\n   cout << "You passed!";\n}', lesson: '< means less than. >= means greater than or equal to.', question: 'Passing requires 50 or more. Which condition is correct?', choices: ['score >= 50', 'score < 50', 'score == 0', 'score <= 49'], correct: 0, explanation: 'A passing score is any value greater than or equal to 50.' },
      { title: "String or Number", code: 'int points = 10;\npoints = points + 5;\ncout << points;', lesson: 'An int stores whole numbers. Adding 5 to 10 produces 15.', question: 'What should this code print?', choices: ['15', '105', '10 + 5', 'An error'], correct: 0, explanation: 'Both values are integers, so + performs numeric addition.' },
      { title: "Loop Boundary", code: 'int scores[3] = {10, 20, 30};\nfor (int i = 0; i <= 3; i++) {\n   cout << scores[i];\n}', lesson: 'For three items, valid indexes are 0, 1, and 2. i++ moves to the next index.', question: 'How should the loop condition change?', choices: ['i < 3', 'i <= 3', 'i > 3', 'i == 3'], correct: 0, explanation: 'i < 3 stops before index 3, which is outside the array.' },
      { title: "AND Condition", code: 'int age = 22;\nbool hasTicket = false;\nif (age >= 18 && hasTicket) {\n   cout << "Enter";\n}', lesson: '&& means AND: both conditions must be true.', question: 'Should this person enter?', choices: ['No, they do not have a ticket', 'Yes, age is enough', 'Yes, false means valid', 'The code always enters'], correct: 0, explanation: 'The age check passes, but hasTicket is false, so the combined AND condition fails.' },
      { title: "Update the Score", code: 'int score = 10;\nscore + 5;\ncout << score;', lesson: 'Calculating score + 5 does not save the result. score += 5 updates score itself.', question: 'How do you make the final score 15?', choices: ['Use score += 5;', 'Use score == 5;', 'Remove score', 'Use cout += 5;'], correct: 0, explanation: 'score += 5 stores the increased value back in score.' },
   ],
   "Python": [
      { title: "Equality Check", code: 'age = 20\nif age = 18:\n   print("Adult")', lesson: '= stores a value. == asks whether two values are equal.', question: 'The code should compare age with 18. What fixes the condition?', choices: ['Use age == 18', 'Use age + 18', 'Remove if', 'Use print == age'], correct: 0, explanation: 'Python uses == for equality comparisons inside conditions.' },
      { title: "List Position", code: 'players = ["Mia", "Leo", "Zoe"]\nprint(players[3])', lesson: 'Python list positions start at 0. Three items use indexes 0, 1, and 2.', question: 'Which part causes the bug?', choices: ['players[3]', 'print', 'The brackets around the list', 'The quotes'], correct: 0, explanation: 'Index 3 asks for a fourth item that does not exist.' },
      { title: "Missing Colon", code: 'score = 90\nif score >= 50\n   print("Passed")', lesson: 'Python starts an if block with a colon : at the end of the condition.', question: 'What is missing?', choices: ['A colon after 50', 'A semicolon after score', 'Brackets around Passed', 'A second if'], correct: 0, explanation: 'The if statement must end with a colon before its indented block.' },
      { title: "True or False", code: 'game_over = False\nif game_over:\n   print("Game over")', lesson: 'An if block runs only when its condition is True.', question: 'Will "Game over" print?', choices: ['No', 'Yes', 'Only twice', 'False becomes True automatically'], correct: 0, explanation: 'game_over is False, so Python skips the indented print.' },
      { title: "Function Result", code: 'def add(a, b):\n   a + b\n\nscore = add(2, 3)', lesson: 'return sends a value back from a function.', question: 'What should replace a + b so score receives 5?', choices: ['return a + b', 'print = a + b', 'def = 5', 'score == add'], correct: 0, explanation: 'Without return, the function does not send the calculated value back.' },
      { title: "Wrong Comparison", code: 'score = 80\nif score < 50:\n   print("You passed!")', lesson: '< means less than. >= means greater than or equal to.', question: 'Passing requires 50 or more. Which condition is correct?', choices: ['score >= 50', 'score < 50', 'score == 0', 'score <= 49'], correct: 0, explanation: 'The condition must accept 50 and every larger score.' },
      { title: "String or Number", code: 'points = 10\npoints = points + 5\nprint(points)', lesson: 'Numbers can be added mathematically with +.', question: 'What should this code print?', choices: ['15', '105', '10 + 5', 'An error'], correct: 0, explanation: 'Both values are numbers, so Python calculates 10 + 5.' },
      { title: "Loop Range", code: 'players = ["A", "B", "C"]\nfor i in range(4):\n   print(players[i])', lesson: 'range(4) produces 0, 1, 2, 3. A three-item list only has indexes 0, 1, 2.', question: 'Which change prevents the invalid fourth lookup?', choices: ['Use range(3)', 'Use range(5)', 'Remove players', 'Start with i = 4'], correct: 0, explanation: 'range(3) generates exactly the three valid indexes.' },
      { title: "AND Condition", code: 'age = 22\nhas_ticket = False\nif age >= 18 and has_ticket:\n   print("Enter")', lesson: 'and requires both conditions to be True.', question: 'Should "Enter" print?', choices: ['No, has_ticket is False', 'Yes, age is enough', 'Yes, False means valid', 'It always prints'], correct: 0, explanation: 'One of the two required conditions is false, so the block does not run.' },
      { title: "Update the Score", code: 'score = 10\nscore + 5\nprint(score)', lesson: 'An expression can calculate a value without saving it. score += 5 saves the new value.', question: 'How do you make the final score 15?', choices: ['Use score += 5', 'Use score == 5', 'Use print += 5', 'Remove score'], correct: 0, explanation: 'score += 5 updates the variable instead of discarding the calculation.' },
   ],
   "JavaScript": [
      { title: "Equality Check", code: 'let age = 20;\nif (age = 18) {\n   console.log("Adult");\n}', lesson: '= assigns a value. === checks whether values are equal without changing them.', question: 'The code should check whether age equals 18. What should change?', choices: ['Change = to ===', 'Change let to console', 'Remove if', 'Change 18 to true'], correct: 0, explanation: '=== performs the comparison the condition needs; = changes age instead.' },
      { title: "Array Position", code: 'const players = ["Mia", "Leo", "Zoe"];\nconsole.log(players[3]);', lesson: 'JavaScript array positions start at 0. Three items use indexes 0, 1, and 2.', question: 'Which part causes the bug?', choices: ['players[3]', 'console.log', 'const', 'The commas'], correct: 0, explanation: 'Index 3 refers to a fourth item, so it produces undefined here.' },
      { title: "True or False", code: 'let gameOver = false;\nif (gameOver) {\n   console.log("Game over");\n}', lesson: 'An if block runs when its condition is true.', question: 'Will "Game over" be logged?', choices: ['No', 'Yes', 'Only twice', 'false becomes true automatically'], correct: 0, explanation: 'gameOver is false, so the block is skipped.' },
      { title: "Function Result", code: 'function add(a, b) {\n   a + b;\n}\nconst score = add(2, 3);', lesson: 'return sends a value back from a function.', question: 'What should replace a + b; so score receives 5?', choices: ['return a + b;', 'console = a + b;', 'function = 5;', 'score === add;'], correct: 0, explanation: 'The function needs return to send the sum back to the caller.' },
      { title: "Wrong Comparison", code: 'let score = 80;\nif (score < 50) {\n   console.log("You passed!");\n}', lesson: '< means less than. >= means greater than or equal to.', question: 'Passing requires 50 or more. Which condition is correct?', choices: ['score >= 50', 'score < 50', 'score === 0', 'score <= 49'], correct: 0, explanation: 'The correct condition includes 50 and every larger score.' },
      { title: "String or Number", code: 'let points = 10;\npoints = points + 5;\nconsole.log(points);', lesson: 'When both values are numbers, + performs addition.', question: 'What should this code log?', choices: ['15', '105', '10 + 5', 'undefined'], correct: 0, explanation: 'Both operands are numbers, so JavaScript adds them.' },
      { title: "Loop Boundary", code: 'const scores = [10, 20, 30];\nfor (let i = 0; i <= 3; i++) {\n   console.log(scores[i]);\n}', lesson: 'A three-item array has indexes 0, 1, 2. i++ increases i by one each loop.', question: 'How should the loop condition change?', choices: ['i < 3', 'i <= 3', 'i > 3', 'i === 3'], correct: 0, explanation: 'i < 3 stops before the invalid index 3.' },
      { title: "AND Condition", code: 'let age = 22;\nlet hasTicket = false;\nif (age >= 18 && hasTicket) {\n   console.log("Enter");\n}', lesson: '&& means AND: both sides must be true.', question: 'Should "Enter" be logged?', choices: ['No, hasTicket is false', 'Yes, age is enough', 'Yes, false means valid', 'It always logs'], correct: 0, explanation: 'The ticket requirement fails, so the whole AND condition is false.' },
      { title: "Update the Score", code: 'let score = 10;\nscore + 5;\nconsole.log(score);', lesson: 'score + 5 calculates 15 but does not save it. score += 5 updates the variable.', question: 'How do you make the final score 15?', choices: ['Use score += 5;', 'Use score === 5;', 'Use console += 5;', 'Remove score'], correct: 0, explanation: 'The += operator stores the increased value back into score.' },
      { title: "Not Equal", code: 'let lives = 0;\nif (lives !== 0) {\n   console.log("Keep playing");\n}', lesson: '!== means “is not equal to.”', question: 'With lives set to 0, should "Keep playing" appear?', choices: ['No', 'Yes', 'Only once', '0 means true'], correct: 0, explanation: '0 is not different from 0, so the condition is false.' },
   ],
};
const DIFFICULTY_POOLS = {
   "C++": {
      Beginner: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      Intermediate: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      Advanced: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
   },
   "Python": {
      Beginner: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      Intermediate: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      Advanced: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
   },
   "JavaScript": {
      Beginner: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      Intermediate: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      Advanced: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
   },
};
const CONCEPT_LABELS = {
   "Wrong Operator": "Operators",
   "Off-by-One Loop": "Array Bounds",
   "Assignment vs Comparison": "Comparison Logic",
   "Integer Division": "Numeric Types",
   "Missing Return": "Control Flow",
   "Uninitialized Accumulator": "Initialization",
   "Null Pointer": "Memory Safety",
   "Wrong String Condition": "Conditional Logic",
   "Vector End Iterator": "Iterators",
   "Boolean Logic": "Boolean Logic",
   "Wrong Comparison": "Conditional Logic",
   "Range Boundary": "Array Bounds",
   "Mutable Default": "Function State",
   "Missing Colon": "Syntax",
   "String + Integer": "Type Conversion",
   "Dictionary Lookup": "Defensive Access",
   "Identity vs Equality": "Object Identity",
   "Infinite Loop": "Loop Control",
   "Function Result": "Return Values",
   "List Copy": "References & Mutation",
   "Strict Equality": "Type Conversion",
   "Accidental Assignment": "Comparison Logic",
   "Array Push": "Mutation & Return Values",
   "Async Result": "Async / Await",
   "Missing Property": "Defensive Access",
   "Block Scope": "Scope",
   "Numeric Sort": "Comparators",
   "Event Handler": "Callbacks",
   "Empty Vector Access": "Array Bounds",
   "Dangling Reference": "Lifetime",
   "Unsigned Countdown": "Numeric Types",
   "Missing Virtual Destructor": "Polymorphism",
   "Iterator Invalidated": "Iterators",
   "Object Slicing": "Polymorphism",
   "Shadowed Builtin": "Names & Scope",
   "Shared Nested Lists": "References & Mutation",
   "Late Binding Closure": "Closures",
   "Missing Await": "Async / Await",
   "Modify While Iterating": "Mutation",
   "Exception Order": "Exceptions",
   "Falsy Zero": "Nullish Values",
   "Closure Loop": "Closures",
   "Object Reference Copy": "References & Mutation",
   "Promise Array": "Async / Await",
   "Lost Method Context": "this Binding",
   "Spread Is Shallow": "References & Mutation",
};
function createSeed(text) {
   let seed = 0;
   for (let i = 0; i < text.length; i++) {
      seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
   }
   return seed;
}
function seededRandom(seed) {
   let value = seed;
   return function random() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
   };
}
function seededShuffle(items, seedText) {
   const shuffled = [...items];
   const random = seededRandom(createSeed(seedText));
   for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
   }
   return shuffled;
}
function getBalancedCorrectPosition(room, roundNumber) {
   const roomSeed = room?.id ?? room?.code ?? "bug-hunt";
   const cycleIndex = Math.floor((roundNumber - 1) / 4);
   const positionInCycle = (roundNumber - 1) % 4;
   const positions = seededShuffle(
      [0, 1, 2, 3],
      `${roomSeed}-${room?.language}-${room?.difficulty}-answers-${cycleIndex}`
   );
   return positions[positionInCycle];
}
// Expanded, code-distinct practice problems loaded from the bundled question bank.
// Each language/difficulty combination contains 100 code-distinct questions.
const expandedPoolsCache = new Map();
function getExpandedPool(language, difficulty) {
   const key = `${language}|${difficulty}`;
   if (expandedPoolsCache.has(key)) return expandedPoolsCache.get(key);
   const pool = EXTRA_QUESTION_BANKS[key] ?? EXTRA_QUESTION_BANKS[`C++|Beginner`];
   expandedPoolsCache.set(key, pool);
   return pool;
}
// Solo-only local rotation remembers progress across browser sessions.
// Multiplayer stays room-seeded so every participant receives the same question.
// Per-browser, per-bank rotation. A full shuffled cycle is exhausted before
// any question is reused. History survives reloads and new matches.
const QUESTION_ROTATION_VERSION = "v4";
function questionRotationKey(language, difficulty) {
   return `bughunt-question-rotation-${QUESTION_ROTATION_VERSION}:${language}:${difficulty}`;
}
function reserveQuestionSequence(language, difficulty, count, seed) {
   const pool = getExpandedPool(language, difficulty);
   if (!pool?.length) return [];
   const storageKey = questionRotationKey(language, difficulty);
   let state = { remaining: [], generation: 0 };
   try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (saved && Array.isArray(saved.remaining) && Number.isInteger(saved.generation)) {
         state = saved;
      }
   } catch { /* localStorage unavailable */ }
   const result = [];
   const wanted = Math.max(1, Math.min(1000, Number(count) || 5));
   while (result.length < wanted) {
      if (!state.remaining.length) {
         state.remaining = seededShuffle(
            pool.map((_, index) => index),
            `${seed}-${state.generation}-${language}-${difficulty}`
         );
         state.generation += 1;
      }
      const next = state.remaining.shift();
      // Avoid a duplicate in the same match when a cycle wraps around.
      if (result.includes(next) && result.length < pool.length) {
         state.remaining.push(next);
         continue;
      }
      result.push(next);
   }
   try { window.localStorage.setItem(storageKey, JSON.stringify(state)); }
   catch { /* graceful fallback */ }
   return result;
}
function soloQuestionSequence(language, difficulty) {
   const key = `bughunt-seen-v2:${language}:${difficulty}`;
   try {
      const saved = JSON.parse(window.localStorage.getItem(key) || "null");
      if (saved && Number.isInteger(saved.next) && saved.next >= 0) return saved.next;
   } catch { /* Storage may be unavailable. */ }
   return 0;
}
function recordSoloQuestionSequence(language, difficulty, next) {
   try { window.localStorage.setItem(`bughunt-seen-v2:${language}:${difficulty}`, JSON.stringify({ next })); }
   catch { /* Non-persistent fallback. */ }
}
function getChallenge(room) {
   const language = room?.language ?? "C++";
   const difficulty = room?.difficulty ?? "Beginner";
   const challenges = getExpandedPool(language, difficulty);
   const roundNumber = Math.max(1, Number(room?.current_round ?? 1));
   const roomSeed = room?.id ?? room?.code ?? "bug-hunt";
   const sequenceSeed = room?.sequence_seed ?? roomSeed;
   const cycleIndex = Math.floor((roundNumber - 1) / challenges.length);
   const challengeOrder = seededShuffle(
      challenges.map((_, index) => index),
      `${sequenceSeed}-${language}-${difficulty}-challenges-${cycleIndex}`
   );
   const syncedSequence = room?.question_sequence;
   const selectedIndex = Array.isArray(syncedSequence)
      ? syncedSequence[roundNumber - 1]
      : undefined;
   const originalIndex = Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < challenges.length
      ? selectedIndex
      : challengeOrder[(roundNumber - 1) % challenges.length];
   const originalChallenge = challenges[originalIndex];
   const targetCorrectIndex = getBalancedCorrectPosition(room, roundNumber);
   const wrongChoices = originalChallenge.choices.filter(
      (_, index) => index !== originalChallenge.correct
   );
   const shuffledWrongChoices = seededShuffle(
      wrongChoices,
      `${roomSeed}-${language}-${difficulty}-${roundNumber}-wrong-choices`
   );
   const choices = [];
   let wrongIndex = 0;
   for (let index = 0; index < 4; index++) {
      if (index === targetCorrectIndex) {
         choices.push(originalChallenge.choices[originalChallenge.correct]);
      } else {
         choices.push(shuffledWrongChoices[wrongIndex]);
         wrongIndex += 1;
      }
   }
   return {
      ...originalChallenge,
      choices,
      correct: targetCorrectIndex,
      concept: CONCEPT_LABELS[originalChallenge.title] ?? "Debugging",
      difficulty,
   };
}
function getRoundSeconds(difficulty, mode = "classic") {
   const base = difficulty === "Rookie" ? 60 : difficulty === "Advanced" ? 25 : difficulty === "Intermediate" ? 35 : 45;
   if (mode === "timed") {
      if (difficulty === "Advanced") return 10;
      if (difficulty === "Intermediate") return 12;
      return 15;
   }
   if (mode === "race") return Math.max(18, base - 6);
   return base;
}
function getBasePoints(difficulty) {
   if (difficulty === "Advanced") return 150;
   if (difficulty === "Intermediate") return 125;
   return 100;
}
function playGameSound(type) {
   if (window.localStorage.getItem("bughunt-sound-muted") === "1") return;
   try {
      const AudioContextClass =
         window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const now = context.currentTime;
      const notes =
         type === "win"
            ? [523.25, 659.25, 783.99, 1046.5]
            : type === "lose"
               ? [392, 349.23, 293.66]
               : [659.25, 783.99];
      notes.forEach((frequency, index) => {
         const oscillator = context.createOscillator();
         const gain = context.createGain();
         const start = now + index * 0.13;
         oscillator.type = type === "lose" ? "triangle" : "sine";
         oscillator.frequency.setValueAtTime(frequency, start);
         gain.gain.setValueAtTime(0.0001, start);
         gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
         gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
         oscillator.connect(gain);
         gain.connect(context.destination);
         oscillator.start(start);
         oscillator.stop(start + 0.2);
      });
      window.setTimeout(() => context.close(), 1200);
   } catch (error) {
      console.warn("Sound could not play:", error);
   }
}
function useMultiplayerCharacterLooks(players = []) {
   const [looks, setLooks] = useState({});
   const userIds = [...new Set(players.map(player => player.user_id).filter(Boolean))].sort().join("|");
   useEffect(() => {
      if (!userIds) { setLooks({}); return; }
      let active = true;
      const fetchLooks = async () => {
         const { data, error } = await supabase.from("debugger_characters")
            .select("user_id,look").in("user_id", userIds.split("|"));
         if (!active) return;
         if (error) {
            console.warn("Could not load opponent character designs:", error);
            return;
         }
         setLooks(Object.fromEntries((data || []).filter(row => row.look).map(row => [row.user_id, row.look])));
      };
      fetchLooks();
      const refresh = window.setInterval(fetchLooks, 10000);
      return () => { active = false; window.clearInterval(refresh); };
   }, [userIds]);
   return looks;
}

function GameArena({
   localCharacterLook,
   room,
   players,
   currentPlayer,
   answers,
   onLeave,
   playerNotice,
   onMatchCompleted,
}) {
   const completedMatchRef = useRef(new Set());
   useEffect(() => {
      if (room?.status !== "finished" && room?.phase !== "finished") return;
      if (!currentPlayer?.id || !room?.id) return;
      const key = `${room.id}:${room.match_number ?? 1}`;
      if (completedMatchRef.current.has(key)) return;
      completedMatchRef.current.add(key);
      onMatchCompleted?.(room.id);
   }, [room?.status, room?.phase, room?.id, room?.match_number, currentPlayer?.id, onMatchCompleted]);
   const [introDone, setIntroDone] = useState(false);
   const avatarMap = usePlayerAvatars(players);
   const badgeMap = usePlayerBadges(players);
   const syncedCharacterLooks = useMultiplayerCharacterLooks(players);
   const characterForPlayer = (player) => {
      if (!player) return DEFAULT_LOOK;
      if (player.id === currentPlayer?.id) return localCharacterLook || DEFAULT_LOOK;
      return (player.user_id && syncedCharacterLooks[player.user_id]) || DEFAULT_LOOK;
   };
   const opponentCharacter = players.find(player => player.id !== currentPlayer?.id);
   const opponentCharacterLook = characterForPlayer(opponentCharacter);
   const [timedBugNumber, setTimedBugNumber] = useState(1);
   const activeRoundNumber = room?.game_mode === "timed"
      ? timedBugNumber
      : Number(room?.current_round ?? 1);
   const challenge = getChallenge({
      ...room,
      current_round: activeRoundNumber,
      sequence_seed: room?.game_mode === "timed"
         ? `${room?.id ?? room?.code}-${currentPlayer?.id ?? "player"}`
         : undefined,
   });
   const roundSeconds = getRoundSeconds(room?.difficulty, room?.game_mode);
   const currentRoundAnswers = answers.filter(
      (answer) => Number(answer.round_number) === Number(activeRoundNumber)
   );
   const [selectedChoice, setSelectedChoice] = useState(null);
   const [submitting, setSubmitting] = useState(false);
   const [secondsLeft, setSecondsLeft] = useState(roundSeconds);
   const [timedSecondsLeft, setTimedSecondsLeft] = useState(90);
   const [timerRound, setTimerRound] = useState(Number(room?.current_round ?? 1));
   const [gameError, setGameError] = useState("");
   const [showHelp, setShowHelp] = useState(false);
   const [playedFinishSound, setPlayedFinishSound] = useState(false);
   const [streak, setStreak] = useState(0);
   const [bestStreak, setBestStreak] = useState(0);
   const [roundHistory, setRoundHistory] = useState([]);
   const [showAnswerReview, setShowAnswerReview] = useState(false);
   const [revealedRound, setRevealedRound] = useState(null);
   const [rewardStatus, setRewardStatus] = useState("idle");
   const [answerFlash, setAnswerFlash] = useState(null);
   const [rewardSummary, setRewardSummary] = useState(null);
   const latestRoundRef = useRef(Number(activeRoundNumber));
   latestRoundRef.current = Number(activeRoundNumber);
   const myAnswer = currentRoundAnswers.find(
      (answer) => answer.player_id === currentPlayer?.id
   );
   const sortedPlayers = [...players].sort(
      (a, b) => b.score - a.score
   );
   const winner = sortedPlayers[0];
   const didWin = winner?.id === currentPlayer?.id;
   const myPlacement =
      sortedPlayers.findIndex((player) => player.id === currentPlayer?.id) + 1;
   const myCorrectRounds = roundHistory.filter((round) => round.isCorrect).length;
   const myAccuracy = roundHistory.length
      ? Math.round((myCorrectRounds / roundHistory.length) * 100)
      : 0;
   const myAverageResponse = roundHistory.length
      ? (
           roundHistory.reduce((total, round) => total + round.responseSeconds, 0) /
           roundHistory.length
        ).toFixed(1)
      : "0.0";
   const fastestRound = roundHistory.length
      ? Math.min(...roundHistory.map((round) => round.responseSeconds)).toFixed(1)
      : "—";
   const unlockedThisMatch = [
      myCorrectRounds >= 1 && { icon: "🐛", name: "FIRST FIX", text: "Squash your first bug." },
      myCorrectRounds === Number(room?.rounds ?? 0) && Number(room?.rounds ?? 0) > 0 && { icon: "💎", name: "FLAWLESS DEBUGGER", text: "Fix every bug in a match." },
      Number(fastestRound) <= 5 && { icon: "⚡", name: "SPEED DEMON", text: "Fix a bug in 5 seconds or less." },
      bestStreak >= 3 && { icon: "🔥", name: "HOT STREAK", text: "Reach a 3+ fix streak." },
      didWin && room?.game_mode === "race" && { icon: "🏁", name: "RACE SPECIALIST", text: "Win a Race match." },
      didWin && { icon: "🏆", name: "VICTOR", text: "Win the match." },
   ].filter(Boolean);
   function getDisplayedScore(player) {
      if (room?.phase !== "answering") {
         return Number(player.score ?? 0);
      }
      const playerAnswer = currentRoundAnswers.find(
         (answer) => answer.player_id === player.id
      );
      return Math.max(
         0,
         Number(player.score ?? 0) - Number(playerAnswer?.points ?? 0)
      );
   }
   const displayedPlayers = [...players].sort(
      (a, b) => getDisplayedScore(b) - getDisplayedScore(a)
   );
   useEffect(() => {
      const finished = room?.phase === "finished" || room?.status === "finished";
      if (!finished || !currentPlayer?.user_id || rewardStatus !== "idle") return;
      let cancelled = false;
      async function recordReward() {
         setRewardStatus("saving");
         const { data: beforeProfile } = await supabase
            .from("profiles")
            .select("xp,bug_points")
            .eq("id", currentPlayer.user_id)
            .maybeSingle();
         const matchKey = `match-${Number(room.match_number ?? 1)}`;
         const { error: rewardError } = await supabase.rpc("record_game_result_once", {
            p_room_id: room.id,
            p_match_key: matchKey,
            p_score: Number(currentPlayer.score ?? 0),
            p_bugs_fixed: myCorrectRounds,
            p_best_streak: bestStreak,
            p_won: didWin,
            p_mode: room?.game_mode ?? "classic",
         });
         if (cancelled) return;
         if (rewardError) {
            console.error("Couldn't save progression:", rewardError);
            setGameError("Match finished, but progression could not be saved.");
            setRewardStatus("error");
            return;
         }
         const { error: historyError } = await supabase
            .from("match_history")
            .upsert({
               user_id: currentPlayer.user_id,
               room_id: room.id,
               match_key: matchKey,
               mode: room?.game_mode ?? "classic",
               language: room?.language ?? "Unknown",
               difficulty: room?.difficulty ?? "Unknown",
               score: Number(currentPlayer.score ?? 0),
               bugs_fixed: myCorrectRounds,
               best_streak: bestStreak,
               placement: myPlacement,
               won: didWin,
            }, { onConflict: "user_id,room_id,match_key" });
         if (historyError) console.error("Couldn't save match history:", historyError);
         const { data: afterProfile } = await supabase
            .from("profiles")
            .select("xp,bug_points")
            .eq("id", currentPlayer.user_id)
            .maybeSingle();
         if (beforeProfile && afterProfile) {
            const beforeLevel = Math.max(1, Math.floor(Math.sqrt(Math.max(0, beforeProfile.xp) / 100)) + 1);
            const afterLevel = Math.max(1, Math.floor(Math.sqrt(Math.max(0, afterProfile.xp) / 100)) + 1);
            setRewardSummary({
               xpEarned: Math.max(0, Number(afterProfile.xp) - Number(beforeProfile.xp)),
               bpEarned: Math.max(0, Number(afterProfile.bug_points) - Number(beforeProfile.bug_points)),
               beforeXp: Number(beforeProfile.xp),
               afterXp: Number(afterProfile.xp),
               beforeLevel,
               afterLevel,
            });
         }
         setRewardStatus("saved");
      }
      recordReward();
      return () => {
         cancelled = true
      };
   }, [
      room?.id,
      room?.phase,
      room?.status,
      room?.game_mode,
      room?.match_number,
      currentPlayer?.user_id,
      currentPlayer?.score,
      myCorrectRounds,
      bestStreak,
      didWin,
   ]);
   useEffect(() => {
      if (
         (room?.phase === "finished" || room?.status === "finished") &&
         !playedFinishSound
      ) {
         playGameSound(didWin ? "win" : "lose");
         setPlayedFinishSound(true);
      }
   }, [room?.phase, room?.status, didWin, playedFinishSound]);
   useEffect(() => {
      setSelectedChoice(null);
      setSubmitting(false);
      setGameError("");
      setTimerRound(Number(room?.current_round ?? 1));
      setSecondsLeft(roundSeconds);
      setRevealedRound(null);
      if (room?.status === "playing") {
         setPlayedFinishSound(false);
      }
   }, [room?.current_round, timedBugNumber, roundSeconds, room?.status]);
   useEffect(() => {
      if (room?.game_mode === "timed") return;
      if (room?.phase !== "answering" || myAnswer) return;
      function updateTimer() {
         const activeRound = Number(room?.current_round ?? 1);
         const start = room?.round_started_at
            ? new Date(room.round_started_at).getTime()
            : Date.now();
         const elapsed = Math.floor((Date.now() - start) / 1000);
         setTimerRound(activeRound);
         setSecondsLeft(Math.max(0, roundSeconds - elapsed));
      }
      updateTimer();
      const timer = window.setInterval(updateTimer, 250);
      return () => window.clearInterval(timer);
   }, [room?.phase, room?.round_started_at, room?.current_round, roundSeconds, myAnswer]);
   useEffect(() => {
      if (room?.game_mode !== "timed" || room?.status !== "playing" || !room?.mode_ends_at) return;
      function updateTimedClock() {
         const remaining = Math.max(
            0,
            Math.ceil((new Date(room.mode_ends_at).getTime() - Date.now()) / 1000)
         );
         setTimedSecondsLeft(remaining);
      }
      updateTimedClock();
      const timer = window.setInterval(updateTimedClock, 250);
      return () => window.clearInterval(timer);
   }, [room?.game_mode, room?.status, room?.mode_ends_at]);

   async function submitAnswer(choiceIndex, timedOut = false, expectedRound = Number(activeRoundNumber)) {
      if (
         submitting ||
         myAnswer ||
         !currentPlayer ||
         room?.phase !== "answering" ||
         Number(latestRoundRef.current) !== Number(expectedRound)
      ) return;
      setSubmitting(true);
      setGameError("");
      try {
         const isCorrect = !timedOut && choiceIndex === challenge.correct;
         setAnswerFlash(isCorrect ? "correct" : "wrong");
         window.setTimeout(() => setAnswerFlash(null), 520);
         const points = isCorrect
            ? room?.game_mode === "timed"
               ? getBasePoints(room.difficulty)
               : getBasePoints(room.difficulty) + Math.max(0, secondsLeft * 2)
            : 0;
         const { error: answerError } = await supabase
            .from("answers")
            .insert({
               room_id: room.id,
               player_id: currentPlayer.id,
               round_number: expectedRound,
               selected_index: timedOut ? -1 : choiceIndex,
               is_correct: isCorrect,
               points,
            });
         if (answerError) {
            if (answerError.code === "23505") return;
            throw answerError;
         }
         if (Number(latestRoundRef.current) !== Number(expectedRound)) return;
         const responseSeconds = room?.game_mode === "timed"
            ? Math.max(0, 90 - timedSecondsLeft)
            : Math.max(0, roundSeconds - secondsLeft);
         setRoundHistory((previousHistory) => {
            const alreadyRecorded = previousHistory.some(
               (round) => round.roundNumber === Number(expectedRound)
            );
            if (alreadyRecorded) return previousHistory;
            return [
               ...previousHistory,
               {
                  roundNumber: Number(expectedRound),
                  isCorrect,
                  points,
                  responseSeconds,
                  timedOut,
                  title: challenge.title,
                  code: challenge.code,
                  question: challenge.question,
                  selectedAnswer: timedOut ? null : challenge.choices[choiceIndex],
                  correctAnswer: challenge.choices[challenge.correct],
                  explanation: challenge.explanation,
               },
            ];
         });
         if (isCorrect) {
            setStreak((previousStreak) => {
               const nextStreak = previousStreak + 1;
               setBestStreak((previousBest) => Math.max(previousBest, nextStreak));
               return nextStreak;
            });
         } else {
            setStreak(0);
         }
         let awardedPoints = points;
         if (room?.game_mode === "race" && isCorrect) {
            const { data: claimedRound, error: claimError } = await supabase
               .from("rooms")
               .update({
                  phase: "results",
                  round_winner_id: currentPlayer.id,
               })
               .eq("id", room.id)
               .eq("phase", "answering")
               .eq("current_round", expectedRound)
               .is("round_winner_id", null)
               .select("id")
               .maybeSingle();
            if (claimError) throw claimError;
            if (!claimedRound) {
               awardedPoints = 0;
               await supabase
                  .from("answers")
                  .update({ points: 0 })
                  .eq("room_id", room.id)
                  .eq("player_id", currentPlayer.id)
                  .eq("round_number", expectedRound);
            }
         }
         if (awardedPoints > 0) {
            const { error: scoreError } = await supabase
               .from("players")
               .update({ score: Number(currentPlayer.score ?? 0) + awardedPoints })
               .eq("id", currentPlayer.id);
            if (scoreError) throw scoreError;
         } else if (room?.game_mode === "timed" && !timedOut && !isCorrect) {
            const penaltyScore = Math.max(0, Number(currentPlayer.score ?? 0) - 25);
            const { error: penaltyError } = await supabase
               .from("players")
               .update({ score: penaltyScore })
               .eq("id", currentPlayer.id);
            if (penaltyError) throw penaltyError;
         }
         if (room?.game_mode === "timed" && timedSecondsLeft > 0) {
            setSelectedChoice(null);
            setTimedBugNumber((previousBug) => previousBug + 1);
         }
      } catch (err) {
         console.error("Couldn't submit answer:", err);
         setGameError("Couldn't submit your answer. Try again.");
      } finally {
         setSubmitting(false);
      }
   }
   useEffect(() => {
      const activeRound = Number(room?.current_round);
      if (
         room?.game_mode !== "timed" &&
         room?.phase === "answering" &&
         Number(timerRound) === activeRound &&
         secondsLeft === 0 &&
         !myAnswer &&
         !submitting
      ) {
         submitAnswer(-1, true, activeRound);
      }
   }, [secondsLeft, timerRound, room?.phase, room?.current_round, myAnswer, submitting]);
   useEffect(() => {
      if (!currentPlayer?.is_host || room?.phase !== "answering" || players.length === 0) {
         return;
      }
      if (room?.game_mode === "timed") {
         return;
      }
      if (room?.game_mode === "race") {
         if (room?.round_winner_id) return;
         if (currentRoundAnswers.length < players.length) return;
      } else if (currentRoundAnswers.length < players.length) {
         return;
      }
      supabase
         .from("rooms")
         .update({ phase: "results" })
         .eq("id", room.id)
         .eq("phase", "answering")
         .then(({ error }) => {
            if (error) console.error("Couldn't reveal results:", error);
         });
   }, [
      currentRoundAnswers.length,
      players.length,
      currentPlayer?.is_host,
      room?.id,
      room?.phase,
      room?.current_round,
      room?.game_mode,
      room?.round_winner_id,
      timedSecondsLeft,
   ]);
   useEffect(() => {
      if (
         room?.game_mode === "timed" &&
         currentPlayer?.is_host &&
         room?.status === "playing" &&
         timedSecondsLeft <= 0
      ) {
         supabase
            .from("rooms")
            .update({ status: "finished", phase: "finished" })
            .eq("id", room.id)
            .eq("status", "playing")
            .then(({ error }) => {
               if (error) console.error("Couldn't stop timed match:", error);
            });
      }
   }, [room?.game_mode, room?.status, room?.id, currentPlayer?.is_host, timedSecondsLeft]);

   useEffect(() => {
      if (
         room?.phase === "results" &&
         revealedRound !== Number(room?.current_round)
      ) {
         setRevealedRound(Number(room?.current_round));
         playGameSound("reveal");
      }
   }, [room?.phase, room?.current_round, revealedRound]);
   async function advanceRound() {
      if (!currentPlayer?.is_host || room?.phase !== "results") return;
      setGameError("");
      try {
         if (Number(room.current_round) >= Number(room.rounds)) {
            const { error } = await supabase
               .from("rooms")
               .update({ status: "finished", phase: "finished" })
               .eq("id", room.id);
            if (error) throw error;
            return;
         }
         const advancingRound = Number(room.current_round);
         const { data: advancedRoom, error } = await supabase
            .from("rooms")
            .update({
               current_round: advancingRound + 1,
               phase: "answering",
               round_started_at: new Date().toISOString(),
               round_winner_id: null,
            })
            .eq("id", room.id)
            .eq("phase", "results")
            .eq("current_round", advancingRound)
            .select("id")
            .maybeSingle();
         if (error) throw error;
         if (!advancedRoom) return;
      } catch (err) {
         console.error("Couldn't advance round:", err);
         setGameError("Couldn't start the next round.");
      }
   }
   useEffect(() => {
      if (room?.phase !== "results" || !currentPlayer?.is_host || room?.game_mode === "timed") return;
      const timeout = window.setTimeout(() => { advanceRound(); }, 3000);
      return () => window.clearTimeout(timeout);
   }, [room?.phase, room?.current_round, room?.id, currentPlayer?.is_host, room?.game_mode]);

   async function playAgain() {
      if (!currentPlayer?.is_host) return;
      try {
         setStreak(0);
         setBestStreak(0);
         setRoundHistory([]);
         setShowAnswerReview(false);
         setRevealedRound(null);
         setRewardStatus("idle");
         setRewardSummary(null);
         setAnswerFlash(null);
         const { error: answersError } = await supabase
            .from("answers")
            .delete()
            .eq("room_id", room.id);
         if (answersError) throw answersError;
         const { error: scoresError } = await supabase
            .from("players")
            .update({ score: 0 })
            .eq("room_id", room.id);
         if (scoresError) throw scoresError;
         const { error: roomError } = await supabase
            .from("rooms")
            .update({
               status: "waiting",
               phase: "lobby",
               current_round: 1,
               match_number: Number(room.match_number ?? 1) + 1,
               round_started_at: null,
               mode_ends_at: null,
               round_winner_id: null,
            })
            .eq("id", room.id);
         if (roomError) throw roomError;
      } catch (err) {
         console.error("Couldn't reset game:", err);
         setGameError("Couldn't reset the game.");
      }
   }
   const [showMatchReport, setShowMatchReport] = useState(false);
   useEffect(() => {
      if (room?.phase !== "finished" && room?.status !== "finished") { setShowMatchReport(false); return; }
      const timeout = window.setTimeout(() => setShowMatchReport(true), 3800);
      return () => window.clearTimeout(timeout);
   }, [room?.phase, room?.status]);
   if (!introDone && room?.phase !== "finished" && room?.status !== "finished") {
      const opponent = players.find((player) => player.id !== currentPlayer?.id);
      return <AnimatedDebugRoom playerLook={localCharacterLook || DEFAULT_LOOK} opponentLook={opponentCharacterLook} multiplayer={Boolean(opponent)} onReady={() => setIntroDone(true)} title="MULTIPLAYER ARENA" introKey={`multi-${room?.id}-${room?.match_number ?? 1}`} playerName={currentPlayer?.name || "Debugger"} opponentName={opponent?.name || "Opponent"} />;
   }
   const opponentPlayer = players.find(player => player.id !== currentPlayer?.id);
   const myRevealAnswer = currentRoundAnswers.find(answer => answer.player_id === currentPlayer?.id);
   const opponentRevealAnswer = currentRoundAnswers.find(answer => answer.player_id === opponentPlayer?.id);
   if (introDone && room?.phase === "results" && room?.game_mode !== "timed") {
      return <ArenaReveal playerName={currentPlayer?.name || "Debugger"} opponentName={opponentPlayer?.name || "Opponent"} title="⚡ ROUND RESULTS" subtitle={`Round ${activeRoundNumber} · ${players.length} debuggers`} playerLook={localCharacterLook || DEFAULT_LOOK} opponentLook={opponentCharacterLook} multiplayer={Boolean(opponentPlayer)} playerResult={myRevealAnswer ? (Number(myRevealAnswer.points) > 0 ? "correct" : "wrong") : null} opponentResult={opponentRevealAnswer ? (Number(opponentRevealAnswer.points) > 0 ? "correct" : "wrong") : null} leaderboard={displayedPlayers.map(p=>({id:p.id,name:p.name,score:p.score}))} countdown={true} />;
   }
   if ((room?.phase === "finished" || room?.status === "finished") && !showMatchReport) {
      return <ArenaReveal playerName={currentPlayer?.name || "Debugger"} opponentName={opponentPlayer?.name || "Opponent"} title={`🏆 ${winner?.name || "WINNER"} WINS!`} subtitle="Final standings" playerLook={localCharacterLook || DEFAULT_LOOK} opponentLook={opponentCharacterLook} multiplayer={Boolean(opponentPlayer)} playerResult={didWin ? "correct" : "wrong"} opponentResult={didWin ? "wrong" : "correct"} winnerSide={didWin ? "left" : "right"} leaderboard={sortedPlayers.map(p=>({id:p.id,name:p.name,score:p.score}))} onContinue={() => setShowMatchReport(true)} buttonLabel="View match report" />;
   }
   if (room?.phase === "finished" || room?.status === "finished") {
      return (
         <main className="app result-app">
            <PlayerLeftNotice message={playerNotice} />
            <div className="mode-action-controls">
               <ModeHelpButton onClick={() => setShowHelp(true)} />
               <button type="button" className="mode-leave-button" onClick={onLeave}>← Leave</button>
            </div>
            {showHelp && <GameModeTutorial mode={room?.game_mode || "classic"} onStart={() => setShowHelp(false)} />}
            <nav className="navbar">
               <Logo />
               <div className="status">
                  <span className="status-dot"></span>
                  MATCH COMPLETE
               </div>
            </nav>
            <section className="game-page final-game-page">
               <CaterpillarMascot mode="trophy" />
               <div className="game-shell final-shell">
                  <p className="eyebrow">// FINAL RESULTS</p>
                  <h2 className={didWin ? "game-title victory-title" : "game-title runner-up-title"}>
                     {didWin ? "YOU CRUSHED IT!" : "MATCH COMPLETE"}
                  </h2>
                  <div className="bh-final-duel" aria-label="Match podium">
                     {sortedPlayers.slice(0, 2).map((player, index) => {
                        const champion = index === 0;
                        const isMe = player.id === currentPlayer?.id;
                        return (
                           <div key={player.id} className={`bh-final-contestant ${champion ? "bh-final-contestant--winner" : "bh-final-contestant--runner"}`}>
                              <div className="bh-final-contestant__avatar">
                                 <DebuggerCharacter look={characterForPlayer(player)} />
                                 <span className="bh-final-contestant__reaction" aria-label={champion ? "Winner trophy" : "Disappointed face"}>{champion ? "🏆" : "☹️"}</span>
                              </div>
                              <span className="bh-final-contestant__rank">{champion ? "🏆 CHAMPION" : "RUNNER-UP"}</span>
                              <strong>{player.name}{isMe ? " (You)" : ""}</strong>
                              <span className="bh-final-contestant__score">{player.score ?? 0} PTS</span>
                           </div>
                        );
                     })}
                  </div>
                  <div className={didWin ? "winner-card personal-finish win-finish" : "winner-card personal-finish lose-finish"}>
                     <span className="winner-crown">
                        {didWin ? "🏆" : myPlacement === 2 ? "🥈" : "🐛"}
                     </span>
                     <p>{didWin ? "Victory" : `You placed #${myPlacement}`}</p>
                     <h2>{currentPlayer?.name}</h2>
                     <strong>{currentPlayer?.score ?? 0} PTS</strong>
                     <span className="finish-message">
                        {didWin
                           ? "Fast fixes. Clean debugging. Top of the leaderboard."
                           : `${winner?.name} takes this match with ${winner?.score ?? 0} points. Rematch?`}
                     </span>
                     {bestStreak >= 2 && (
                        <span className="final-streak">🔥 BEST STREAK: {bestStreak}</span>
                     )}
                  </div>
                  <div className="match-stats-grid">
                     <div className="match-stat-card">
                        <span>BUGS FIXED</span>
                        <strong>{myCorrectRounds}/{roundHistory.length || Number(room?.rounds ?? 0)}</strong>
                     </div>
                     <div className="match-stat-card">
                        <span>ACCURACY</span>
                        <strong>{myAccuracy}%</strong>
                     </div>
                     <div className="match-stat-card">
                        <span>BEST STREAK</span>
                        <strong>🔥 {bestStreak}</strong>
                     </div>
                     <div className="match-stat-card">
                        <span>FASTEST FIX</span>
                        <strong>⚡ {fastestRound}s</strong>
                     </div>
                  </div>
                  <div className="performance-award">
                     <span>⚡</span>
                     <div>
                        <small>DEBUG REPORT</small>
                        <strong>
                           {myCorrectRounds === Number(room?.rounds)
                              ? "FLAWLESS DEBUGGER"
                              : bestStreak >= 3
                                 ? "HOT STREAK"
                                 : myAccuracy >= 60
                                    ? "BUG SQUASHER"
                                    : "KEEP DEBUGGING"}
                        </strong>
                        <p>Average response time: {myAverageResponse}s</p>
                     </div>
                  </div>
                  <div className="leaderboard-card final-staircase-card">
                     <h3>Final Leaderboard</h3>
                     <div className={`final-staircase final-staircase-${sortedPlayers.length}`}>
                        {sortedPlayers.map((player, index) => (
                           <div
                              className={`staircase-player staircase-rank-${index + 1} ${player.id === currentPlayer?.id ? "current-user-row" : ""}`}
                              key={player.id}
                           >
                              <div className="staircase-rank">
                                 {index === 0 ? "🏆 #1" : `#${index + 1}`}
                              </div>
                              <div className="staircase-player-info staircase-player-with-avatar">
                                 <PlayerAvatar player={player} avatarMap={avatarMap} large={index === 0} />
                                 <strong>
                                    {player.name}
                                    {player.id === currentPlayer?.id ? " (You)" : ""}
                                    {player.user_id && <MatchProfileBadge badgeId={badgeMap[player.user_id]} />}
                                 </strong>
                                 <b>{player.score} PTS</b>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  {currentPlayer?.user_id && rewardSummary && (
                     <div className="reward-celebration">
                        {rewardSummary.afterLevel > rewardSummary.beforeLevel && (
                           <div className="level-up-burst">
                              <span>LEVEL UP!</span>
                              <strong>LVL {rewardSummary.afterLevel}</strong>
                              <small>🔓 NEW COSMETICS MAY BE AVAILABLE</small>
                           </div>
                        )}
                        <div className="reward-earned-grid">
                           <div><span>XP EARNED</span><strong>+{rewardSummary.xpEarned} XP</strong></div>
                           <div><span>BUG POINTS</span><strong>+{rewardSummary.bpEarned} 🪙</strong></div>
                        </div>
                        <div className="reward-xp-track">
                           <span style={{ width: `${Math.min(100, ((rewardSummary.afterXp - Math.pow(rewardSummary.afterLevel - 1, 2) * 100) / Math.max(1, Math.pow(rewardSummary.afterLevel, 2) * 100 - Math.pow(rewardSummary.afterLevel - 1, 2) * 100)) * 100)}%` }}></span>
                        </div>
                     </div>
                  )}
                  {currentPlayer?.user_id && rewardStatus === "saving" && (
                     <p className="reward-save-status">Saving XP & Bug Points...</p>
                  )}
                  {currentPlayer?.user_id && rewardStatus === "saved" && (
                     <p className="reward-save-status">✓ XP & Bug Points saved</p>
                  )}
                  {gameError && <p className="form-error">{gameError}</p>}
                  {unlockedThisMatch.length > 0 && (
                     <div className="match-achievements">
                        <p className="eyebrow">// MATCH BADGES</p>
                        <div className="match-achievement-grid">
                           {unlockedThisMatch.map((badge) => (
                              <div className="match-achievement" key={badge.name}>
                                 <span>{badge.icon}</span>
                                 <div><strong>{badge.name}</strong><small>{badge.text}</small></div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
                  <AnswerReview rounds={roundHistory} open={showAnswerReview} onToggle={() => setShowAnswerReview(value => !value)} />
                  <div className="final-result-actions">
                     {currentPlayer?.is_host ? (
                        <button className="primary-button full-button iridescent-button" onClick={playAgain}>
                           Play Again
                        </button>
                     ) : (
                        <button className="primary-button full-button iridescent-button" disabled>
                           Waiting for Host to Start a Rematch
                        </button>
                     )}
                     <button className="primary-button full-button iridescent-button" onClick={onLeave}>
                        Return Home
                     </button>
                  </div>
               </div>
            </section>
         </main>
      );
   }
   return (
      <main className={`app home-app bh-room-gameplay gameplay-feedback ${answerFlash ? `answer-flash-${answerFlash}` : ""} ${room?.game_mode === "timed" && timedSecondsLeft <= 30 ? "timed-urgent" : ""} ${room?.game_mode === "timed" && timedSecondsLeft <= 10 ? "timed-critical" : ""}`}>
         <ActiveArenaBackdrop playerLook={localCharacterLook || DEFAULT_LOOK} opponentLook={opponentCharacterLook} multiplayer={players.length > 1} playerName={currentPlayer?.name || "Debugger"} opponentName={players.find(p => p.id !== currentPlayer?.id)?.name || "Opponent"} />
         <div className="bh-live-racers" aria-label="Live competitors">
            {players.map((player, index) => {
               const submitted = currentRoundAnswers.some(answer => answer.player_id === player.id);
               const isMe = player.id === currentPlayer?.id;
               return (
                  <div className={`bh-live-racer ${isMe ? "bh-live-racer--you" : ""}`} key={player.id}>
                     <div className="bh-live-racer__avatar"><DebuggerCharacter look={characterForPlayer(player)} /></div>
                     <div className="bh-live-racer__details">
                        <strong title={player.name}>{player.name}{isMe ? " (You)" : ""}</strong>
                        <span>{player.score ?? 0} PTS</span>
                        <small className={submitted ? "bh-live-racer__locked" : ""}>{submitted ? "✓ Answer locked" : "⌨ Debugging..."}</small>
                     </div>
                  </div>
               );
            })}
         </div>
         <PlayerLeftNotice message={playerNotice} />
         <div className="mode-action-controls">
            <ModeHelpButton onClick={() => setShowHelp(true)} />
            <button type="button" className="mode-leave-button" onClick={onLeave}>← Leave</button>
         </div>
         {showHelp && <GameModeTutorial mode={room?.game_mode || "classic"} onStart={() => setShowHelp(false)} />}
         {answerFlash && (
            <div className={`answer-feedback-pop answer-feedback-${answerFlash}`}>
               {answerFlash === "correct" ? "✓ BUG FIXED" : room?.game_mode === "timed" ? "✕ -25 PTS" : "✕ NOT QUITE"}
            </div>
         )}
         {streak >= 3 && (
            <div className={`live-streak streak-${Math.min(5, streak)}`}>🔥 {streak} FIX STREAK</div>
         )}
         <nav className="navbar">
            <Logo />
            <div className="status">
               <span className="status-dot"></span>
               LIVE MATCH
            </div>
         </nav>
         <section className="game-page">
            <div className="game-shell">
               {room?.game_mode === "race" && room?.phase === "results" && room?.round_winner_id && (
                  <div className="race-winner-banner">
                     ⚡ {players.find((player) => player.id === room.round_winner_id)?.name ?? "A debugger"} FIXED IT FIRST!
                  </div>
               )}
               <div className="round-topbar">
                  <div>
                     <p className="eyebrow">
                        // {room?.difficulty?.toUpperCase()} • {room?.language?.toUpperCase()}
                     </p>
                     <h2 className="game-title">
                        {room?.game_mode === "timed"
                           ? `BUG ${timedBugNumber} • 90 SECOND SPRINT`
                           : room?.game_mode === "race"
                              ? `RACE ROUND ${room?.current_round} / ${room?.rounds}`
                              : `ROUND ${room?.current_round} / ${room?.rounds}`}
                     </h2>
                  </div>
                  <div
                     className={
                        (room?.game_mode === "timed" ? timedSecondsLeft : secondsLeft) <= 10
                           ? "timer timer-danger timer-critical"
                           : room?.game_mode === "timed" && timedSecondsLeft <= 30
                              ? "timer timer-warning"
                              : "timer"
                     }
                  >
                     {room?.game_mode === "timed" ? `${timedSecondsLeft}s` : `${secondsLeft}s`}
                  </div>
               </div>
               <div className="round-progress">
                  <span
                     style={{
                        width: room?.game_mode === "timed"
                           ? `${Math.max(0, Math.min(100, ((90 - timedSecondsLeft) / 90) * 100))}%`
                           : `${(Number(room?.current_round ?? 1) / Number(room?.rounds ?? 1)) * 100}%`,
                     }}
                  ></span>
               </div>
               <div className="game-grid">
                  <div className="challenge-card">
                     <div className="challenge-heading">
                        <div>
                           <span className="challenge-number">BUG #{room?.game_mode === "timed" ? timedBugNumber : room?.current_round}</span>
                           <h2>{challenge.title}</h2>
                        </div>
                        <div className="challenge-badges">
                           <span className="concept-chip">{challenge.concept}</span>
                           <span className={`difficulty-chip difficulty-${room?.difficulty?.toLowerCase()}`}>
                              {room?.difficulty}
                           </span>
                           <span className="bug-chip">🐛 FIND THE BUG</span>
                        </div>
                     </div>
                     <pre className="game-code"><code>{challenge.code}</code></pre>
                     {room?.phase === "answering" ? (
                        <>
                           <h3 className="question">{challenge.question}</h3>
                           <div className="answer-grid">
                              {challenge.choices.map((choice, index) => (
                                 <button
                                    className={selectedChoice === index ? "answer-option selected" : "answer-option"}
                                    key={`${index}-${choice}`}
                                    disabled={Boolean(myAnswer) || submitting}
                                    onClick={() => setSelectedChoice(index)}
                                 >
                                    <span>{String.fromCharCode(65 + index)}</span>
                                    {choice}
                                 </button>
                              ))}
                           </div>
                           {!myAnswer ? (
                              <button
                                 className="primary-button submit-answer"
                                 disabled={selectedChoice === null || submitting}
                                 onClick={() => submitAnswer(selectedChoice)}
                              >
                                 {submitting ? "Submitting..." : "Lock In Answer"}
                              </button>
                           ) : (
                              <div className="locked-answer">
                                 {room?.game_mode === "race"
                                    ? "🏁 Answer locked — first correct fix takes the round"
                                    : room?.game_mode === "timed"
                                       ? "⚡ Loading next bug..."
                                       : "✓ Answer locked — waiting for other developers"}
                              </div>
                           )}
                        </>
                     ) : (
                        <div className="result-panel">
                           <CaterpillarMascot
                              mode={
                                 Number(room.current_round) >= Number(room.rounds)
                                    ? "trophy"
                                    : "sprint"
                              }
                           />
                           <p className="eyebrow">// BUG EXPLAINED</p>
                           <div className="explanation-meta">
                              <span className="concept-chip">CONCEPT: {challenge.concept}</span>
                              {streak >= 2 && (
                                 <span className="streak-chip">🔥 {streak} BUG STREAK</span>
                              )}
                           </div>
                           <h3>Correct fix: {challenge.choices[challenge.correct]}</h3>
                           <p>{challenge.explanation}</p>
                           {myAnswer && (
                              <div className={myAnswer.is_correct ? "personal-result correct" : "personal-result incorrect"}>
                                 {myAnswer.is_correct
                                    ? `✓ Correct! +${myAnswer.points} points`
                                    : myAnswer.selected_index === -1
                                       ? "⌛ Time expired — 0 points"
                                       : "✕ Not quite — 0 points"}
                              </div>
                           )}
                           {currentPlayer?.is_host ? (
                              <button className="primary-button submit-answer" onClick={advanceRound}>
                                 {Number(room.current_round) >= Number(room.rounds)
                                    ? "View Final Results"
                                    : "Next Round →"}
                              </button>
                           ) : (
                              <div className="locked-answer">
                                 Waiting for host to continue...
                              </div>
                           )}
                        </div>
                     )}
                     {gameError && <p className="form-error">{gameError}</p>}
                  </div>
                  <aside className="match-sidebar">
                     <div className="sidebar-card">
                        <div className="sidebar-heading">
                           <h3>Live Leaderboard</h3>
                           <span>
                              {room?.game_mode === "timed"
                                 ? `Your bug #${timedBugNumber}`
                                 : `${currentRoundAnswers.length}/${players.length} answered`}
                           </span>
                        </div>
                        {(room?.phase === "answering" ? displayedPlayers : sortedPlayers).map((player, index) => {
                           const playerAnswer = currentRoundAnswers.find(
                              (answer) => answer.player_id === player.id
                           );
                           const scoreToShow =
                              room?.phase === "answering"
                                 ? getDisplayedScore(player)
                                 : Number(player.score ?? 0);
                           return (
                              <div
                                 className={
                                    room?.phase === "results" && Number(playerAnswer?.points ?? 0) > 0
                                       ? "score-row score-reveal"
                                       : "score-row"
                                 }
                                 key={player.id}
                              >
                                 <span className="rank">#{index + 1}</span>
                                 <div>
                                    <strong>
                                       {player.name}
                                       {player.id === currentPlayer?.id ? " (You)" : ""}
                                    </strong>
                                    <small>
                                       {room?.phase === "answering"
                                          ? playerAnswer
                                             ? "ANSWER LOCKED ✓"
                                             : "DEBUGGING..."
                                          : playerAnswer?.is_correct
                                             ? "BUG FIXED ✓"
                                             : playerAnswer
                                                ? "MISSED BUG"
                                                : "NO ANSWER"}
                                    </small>
                                 </div>
                                 <div className="score-value-wrap">
                                    <b>{scoreToShow}</b>
                                    {room?.phase === "results" &&
                                       Number(playerAnswer?.points ?? 0) > 0 && (
                                          <span className="points-pop">
                                             +{playerAnswer.points}
                                          </span>
                                       )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     <div className="sidebar-card mini-rules">
                        <h3>Scoring</h3>
                        <p>Correct answer = base points</p>
                        <p>Faster answer = speed bonus</p>
                        <p>Wrong answer = 0 points</p>
                        <div className={streak >= 2 ? "streak-status active" : "streak-status"}>
                           <span>🔥</span>
                           <strong>{streak} BUG STREAK</strong>
                           <small>Consecutive correct fixes</small>
                        </div>
                     </div>
                  </aside>
               </div>
            </div>
         </section>
      </main>
   );
}
function Setting({ label, value }) {
   return (
      <div className="setting-row">
         <span>{label}</span>
         <strong>{value}</strong>
      </div>
   );
}
export default App;
