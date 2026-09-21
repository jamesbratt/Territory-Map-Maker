const features = [
  { number: '01', title: 'Make every territory yours', text: 'Build territories from UK postcode districts. Name them, colour them and adjust your coverage with a click.', tag: 'POSTCODE TERRITORIES' },
  { number: '02', title: 'Put your customers on the map', text: 'Upload a postcode CSV to see your sales locations alongside your territories, with a sales count for each area.', tag: 'SALES VISIBILITY' },
  { number: '03', title: 'Get to know the neighbourhood', text: 'Explore a 10 km radius. Compare census signals and map estimated population, household and income measures.', tag: 'LOCAL INSIGHT' },
];
const useCases = [
  { number: '01', title: 'Plan sales coverage', text: 'See where your customers are, define team territories and spot areas that deserve a closer look.', audience: 'FOR SALES TEAMS' },
  { number: '02', title: 'Explore a new location', text: 'Place a radius around a potential site and compare the demographic estimates of nearby postcode districts.', audience: 'FOR LOCATION PLANNERS' },
  { number: '03', title: 'Focus local campaigns', text: 'Compare census signals across districts to help decide where to focus your next local marketing campaign.', audience: 'FOR MARKETING TEAMS' },
];

export function LandingHero() {
  return <section className="landing-hero landing-container" aria-labelledby="hero-title">
    <div className="hero-copy">
      <h1 id="hero-title">Free territory map creator<br /><em>for the UK.</em></h1>
      <p>Create your own UK territory map for free. Select postcode districts, group them into territories and customise their names and colours. Add your customers to see how your sales coverage fits together.</p>
      <div className="hero-actions"><a className="landing-button" href="#map-workspace">Create your free territory map <span aria-hidden="true">↗</span></a><a className="landing-text-link" href="#features">Explore the features <span aria-hidden="true">↓</span></a></div>
      <div className="hero-footnote">Free to use <span>·</span> UK postcode boundaries <span>·</span> No sign-up required</div>
    </div>
  </section>;
}

export function LandingFeatures() {
  return <section className="landing-section landing-container" id="features" aria-labelledby="features-title">
    <div className="landing-section-heading"><div><span className="landing-kicker">FROM POSTCODES TO POSSIBILITIES</span><h2 id="features-title">One workspace. A clearer view.</h2></div><p>Bring your coverage, customers and local context together in one place.</p></div>
    <div className="landing-cards">{features.map((feature) => <article className="landing-card feature-card" key={feature.number}><span className="card-number">{feature.number}</span><span className="card-tag">{feature.tag}</span><h3>{feature.title}</h3><p>{feature.text}</p><a href="#map-workspace">Try it on the map <span aria-hidden="true">↗</span></a></article>)}</div>
  </section>;
}

export function LandingUseCases() {
  return <section className="use-cases-section" id="use-cases" aria-labelledby="use-cases-title"><div className="landing-container landing-section">
    <div className="landing-section-heading"><div><span className="landing-kicker">MAKE YOUR NEXT MOVE</span><h2 id="use-cases-title">A map for the decisions ahead.</h2></div><p>Start with a question about your market.<br />Find a new perspective on the map.</p></div>
    <div className="landing-cards">{useCases.map((item) => <article className="landing-card use-case-card" key={item.number}><span className="card-tag">{item.audience}</span><h3>{item.title}</h3><p>{item.text}</p><a href="#map-workspace">Explore your area <span aria-hidden="true">↗</span></a></article>)}</div>
  </div></section>;
}

export function LandingFooter() {
  return <footer className="landing-footer landing-container"><div><a className="brand" href="#top">territory<span className="brand-light">mapmaker</span></a><p>A little local knowledge. A wider view.</p></div><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#map-workspace">The map</a><a href="#use-cases">Use cases</a><a href="#top">Back to top ↑</a></nav><span className="footer-note">Made for UK territory planning.</span></footer>;
}
