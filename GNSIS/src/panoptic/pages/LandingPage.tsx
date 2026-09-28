// Landing C: one promise, one bar to ask in, three ideas each on a phone.

import { useNavigate } from "react-router";

import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";
import { AnswerPhone, GlancePhone, SearchPhone } from "../components/Phones";
import { TaskBar } from "../components/TaskBar";
import { SUMMIT } from "../components/Crop";
import { useDialogs } from "../dialogContext";
import { handOffTask, routeTask } from "../taskFlow";
import { usePageMeta } from "../usePageMeta";

export default function LandingPage() {
  usePageMeta(
    "Panoptic — you ask. Panoptic remembers.",
    "Describe what you’re looking for in plain words. Panoptic looks inside the videos, not just their titles, and shows you the ones where it happens.",
  );
  const navigate = useNavigate();
  const { openEarlyAccess } = useDialogs();

  const onTask = (task: string, input: HTMLInputElement | null) => {
    const destination = routeTask(task);
    if (destination.kind === "session") {
      handOffTask(destination.task);
      navigate(destination.path, { state: { task: destination.task } });
      return;
    }
    openEarlyAccess({ task: destination.task, source: "video-search:task-bar", returnFocus: input });
  };

  return (
    <div className="pn-page">
      <div className="pn-wrap">
        <Nav page="video-search" current="product" />
      </div>
      <main>
        <section className="pn-wrap pn-hero" aria-labelledby="pn-hero-title">
          <h1 className="pn-hero-title" id="pn-hero-title">
            <span className="pn-line">you ask.</span> <span className="pn-line">Panoptic remembers.</span>
          </h1>
          <p className="pn-byline">
            from <strong>GNSIS</strong>.studio
          </p>
          <TaskBar onSubmit={onTask} />
          <img
            className="pn-hero-photo"
            src={SUMMIT}
            alt="First-person view from a snowy summit at sunrise, boots over the edge"
            width={1204}
            height={620}
            fetchPriority="high"
            decoding="async"
          />
        </section>

        <section className="pn-wrap pn-split" aria-labelledby="pn-moment">
          <div className="pn-split-text">
            <h2 className="pn-h2" id="pn-moment">
              Ask for a moment.
            </h2>
            <p className="pn-lede">
              Describe what you’re looking for in plain words. Panoptic looks inside the videos, not just their titles, and shows you the ones
              where it happens.
            </p>
          </div>
          <div className="pn-phone-col">
            <SearchPhone />
          </div>
        </section>

        <div className="pn-band pn-on-dark">
          <section className="pn-wrap pn-split" aria-labelledby="pn-glance">
            <div className="pn-split-text">
              <h2 className="pn-h2" id="pn-glance">
                Sees it at a glance.
              </h2>
              <p className="pn-lede">
                Like the fast, instinctive side of your mind, Panoptic takes in a video at a glance: what’s there, what’s happening and when. It
                sees video the way you do.
              </p>
              <p className="pn-ps">(P.S. it never needs a second look.)</p>
            </div>
            <div className="pn-phone-col">
              <GlancePhone />
            </div>
          </section>
        </div>

        <section className="pn-wrap pn-split pn-split--last" aria-labelledby="pn-anything">
          <div className="pn-split-text">
            <h2 className="pn-h2" id="pn-anything">
              Ask it anything.
            </h2>
            <p className="pn-lede">
              Pick any video and ask what you want to know. Every answer points to the moment it comes from, so you can watch it for yourself.
            </p>
          </div>
          <div className="pn-phone-col">
            <AnswerPhone />
          </div>
        </section>
      </main>
      <Footer page="video-search" />
    </div>
  );
}
