// Agentic web steering: agents read a site's code; Panoptic looks at the
// screen and steers. Every picture follows one task, buying an 8.25 skate
// deck under $100. The store, products and prices are stand-ins.

import type { CSSProperties } from "react";

import { Canvas } from "../components/Canvas";
import { Crop, KICKFLIP, type CropSpec } from "../components/Crop";
import { Cta } from "../components/Cta";
import { Footer } from "../components/Footer";
import { CursorIcon, ThenArrow } from "../components/Icons";
import { Nav } from "../components/Nav";
import { RevealSection } from "../components/Reveal";
import { useDialogs } from "../dialogContext";
import { WEB_STEERING_META } from "../pageMeta";
import { usePageMeta } from "../usePageMeta";

const DECK_825: CropSpec = { src: KICKFLIP, width: 243.1, left: -95.24, top: -63.81 };
const DECK_825_CARD: CropSpec = { src: KICKFLIP, width: 243.1, left: -95.24, top: -73.38 };
const DECK_80: CropSpec = { src: KICKFLIP, width: 340.33, left: -120, top: -88.16 };
const PRO_DECK: CropSpec = { src: KICKFLIP, width: 283.61, left: -83.33, top: -63.9, opacity: 0.55 };
const BUNDLE: CropSpec = { src: KICKFLIP, width: 204.2, left: -40, top: -46 };

const CODE = `<div class="pdp-wrap v3">
  <img src="/i/88213.webp" alt="">
  <h1 class="t-xl">Skate deck 8.25</h1>
  <span class="pr">$</span><span>89</span>
  <div class="sz-grid" data-req="1">
    <button class="sz">8.0</button>
    <button class="sz">8.25</button>
  </div>
  <button class="cta b-2" disabled>
    Add to cart
  </button>
</div>`;

/* Design sizes of the small drawings, inside their 1px border. */
const FRAME = { width: 284, height: 177.5 };
const BIG_FRAME = { width: 317, height: 198 };

function at(left: number, top: number, extra: CSSProperties = {}): CSSProperties {
  return { left, top, ...extra };
}

export default function WebSteeringPage() {
  usePageMeta(WEB_STEERING_META.title, WEB_STEERING_META.description);
  const { openEarlyAccess } = useDialogs();

  return (
    <div className="pn-page">
      <div className="pn-band pn-on-dark">
        <div className="pn-wrap">
          <Nav page="web-steering" current="use-cases" onDark />
        </div>
      </div>
      <main>
      <div className="pn-band pn-on-dark ws-top">
        <div className="pn-wrap">
            <section aria-labelledby="ws-title">
              <div className="ws-hero">
                <div>
                  <p className="ws-kicker">Agentic web steering</p>
                  <h1 className="ws-title" id="ws-title">
                    <span className="pn-line">Eyes for</span> <span className="pn-line">your agent.</span>
                  </h1>
                </div>
                <div className="ws-hero-aside">
                  <p>
                    Most agents read a website’s code. Panoptic looks at the screen the way you do, and steers your agent through any site, one
                    move at a time.
                  </p>
                  <Cta inverse large onClick={(event) => openEarlyAccess({ source: "web-steering:hero", returnFocus: event.currentTarget })}>
                    Get early access
                  </Cta>
                </div>
              </div>

              <figure className="ws-results-figure">
                <p className="ws-goal">
                  <span>Your agent’s goal</span>Buy an 8.25 skate deck under $100
                </p>
                <ResultsPage />
                <figcaption className="ws-caption">What Panoptic notices on a results page, the same things you would.</figcaption>
              </figure>
            </section>
        </div>
      </div>

      <RevealSection className="pn-wrap ws-section" aria-labelledby="ws-read">
        <div className="ws-head">
          <h2 className="ws-h2" id="ws-read">
            <span className="pn-line">Agents read</span> <span className="pn-line">the web.</span>{" "}
            <span className="pn-line">Panoptic sees it.</span>
          </h2>
          <div className="ws-head-text">
            <p>
              Most agents only read a page’s code. They miss what you’d notice in a second: what a photo shows, what’s covering a button, what’s
              greyed out. Panoptic looks at the screen, the way you do.
            </p>
          </div>
        </div>
        <div className="ws-panels">
          <figure>
            <p className="ws-panel-label">How agents see it today</p>
            <pre className="ws-code">{CODE}</pre>
            <figcaption className="ws-panel-caption">Lines of code. No idea what the photo shows, or why the button won’t work.</figcaption>
          </figure>
          <figure>
            <p className="ws-panel-label ws-panel-label--strong">How Panoptic sees it</p>
            <ProductPanel />
            <figcaption className="ws-panel-caption">The page itself. What the photo shows, why the button is grey, and what to do next.</figcaption>
          </figure>
        </div>
      </RevealSection>

      <div className="ws-video">
        <RevealSection className="pn-wrap ws-section" aria-labelledby="ws-video">
          <div className="ws-head">
            <h2 className="ws-h2 ws-h2--video" id="ws-video">
              <span className="pn-line">The web</span> <span className="pn-line">is video.</span>
            </h2>
            <div className="ws-head-text">
              <p>
                To Panoptic, browsing is just another video. It watches the screen moment by moment and notices each thing as it appears. If you
                can see it, so can Panoptic.
              </p>
            </div>
          </div>
          <Film />
        </RevealSection>
      </div>

      <div className="pn-band pn-on-dark">
        <RevealSection className="pn-wrap ws-section ws-section--even" aria-labelledby="ws-think">
          <div className="ws-head">
            <h2 className="ws-h2" id="ws-think">
              <span className="pn-line">Your agent thinks.</span> <span className="pn-line">Panoptic sees.</span>
            </h2>
            <div className="ws-head-text">
              <p>
                Your agent does the slow thinking: planning, reasoning, deciding. Panoptic does the fast seeing: what’s on the page and what just
                changed, glance after glance.
              </p>
              <p className="pn-ps">(P.S. it doesn’t blink.)</p>
            </div>
          </div>
          <div className="ws-versus">
            <div>
              <p className="ws-who">Your agent</p>
              <p className="ws-does">Plans. Reasons. Decides.</p>
              <div className="ws-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <p className="ws-rhythm">thinks in steps</p>
            </div>
            <div>
              <p className="ws-who ws-who--panoptic">Panoptic</p>
              <p className="ws-does ws-does--panoptic">Sees. Notices. Steers.</p>
              <div className="ws-ticks" aria-hidden="true">
                {Array.from({ length: 40 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <p className="ws-rhythm ws-rhythm--panoptic">sees in glances</p>
            </div>
          </div>
        </RevealSection>
      </div>

      <div className="pn-wrap">
        <RevealSection className="ws-change" aria-labelledby="ws-change">
          <div>
            <h2 className="ws-h2" id="ws-change">
              Notices what changed.
            </h2>
            <p className="pn-lede">
              A pop-up, a slow page, a button that moved. Panoptic spots the change the moment it happens and steers your agent around it.
            </p>
          </div>
          <div>
            <div className="ws-beforeafter">
              <Canvas {...BIG_FRAME} className="ws-frame ws-frame--big" label="Before, 00:03: size 8.25 is picked and Add to cart is the next click">
                <BigFrameBase time="00:03" />
                <span className="g-size" style={at(144, 80)}>
                  8.0
                </span>
                <span className="g-size f-size--on" style={at(178, 80)}>
                  8.25
                </span>
                <span className="g-add">Add to cart</span>
                <span className="f-ring" style={at(138, 104, { width: 128, height: 34, borderRadius: 10 })} />
                <span className="g-note">Next: add to cart</span>
              </Canvas>
              <ThenArrow />
              <Canvas
                {...BIG_FRAME}
                className="ws-frame ws-frame--big"
                label="After, 00:04: a new pop-up offering 10% off covers the Add to cart button, and its close button becomes the next click"
              >
                <BigFrameBase time="00:04" />
                <span className="g-add">Add to cart</span>
                <span className="g-popup">
                  <span className="g-popup-title">Get 10% off your first order</span>
                  <span className="g-popup-field" />
                  <span className="g-popup-button" />
                  <span className="g-popup-x">×</span>
                  <span className="g-popup-ring" />
                </span>
                <span className="g-dashed" />
                <span className="g-note">New: a pop-up covers the button</span>
              </Canvas>
            </div>
            <div className="ws-change-note">
              <span>00:04</span>
              <p>
                A pop-up covered Add to cart. <span>Panoptic steered the agent to close it first, then add the deck to the cart.</span>
              </p>
            </div>
          </div>
        </RevealSection>
      </div>
      </main>

      <Footer page="web-steering" />
    </div>
  );
}

function ResultsPage() {
  return (
    <div
      className="ws-results"
      role="img"
      aria-label="A shop’s results page for skate decks, with Panoptic’s notes: the first is sponsored, the second matches the goal and is the next click, the third is sold out, the fourth is a bundle"
    >
      <div aria-hidden="true">
        <div className="ws-results-bar">
          <span className="ws-store">[Store]</span>
          <span className="ws-store-search">skate deck</span>
          <span className="ws-cart">Cart (0)</span>
        </div>
        <p className="ws-results-title">
          Skate decks<span>4 results</span>
        </p>
        <div className="ws-cards">
          <div className="ws-card">
            <div className="ws-card-photo">
              <Crop spec={DECK_80} />
            </div>
            <p className="ws-card-name">Skate deck 8.0</p>
            <p className="ws-card-price">$79</p>
            <p className="ws-card-meta">Sponsored</p>
            <span className="ws-note">Sponsored, and the wrong size</span>
          </div>
          <div className="ws-card">
            <span className="ws-card-chosen" />
            <div className="ws-card-photo">
              <Crop spec={DECK_825_CARD} />
              <CursorIcon className="ws-cursor" />
            </div>
            <p className="ws-card-name">Skate deck 8.25</p>
            <p className="ws-card-price">$89</p>
            <p className="ws-card-meta">In stock</p>
            <span className="ws-note ws-note--strong">Matches the goal: open this one</span>
          </div>
          <div className="ws-card">
            <div className="ws-card-photo">
              <Crop spec={PRO_DECK}>
                <span className="ws-soldout">Sold out</span>
              </Crop>
            </div>
            <p className="ws-card-name">Pro deck 8.25</p>
            <p className="ws-card-price">$96</p>
            <span className="ws-note">Right size, but sold out</span>
          </div>
          <div className="ws-card">
            <div className="ws-card-photo">
              <Crop spec={BUNDLE} />
            </div>
            <p className="ws-card-name">Deck + trucks set 8.25</p>
            <p className="ws-card-price">$140</p>
            <span className="ws-note">A bundle, and over $100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPanel() {
  return (
    <div
      className="ws-pdp"
      role="img"
      aria-label="The same shop page as a person sees it, with Panoptic’s notes: a skateboard deck; next, pick 8.25; Add to cart is greyed out until a size is picked"
    >
      <div className="ws-pdp-photo" aria-hidden="true">
        <Crop spec={DECK_825} />
        <span className="ws-note">A skateboard deck</span>
      </div>
      <div className="ws-pdp-info" aria-hidden="true">
        <p className="ws-pdp-name">Skate deck 8.25</p>
        <p className="ws-pdp-price">$89</p>
        <div className="ws-sizes">
          <span className="ws-size">8.0</span>
          <span className="ws-size">
            8.25
            <span className="ws-size-ring" />
          </span>
          <span className="ws-note">Next: pick 8.25</span>
        </div>
        <p className="ws-size-hint">Choose a size</p>
        <div className="ws-add">
          <span className="ws-add-button">Add to cart</span>
          <span className="ws-note">Greyed out until a size is picked</span>
        </div>
      </div>
    </div>
  );
}

function FrameBase({ time }: { time: string }) {
  return (
    <>
      <span className="f-store">[Store]</span>
      <span className="f-time">{time}</span>
    </>
  );
}

function ProductFrameBase({ time, picked }: { time: string; picked: boolean }) {
  return (
    <>
      <FrameBase time={time} />
      <Crop spec={DECK_825} className="f-photo" />
      <span className="f-name">Skate deck 8.25</span>
      <span className="f-price">$89</span>
      <span className="f-size" style={at(124, 72)}>
        8.0
      </span>
      <span className={picked ? "f-size f-size--on" : "f-size"} style={at(154, 72)}>
        8.25
      </span>
      <span className={picked ? "f-add f-add--on" : "f-add"}>Add to cart</span>
    </>
  );
}

function BigFrameBase({ time }: { time: string }) {
  return (
    <>
      <span className="g-store">[Store]</span>
      <span className="g-time">{time}</span>
      <Crop spec={DECK_825} className="g-photo" />
      <span className="g-name">Skate deck 8.25</span>
      <span className="g-price">$89</span>
    </>
  );
}

function Film() {
  const thumbs: Array<[number, CropSpec]> = [
    [12, DECK_80],
    [78, DECK_825_CARD],
    [144, PRO_DECK],
    [210, BUNDLE],
  ];
  return (
    <div className="ws-film-scroll" tabIndex={0} role="region" aria-label="Four moments from the agent’s session">
      <div className="ws-film">
        <div
          className="ws-frames"
          role="img"
          aria-label="Four moments from the agent’s session: results load and Panoptic finds the 8.25 deck; the product page opens with Add to cart greyed out; size 8.25 is picked and the button is ready; the deck is added to the cart"
        >
          <Canvas {...FRAME} className="ws-frame">
            <FrameBase time="00:01" />
            {thumbs.map(([left, spec]) => (
              <span key={left} className="f-thumb" style={{ left }}>
                <Crop spec={spec} />
                <span className="f-bar" />
                <span className="f-bar" />
              </span>
            ))}
            <span className="f-ring" style={at(72, 26, { width: 66, height: 80, borderRadius: 10 })} />
            <span className="f-note">Found the 8.25 deck, $89</span>
          </Canvas>
          <Canvas {...FRAME} className="ws-frame">
            <ProductFrameBase time="00:02" picked={false} />
            <span className="f-note">Button greyed out: pick a size</span>
          </Canvas>
          <Canvas {...FRAME} className="ws-frame">
            <ProductFrameBase time="00:03" picked />
            <span className="f-ring" style={at(119, 93, { width: 102, height: 26, borderRadius: 8 })} />
            <span className="f-note">8.25 picked. Next: add to cart</span>
          </Canvas>
          <Canvas {...FRAME} className="ws-frame">
            <ProductFrameBase time="00:04" picked />
            <span className="f-toast">✓ Added to cart</span>
            <span className="f-note">Done: in the cart for $89</span>
          </Canvas>
        </div>
        <div className="ws-timeline" aria-hidden="true">
          <i style={{ left: "12.5%" }} />
          <i style={{ left: "37.5%" }} />
          <i style={{ left: "62.5%" }} />
          <span className="ws-timeline-done" />
          <span className="ws-playhead" />
        </div>
        <div className="ws-captions">
          <p>
            <span>00:01</span>Results load
          </p>
          <p>
            <span>00:02</span>The deck’s page opens
          </p>
          <p>
            <span>00:03</span>Size 8.25 picked
          </p>
          <p>
            <span>00:04</span>Added to cart
          </p>
        </div>
      </div>
    </div>
  );
}
