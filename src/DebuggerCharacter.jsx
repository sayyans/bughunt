import { useEffect, useState, useId } from "react";



import "./DebuggerCharacter.css";



import "./CostumeStudioUpdate.css";



import { supabase } from "./supabase";



export const CLASSIC_TEE_ID = "i-heart-bughunt-tee";



export const COSTUME_CATALOG = [



   { id: "princess", name: "Royal Princess", price: 350 },



   { id: "witch", name: "Midnight Witch", price: 350 },



   { id: "doctor", name: "Night Shift Doctor", price: 300 },



   { id: "nurse", name: "Night Shift Nurse", price: 300 },



   { id: "pilot", name: "Star Pilot", price: 325 },



   { id: "officer", name: "Patrol Officer", price: 325 },



];



export const DEFAULT_LOOK = { skin: "#e9b18b", hair: "#30253d", outfit: "mint", accessory: "headphones", hairstyle: "curtain", gender: "female" };



const OPTIONS = {



   gender: [{ id: "female", label: "Female" }, { id: "male", label: "Male" }],



   skin: [{ id: "#f4d4b4", label: "Light" }, { id: "#e9b18b", label: "Warm" }, { id: "#ba785a", label: "Tan" }, { id: "#794632", label: "Deep" }, { id: "#fff0dc", label: "Porcelain" }, { id: "#d89b74", label: "Honey" }, { id: "#98583f", label: "Bronze" }, { id: "#4d2c27", label: "Espresso" }, { id: "#f3a7d7", label: "Pink" }, { id: "#ec77a9", label: "Rose" }, { id: "#8bd3ff", label: "Sky Blue" }, { id: "#537bd8", label: "Royal Blue" }, { id: "#a5e89c", label: "Mint Green" }, { id: "#48ad79", label: "Emerald" }, { id: "#b8a3f1", label: "Lavender" }, { id: "#f6d46e", label: "Golden" }, { id: "#a5aab7", label: "Silver" }],



   hair: [{ id: "#30253d", label: "Midnight" }, { id: "#9d5b34", label: "Copper" }, { id: "#f2c76b", label: "Gold" }, { id: "#a982e9", label: "Lilac" }, { id: "#15151d", label: "Jet Black" }, { id: "#5c372c", label: "Chocolate" }, { id: "#c18b60", label: "Caramel" }, { id: "#f9e3a7", label: "Platinum Blonde" }, { id: "#df6a45", label: "Ginger" }, { id: "#ad304a", label: "Burgundy" }, { id: "#f59cc8", label: "Pastel Pink" }, { id: "#e853a8", label: "Hot Pink" }, { id: "#7ddde4", label: "Aqua" }, { id: "#3774e3", label: "Electric Blue" }, { id: "#76c48c", label: "Sage" }, { id: "#42b75c", label: "Green" }, { id: "#e5e5ed", label: "Silver" }, { id: "#ffffff", label: "White" }],



   hairstyle: [{ id: "fade", label: "Textured Fade" }, { id: "side-part", label: "Side Part" }, { id: "quiff", label: "Soft Quiff" }, { id: "bun", label: "Bun" }, { id: "wavy", label: "Long Wavy" }, { id: "straight", label: "Long Straight" }, { id: "curtain", label: "Curtain Bangs" }, { id: "bob", label: "Straight Bob" }, { id: "wavy-bob", label: "Wavy Bob" }, { id: "pigtails", label: "Pigtails" }, { id: "messy-bun", label: "Messy Bun" }, { id: "braids", label: "Braids" }, { id: "curly", label: "Curly" }, { id: "short", label: "Short" }],



   outfit: [{ id: "mint", label: "Mint Hoodie" }, { id: "violet", label: "Violet Hoodie" }, { id: "coral", label: "Coral Hoodie" }, { id: "night", label: "Night Hoodie" }],



   accessory: [{ id: "headphones", label: "Headphones" }, { id: "glasses", label: "Glasses" }, { id: "none", label: "None" }, { id: "tiara", label: "Tiara" }, { id: "bat-ears", label: "Bat ears" }, { id: "bunny-ears", label: "Bunny ears" }, { id: "witch-hat", label: "Witch hat" }, { id: "pilot-cap", label: "Pilot cap" }],



   costume: [{ id: "none", label: "Everyday (original)" }, { id: "princess", label: "Princess preview" }, { id: "witch", label: "Witch preview" }, { id: "doctor", label: "Doctor preview" }, { id: "nurse", label: "Nurse preview" }, { id: "pilot", label: "Pilot preview" }, { id: "officer", label: "Police officer preview" }],



};



export const MALE_HAIRSTYLES = ["short", "fade", "side-part", "quiff", "curly", "straight", "wavy", "braids", "bun", "messy-bun", "bob", "wavy-bob", "curtain", "pigtails"];

export const FEMALE_HAIRSTYLES = ["curtain", "wavy", "straight", "bob", "wavy-bob", "curly", "braids", "bun", "messy-bun", "pigtails", "short", "fade", "side-part", "quiff"];

export const HAIR_LABELS = { short: "Classic Short", fade: "Textured Fade", "side-part": "Side Part", quiff: "Soft Quiff", curtain: "Curtain Bangs", wavy: "Long Wavy", straight: "Long Straight", bob: "Straight Bob", "wavy-bob": "Wavy Bob", curly: "Curly", braids: "Braids", bun: "Bun", "messy-bun": "Messy Bun", pigtails: "Pigtails" };



const SHOP_ONLY_ACCESSORIES = new Set(["tiara", "bat-ears", "bunny-ears", "witch-hat", "pilot-cap"]);



// A costume purchase also licenses its matching headwear.



const COSTUME_ACCESSORY_UNLOCKS = {



   princess: ["tiara"],



   witch: ["witch-hat"],



   pilot: ["pilot-cap"],



};



function storageKey(userId) { return `bughunt-character-${userId || "guest"}`; }



function readLook(userId) {



   try { const saved = { ...DEFAULT_LOOK, ...JSON.parse(localStorage.getItem(storageKey(userId)) || "{}") }; return saved; }



   catch { return DEFAULT_LOOK; }



}



export function useDebuggerLook(userId) {



   const [look, setLook] = useState(() => readLook(userId));



   useEffect(() => {



      let active = true;



      if (userId) {



         supabase.from("debugger_characters").select("look").eq("user_id", userId).maybeSingle().then(({ data, error }) => {



            if (!active || error || !data?.look) return;



            const cloudLook = { ...DEFAULT_LOOK, ...data.look, accessory: data.look.accessory || DEFAULT_LOOK.accessory };



            localStorage.setItem(storageKey(userId), JSON.stringify(cloudLook));



            setLook(cloudLook);



            window.dispatchEvent(new Event("bughunt-character-updated"));



         });



      }



      const refresh = () => setLook(readLook(userId));



      refresh();



      window.addEventListener("bughunt-character-updated", refresh);



      return () => { active = false; window.removeEventListener("bughunt-character-updated", refresh); };



   }, [userId]);



   function updateLook(next) {



      const value = { ...look, ...next };



      setLook(value);



      localStorage.setItem(storageKey(userId), JSON.stringify(value));



      if (userId) {



         supabase.from("debugger_characters").upsert({ user_id: userId, look: value }, { onConflict: "user_id" }).then(({ error }) => {



            if (error) console.warn("Character saved locally; cloud save requires the Phase 2 SQL migration.", error.message);



         });



      }



      window.dispatchEvent(new Event("bughunt-character-updated"));



   }



   return [look, updateLook];



}



export function HeartBugLogo() {



   return <span className="debugger-heart-logo" aria-label="red heart with green caterpillar">



      <svg viewBox="0 0 64 59" aria-hidden="true" focusable="false">



         <path d="M32 55 C25 47 4 33 4 18 C4 3 23 0 32 14 C41 0 60 3 60 18 C60 33 39 47 32 55Z" fill="#ed304d" />



         <g transform="translate(33 29) rotate(-19)">



            <ellipse cx="0" cy="11" rx="8" ry="11" fill="#6fdc56" stroke="#2c8e37" strokeWidth="2" />



            <circle cx="0" cy="-3" r="11" fill="#a0ee68" stroke="#2c8e37" strokeWidth="2" />



            <circle cx="-4" cy="-5" r="1.6" fill="#182e20" /><circle cx="4" cy="-5" r="1.6" fill="#182e20" />



            <path d="M-3 0 Q0 3 3 0 M-6 -12 L-9 -17 M6 -12 L9 -17" fill="none" stroke="#2c8e37" strokeWidth="2" strokeLinecap="round" />



            <path d="M-7 12 H7" stroke="#3ba447" strokeWidth="1.5" />



         </g>



      </svg>



   </span>;



}



export function TeeGraphic() {



   return <span className="debugger-tee-print"><span className="debugger-tee-top"><b>I</b><HeartBugLogo /></span><strong>BUGHUNT</strong></span>;



}



// Hair is drawn in the same 260 × 350 coordinate system as the body.



// Each silhouette is a separate layered hairstyle, rather than a recolored cap.



// Every hairstyle uses the SAME head anchors as CurtainHair.



// Crown: y 55–140; temples: x 92/228; face: x 100–220; neck: y 218.



// Braids-only illustration. All approved hairstyles use their original code.
function RefinedBraidsHair({ color, layer }) {
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 2.6, strokeLinejoin: "round", strokeLinecap: "round" };
   const shine = { fill: "none", stroke: "#ffe6c0", strokeWidth: 2.5, strokeLinecap: "round", opacity: .28 };
   // A plait has a narrow center axis and alternating locks, not stacked triangles.
   const braid = (right = false) => <g transform={right ? "translate(320 0) scale(-1 1)" : undefined}>
      {/* Root begins behind the ear, then narrows toward the tied end. */}
      <path d="M97 148 Q82 152 82 170 C79 179 84 188 88 194
         C81 204 87 212 93 216 C88 226 97 232 105 231
         Q115 229 116 221 Q110 214 111 208 Q119 199 111 191
         Q116 183 108 175 L108 150Z" {...edge}/>
      {/* Woven diagonal segments, each tucked into the next. */}
      <path d="M86 171 Q93 166 108 177 Q108 186 96 189 Q85 186 82 179Z" {...edge}/>
      <path d="M107 179 Q115 187 108 195 Q99 202 89 194 Q90 186 107 179Z" {...edge}/>
      <path d="M88 194 Q98 189 111 199 Q112 206 100 210 Q90 207 86 202Z" {...edge}/>
      <path d="M110 205 Q116 214 108 221 Q100 224 92 216 Q93 210 110 205Z" {...edge}/>
      <path d="M94 220 Q102 225 111 219" fill="none" stroke={ink} strokeWidth="2.1" strokeLinecap="round"/>
      <path d="M89 176 Q92 173 97 175 M97 193 Q102 191 106 188
         M92 201 Q96 198 100 201 M99 215 Q103 216 106 213" {...shine}/>
      {/* Tiny warm shadows add depth without making the braids look segmented. */}
      <path d="M88 182 Q93 187 98 187 M103 198 Q99 203 94 203
         M92 214 Q98 217 103 216"
         fill="none" stroke="#512c25" strokeWidth="2.4" opacity=".18" strokeLinecap="round"/>
      {/* A visible tied-off braid with a little loose, tapered hair tail.
          The band sits beneath the woven sections, not on top of a rounded end. */}
      <path d="M96 222 C94 228 91 234 88 240
         Q85 245 79 246 Q87 250 95 246
         Q94 252 89 255 Q101 256 109 245
         C114 238 113 230 110 224Z" {...edge}/>
      <path d="M91 239 Q97 236 99 231 M100 245 Q105 241 106 235"
         fill="none" stroke="#ffe6c0" strokeWidth="2.2" opacity=".32" strokeLinecap="round"/>
      {/* Warm, slim elastic at the transition to the loose ends. */}
      <path d="M95 223 Q102 220 111 225 L110 230 Q102 226 94 228Z"
         fill="#d7a078" stroke={ink} strokeWidth="2.1" strokeLinejoin="round"/>
      <path d="M97 225 Q103 224 108 227" fill="none"
         stroke="#ffe4c7" strokeWidth="1.7" opacity=".65" strokeLinecap="round"/>
   </g>;
   if (layer === "back") return <g>
      {/* Under-hair is a solid fill, not an outlined cap. Its former upper
          stroke was visible THROUGH the crown as a dark headband arc. */}
      <path d="M92 144 C79 116 87 90 107 74 Q132 54 160 55
         Q201 52 222 77 C238 99 237 123 228 146
         Q221 167 211 177 Q160 190 109 177 Q98 166 92 144Z"
         fill={color}/>
      {/* Only the lower perimeter needs an outline behind the face. */}
      <path d="M92 144 Q98 166 109 177 Q160 190 211 177 Q221 167 228 146"
         fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round"/>
      {braid(false)}{braid(true)}
   </g>;
   if (layer === "crown") return <g>
      {/* Continuous rounded cap, with no crossing crown outlines. */}
      {/* Fill the cap continuously behind the fringe, but outline ONLY its
          outer silhouette. Removing the inner arch prevents a headband look. */}
      <path d="M88 139 Q77 103 104 74 Q126 54 158 55
         Q196 52 219 74 Q245 102 231 139
         Q220 116 204 103 Q184 88 160 91 Q136 88 117 103
         Q100 119 88 139Z" fill={color}/>
      <path d="M88 139 Q77 103 104 74 Q126 54 158 55
         Q196 52 219 74 Q245 102 231 139"
         fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M109 85 Q128 69 150 69 M173 68 Q199 73 214 89" {...shine}/>
      {/* A few hair-direction highlights, kept well inside the crown. */}
      <path d="M105 103 Q117 91 130 86 M193 84 Q208 91 217 105"
         fill="none" stroke="#ffe6c0" strokeWidth="1.65"
         opacity=".16" strokeLinecap="round"/>
   </g>;
   if (layer === "front") return <g>
      {/* Side pieces are rooted high on the crown and tucked beneath the
          scalloped fringe. They follow the temples down beside the cheeks. */}
      <path d="M116 103
         C105 111 94 124 89 140
         C86 152 90 164 98 170
         Q104 172 107 166
         C101 155 104 145 108 132
         Q113 115 122 106Z"
         fill={color}/>
      <path d="M204 103
         C215 111 226 124 231 140
         C234 152 230 164 222 170
         Q216 172 213 166
         C219 155 216 145 212 132
         Q207 115 198 106Z"
         fill={color}/>
      {/* Outline just the exposed lower outer contours of the cheek locks. */}
      <path d="M89 140 C86 152 90 164 98 170 Q104 172 107 166
         M231 140 C234 152 230 164 222 170 Q216 172 213 166"
         fill="none" stroke={ink} strokeWidth="2.35" strokeLinecap="round"/>
      <path d="M96 142 Q93 155 100 164 M224 142 Q227 155 220 164"
         fill="none" stroke="#ffe6c0" strokeWidth="2.1" opacity=".24" strokeLinecap="round"/>
      {/* Draw the original fringe LAST: it hides the side-piece roots so they
          appear to grow naturally out of the top of the head. */}
      {/* The fringe's closed shape used to STROKE its hidden upper return
          (230 139 -> 187 94 -> 111 106), creating the remaining headband arc.
          Fill the full fringe, then stroke ONLY the visible lower hairline. */}
      <path d="M86 144 C100 130 116 114 130 106
         C142 115 150 118 160 104
         C177 118 202 132 234 144
         L235 105 Q215 81 187 83
         Q145 74 111 88 Q91 106 86 144Z" fill={color}/>
      {/* The ONLY dark fringe outline follows the exposed hair-to-skin edge.
          There is no upper or interior stroke across the brown crown. */}
      <path d="M86 144 C100 130 116 114 130 106
         C142 115 150 118 160 104
         C177 118 202 132 234 144"
         fill="none" stroke={ink} strokeWidth="2.35"
         strokeLinecap="round" strokeLinejoin="round"/>
      {/* Tiny wisps grow directly from the scalloped fringe instead of floating
          below it. Narrow hair-filled tapers share their roots with the crown. */}
      {/* Two softly tapered baby hairs, grown directly from the hairline.
          Draw their dark edge only where it touches the forehead. */}
      {/* Rooted wisps: their broad upper ends overlap the solid fringe,
          while only their lower, face-facing edges are outlined. */}
      <path d="M138 106 Q148 106 153 110
         C151 119 146 126 139 129
         Q145 120 141 114Z" fill={color}/>
      <path d="M170 109 Q179 105 185 109
         Q181 116 185 128
         C177 124 173 118 170 109Z" fill={color}/>
      <path d="M141 114 C145 120 143 125 139 129
         Q149 124 151 115
         M173 114 Q176 124 185 128
         Q180 120 182 115"
         fill="none" stroke={ink} strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round"/>
      {/* Very light strand accents; no strokes across the crown or roots. */}
      <path d="M145 116 Q147 121 143 125
         M177 116 Q178 120 181 123"
         fill="none" stroke="#ffe6c0" strokeWidth="1.1"
         opacity=".24" strokeLinecap="round"/>
   </g>;
   return null;
}

// Short haircut under review: isolated from every approved hairstyle.
// Soft, slightly textured crop with one continuous cap and a curved fringe.
function ShortTexturedCropHair({ color, layer }) {
   const ink = "#352a42";
   const outline = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };
   if (layer === "back") return <g>
      {/* Short tapered sides sit behind the ears and face. */}
      <path d="M98 133 Q90 111 101 86 Q119 62 155 60 Q197 57 220 85
         Q232 110 222 134 L217 156 Q207 165 198 157
         Q160 166 122 157 Q110 165 103 156Z" fill={color}/>
   </g>;
   if (layer === "crown") return <g>
      {/* Single crown-to-fringe silhouette: no helmet band or jagged teeth. */}
      <path d="M91 143
         C82 124 83 101 93 84
         C107 60 134 53 156 55
         C184 50 212 61 226 82
         C237 100 236 124 229 143
         C218 136 210 127 201 120
         Q192 117 185 115
         C178 117 172 124 163 126
         C155 127 148 120 141 117
         C133 121 126 129 116 132
         Q103 136 91 143Z" {...outline}/>
      {/* Short, curved directional highlights make the top look less flat. */}
      <path d="M110 90 Q132 70 157 72 M174 72 Q197 75 213 93"
         fill="none" stroke="#ffe1bd" strokeWidth="3.1" opacity=".35" strokeLinecap="round"/>
      <path d="M114 108 Q124 98 136 96 M178 95 Q192 97 204 108"
         fill="none" stroke="#48291e" strokeWidth="2" opacity=".15" strokeLinecap="round"/>
   </g>;
   if (layer === "front") return <g>
      {/* Two restrained wisps follow the existing fringe edge, not spikes. */}
      <path d="M141 117 Q146 120 150 121 M183 115 Q188 117 193 120"
         fill="none" stroke="#ffe1bd" strokeWidth="1.7" opacity=".27" strokeLinecap="round"/>
   </g>;
   return null;
}

// Textured Fade — independent from the locked Classic Short design.
// A fuller textured crop above softly tapered temples; no hard fade band.
function TexturedFadeHair({ color, layer }) {
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" };
   if (layer === "back") return <g>
      {/* Short hair hugs the temples and stays behind the face. */}
      <path d="M97 137 Q91 111 104 91 Q124 68 160 68 Q199 66 218 91
         Q231 114 223 139 L218 155 Q212 161 204 157
         Q160 164 116 157 Q108 161 102 154Z" fill={color}/>
   </g>;
   if (layer === "crown") return <g>
      {/* A single filled and outlined silhouette joins both tapered sides
          to the crown. The scalloped edge remains the natural fringe. */}
      <path d="M100 148
         C94 145 91 138 95 133
         C89 120 88 104 94 88
         C104 66 127 56 151 56
         Q180 51 202 64
         C222 75 231 96 229 117
         Q229 127 225 135
         C229 141 226 146 220 148
         Q214 148 214 143
         Q217 139 215 130
         Q209 125 202 122
         Q195 118 188 119
         Q179 113 172 118
         Q162 111 153 117
         Q143 113 135 120
         Q124 117 116 125
         Q109 127 105 130
         Q103 140 106 144
         Q106 149 100 148Z"
         fill={color} stroke={ink} strokeWidth="3"
         strokeLinejoin="round" strokeLinecap="round"/>
      {/* Only soft highlights; no separate outlines or side-piece seams. */}
      <path d="M111 91 Q127 74 147 74 M160 70 Q181 69 199 84
         M115 106 Q127 95 140 96 M162 91 Q175 87 190 99"
         fill="none" stroke="#ffe3be" strokeWidth="2.5" opacity=".28" strokeLinecap="round"/>
   </g>;
   if (layer === "front") return <g>
      {/* Just a hint of fine texture along the lifted fringe. */}
      <path d="M136 120 Q141 118 145 117 M173 118 Q177 117 181 119"
         fill="none" stroke="#ffe3be" strokeWidth="1.4" opacity=".23" strokeLinecap="round"/>
   </g>;
   return null;
}

// Side Part — independent hairstyle with one continuous outer silhouette.
// Keep the fade, short crop, and all other approved hairstyles untouched.
function SoftSidePartHair({ color, layer }) {
   const ink = "#352a42";
   if (layer === "back") return <g>
      <path d="M101 144 Q90 112 108 85 Q130 61 166 60 Q205 60 220 88
         Q233 111 219 145 L216 154 Q206 161 201 153
         Q162 160 118 153 Q108 161 103 153Z" fill={color}/>
   </g>;
   if (layer === "crown") return <g>
      {/* A SINGLE outlined silhouette. The left-hand swoop is built into
          the lower edge itself, like one curtain-bang panel swept sideways.
          No line or separate outlined shape crosses the inside of the bang. */}
      <path d="M99 149
         C93 147 92 140 96 135
         C88 118 91 95 103 79
         C118 59 144 53 167 55
         C193 54 214 65 225 84
         C234 101 232 122 225 136
         C229 143 225 150 219 150
         Q213 151 213 145
         Q218 138 216 132
         C205 126 195 121 185 119
         C177 116 170 116 163 119
         C154 126 149 138 137 145
         C127 152 115 155 103 151
         Q102 152 99 149Z"
         fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      {/* A short, softly tapered off-centre parting line. It follows the
          direction of the sweep and stops inside the crown: not a border
          between two hair panels. */}
      <path d="M185 78 Q180 86 177 94 Q175 99 174 102"
         fill="none" stroke="#503449" strokeWidth="2.15"
         opacity=".63" strokeLinecap="round"/>
      <path d="M174 102 Q173 105 172 107"
         fill="none" stroke="#503449" strokeWidth="1.05"
         opacity=".28" strokeLinecap="round"/>
      {/* Light strokes flow with the side-swept fringe; no dark parting seam. */}
      <path d="M119 91 Q141 73 166 71 Q189 69 210 88"
         fill="none" stroke="#ffe3be" strokeWidth="3.1" opacity=".35" strokeLinecap="round"/>
      <path d="M110 113 Q133 98 154 96 Q174 91 197 103"
         fill="none" stroke="#ffe3be" strokeWidth="2.4" opacity=".24" strokeLinecap="round"/>
      <path d="M112 139 Q134 136 153 119"
         fill="none" stroke="#ffe3be" strokeWidth="1.8" opacity=".17" strokeLinecap="round"/>
   </g>;
   if (layer === "front") return null;
   return null;
}

// Soft Quiff — separate from every approved hairstyle.
// The crown, lifted fringe, and both temple tapers share one continuous edge.
function SoftQuiffHair({ color, layer }) {
   const ink = "#352a42";
   if (layer === "back") return <g>
      <path d="M99 144 Q89 115 103 85 Q128 59 163 60 Q202 59 222 87
         Q234 111 222 144 L219 154 Q209 160 201 153
         Q160 161 120 153 Q110 161 103 154Z" fill={color}/>
   </g>;
   if (layer === "crown") return <g>
      {/* One closed outer silhouette: lifted, swept-back front; tapered sides.
          No separately outlined bangs, spikes, or sideburns. */}
      <path d="M101 149
         C95 147 92 141 96 135
         C89 121 90 103 97 89
         C106 71 123 61 143 60
         C151 49 167 44 181 48
         C198 49 213 61 222 78
         C233 96 233 119 225 135
         C229 142 226 149 220 150
         C214 151 213 145 215 139
         C215 134 212 130 206 126
         C197 121 189 119 181 118
         C173 115 164 116 157 119
         C146 119 137 115 128 117
         C118 119 110 128 105 134
         C104 140 108 145 106 148
         Q104 151 101 149Z"
         fill={color} stroke={ink} strokeWidth="3"
         strokeLinejoin="round" strokeLinecap="round"/>
      {/* Swept highlights follow the lifted quiff, not a horizontal helmet band. */}
      <path d="M112 91 Q131 70 153 67 Q175 59 197 73"
         fill="none" stroke="#ffe3be" strokeWidth="3.1" opacity=".37" strokeLinecap="round"/>
      <path d="M119 106 Q140 88 158 88 Q181 86 207 103"
         fill="none" stroke="#ffe3be" strokeWidth="2.3" opacity=".25" strokeLinecap="round"/>
      <path d="M153 64 Q163 57 174 58"
         fill="none" stroke="#ffe3be" strokeWidth="1.8" opacity=".23" strokeLinecap="round"/>
      {/* A little directional texture; no solid interior partition. */}
      <path d="M139 104 Q149 98 158 99 M177 100 Q186 100 194 106"
         fill="none" stroke="#543a39" strokeWidth="1.45" opacity=".17" strokeLinecap="round"/>
   </g>;
   if (layer === "front") return null;
   return null;
}

function HairLayers({ style, color, layer }) {
   if (style === "short") return <ShortTexturedCropHair color={color} layer={layer} />;
   if (style === "fade") return <TexturedFadeHair color={color} layer={layer} />;
   if (style === "side-part") return <SoftSidePartHair color={color} layer={layer} />;
   if (style === "quiff") return <SoftQuiffHair color={color} layer={layer} />;
   if (style === "braids") return <RefinedBraidsHair color={color} layer={layer} />;



   const ink = "#352a42";



   const edge = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };



   const shine = { fill: "none", stroke: "#ffe6c0", strokeWidth: 4, strokeLinecap: "round", opacity: .35 };



   const strand = { fill: "none", stroke: ink, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };



   const long = ["wavy", "straight", "pigtails", "braids", "curly"].includes(style);



   const baseBack = style === "wavy"



      ? "M95 137 Q88 105 110 78 Q155 54 210 78 Q231 105 225 137 L224 171 Q214 187 201 180 L201 142 Q160 107 119 142 L119 180 Q106 187 96 171Z"



      : long



      ? "M90 145 Q78 99 105 68 Q158 43 216 69 Q242 99 230 146 L235 218 Q224 239 208 229 Q184 239 160 232 Q136 239 112 229 Q96 238 85 218Z"



      : ["short", "fade", "side-part", "quiff"].includes(style)

     ? "M97 138 Q85 102 108 76 Q157 48 213 76 Q235 103 223 138 L218 161 Q160 182 102 161Z"

     : "M90 145 Q78 99 105 68 Q158 43 216 69 Q242 99 230 146 L227 187 Q212 204 194 194 Q159 201 125 194 Q106 204 93 187Z";



   if (layer === "back") return <g>



      <path d={baseBack} {...edge}/>



      {style === "bun" && <g><circle cx="160" cy="43" r="22" {...edge}/><path d="M147 37 Q158 29 171 37" {...shine}/></g>}



      {style === "messy-bun" && <g><path d="M139 61 Q125 45 136 31 Q150 22 160 33 Q174 16 187 32 Q201 45 188 61Z" {...edge}/><path d="M139 36 L129 23 M185 34 L193 21" {...strand}/></g>}



      {style === "pigtails" && <g>



         <path d="M92 155 Q71 139 61 154 Q48 176 62 196 Q80 205 96 182Z" {...edge}/>



         <path d="M228 155 Q249 139 259 154 Q272 176 258 196 Q240 205 224 182Z" {...edge}/>



         <path d="M69 163 Q62 176 70 187 M251 163 Q258 176 250 187" {...shine}/>



      </g>}



      {style === "braids" && <g>



         {[0, 1, 2, 3].map(i => <g key={i}>



            <path d={`M${91+(i%2?2:-2)} ${150+i*17} q-15 6 -7 18 q15 9 19 -6Z`} {...edge}/>



            <path d={`M${229+(i%2?-2:2)} ${150+i*17} q15 6 7 18 q-15 9 -19 -6Z`} {...edge}/>



         </g>)}



         <path d="M84 217 L91 230 L100 218 M220 218 L229 230 L236 217" {...edge}/>



      </g>}



      {style === "curly" && <g>



         {[[96,135,19],[86,159,20],[91,187,20],[110,213,19],[224,135,19],[234,159,20],[229,187,20],[210,213,19]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} {...edge}/>) }



      </g>}



      {style === "wavy" && <g><path d="M95 156 Q88 179 96 203 M225 156 Q232 179 224 203" {...shine}/></g>}



      {style === "straight" && <g><path d="M96 150 L95 229 M224 150 L225 229" {...shine}/></g>}



   </g>;



   if (layer === "crown") return <g>



      <path d={["short", "fade", "side-part", "quiff"].includes(style) ? "M89 138 Q73 97 101 69 Q127 53 155 55 Q194 48 222 70 Q244 89 231 138 Q211 120 189 103 L170 112 L154 102 L138 114 L124 105 Q103 117 89 138Z" : "M88 137 Q73 97 101 69 Q127 53 155 55 Q194 48 222 70 Q244 89 231 139 Q220 117 209 105 Q186 81 163 86 Q135 79 116 99 Q101 119 88 137Z"} {...edge}/>



      {style !== "curly" && <path d={style === "fade" ? "M117 87 Q153 67 195 83" : style === "side-part" ? "M113 88 Q143 68 172 70 M184 73 Q201 77 213 90" : "M110 85 Q131 67 166 68 M179 65 Q206 69 217 86"} {...shine}/>}
      {style === "curly" && <g>
         {/* Hair-toned crown depth: avoids the skin-like exposed curved lines. */}
         <path d="M112 84 Q137 66 157 70 M181 70 Q202 74 213 88"
            fill="none" stroke="#442718" strokeWidth="2.2" opacity=".15" strokeLinecap="round"/>
      </g>}



      {style === "curly" && <g>{[[104,114,18],[125,96,19],[150,88,19],[177,89,19],[202,101,19],[220,122,18]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} {...edge}/>)}</g>}



   </g>;



   const wisps = <g><path d="M94 139 Q84 159 92 180 Q101 181 108 163" {...edge}/><path d="M226 139 Q236 159 228 180 Q219 181 212 163" {...edge}/></g>;



   const fringe = {



      bun: <g>



         <path d="M88 143 Q96 116 121 104 Q139 100 151 106 Q170 92 188 102 Q214 109 232 142 Q219 132 208 123 Q190 116 177 119 Q161 129 145 117 Q130 130 115 126 Q104 135 88 143Z" {...edge}/>



         <path d="M97 140 Q84 152 87 171 L92 192 Q105 183 108 160 M223 140 Q236 152 233 171 L228 192 Q215 183 212 160" {...edge}/>



         <path d="M108 116 Q129 105 144 111 M177 110 Q196 108 213 122" {...shine}/>



      </g>,



      "messy-bun": <g><path d="M88 141 Q108 129 123 109 Q142 126 160 103 Q180 127 231 140 Q212 106 190 96 Q155 83 123 97Z" {...edge}/><path d="M102 118 Q95 137 102 149" {...strand}/>{wisps}</g>,



      wavy: <g>



         <path d="M88 146 Q87 112 108 91 Q130 73 160 79 Q192 74 215 96 Q231 114 232 147 Q220 132 208 113 Q187 91 162 93 Q136 93 117 115 Q101 132 88 146Z" {...edge}/>



         <path d="M102 126 Q88 139 80 162 Q77 184 86 202 Q77 224 83 245 Q75 266 83 287 L83 300 L117 300 L118 278 Q123 261 114 244 Q124 223 115 203 Q120 177 108 158 Q106 145 100 137Z" {...edge}/>



         <path d="M218 126 Q232 139 240 162 Q243 184 234 202 Q243 224 237 245 Q245 266 237 287 L237 300 L203 300 L202 278 Q197 261 206 244 Q196 223 205 203 Q200 177 212 158 Q214 145 220 137Z" {...edge}/>



         <path d="M104 110 Q124 90 151 91 M177 89 Q202 96 216 117 M94 161 Q85 179 96 200 Q87 221 96 241 Q87 262 98 285 M226 161 Q235 179 224 200 Q233 221 224 241 Q233 262 222 285" {...shine}/>



      </g>,



      straight: <g><path d="M89 140 Q110 129 122 109 L133 115 L144 106 L155 114 L167 104 L181 114 L194 106 Q216 124 231 140 L218 101 Q185 84 157 91 Q123 83 100 108Z" {...edge}/><path d="M91 143 L88 225 L109 225 L112 152 M229 143 L232 225 L211 225 L208 152" {...edge}/></g>,



      bob: <g><path d="M89 142 Q106 124 125 106 Q146 118 161 104 Q182 118 231 142 Q210 101 184 93 Q142 80 109 106Z" {...edge}/><path d="M92 143 Q82 175 99 196 Q117 199 126 186 M228 143 Q238 175 221 196 Q203 199 194 186" {...edge}/></g>,



      pigtails: <g><path d="M90 140 Q113 121 130 107 Q146 118 160 104 Q181 123 230 140 Q208 103 184 94 Q139 81 110 108Z" {...edge}/><path d="M79 149 L91 152 M229 152 L241 149" stroke="#f5a5c6" strokeWidth="6" strokeLinecap="round"/>{wisps}</g>,



      braids: <g><path d="M90 139 Q113 121 130 106 Q147 120 160 104 Q183 125 230 139 Q210 102 185 92 Q141 82 111 106Z" {...edge}/>{wisps}</g>,



      curly: <g>
         {[[98,136,16],[111,119,18],[130,111,18],[151,110,17],[172,110,18],[192,118,18],[218,137,16]].map(([x,y,r],i)=>
            <circle key={i} cx={x} cy={y} r={r} fill={color} stroke={ink} strokeWidth="2.45" strokeLinejoin="round"/>)}
         {/* Tiny reflected-light arcs add softness without moving or reshaping curls. */}
         <path d="M103 122 Q107 116 113 116 M145 97 Q151 93 157 96 M184 108 Q191 107 195 113"
            fill="none" stroke="#ffe6c0" strokeWidth="2.4" strokeLinecap="round" opacity=".24"/>
         <path d="M103 139 Q110 149 116 144 M199 144 Q208 149 216 139" {...strand}/>
      </g>,



      short: <g />,

      fade: <g>

         {/* Short cropped temples, textured top; no second forehead outline. */}

         <path d="M92 141 Q104 124 116 112 L132 109 L145 102 L159 107 L175 99 L192 108 Q215 120 228 141" fill="none" stroke={ink} strokeWidth="2.3" strokeLinecap="round" />

         <path d="M103 126 L109 121 M122 111 L127 107 M147 103 L152 100 M176 103 L181 101" {...strand}/>

      </g>,

      "side-part": <g>

         <path d="M91 137 Q112 123 130 113 Q149 98 170 91 Q192 91 212 111 Q223 122 230 137 L209 121 Q192 109 175 107 Q149 110 129 121 Q110 129 91 137Z" {...edge}/>

         <path d="M171 92 Q165 105 156 110" {...shine}/>

      </g>,

      quiff: <g>

         <path d="M90 140 Q105 126 118 112 Q127 98 142 91 Q158 82 170 96 Q184 85 199 98 Q220 115 231 140 Q213 129 198 120 Q184 110 169 115 Q149 107 136 119 Q116 125 90 140Z" {...edge}/>

         <path d="M132 102 Q144 91 158 99 M177 98 Q188 97 200 108" {...shine}/>

      </g>



   };



   return <g>{fringe[style] || fringe.short}</g>;



}



// The first approved-style character foundation: a fixed face/head coordinate system.



// Curtain hair is intentionally authored as separate back, crown, and fringe layers.



// Other styles remain selectable while we refine their artwork against this foundation.



// Bun-only artwork. Intentionally separate from the three approved hairstyles

// (curtain, short, curly), whose SVG paths must remain untouched.

function NaturalBunHair({ color, layer }) {
   // Bun redesign isolated from all four locked hairstyles.
   // Hairline is high enough to leave eyebrows and eyes unobstructed.
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };
   const gleam = { fill: "none", stroke: "#ffe0b6", strokeWidth: 2.8, strokeLinecap: "round", opacity: .30 };
   if (layer === "back") return <g>
      {/* Flattened gathered bun; lower edge tucks underneath the crown. */}
      <path d="M124 76 C122 67 126 55 136 48 C147 40 171 38 184 46
         C196 53 200 64 196 77 C186 86 138 85 124 76Z" {...edge}/>
      <path d="M137 56 Q150 46 165 47 M180 50 Q191 58 187 69" {...gleam}/>
      {/* Small rear side pieces, mostly hidden behind the ears. */}
      <path d="M102 130 Q90 148 100 171 Q104 181 115 180
         L122 141Z" {...edge}/>
      <path d="M218 130 Q230 148 220 171 Q216 181 205 180
         L198 141Z" {...edge}/>
   </g>;
   if (layer === "front") return <g>
      {/* Seamless crown underpainting: no outlined lower seam. */}
      <path d="M89 148 C81 124 88 101 104 84
         C119 68 138 62 159 62 C185 60 207 71 222 89
         C237 107 238 132 230 150
         C217 160 198 151 183 135
         C171 123 164 105 160 91
         C151 112 145 127 131 139
         C114 155 99 159 89 148Z" fill={color}/>
      <path d="M89 148 C81 124 88 101 104 84
         C119 68 138 62 159 62 C185 60 207 71 222 89
         C237 107 238 132 230 150"
         fill="none" stroke={ink} strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M109 86 Q129 72 151 75 M172 75 Q198 77 216 96" {...gleam}/>
      {/* Soft side wisps tuck UNDER the main fringe; avoid sticker-like roots. */}
      <path d="M102 140 C92 150 96 166 105 177
         C109 184 107 190 100 196
         C113 191 119 179 113 167 L119 143Z" fill={color}/>
      <path d="M218 140 C228 150 224 166 215 177
         C211 184 213 190 220 196
         C207 191 201 179 207 167 L201 143Z" fill={color}/>
      <path d="M99 153 C96 162 100 172 105 177 C109 184 107 190 100 196
         C113 191 119 179 113 167"
         fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M221 153 C224 162 220 172 215 177 C211 184 213 190 220 196
         C207 191 201 179 207 167"
         fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      {/* The same shallow curtain-bang construction that worked for Long Wavy:
          two smooth tapered sections, no large central hair triangle. */}
      <path d="M160 91 C145 84 127 90 117 101
         C111 119 102 135 90 147
         C104 153 122 144 134 132
         C149 116 154 101 160 91Z" {...edge}/>
      <path d="M160 91 C175 84 193 90 204 102
         C210 119 219 135 230 147
         C216 153 198 144 186 132
         C171 116 166 101 160 91Z" {...edge}/>
      <path d="M122 102 Q114 121 102 136 M198 102 Q206 121 218 136" {...gleam}/>
      <path d="M111 169 Q110 178 105 184 M209 169 Q210 178 215 184"
         fill="none" stroke="#ffe0b6" strokeWidth="2" opacity=".22" strokeLinecap="round"/>
   </g>;
   return null;
}


// Messy Bun is intentionally separate from the locked NaturalBunHair.
// It inherits the approved Bun silhouette, then adds a textured, tousled
// gathered bun and loose strands. No other hairstyle is edited.
function MessyBunHair({ color, layer }) {
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 2.7, strokeLinecap: "round", strokeLinejoin: "round" };
   const shine = { fill: "none", stroke: "#ffe0b6", strokeWidth: 2.2, opacity: .36, strokeLinecap: "round" };
   if (layer === "back") return <g>
      <NaturalBunHair color={color} layer="back" />
      {/* Loosely gathered locks sit on the approved bun, not above it like a ball. */}
      <path d="M130 69 C120 56 132 45 143 46 C145 34 161 35 166 44
         C181 33 195 47 191 58 C202 66 192 78 182 79
         Q158 84 135 78Z" {...edge}/>
      <path d="M144 47 Q137 59 144 68 M167 44 Q176 53 172 64
         M188 55 Q184 63 190 68" fill="none" stroke={ink} strokeWidth="1.9" opacity=".38" strokeLinecap="round" />
      <path d="M137 55 Q145 45 155 48 M172 45 Q184 44 188 54" {...shine}/>
      {/* Side-swept, low flyaways instead of upright crown-like spikes.
          Roots overlap the bun, with tapered tips curling horizontally. */}
      <path d="M140 55 C130 53 122 47 114 45
         Q123 56 137 61Z"
         fill={color} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M182 53 C194 49 203 46 209 47
         Q201 58 186 61Z"
         fill={color} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M157 46 Q145 41 139 42 Q148 49 156 51
         M172 46 Q183 41 190 43 Q183 49 176 52"
         fill="none" stroke={ink} strokeWidth="1.5" opacity=".42" strokeLinecap="round" />
   </g>;
   if (layer === "front") return <g>
      <NaturalBunHair color={color} layer="front" />
      {/* Low, sideways flyaways that follow the hair sweep instead of
          pointing upward like a tiara. */}
      <path d="M109 92 Q96 89 91 91 Q99 97 114 96
         M211 94 Q224 90 229 92 Q221 99 206 98"
         fill={color} stroke={ink} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M115 87 Q127 78 140 78 M182 79 Q198 81 207 91" {...shine}/>
      {/* A few fine, connected forehead wisps: not a new bang layer. */}
      <path d="M146 98 Q145 109 139 115
         M175 97 Q179 109 185 114"
         fill="none" stroke={ink} strokeWidth="1.6" opacity=".54" strokeLinecap="round" />
      {/* Loose cheek-length strands, drawn on top of the Bun's shorter side locks. */}
      <path d="M102 156 C94 170 99 184 108 193
         C114 203 106 213 100 216
         C113 213 120 203 114 190 C108 178 111 167 112 160"
         fill={color} stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M218 156 C226 170 221 184 212 193
         C206 203 214 213 220 216
         C207 213 200 203 206 190 C212 178 209 167 208 160"
         fill={color} stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M103 178 Q103 188 109 194 M217 178 Q217 188 211 194" {...shine}/>
   </g>;
   return null;
}

// Long Wavy is independent of the three approved hairstyles.
// Back layers sit behind the body; front tendrils sit above the face and shirt.
function LongWavyHair({ color, layer }) {
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };
   const gleam = { fill: "none", stroke: "#ffe0b6", strokeWidth: 3, strokeLinecap: "round", opacity: .29 };
   // Soft depth and reflected light are clipped by the existing hair silhouettes.
   // Geometry, outer outlines and face-framing shapes remain unchanged.
   const shade = { fill: "none", stroke: "#442718", strokeWidth: 5.5, opacity: .15, strokeLinecap: "round" };
   const shimmer = { fill: "none", stroke: "#ffe8c9", strokeWidth: 2, opacity: .21, strokeLinecap: "round" };
   if (layer === "back") return <g>
      {/* One continuous curtain of hair, with alternating S-curves and tapered ends.
          Most volume stays behind the shoulders, rather than over the shirt. */}
      <path d="M96 135 C81 108 92 79 119 65 C139 53 183 54 208 68 C234 84 239 110 226 138
         C237 158 242 174 233 190 C248 208 242 225 234 235 C249 253 242 271 229 283
         C240 291 235 304 220 306 C225 319 210 325 195 316 C182 327 173 318 165 322
         C153 329 144 319 132 324 C120 326 113 318 113 313 C94 323 83 312 91 300
         C74 298 72 283 85 272 C70 255 77 239 87 230 C75 215 79 198 88 188
         C79 173 83 151 96 135Z" {...edge}/>
      <path d="M102 165 C92 181 102 198 95 212 C88 229 96 240 90 253
         M123 200 C131 219 116 237 125 254 C133 274 119 293 124 307
         M218 166 C228 182 217 201 226 217 C235 235 219 249 228 266
         M198 201 C188 223 204 239 195 256 C187 277 201 293 193 309" {...shade}/>
      <path d="M91 179 C79 200 101 211 86 231 C74 247 92 259 84 275
         M106 207 C118 224 101 240 111 259 C119 277 101 293 113 307
         M222 179 C241 199 222 215 235 234 C244 251 224 268 234 284
         M209 211 C198 228 219 243 206 261 C196 280 219 293 208 311" {...gleam}/>
   </g>;
   if (layer === "crown") return <g>
      {/* Soft crown: covers the join between the long back layer and front fringe. */}
      {/* Extend the crown beneath BOTH bangs. No stroked lower edge: that
          used to create the dark seams and skin-coloured slits at the top. */}
      <path d="M89 150 C79 115 88 89 108 73 C126 58 146 56 161 58
         C184 54 207 65 221 82 C238 102 240 126 231 150
         C216 160 198 150 181 130 C170 116 164 95 160 82
         C154 100 146 121 130 137 C115 153 100 160 89 150Z"
         fill={color}/>
      {/* Only the outside crown perimeter is outlined; fringe covers the join. */}
      <path d="M89 150 C79 115 88 89 108 73 C126 58 146 56 161 58
         C184 54 207 65 221 82 C238 102 240 126 231 150"
         fill="none" stroke={ink} strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M109 84 Q130 67 153 70 M174 70 Q199 74 215 91" {...gleam}/>
      <path d="M102 108 Q99 122 104 134 M219 108 Q225 123 219 134"
         fill="none" stroke="#442718" strokeWidth="3" opacity=".10" strokeLinecap="round"/>
   </g>;
   return <g>
      {/* Draw the two face-framing locks FIRST, behind the curtain bangs.
          Their roots disappear under the fringe rather than sitting on top
          as separate, stuck-on pieces. Their lower waves are unchanged. */}
      {/* Colour continues beneath the fringe, but the outline begins LOWER.
          This removes the little dark horizontal/diagonal root seams. */}
      <path d="M101 143 C91 156 94 170 101 181 C108 193 103 204 95 211
         C106 209 116 199 115 188 C114 176 106 166 112 153Z" fill={color}/>
      <path d="M219 143 C229 156 225 171 218 182 C211 193 216 205 225 212
         C214 209 204 198 205 187 C207 175 214 165 208 153Z" fill={color}/>
      <path d="M97 155 C92 166 96 175 101 181 C108 193 103 204 95 211
         C106 209 116 199 115 188 C114 176 106 166 110 160"
         fill="none" stroke={ink} strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M223 155 C228 166 223 176 218 182 C211 193 216 205 225 212
         C214 209 204 198 205 187 C207 175 214 165 210 160"
         fill="none" stroke={ink} strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Fringe is drawn last so its lower edge naturally conceals both roots. */}
      <path d="M160 82 C142 74 122 84 115 96 C112 111 104 130 89 145
         C102 152 121 143 133 130 C148 115 154 96 160 82Z" {...edge}/>
      <path d="M160 82 C177 74 197 84 208 97 C211 113 218 131 232 145
         C219 152 201 144 189 131 C174 116 167 96 160 82Z" {...edge}/>
      <path d="M120 94 Q115 113 102 131 M198 94 Q204 113 219 132
         M103 160 Q100 171 106 180 M217 160 Q220 171 214 180" {...gleam}/>
      {/* Very light strand detail: no new dark seams at the roots. */}
      <path d="M124 105 Q116 122 107 132 M193 104 Q204 121 214 131"
         {...shimmer}/>
      <path d="M106 185 Q109 193 103 200 M214 185 Q211 194 218 201"
         fill="none" stroke="#442718" strokeWidth="2.5" opacity=".13" strokeLinecap="round"/>
   </g>;
}


// Long Straight has its own back silhouette, while reusing the already-approved
// Long Wavy crown and fringe exactly. The Wavy implementation is not modified.
function LongStraightHair({ color, layer }) {
   if (layer === "crown") return <LongWavyHair color={color} layer="crown" />;
   if (layer === "front") return <g>
      {/* Straighter face-framing locks: same concealed roots and tapered tips,
          but no S-shaped curl. This artwork belongs only to Long Straight. */}
      <path d="M101 143 C94 155 96 170 98 184
         C99 195 97 204 94 211
         C105 208 111 199 111 186
         C111 172 109 158 112 151Z" fill={color}/>
      <path d="M219 143 C226 155 224 170 222 184
         C221 195 223 204 226 211
         C215 208 209 199 209 186
         C209 172 211 158 208 151Z" fill={color}/>
      <path d="M98 156 C95 168 97 182 98 190 C99 200 97 206 94 211
         C105 208 111 199 111 186 C111 176 109 167 110 160"
         fill="none" stroke="#352a42" strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M222 156 C225 168 223 182 222 190 C221 200 223 206 226 211
         C215 208 209 199 209 186 C209 176 211 167 210 160"
         fill="none" stroke="#352a42" strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Reuse the exact approved Long Wavy curtain-bang paths. */}
      <path d="M160 82 C142 74 122 84 115 96 C112 111 104 130 89 145
         C102 152 121 143 133 130 C148 115 154 96 160 82Z"
         fill={color} stroke="#352a42" strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M160 82 C177 74 197 84 208 97 C211 113 218 131 232 145
         C219 152 201 144 189 131 C174 116 167 96 160 82Z"
         fill={color} stroke="#352a42" strokeWidth="3.1" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M120 94 Q115 113 102 131 M198 94 Q204 113 219 132"
         fill="none" stroke="#ffe0b6" strokeWidth="3" opacity=".29" strokeLinecap="round"/>
      <path d="M124 105 Q116 122 107 132 M193 104 Q204 121 214 131"
         fill="none" stroke="#ffe8c9" strokeWidth="2" opacity=".21" strokeLinecap="round"/>
      <path d="M102 165 Q100 183 100 197 M218 165 Q220 183 220 197"
         fill="none" stroke="#ffe0b6" strokeWidth="2.6" opacity=".28" strokeLinecap="round"/>
   </g>;
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };
   const light = { fill: "none", stroke: "#ffe0b6", strokeWidth: 2.8, opacity: .27, strokeLinecap: "round" };
   const shadow = { fill: "none", stroke: "#442718", strokeWidth: 4.5, opacity: .12, strokeLinecap: "round" };
   return <g>
      {/* Smooth straight lengths, gently curved around the shoulders.
          Unlike Long Wavy there are no S-curves or scalloped ends. */}
      <path d="M96 135
         C82 108 92 79 119 65 C139 53 183 54 208 68
         C234 84 239 110 226 138
         C231 164 231 190 231 215
         C232 244 231 276 226 304
         Q222 318 207 318
         Q194 321 181 317
         Q169 322 159 319
         Q146 322 135 317
         Q122 321 110 317
         Q96 318 92 304
         C87 275 88 246 89 216
         C89 185 90 159 96 135Z" {...edge}/>
      {/* Long smooth internal lines suggest naturally falling strands. */}
      <path d="M105 153 C99 193 102 242 104 296
         M214 153 C222 197 217 247 215 296
         M129 185 C124 230 126 279 128 306
         M191 185 C196 233 194 278 192 306" {...shadow}/>
      <path d="M98 167 C94 203 96 257 99 291
         M221 167 C226 207 222 256 220 291
         M116 218 Q114 261 117 302
         M203 218 Q205 261 202 302" {...light}/>
   </g>;
}


// Pigtails are a standalone style. The crown and curtain bangs reuse the
// approved Long Wavy art without changing its paths; ponytails are new artwork.
function PonytailPigtailsHair({ color, layer }) {
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };
   const shine = { fill: "none", stroke: "#ffe0b6", strokeWidth: 2.8, opacity: .31, strokeLinecap: "round" };
   if (layer === "crown") return <LongWavyHair color={color} layer="crown" />;
   if (layer === "front") return <LongWavyHair color={color} layer="front" />;
   if (layer === "back") return <g>
      {/* Small connecting hair mass behind the face, ending at the ties. */}
      <path d="M96 135 C83 107 93 80 116 67 Q160 48 203 68
         C228 84 239 111 225 137 L227 178 Q214 192 198 181
         Q160 171 122 181 Q105 192 93 178Z" {...edge}/>
      {/* Ponytails grow from the sides and hang behind the shoulders. */}
      <path d="M99 160 C83 149 71 157 69 174 C63 189 71 204 67 221
         C59 238 64 251 59 266 C54 280 62 294 75 303
         Q91 308 103 293 C116 278 104 262 109 246
         C119 228 108 210 114 194 C120 177 112 165 99 160Z" {...edge}/>
      <path d="M221 160 C237 149 249 157 251 174 C257 189 249 204 253 221
         C261 238 256 251 261 266 C266 280 258 294 245 303
         Q229 308 217 293 C204 278 216 262 211 246
         C201 228 212 210 206 194 C200 177 208 165 221 160Z" {...edge}/>
      {/* A subtle S-flow gives the ponytails volume without turning them into braids. */}
      <path d="M81 188 C74 204 85 217 77 234 C69 253 79 270 73 287
         M239 188 C246 204 235 217 243 234 C251 253 241 270 247 287" {...shine}/>
      <path d="M99 198 C108 215 94 229 101 244 C106 257 99 276 94 288
         M221 198 C212 215 226 229 219 244 C214 257 221 276 226 288"
         fill="none" stroke={ink} strokeWidth="1.9" opacity=".18" strokeLinecap="round"/>
      {/* Hair ties sit where each ponytail is gathered, behind the ears. */}
      <path d="M79 171 Q91 166 103 177" fill="none" stroke="#f5a5c6" strokeWidth="6" strokeLinecap="round"/>
      <path d="M241 171 Q229 166 217 177" fill="none" stroke="#f5a5c6" strokeWidth="6" strokeLinecap="round"/>
      <path d="M81 170 Q90 166 100 174 M239 170 Q230 166 220 174"
         fill="none" stroke="#ffe4ee" strokeWidth="1.7" opacity=".7" strokeLinecap="round"/>
   </g>;
   return null;
}

// Independent, bang-free bob designs. No approved hairstyle paths are changed.
// Both use a gentle off-center part and a visible forehead, with the lengths
// stopping near the jaw/neck rather than extending onto the torso.
function BobHair({ color, layer, wavy = false }) {
   // Two independent chin-length bobs. Both use the approved Long Wavy crown
   // and curtain-bang shapes, without changing Long Wavy itself.
   const ink = "#352a42";
   const edge = { fill: color, stroke: ink, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };
   const shine = { fill: "none", stroke: "#ffe0b6", strokeWidth: 2.7, opacity: .27, strokeLinecap: "round" };
   if (layer === "back") return <g>
      {wavy
         ? <path d="M96 135 C82 107 94 78 120 64 Q160 50 201 65 C228 80 238 108 228 139
            C235 152 229 164 234 174 C241 190 231 208 220 214
            Q208 225 193 219 Q180 228 161 221 Q143 228 126 219
            Q110 226 99 215 C85 207 79 190 87 175 C93 163 86 150 96 135Z" {...edge}/>
         : <path d="M96 135 C82 107 94 78 120 64 Q160 50 201 65 C228 80 238 108 228 139
            C231 162 231 190 225 220 Q210 229 195 224
            Q160 229 125 224 Q110 229 95 220 C89 191 89 160 96 135Z" {...edge}/>}
      <path d={wavy
         ? "M99 153 Q91 170 98 183 Q92 200 101 211 M221 153 Q229 170 222 183 Q228 200 219 211"
         : "M100 153 Q95 180 100 214 M220 153 Q225 180 220 214"} {...shine}/>
   </g>;
   if (layer === "crown") return <LongWavyHair color={color} layer="crown" />;
   if (layer === "front") return <g>
      {/* Side sections reach the chin, with roots concealed by the bangs. */}
      {wavy ? <>
         <path d="M101 144 C91 156 98 170 94 182 C89 194 96 209 108 219
            Q120 216 119 204 C112 192 120 179 113 168 L112 148Z" fill={color}/>
         <path d="M219 144 C229 156 222 170 226 182 C231 194 224 209 212 219
            Q200 216 201 204 C208 192 200 179 207 168 L208 148Z" fill={color}/>
         <path d="M98 156 C93 169 99 177 94 185 C91 200 98 213 108 219
            Q120 216 119 204 C112 192 120 179 113 168" fill="none" stroke={ink} strokeWidth="3.1" strokeLinecap="round"/>
         <path d="M222 156 C227 169 221 177 226 185 C229 200 222 213 212 219
            Q200 216 201 204 C208 192 200 179 207 168" fill="none" stroke={ink} strokeWidth="3.1" strokeLinecap="round"/>
      </> : <>
         <path d="M101 144 C94 160 96 194 99 218 Q109 225 120 219
            C115 193 115 168 112 148Z" fill={color}/>
         <path d="M219 144 C226 160 224 194 221 218 Q211 225 200 219
            C205 193 205 168 208 148Z" fill={color}/>
         <path d="M98 156 C95 179 97 204 99 218 Q109 225 120 219
            C115 193 115 168 112 158" fill="none" stroke={ink} strokeWidth="3.1" strokeLinecap="round"/>
         <path d="M222 156 C225 179 223 204 221 218 Q211 225 200 219
            C205 193 205 168 208 158" fill="none" stroke={ink} strokeWidth="3.1" strokeLinecap="round"/>
      </>}
      <path d="M103 173 Q100 195 104 210 M217 173 Q220 195 216 210" {...shine}/>
      {/* Approved Long Wavy bang geometry: only duplicated here, not modified there. */}
      <path d="M160 82 C142 74 122 84 115 96 C112 111 104 130 89 145
         C102 152 121 143 133 130 C148 115 154 96 160 82Z" {...edge}/>
      <path d="M160 82 C177 74 197 84 208 97 C211 113 218 131 232 145
         C219 152 201 144 189 131 C174 116 167 96 160 82Z" {...edge}/>
      <path d="M120 94 Q115 113 102 131 M198 94 Q204 113 219 132" {...shine}/>
   </g>;
   return null;
}

function CurtainHair({ color, layer, extended = false, bunVariant = false }) {



   const outline = "#352a42";



   const edge = { stroke: outline, strokeWidth: 3.1, strokeLinejoin: "round", strokeLinecap: "round" };



   if (layer === "back") return <g>



      <path d={extended ? "M91 142 Q82 101 107 75 Q132 58 165 60 Q208 58 227 87 Q240 113 229 147 L225 217 Q208 235 193 226 L127 226 Q111 233 95 217Z" : "M90 144 Q75 93 104 64 Q131 49 167 53 Q213 51 232 84 Q245 113 229 154 Q245 194 233 222 Q223 243 207 231 Q194 243 182 237 L134 237 Q113 239 105 222 Q89 242 81 221 Q72 194 90 144Z"} fill={color} {...edge}/>



      {!extended && <path d="M98 165 Q87 203 103 222 M224 163 Q235 203 219 220" fill="none" stroke="#ffffff" strokeWidth="4" opacity=".14" strokeLinecap="round"/>}



   </g>;



   if (layer === "crown") return <g>



      <path d={extended



         ? "M89 139 Q83 105 108 79 Q135 63 163 66 Q197 63 216 81 Q235 104 230 139 Q212 106 200 98 Q179 85 163 86 Q136 83 116 101 Q101 120 89 139Z"



         : "M88 137 Q73 97 101 69 Q127 53 155 55 Q194 48 222 70 Q244 89 231 139 Q220 117 209 105 Q186 81 163 86 Q135 79 116 99 Q101 119 88 137Z"} fill={color} {...edge}/>



      <path d={extended ? "M114 85 Q140 72 164 76 M185 75 Q202 79 212 91" : "M110 85 Q131 67 166 68 M179 65 Q206 69 217 86"} fill="none" stroke="#fff1c7" opacity={extended ? ".24" : ".34"} strokeWidth={extended ? "3.5" : "5"} strokeLinecap="round"/>



   </g>;



   return <g>



      {extended && <g>



         {/* Long Wavy only: irregular tapered locks, attached beneath the curtain fringe. */}



         <path d="M112 113 Q95 129 89 147 Q79 168 83 188 Q76 209 81 228 Q74 249 80 270 L78 294 L114 294 Q117 272 112 252 Q119 230 113 210 Q120 190 112 171 Q111 145 123 126Z" fill={color} {...edge}/>



         <path d="M208 113 Q225 129 231 147 Q241 168 237 188 Q244 209 239 228 Q246 249 240 270 L242 294 L206 294 Q203 272 208 252 Q201 230 207 210 Q200 190 208 171 Q209 145 197 126Z" fill={color} {...edge}/>



         <path d="M84 174 Q79 190 84 202 Q79 220 84 235 Q79 250 83 263 M236 174 Q241 190 236 202 Q241 220 236 235 Q241 250 237 263" fill="none" stroke="#fff1d6" opacity=".24" strokeWidth="3.2" strokeLinecap="round"/>



      </g>}



      {/* Center-parted curtain bangs: the two locks meet exactly at the hairline. */}



      <path d="M163 80 Q139 70 116 88 Q111 111 88 146 Q112 153 132 134 Q154 116 163 80Z" fill={color} {...edge}/>



      <path d="M163 80 Q192 67 210 88 Q216 117 232 146 Q210 153 191 133 Q171 115 163 80Z" fill={color} {...edge}/>



      <path d="M123 92 Q119 116 102 133 M196 92 Q200 115 218 132" fill="none" stroke="#fff1d6" opacity=".32" strokeWidth="4.5" strokeLinecap="round"/>



      {bunVariant && <g>



         <path d="M96 136 Q88 148 88 164 L87 183 Q96 176 102 160 L105 147Z" fill={color} {...edge}/>



         <path d="M224 136 Q232 148 232 164 L233 183 Q224 176 218 160 L215 147Z" fill={color} {...edge}/>



      </g>}



      {!extended && !bunVariant && <g>



         <path d="M94 133 Q78 155 88 181 Q96 180 103 163" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>



         <path d="M226 133 Q242 155 232 181 Q224 180 217 163" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>



         <path d="M94 136 Q81 171 94 190 Q106 188 113 169 M226 137 Q240 171 227 190 Q215 188 208 170" fill={color} {...edge}/>



      </g>}



      {!extended && <path d="M108 99 Q115 81 132 76 M188 77 Q204 88 212 105" fill="none" stroke="#ffe7c2" strokeWidth="3" opacity=".34" strokeLinecap="round"/>}



   </g>;



}



export function DebuggerCharacter({ look = DEFAULT_LOOK, compact = false, headOnly = false }) {



   const skin = look.skin || DEFAULT_LOOK.skin;



   const hair = look.hair || DEFAULT_LOOK.hair;



   const isMale = look.gender === "male";



   const style = look.hairstyle || (isMale ? "short" : "curtain");



   const isTee = look.outfit === CLASSIC_TEE_ID;



   const palette = {



      mint: ["#79e6c7", "#3bb69d"],



      violet: ["#c8b4ff", "#9875db"],



      coral: ["#ffb1c3", "#e87798"],



      night: ["#6e87bd", "#3b517f"],



   };



   const [fabric, shadow] = isTee



      ? ["#fffefa", "#e8e5e4"]



      : (palette[look.outfit] || palette.mint);



   const ink = "#352a42";



   const uid = useId().replace(/:/g, "");



   const line = {



      stroke: ink,



      strokeWidth: 3.2,



      strokeLinejoin: "round",



      strokeLinecap: "round",



   };



   const curtain = style === "curtain" || style === "wavy" || style === "straight" || style === "bob" || style === "wavy-bob" || style === "pigtails";



   return (



      <svg



         className={`debugger-avatar-svg ${compact ? "debugger-avatar-svg--compact" : ""} ${headOnly ? "debugger-avatar-svg--head" : ""}`}



         viewBox={headOnly ? (["wavy", "straight"].includes(look.hairstyle) ? "66 45 188 265" : "68 25 184 245") : "0 0 320 420"}



         role="img"



         aria-label={`Bug Hunt character with ${style} hairstyle`}



         xmlns="http\\\://www.w3.org/2000/svg"



      >



         <defs>



            <linearGradient id={`${uid}-cloth`} x1="0" y1="0" x2="1" y2="1">



               <stop stopColor={fabric} />



               <stop offset="1" stopColor={shadow} />



            </linearGradient>



            <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">



               <stop stopColor={skin} />



               <stop offset="1" stopColor={skin} />



            </linearGradient>



         </defs>



         <ellipse cx="160" cy="403" rx="75" ry="10" fill="#62dbe2" opacity=".18" />



         {/* Back hair is behind the shoulders, never clipped across the ends. */}



         <g transform="translate(48.9 91) scale(.694 .69)">



            {style === "bun" ? (

               <NaturalBunHair color={hair} layer="back" />

            ) : style === "messy-bun" ? (

               <MessyBunHair color={hair} layer="back" />

            ) : curtain ? (

               style === "wavy" ? <LongWavyHair color={hair} layer="back" /> : style === "pigtails" ? <PonytailPigtailsHair color={hair} layer="back" /> : style === "straight" ? <LongStraightHair color={hair} layer="back" /> : ["bob", "wavy-bob"].includes(style) ? <BobHair color={hair} layer="back" wavy={style === "wavy-bob"} /> : <CurtainHair color={hair} layer="back" />

            ) : (



               <g>



                  <HairLayers style={style} color={hair} layer="back" />



               </g>



            )}



         </g>



         {/* The whole character shares ONE coordinate system. The face ends at y=246. */}



        {/* Slim, comfortable pants */}



        <path d="M137 330 Q160 334 183 330 L182 378 Q175 383 166 378 L160 352 L153 378 Q145 383 137 378Z" fill="#4a526c" {...line} />



        <path d="M139 359 Q146 363 152 359 M168 359 Q175 363 181 359" fill="none" stroke="#8590aa" strokeWidth="2" strokeLinecap="round" />



        {/* Keep the original comfortable sneakers, recolored for each costume. */}



        <g>



           <path d="M137 375 Q146 381 153 378 L153 388 Q150 397 138 397 L121 397 Q112 395 118 387Z" fill={look.costume === "princess" ? "#f5a1c9" : look.costume === "witch" ? "#25212d" : "#fffefa"} {...line} />



           <path d="M167 378 Q175 381 183 375 L202 387 Q208 395 198 397 L181 397 Q169 397 167 388Z" fill={look.costume === "princess" ? "#f5a1c9" : look.costume === "witch" ? "#25212d" : "#fffefa"} {...line} />



           <path d="M120 392 H152 M169 392 H201 M128 386 H145 M176 386 H193" fill="none" stroke={look.costume === "princess" ? "#ffe3f1" : look.costume === "witch" ? "#766a85" : "#b8c5d9"} strokeWidth="2" strokeLinecap="round" />



        </g>



        {/* Bare arms sit behind the short-sleeve openings. */}



        {look.costume !== "princess" && look.costume !== "witch" && look.costume !== "doctor" && look.costume !== "nurse" && <g>



        <path



           d="M116 307 Q112 314 111 321 Q111 328 117 329 Q123 329 127 321 L134 303Z"



           fill={skin}



           {...line}



        />



        <path



           d="M204 307 Q208 314 209 321 Q209 328 203 329 Q197 329 193 321 L186 303Z"



           fill={skin}



           {...line}



        />



        </g>}



        {(!look.costume || look.costume === "none") && <g>



        {/* Classic boxy tee with square, straight-cut short sleeves. */}



        <path



           d="M145 253 Q153 255 160 255 Q167 255 175 253



              L187 254 L197 260



              L215 300 L194 310



              L188 283 L192 303 L195 330



              Q160 337 125 330 L128 303 L132 283



              L126 310 L105 300



              L123 260 L133 254Z"



           fill={`url(#${uid}-cloth)`}



           {...line}



        />



       {/* Flat sleeve cuffs, no curved or wing-shaped hems. */}



        <path



           d="M105 300 L126 310 M194 310 L215 300"



           fill="none"



           stroke={shadow}



           strokeWidth="2"



           strokeLinecap="butt"



        />



        {/* Subtle vertical shoulder seams. */}



        <path



           d="M133 254 L132 283 M187 254 L188 283"



           fill="none"



           stroke={shadow}



           strokeWidth="1.5"



           opacity=".32"



        />



        <path



           d="M131 296 Q134 307 131 314 M189 296 Q186 307 189 314"



           fill="none"



           stroke={shadow}



           strokeWidth="1.7"



           opacity=".25"



           strokeLinecap="round"



        />



        <path d="M127 329 Q160 334 193 329" stroke={shadow} strokeWidth="2" opacity=".45" fill="none" strokeLinecap="round" />



       {isTee ? (



           <g>



              <text x="145" y="298" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="19" fill="#171720">I</text>



              <path d="M151 279 C151 268 162 266 168 275 C175 266 187 268 187 279 C187 291 169 304 169 304 C169 304 151 291 151 279Z" fill="#ed304d" />



              {/* Original little green caterpillar inside the heart */}



              <g transform="translate(169 287) scale(.34)">



                 <ellipse cy="10" rx="11" ry="15" fill="#77db59" stroke="#318d3e" strokeWidth="3" />



                 <circle cy="-8" r="13" fill="#a2ee70" stroke="#318d3e" strokeWidth="3" />



                 <circle cx="-5" cy="-9" r="2" fill="#1d3226" />



                 <circle cx="5" cy="-9" r="2" fill="#1d3226" />



                 <path d="M-5 -1 Q0 4 5 -1 M-7 -20 L-12 -29 M7 -20 L12 -29" fill="none" stroke="#318d3e" strokeWidth="3" strokeLinecap="round" />



              </g>



              <text x="160" y="324" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13.8" letterSpacing="-.55" fill="#171720">BUGHUNT</text>



           </g>



        ) : (



           <g>



              <path d="M145 255 Q160 265 175 255 M146 263 L143 279 M174 263 L177 279" stroke="#fff" strokeWidth="3" opacity=".65" fill="none" strokeLinecap="round" />



              <path d="M138 314 Q160 309 182 314 L180 328 H140Z" fill={shadow} opacity=".4" />



           </g>



        )}



        </g>}



        {/* Costume-specific silhouettes: never draw the original white tee beneath them. */}



        {look.costume && look.costume !== "none" && <g>



           {(look.costume === "princess" || look.costume === "witch") ? <g>



              {/* Single uninterrupted skin-toned arms from shoulders to hands. */}



              <path d="M139 254 Q130 251 125 260 Q120 271 116 289 L106 315 Q103 323 109 327 Q116 330 121 322 L131 296 Q136 279 143 263Z" fill={skin} {...line} />



              <path d="M181 254 Q190 251 195 260 Q200 271 204 289 L214 315 Q217 323 211 327 Q204 330 199 322 L189 296 Q184 279 177 263Z" fill={skin} {...line} />



           </g> : (look.costume === "doctor" || look.costume === "nurse") ? null : <g>



              <path d="M143 251 Q135 248 126 254 Q116 264 113 280 L110 294 Q111 302 117 303 Q123 303 126 295 L137 273 L146 261Z" fill={skin} {...line} />



              <path d="M177 251 Q185 248 194 254 Q204 264 207 280 L210 294 Q209 302 203 303 Q197 303 194 295 L183 273 L174 261Z" fill={skin} {...line} />



           </g>}



        </g>}



        {/* TEMPORARY COSTUME PREVIEWS — the original tee artwork above is untouched. */}



        {look.costume && look.costume !== "none" && (



           <g className="bh-costume-preview" pointerEvents="none" strokeLinejoin="round">



              {look.costume === "princess" && <g>



                 <path d="M137 255 Q160 247 183 255 L192 326 Q210 346 214 368 Q160 391 106 368 Q110 346 128 326Z" fill="#e9a1d7" stroke="#7f4e91" strokeWidth="3"/>



                 <path d="M138 269 L160 289 182 269 M128 331 Q160 341 192 331 M116 363 Q160 377 204 363" fill="none" stroke="#fff0b8" strokeWidth="4"/>



                 <path d="M148 275 L160 286 172 275" fill="none" stroke="#fff9ee" strokeWidth="4"/>



              </g>}



              {look.costume === "witch" && <g>



                 <path d="M136 255 Q160 249 184 255 L193 329 Q205 350 211 369 Q160 383 109 369 Q115 350 127 329Z" fill="#49376d" stroke="#302543" strokeWidth="3"/>



                 <path d="M130 313 H190 M117 364 Q160 375 203 364" stroke="#c18ae3" strokeWidth="6" fill="none"/>



                 <path d="M153 279 L160 290 167 279" stroke="#ffd87a" strokeWidth="4" fill="none"/>



              </g>}



              {(look.costume === "doctor" || look.costume === "nurse") && <g>



                 {/* Continuous hands emerge directly from the uniform sleeve cuffs. */}



                 <path d="M113 296 L128 301 L123 319 Q120 329 113 329 Q106 327 107 320 Q108 310 113 296Z" fill={skin} {...line}/>



                 <path d="M207 296 L192 301 L197 319 Q200 329 207 329 Q214 327 213 320 Q212 310 207 296Z" fill={skin} {...line}/>



              </g>}



              {look.costume === "doctor" && <g>



                 <path d="M138 252 Q146 249 151 254 L169 254 Q174 249 182 252 L197 271 190 280 176 263 H144 L130 280 123 271Z" fill="#f6fbff" stroke="#6b8fa4" strokeWidth="3"/>



                 <path d="M135 254 L146 262 160 282 174 262 185 254 L199 348 160 355 121 348Z" fill="#f6fbff" stroke="#6b8fa4" strokeWidth="3"/>



                 <path d="M139 252 Q130 250 124 260 L112 300 129 306 142 267 M181 252 Q190 250 196 260 L208 300 191 306 178 267" fill="#f6fbff" stroke="#6b8fa4" strokeWidth="3"/>



                 <path d="M145 265 L160 287 175 265 M160 287 V349" fill="none" stroke="#a6c8d7" strokeWidth="3"/>



                 <path d="M176 304 v22 m-11 -11 h22" stroke="#44b3bf" strokeWidth="5"/>



                 <path d="M133 298 Q130 322 147 324" fill="none" stroke="#647b9c" strokeWidth="3"/>



              </g>}



              {look.costume === "nurse" && <g>



                 <path d="M138 252 Q146 249 151 254 L169 254 Q174 249 182 252 L197 271 190 280 176 263 H144 L130 280 123 271Z" fill="#fff3f7" stroke="#bb7797" strokeWidth="3"/>



                 <path d="M136 255 Q160 249 184 255 L195 331 207 354 Q160 370 113 354 L125 331Z" fill="#fff3f7" stroke="#bb7797" strokeWidth="3"/>



                 <path d="M139 252 Q130 250 124 260 L112 300 129 306 143 266 M181 252 Q190 250 196 260 L208 300 191 306 177 266" fill="#fff3f7" stroke="#bb7797" strokeWidth="3"/>



                 <path d="M145 267 L160 286 175 267 M121 348 Q160 359 199 348" stroke="#e98aaf" strokeWidth="4" fill="none"/>



                 <path d="M160 296 v22 m-11 -11 h22" stroke="#e96e91" strokeWidth="5"/>



              </g>}



              {look.costume === "pilot" && <g>



                 <path d="M134 253 Q160 247 186 253 L197 337 Q160 349 123 337Z" fill="#304f78" stroke="#172c4b" strokeWidth="3"/>



                 <path d="M134 253 L118 260 107 313 128 319 143 265 M186 253 L202 260 213 313 192 319 177 265" fill="#304f78" stroke="#172c4b" strokeWidth="3"/>



                 <path d="M145 264 L160 283 175 264 M125 315 H195 M110 305 L130 311 M190 311 L210 305" stroke="#dfbd7d" strokeWidth="4" fill="none"/>



                 <path d="M160 293 l8 8 -8 8 -8 -8Z" fill="#ffdb8c"/>



              </g>}



              {look.costume === "officer" && <g>



                 <path d="M133 254 Q160 248 187 254 L196 337 Q160 349 124 337Z" fill="#3a5482" stroke="#203554" strokeWidth="3"/>



                 <path d="M133 254 L120 259 106 296 128 305 143 266 M187 254 L200 259 214 296 192 305 177 266" fill="#3a5482" stroke="#203554" strokeWidth="3"/>



                 <path d="M108 295 L128 304 M192 304 L212 295 M160 271 V339 M134 289 H148 M172 289 H186 M127 314 H193" stroke="#9fb6d8" strokeWidth="3" fill="none"/>



                 <path d="M180 296 l8 6 -8 7 -8 -7Z" fill="#ffda87"/>



              </g>}



           </g>



        )}



        {/* Hair, face, and neck share the same anchor */}



         <g transform="translate(48.9 91) scale(.694 .69)">



            {/* Short neck */}



            <path



               d="M150 218 L150 235 Q160 238 170 235 L170 218Z"



               fill={skin}



               {...line}



            />



            {/* Ears */}



            <ellipse cx="92" cy="166" rx="12" ry="19" fill={skin} {...line} />



            <ellipse cx="228" cy="166" rx="12" ry="19" fill={skin} {...line} />



            {/* Face */}



            <path



               d={isMale ? "M99 132 Q97 88 160 85 Q223 88 221 132 L220 178 Q212 204 192 214 L171 225 Q160 230 149 225 L128 214 Q108 204 100 178Z" : "M99 132 Q97 88 160 85 Q223 88 221 132 L220 177 Q209 222 160 224 Q111 222 100 177Z"}



               fill={`url(#${uid}-skin)`}



               {...line}



            />





            {/* Soft face highlights */}



            <path



               d="M111 202 Q126 216 143 217"



               fill="none"



               stroke="#fff"



               strokeWidth="4"



               opacity=".09"



               strokeLinecap="round"



            />



            <path



               d="M108 186 Q122 208 148 216"



               fill="none"



               stroke="#fff"



               strokeWidth="8"



               opacity=".1"



               strokeLinecap="round"



            />



            {/* Subtle cheeks for male style; soft blush for female style. */}



            {!isMale && <>



               <ellipse cx="116" cy="184" rx="10" ry="6" fill="#f58fa0" opacity=".26" />



               <ellipse cx="204" cy="184" rx="10" ry="6" fill="#f58fa0" opacity=".26" />



            </>}



            {/* Eyebrows */}



            <path



               d={isMale ? "M114 150 Q125 143 138 148 M182 148 Q195 143 206 150" : "M116 151 Q126 147 136 151 M184 151 Q194 147 204 151"}



               stroke="#77515b"



               strokeWidth={isMale ? "4.5" : "2.5"}



               fill="none"



               strokeLinecap="round"



            />



            {/* Eyes */}



            <ellipse cx="128" cy="169" rx="11" ry="12" fill="#fffdfa" />



            <ellipse cx="192" cy="169" rx="11" ry="12" fill="#fffdfa" />



            <ellipse cx="129" cy="170" rx="6.5" ry="8.6" fill="#49394e" />



            <ellipse cx="191" cy="170" rx="6.5" ry="8.6" fill="#49394e" />



            <circle cx="126.5" cy="166" r="3" fill="#fff" />



            <circle cx="188.5" cy="166" r="3" fill="#fff" />



            <circle cx="131.5" cy="174" r="1.25" fill="#fff" opacity=".85" />



            <circle cx="193.5" cy="174" r="1.25" fill="#fff" opacity=".85" />



            {/* Lashes */}



            {!isMale && <path



               d="M117 163 L112 159 M203 163 L208 159"



               stroke="#604354"



               strokeWidth="2.2"



               strokeLinecap="round"



            />}



            <path



               d="M119 158 Q128 154 137 158 M183 158 Q192 154 201 158"



               stroke="#5d4050"



               strokeWidth="1.6"



               fill="none"



               strokeLinecap="round"



            />



            {/* Nose and smile */}



            <path



               d="M157 185 Q160 187 163 185"



               fill="none"



               stroke="#bc807e"



               strokeWidth="1.6"



               strokeLinecap="round"



            />



            <path



               d="M153 196 Q160 200 167 196"



               fill="none"



               stroke="#a65770"



               strokeWidth="2.4"



               strokeLinecap="round"



            />



            <path



               d="M155 198 Q160 200 165 198"



               fill="none"



               stroke="#d98599"



               strokeWidth="1.2"



               opacity=".6"



            />



            {/* Hair on top of the face */}



            {curtain ? (



               <>



                  {style === "wavy" ? <LongWavyHair color={hair} layer="crown" /> : style === "pigtails" ? <PonytailPigtailsHair color={hair} layer="crown" /> : style === "straight" ? <LongStraightHair color={hair} layer="crown" /> : ["bob", "wavy-bob"].includes(style) ? <BobHair color={hair} layer="crown" wavy={style === "wavy-bob"} /> : <CurtainHair color={hair} layer="crown" />}



                  {style === "wavy" ? <LongWavyHair color={hair} layer="front" /> : style === "pigtails" ? <PonytailPigtailsHair color={hair} layer="front" /> : style === "straight" ? <LongStraightHair color={hair} layer="front" /> : ["bob", "wavy-bob"].includes(style) ? <BobHair color={hair} layer="front" wavy={style === "wavy-bob"} /> : <CurtainHair color={hair} layer="front" />}



               </>



            ) : (



               <g>



                  {style === "bun" ? <NaturalBunHair color={hair} layer="front" /> : style === "messy-bun" ? <MessyBunHair color={hair} layer="front" /> : <>



                     <HairLayers style={style} color={hair} layer="crown" />



                     <HairLayers style={style} color={hair} layer="front" />



                  </>}



               </g>



            )}



            {/* Glasses */}



            {look.accessory === "glasses" && (



               <g stroke="#40374f" strokeWidth="3" fill="none">



                  <rect x="111" y="156" width="35" height="27" rx="10" />



                  <rect x="174" y="156" width="35" height="27" rx="10" />



                  <path d="M146 163 Q160 158 174 163" />



               </g>



            )}



            {/* Headphones */}



            {look.accessory === "headphones" && (



               <g fill="none" stroke="#bba8ee" strokeWidth="6">



                  <path d="M93 164 Q81 62 160 62 Q239 62 227 164" />



                  <rect x="85" y="158" width="15" height="34" rx="7" fill="#7467af" />



                  <rect x="220" y="158" width="15" height="34" rx="7" fill="#7467af" />



               </g>



            )}



            {/* Optional headwear previews — independent of shirt and hairstyle. */}



            {look.costume === "doctor" && look.accessory === "none" && <g><path d="M118 101 Q119 66 160 66 Q201 66 202 101 L194 107 Q160 94 126 107Z" fill="#f6fbff" stroke="#6b8fa4" strokeWidth="4"/><path d="M160 77 V97 M150 87 H170" stroke="#44b3bf" strokeWidth="5"/></g>}



            {look.costume === "nurse" && look.accessory === "none" && <g><path d="M123 104 L130 76 Q160 66 190 76 L197 104 Q160 92 123 104Z" fill="#fff3f7" stroke="#bb7797" strokeWidth="4"/><path d="M160 79 V96 M151 87 H169" stroke="#e96e91" strokeWidth="5"/></g>}



            {look.accessory === "tiara" && <g><path d="M106 108 L116 77 140 94 160 66 180 94 204 77 214 108Z" fill="#f9d782" stroke="#a56a8e" strokeWidth="4"/><circle cx="160" cy="86" r="7" fill="#85d9ed"/></g>}



            {look.accessory === "bat-ears" && <g stroke="#9d78c6" strokeWidth="4" strokeLinejoin="round"><path d="M107 109 Q103 87 111 66 L126 79 141 68 Q149 86 146 108Z" fill="#453354"/><path d="M174 108 Q171 86 179 68 L194 79 209 66 Q217 87 213 109Z" fill="#453354"/><path d="M119 87 Q129 82 137 88 M183 88 Q191 82 201 87" fill="none" stroke="#c79ce5" strokeWidth="2"/></g>}



            {look.accessory === "bunny-ears" && <g stroke="#9779aa" strokeWidth="4"><ellipse cx="126" cy="50" rx="16" ry="44" transform="rotate(-13 126 50)" fill="#fff4fc"/><ellipse cx="194" cy="50" rx="16" ry="44" transform="rotate(13 194 50)" fill="#fff4fc"/><ellipse cx="126" cy="50" rx="7" ry="30" transform="rotate(-13 126 50)" fill="#f5b2d2"/><ellipse cx="194" cy="50" rx="7" ry="30" transform="rotate(13 194 50)" fill="#f5b2d2"/></g>}



            {(look.accessory === "witch-hat" || (look.costume === "witch" && look.accessory === "none")) && <g><path d="M108 112 Q132 75 150 42 Q161 20 155 7 Q185 41 187 78 Q192 94 207 111Z" fill="#50386d" stroke="#2b2242" strokeWidth="5"/><path d="M137 81 Q165 85 189 80" stroke="#e09cda" strokeWidth="9" fill="none"/><ellipse cx="160" cy="112" rx="84" ry="11" fill="#50386d" stroke="#2b2242" strokeWidth="4"/></g>}



            {(look.accessory === "pilot-cap" || (look.costume === "pilot" && look.accessory === "none")) && <g><path d="M105 106 Q109 48 160 47 Q211 48 215 106Z" fill="#305679" stroke="#1b314b" strokeWidth="4"/><path d="M106 103 Q160 95 214 103" fill="none" stroke="#d8b978" strokeWidth="3" strokeLinecap="round"/><path d="M160 69 l9 8 -9 8 -9 -8Z" fill="#f5d48d"/></g>}



         </g>



         {/* A single subtle crew collar, not stacked neckline stripes. */}



         <path d="M147 253 Q160 260 173 253" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />



         {/* Little sparkle */}



         <path



            d="M261 88 L266 100 L279 105 L266 110 L261 123 L256 110 L243 105 L256 100Z"



            fill="#ffe18d"



         />



      </svg>



   );



}



function adjustShade(hex, amount) {
   const clean = String(hex).replace("#", "");
   if (!/^[0-9a-f]{6}$/i.test(clean)) return hex;
   const factor = Math.abs(amount) / 100;
   const target = amount >= 0 ? 255 : 0;
   return "#" + [0, 2, 4].map(i => Math.round(parseInt(clean.slice(i, i + 2), 16) * (1 - factor) + target * factor).toString(16).padStart(2, "0")).join("");
}

export function CharacterWardrobe({ userId }) {



   const [look, updateLook] = useDebuggerLook(userId);



   const [ownsTee, setOwnsTee] = useState(false);



   const [ownedCostumes, setOwnedCostumes] = useState([]);



   const [costumesLoaded, setCostumesLoaded] = useState(false);



   const [step, setStep] = useState(0);
   const [colorBase, setColorBase] = useState({});
   const [colorShade, setColorShade] = useState({ hair: 0, skin: 0 });



   const [finished, setFinished] = useState(true);



   const [editing, setEditing] = useState(() => sessionStorage.getItem("bughunt-open-character-studio") === "yes");



   const [draftLook, setDraftLook] = useState(() => readLook(userId));



   const previewLook = editing ? (draftLook || look) : look;



   const chooseLook = next => {



      const changes = next.gender ? { ...next, hairstyle: next.gender === "male" ? "short" : "curtain" } : next;



      return editing ? setDraftLook(previous => ({ ...(previous || look), ...changes })) : updateLook(changes);



   };



   const saveEdits = () => { if (draftLook) updateLook(draftLook); setEditing(false); setDraftLook(null); setFinished(true); };



   useEffect(() => {



      if (sessionStorage.getItem("bughunt-open-character-studio") === "yes") {



         sessionStorage.removeItem("bughunt-open-character-studio");



         setStep(0);



         setDraftLook({ ...look });



         setEditing(true);



      }



   }, []);



   const steps = ["gender", "hairstyle", "hair", "skin", "outfit", "costume", "accessory"];



   const category = steps[step];

   const stepTitles = { gender: "Choose your character", hairstyle: "Choose your hairstyle", hair: "Choose your hair colour", skin: "Choose your skin tone", outfit: "Choose your outfit", costume: "Your unlocked costumes", accessory: "Choose your accessories" };

   const hairstyleOrder = previewLook.gender === "male" ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;

   const hairstyleChoices = hairstyleOrder.map(id => OPTIONS.hairstyle.find(item => item.id === id)).filter(Boolean);



   const unlockedAccessories = new Set(ownedCostumes.flatMap(costume => COSTUME_ACCESSORY_UNLOCKS[costume] || []));



   useEffect(() => {



      if (!costumesLoaded) return;



      if (look.costume && look.costume !== "none" && !ownedCostumes.includes(look.costume)) {



         updateLook({ costume: "none" });



      } else if (SHOP_ONLY_ACCESSORIES.has(look.accessory) && !unlockedAccessories.has(look.accessory)) {



         updateLook({ accessory: "none" });



      }



   }, [costumesLoaded, ownedCostumes, look.costume, look.accessory]);



   useEffect(() => {



      if (!userId) { setOwnedCostumes([]); setCostumesLoaded(true); return; }



      setCostumesLoaded(false);



      let active = true;



      const refresh = () => supabase.from("bughunt_costume_ownership").select("costume_id").eq("user_id", userId).then(({ data }) => {



         if (active) { setOwnedCostumes((data || []).map(row => row.costume_id)); setCostumesLoaded(true); }



      });



      refresh();



      window.addEventListener("bughunt-costume-purchased", refresh);



      return () => { active = false; window.removeEventListener("bughunt-costume-purchased", refresh); };



   }, [userId]);



   useEffect(() => {



      if (!userId) { setOwnsTee(false); return; }



      let live = true;



      supabase.from("character_clothing_owned").select("item_id").eq("user_id", userId).eq("item_id", CLASSIC_TEE_ID).maybeSingle().then(({ data }) => { if (live) setOwnsTee(Boolean(data)); });



      const refresh = () => supabase.from("character_clothing_owned").select("item_id").eq("user_id", userId).eq("item_id", CLASSIC_TEE_ID).maybeSingle().then(({ data }) => { if (live) setOwnsTee(Boolean(data)); });



      window.addEventListener("bughunt-clothing-purchased", refresh);



      return () => { live = false; window.removeEventListener("bughunt-clothing-purchased", refresh); };



   }, [userId]);



   return (



      <section className="debugger-wardrobe">



         {finished ? (



            <div className="bh-character-finished">



               <div className="bh-character-command">



                  <div className="bh-character-command__top"><span>BH // ORBITAL COMMAND</span><span className="bh-command-online">● SYSTEM ONLINE</span></div>



                  <div className="bh-character-command__orbit bh-character-command__orbit--one" />



                  <div className="bh-character-command__orbit bh-character-command__orbit--two" />



                  <div className="bh-character-command__avatar"><DebuggerCharacter look={look} /></div>



                  <div className="bh-character-command__bottom"><span>CREW ID // DEBUGGER</span><span>SECTOR 07</span></div>



               </div>



               <div className="bh-character-finished__info">



                  <span className="debugger-wardrobe__eyebrow">CHARACTER READY</span>



                  <h3>Meet your debugger.</h3>



                  <p>Your signature look is ready! Come back anytime to update your hairstyle, outfit, or accessories.</p>



                  <button className="bh-edit-character" type="button" onClick={() => { setStep(0); setDraftLook({ ...look }); setEditing(true); }}>✧ Edit character →</button>



               </div>



            </div>



         ) : (



            <div className="debugger-wardrobe__stage"><DebuggerCharacter look={look} /><div><span className="debugger-wardrobe__eyebrow">YOUR DEBUGGER</span><h3>Make it yours.</h3><p>Pick your signature look. Your character and hairstyles sync to your account.</p></div></div>



         )}



         {(!finished || editing) && <div className={editing ? "bh-customizer-modal-backdrop" : "bh-customizer-inline"} onMouseDown={editing ? event => { if (event.target === event.currentTarget) { setEditing(false); setDraftLook(null); } } : undefined}>



            <div className={editing ? "bh-customization-wizard bh-customization-wizard--modal" : "bh-customization-wizard"} role={editing ? "dialog" : undefined} aria-modal={editing ? "true" : undefined} aria-label={editing ? "Edit your character" : undefined}>



            {editing && <div className="bh-modal-heading"><div><span className="debugger-wardrobe__eyebrow">CHARACTER STUDIO</span><h3>{stepTitles[category]}</h3></div><button type="button" className="bh-modal-close" aria-label="Close without saving" onClick={() => { setEditing(false); setDraftLook(null); }}>✕</button></div>}



            <div className={editing ? "bh-modal-columns" : "bh-modal-columns bh-modal-columns--inline"}>



               {editing && <div className="bh-modal-avatar"><DebuggerCharacter look={previewLook} /></div>}



               <div className="bh-modal-options">



            <div className="bh-wizard-progress" aria-label="Customization steps">



               {steps.map((item, index) => <button key={item} type="button" className={index === step ? "current" : index < step ? "done" : ""} onClick={() => setStep(index)}>{index + 1}. {({ gender: "Character", hairstyle: "Hairstyles", hair: "Hair Colour", skin: "Skin Tone", outfit: "Outfits", costume: "Costumes", accessory: "Accessories" })[item]}</button>)}



            </div>



            <div className="debugger-wardrobe__controls">



               {category === "hairstyle" ? <fieldset className="debugger-hairstyles"><legend>{previewLook.gender === "male" ? "Male hairstyle collection" : "Female hairstyle collection"} · All styles available</legend><div className="debugger-hair-grid">{hairstyleChoices.map(choice => <button type="button" key={choice.id} className={previewLook.hairstyle === choice.id ? "selected" : ""} aria-pressed={previewLook.hairstyle === choice.id} onClick={() => chooseLook({ hairstyle: choice.id })}><span className="debugger-hair-tile"><DebuggerCharacter look={{ ...previewLook, hairstyle: choice.id, accessory: "none" }} compact headOnly /></span><span>{choice.label}</span></button>)}</div></fieldset>



               : <fieldset className="bh-wizard-field"><legend>{category === "outfit" ? "Choose your clothing" : category === "costume" ? "Your unlocked costumes" : stepTitles[category]}</legend>



                  <div className={`debugger-wardrobe__choices ${["skin", "hair"].includes(category) ? "bh-color-options" : ""}`}>{(category === "costume" ? OPTIONS.costume.filter(item => item.id === "none" || ownedCostumes.includes(item.id)) : OPTIONS[category].filter(choice => category !== "accessory" || !SHOP_ONLY_ACCESSORIES.has(choice.id) || unlockedAccessories.has(choice.id))).map(choice => <button type="button" key={choice.id} className={previewLook[category] === choice.id ? "selected" : ""} onClick={() => { chooseLook({ [category]: choice.id }); if (["hair", "skin"].includes(category)) { setColorBase(prev => ({...prev, [category]: choice.id})); setColorShade(prev => ({...prev, [category]: 0})); } }} aria-pressed={previewLook[category] === choice.id} aria-label={choice.label} title={choice.label}>{["skin", "hair"].includes(category) ? <span className="debugger-wardrobe__swatch" style={{ background: choice.id }} /> : choice.label.replace(" preview", "")}</button>)}



                  {category === "outfit" && ownsTee && <button type="button" className={previewLook.outfit === CLASSIC_TEE_ID ? "selected" : ""} onClick={() => chooseLook({ outfit: CLASSIC_TEE_ID })}>❤️ I ♥ BUGHUNT Classic Tee</button>}



                  </div>



                  {["skin", "hair"].includes(category) && <label className="bh-shade-control"><span>Darken</span><input type="range" min="-55" max="55" step="1" style={{ background: `linear-gradient(to right, ${adjustShade(colorBase[category] || previewLook[category], -55)}, ${colorBase[category] || previewLook[category]} 50%, ${adjustShade(colorBase[category] || previewLook[category], 55)})` }} value={colorShade[category] ?? 0} onChange={event => { const amount = Number(event.target.value); const base = colorBase[category] || previewLook[category]; setColorBase(prev => ({...prev, [category]: base})); setColorShade(prev => ({...prev, [category]: amount})); chooseLook({[category]: adjustShade(base, amount)}); }} aria-label={`${category} color brightness`} /><span>Lighten</span><output>{colorShade[category] > 0 ? "+" : ""}{colorShade[category] ?? 0}%</output></label>}
                  {category === "costume" && <p>Unlock costumes in the Night Shift Collection in the Shop. Your purchases will appear here automatically.</p>}



                  {category === "accessory" && <p>Matching accessories unlock automatically when you purchase a costume in the Night Shift Collection. Your Royal Princess costume unlocks the Tiara.</p>}



               </fieldset>}



            </div>



            <div className="bh-wizard-actions"><button type="button" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}>← Back</button><span>Step {step + 1} of {steps.length} · {editing ? "Save when finished" : "Saved automatically"}</span><button type="button" onClick={() => { if (step === steps.length - 1) { if (editing) saveEdits(); else setFinished(true); } else setStep(value => value + 1); }}>{step === steps.length - 1 ? "All done ✓" : "Save & continue →"}</button></div>



            </div></div>



         </div>



         </div>}



      </section>



   );



}
