import { trackEvent } from '../lib/analytics';

const features = [
  {
    number: "01",
    title: "Make every territory yours",
    text: "Build territories from UK postcode districts. Name them, colour them and adjust your coverage with a click.",
    tag: "POSTCODE TERRITORIES",
  },
  {
    number: "02",
    title: "Put your customers on the map",
    text: "Upload a postcode CSV to see your sales locations alongside your territories, with a sales count for each area.",
    tag: "SALES VISIBILITY",
  },
  {
    number: "03",
    title: "Get to know the neighbourhood",
    text: "Explore a 10 km radius. Compare census signals and map estimated population, household and income measures.",
    tag: "LOCAL INSIGHT",
  },
];

export function LandingHero() {
  return (
    <section
      className="landing-hero landing-container"
      aria-labelledby="hero-title"
    >
      <div className="hero-copy">
        <h1 id="hero-title">
          Free sales territory map
          <br />
          <em>creator for the UK.</em>
        </h1>
        <p>
          Create your own UK territory map for free. Select postcode districts,
          group them into territories and customise their names and colours. Add
          your customers to see how your sales coverage fits together.
        </p>
        <div className="hero-actions">
          <a className="landing-button" href="#map-workspace" onClick={() => trackEvent('hero_cta_click')}>
            Create your free territory map
          </a>
        </div>
        <div className="hero-footnote">
          Free to use <span>·</span> UK postcode boundaries <span>·</span> No
          sign-up required
        </div>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section
      className="landing-section landing-container"
      id="features"
      aria-label="Features"
    >
      <div className="landing-cards">
        {features.map((feature) => (
          <article className="landing-card feature-card" key={feature.number}>
            <span className="card-number">{feature.number}</span>
            <span className="card-tag">{feature.tag}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <a href="#map-workspace">Try it on the map</a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer landing-container">
      <div>
        <a className="brand" href="#top">
          territory<span className="brand-light">mapmaker</span>
        </a>
      </div>
      <nav aria-label="Footer navigation">
        <a href="#map-workspace">The map</a>
        <a href="#top">Back to top</a>
      </nav>
      <span className="footer-note">Made for UK territory planning.</span>
    </footer>
  );
}
