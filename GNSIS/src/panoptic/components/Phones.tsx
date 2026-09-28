// The three phones on the landing: static pictures of the app, drawn from
// the design source. Each is one image to assistive technology, described by
// its label; nothing inside is interactive.

import type { ReactNode } from "react";

import { Crop, KICKFLIP, SUMMIT, type CropSpec } from "./Crop";
import { AccountIcon, BackIcon, PlayIcon, SearchIcon } from "./Icons";

function Phone({ label, dark = false, screenDark = false, children }: { label: string; dark?: boolean; screenDark?: boolean; children: ReactNode }) {
  return (
    <figure className="pn-phone-slot" role="img" aria-label={label}>
      <div className={dark ? "pn-phone pn-phone--dark" : "pn-phone"} aria-hidden="true">
        <div className={screenDark ? "pn-phone-screen pn-phone-screen--dark" : "pn-phone-screen"}>{children}</div>
      </div>
    </figure>
  );
}

const GRID_LEFT: Array<[CropSpec, number]> = [
  [{ src: SUMMIT, width: 251.67, left: -133.33, top: 0 }, 0.8],
  [{ src: SUMMIT, width: 100, left: 0, top: -10.09 }, 1.7778],
  [{ src: SUMMIT, width: 240.23, left: -75, top: -76.82 }, 1],
];

const GRID_RIGHT: Array<[CropSpec, number]> = [
  [{ src: KICKFLIP, width: 283.61, left: -83.33, top: -44.44 }, 0.8],
  [{ src: KICKFLIP, width: 309.39, left: 0, top: 0 }, 0.75],
  [{ src: KICKFLIP, width: 243.1, left: -95.24, top: -63.81 }, 1],
];

export function SearchPhone() {
  return (
    <Phone label="The Panoptic app’s search screen: a grid of video thumbnails, and a search bar asking to see the moment we reached the summit">
      <div className="pn-app-head">
        <p className="pn-app-mark">Panoptic</p>
        <p className="pn-app-tag">you ask. Panoptic remembers.</p>
      </div>
      <span className="pn-app-account">
        <AccountIcon />
      </span>
      <div className="pn-app-grid">
        <span>
          {GRID_LEFT.map(([spec, aspect], i) => (
            <Crop key={i} spec={spec} aspect={aspect} />
          ))}
        </span>
        <span>
          {GRID_RIGHT.map(([spec, aspect], i) => (
            <Crop key={i} spec={spec} aspect={aspect} />
          ))}
        </span>
      </div>
      <div className="pn-app-search">
        <SearchIcon size={13} strokeWidth={2} color="#FFFFFF" />
        <span>show me the moment we reached the summit</span>
      </div>
    </Phone>
  );
}

export function GlancePhone() {
  return (
    <Phone
      dark
      screenDark
      label="A skateboarding video in the Panoptic app, with the skateboard outlined and a panel of what Panoptic sees: board mid-flip at 4:49, feet leave the board at 4:50, clean landing at 4:51"
    >
      <img className="pn-fill-img" src={KICKFLIP} alt="" loading="lazy" decoding="async" style={{ width: "436.7%", left: "-155.3%", top: "-37.33%" }} />
      <span className="pn-brackets">
        <i />
        <i />
        <i />
        <i />
        <span className="pn-brackets-label">skateboard</span>
      </span>
      <span className="pn-app-back">
        <BackIcon />
      </span>
      <div className="pn-sees">
        <p className="pn-sees-title">What Panoptic sees</p>
        <p className="pn-sees-row">
          <span>Board mid-flip</span>
          <span>4:49</span>
        </p>
        <p className="pn-sees-row">
          <span>Feet leave the board</span>
          <span>4:50</span>
        </p>
        <p className="pn-sees-row">
          <span>Clean landing</span>
          <span>4:51</span>
        </p>
      </div>
      <div className="pn-ask-field">Ask about this video</div>
    </Phone>
  );
}

export function AnswerPhone() {
  return (
    <Phone
      screenDark
      label="A summit video in the Panoptic app with a question, what happens at 16:05, and its answer: they reach the top just as the sun clears the ridge, with a button to watch from 16:05"
    >
      <img className="pn-fill-img" src={SUMMIT} alt="" loading="lazy" decoding="async" style={{ width: "291.18%", left: "-162.12%", top: "0%" }} />
      <span className="pn-dim" />
      <div className="pn-sheet">
        <span className="pn-sheet-grip" />
        <p className="pn-sheet-title">Ask about this video</p>
        <p className="pn-sheet-sub">Sunrise summit push, full climb</p>
        <div className="pn-sheet-gap" />
        <p className="pn-sheet-q">What happens at 16:05?</p>
        <p className="pn-sheet-a">They reach the top just as the sun clears the ridge.</p>
        <p className="pn-sheet-chip">
          <PlayIcon />
          Watch from 16:05
        </p>
        <p className="pn-sheet-input">Ask anything about it</p>
      </div>
    </Phone>
  );
}
