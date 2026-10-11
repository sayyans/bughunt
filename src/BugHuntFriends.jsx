import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import './BugHuntFriends.css';

export default function BugHuntFriends({ userId, compact = false, opponent = null, inMatch = false }) {
   const [friends, setFriends] = useState([]);
   const [requests, setRequests] = useState([]);
   const [people, setPeople] = useState([]);
   const [query, setQuery] = useState('');
   const [message, setMessage] = useState('');
   const [invisible, setInvisible] = useState(false);
   const [busy, setBusy] = useState(false);

   async function refresh() {
      if (!userId) return;
      const { data: relationships, error } = await supabase.from('bh_friend_requests')
         .select('id,sender_id,receiver_id,status,created_at')
         .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (error) { setMessage(error.message); return; }
      const rows = relationships || [];
      const ids = [...new Set(rows.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id))];
      const { data: profiles } = ids.length ? await supabase.from('profiles').select('id,display_name').in('id',ids) : {data:[]};
      const { data: presence } = ids.length ? await supabase.from('bh_friend_presence').select('user_id,last_seen,activity').in('user_id',ids) : {data:[]};
      const names = Object.fromEntries((profiles || []).map(p => [p.id,p.display_name]));
      const online = Object.fromEntries((presence || []).map(p => [p.user_id,p]));
      const mapped = rows.map(r => {
         const otherId = r.sender_id === userId ? r.receiver_id : r.sender_id;
         const p = online[otherId];
         return {...r,otherId,name:names[otherId] || 'Debugger',online: Boolean(p && Date.now()-Date.parse(p.last_seen)<45000),activity:p?.activity};
      });
      setFriends(mapped.filter(r=>r.status==='accepted'));
      setRequests(mapped.filter(r=>r.status==='pending'));
   }
   useEffect(() => {
      if (!userId) return;
      refresh();
      const timer = window.setInterval(refresh, 15000);
      return () => window.clearInterval(timer);
   }, [userId]);
   useEffect(() => {
      if (!userId) return;
      const beat = () => supabase.rpc('bh_set_presence',{p_activity:inMatch?'in_match':'online',p_invisible:invisible}).then(({error})=>{if(error)console.warn('Presence:',error.message);});
      beat();
      const timer = window.setInterval(beat,20000);
      return () => window.clearInterval(timer);
   },[userId,inMatch,invisible]);
   async function act(name,args) {
      setBusy(true);setMessage('');
      const {data,error} = await supabase.rpc(name,args);
      setBusy(false);
      setMessage(error?.message || ({sent:'Friend request sent!',already_sent:'Request already sent.',incoming_request:'They already sent you a request!',already_friends:'Already friends.'}[data] || 'Updated!'));
      await refresh();
   }
   async function search(e) {
      e?.preventDefault();
      if(query.trim().length < 2) {setPeople([]);return;}
      const safe = query.trim().replace(/[%_,()]/g,'').slice(0,40);
      const {data,error} = await supabase.from('profiles').select('id,display_name').ilike('display_name',`%${safe}%`).neq('id',userId).limit(12);
      setMessage(error?.message || '');setPeople(data || []);
   }
   if(!userId) return <section className="bh-friends"><h3>👥 Friends</h3><p>Sign in to add friends and see who's online.</p></section>;
   const opponentRelationship = opponent?.user_id && [...friends,...requests].find(r=>r.otherId===opponent.user_id);
   if(opponent) return opponent.user_id && opponent.user_id!==userId ? <div className="bh-friend-opponent">
      <strong>👥 {opponent.name}</strong>
      {opponentRelationship?.status==='accepted' ? <span>✓ Friends</span> : opponentRelationship?.status==='pending' ? <span>{opponentRelationship.sender_id===userId?'Request sent':'Request received'}</span> :
      <button disabled={busy} onClick={()=>act('bh_send_friend_request',{p_recipient:opponent.user_id})}>＋ Add Friend</button>}
      {message && <small role="status">{message}</small>}
   </div> : null;
   return <section className={`bh-friends ${compact?'bh-friends--compact':''}`}>
      <header><h3>👥 {compact?'Friends Online':'Your Friends'}</h3><span>{friends.filter(f=>f.online).length} online</span></header>
      {friends.length===0 ? <p>{compact ? 'No friends online yet.' : 'No friends yet. Find players below!'}</p> :
      <div className="bh-friend-list">{friends.filter(f=>!compact || f.online).map(f=><div className="bh-friend-item" key={f.id}>
         <span className={f.online?'bh-dot bh-dot--online':'bh-dot'} aria-hidden="true"/>
         <span><b>{f.name}</b><small>{f.online?(f.activity==='in_match'?'In a match':'Online'):'Offline'}</small></span>
         {!compact && <button className="bh-friend-remove" disabled={busy} onClick={()=>act('bh_remove_friend',{p_other:f.otherId})}>Remove</button>}
      </div>)}</div>}
      {compact ? null : <>
         <label className="bh-friend-privacy"><span>Appear invisible to friends</span><input className="bh-privacy-input" type="checkbox" role="switch" aria-label="Appear invisible to friends" checked={invisible} onChange={e=>setInvisible(e.target.checked)}/><span className="bh-privacy-track" aria-hidden="true"><span className="bh-privacy-thumb"/></span><span className="bh-privacy-state">{invisible ? "On" : "Off"}</span></label>
         <h4>Friend requests</h4>
         {requests.length===0 && <p>No pending requests.</p>}
         {requests.map(r=><div className="bh-friend-item" key={r.id}><span>{r.name}</span>{r.receiver_id===userId ? <div className="bh-friend-actions"><button disabled={busy} onClick={()=>act('bh_respond_friend_request',{p_request:r.id,p_accept:true})}>Accept</button><button disabled={busy} onClick={()=>act('bh_respond_friend_request',{p_request:r.id,p_accept:false})}>Decline</button></div> : <small>Sent</small>}</div>)}
         <h4>Find players</h4>
         <form onSubmit={search} className="bh-friend-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search BugHunt username" aria-label="Search BugHunt username"/><button type="submit">Search</button></form>
         {people.map(p=><div className="bh-friend-item" key={p.id}><span>{p.display_name}</span><button disabled={busy || [...friends,...requests].some(r=>r.otherId===p.id)} onClick={()=>act('bh_send_friend_request',{p_recipient:p.id})}>{friends.some(r=>r.otherId===p.id)?'Friends':requests.some(r=>r.otherId===p.id)?'Pending':'Add Friend'}</button></div>)}
      </>}
      {message && <p role="status" className="bh-friend-message">{message}</p>}
   </section>;
}
