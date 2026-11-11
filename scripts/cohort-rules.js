/*
 * Cohort rules for the Nature's Bounty homepage (demo).
 * Order matters: the first rule that matches decides the experience.
 * Read by the browser (scripts/cohorts.js) and by the homepage-cohorts skill's size.js /
 * review.js on Optel bundles. Regexes are strings (case-insensitive) so the file stays data.
 *
 * Demo note: the shares and rates shown by the demo panel come from /cohorts/cohorts.json,
 * which for this demo is built from ILLUSTRATIVE (synthetic) bundles, not naturesbounty.com
 * traffic. The rules themselves are real and run as written.
 */
const RETAIL = 'store-locator|where-to-buy|walmart\\.com|target\\.com|cvs\\.com|walgreens\\.com|amazon\\.com';
const PRODUCT = '/products/';

export default {
  experiment: 'homepage-cohorts',

  // needs, from campaign tags and from pages visited (first match wins)
  intents: [
    ['hair', 'hair|biotin|skin-and-nails|lustriva'],
    ['sleep', 'sleep|melatonin|magnesium|calm|stress'],
    ['immune', 'immun|vitamin-c|ester-c|elderberry|zinc'],
    ['heart', 'heart|co-?q-?10|fish-oil|omega'],
    ['digestive', 'digest|probiotic|fiber|gut'],
    ['energy', 'energy|b-complex|b12|iron|ginseng|metabolism'],
    ['women', 'women|prenatal|menopause'],
  ],

  insights: {
    src: '/cohorts/cohorts.json',
    label: 'Optel · illustrative data',
    pages: {
      '/pages/store-locator': 'Where to Buy',
      '/pages/compare-magnesium-products': 'Compare magnesium',
      '/pages/faqs': 'FAQs',
      '/blogs/news': 'Articles',
    },
  },

  // the brand sells through retailers: the conversion is the hand-off to a store
  conversion: { click: RETAIL, path: '^/pages/store-locator', label: 'find a store' },

  memory: {
    storeKey: 'nb-cohorts-v1',
    sessionGapMs: 30 * 60 * 1000,
    requireConsent: false,
    // a click on Where to Buy marks this browser as a buyer (the engine calls it "signed in")
    signIn: 'a[href*="store-locator"], a[href*="where-to-buy"], [data-where-to-buy]',
  },

  experiences: {
    mobile: { label: 'Mobile: quick tasks', sub: 'Six things people come to do · Where to Buy one tap away · half the length' },
    regular: { label: 'Regular: your need first', sub: 'Welcome back · the need you shop for · nearest store · one new launch' },
    shopper: { label: 'Shopper: the ad, repeated back', sub: 'The product from the ad or post · reviews · where to buy' },
    learner: { label: 'Learner: answers first', sub: 'Which supplement for which need · backed by science · articles' },
    agent: { label: 'Personal agent: plain & actionable', sub: 'A native form · facts as a table · nothing hidden behind tabs or carousels' },
  },

  sources: [
    { id: 'health-info', label: 'Health & wellness sites', referrer: ['healthline.com', 'webmd.com', 'verywellhealth.com', 'nih.gov', 'examine.com', 'health.com', 'mayoclinic.org'] },
    { id: 'email', label: 'Email (Klaviyo)', referrer: ['klaviyo.com', 'klclick.com', 'klclick1.com'] },
  ],

  rules: [
    {
      id: 'personal-agent',
      label: 'A personal AI agent is browsing',
      experience: 'agent',
      intent: 'utm',
      when: { agent: true },
      goal: { click: `${RETAIL}|${PRODUCT}` },
      goalLabel: 'open a product or find a store',
    },
    {
      id: 'ai-referred',
      label: 'Sent by an AI assistant',
      experience: 'learner',
      when: { source: 'ai' },
      goal: { click: `${PRODUCT}|${RETAIL}` },
      goalLabel: 'open a product or find a store',
      support: { click: 'blogs|faqs|compare' },
      supportLabel: 'articles, FAQs or comparisons',
    },
    {
      id: 'health-info',
      label: 'From a health site',
      experience: 'learner',
      when: { referrer: ['healthline.com', 'webmd.com', 'verywellhealth.com', 'nih.gov', 'examine.com', 'health.com', 'mayoclinic.org'] },
      goal: { click: `${PRODUCT}|${RETAIL}` },
      goalLabel: 'open a product or find a store',
      support: { click: 'blogs|faqs|compare' },
      supportLabel: 'articles, FAQs or comparisons',
    },
    {
      id: 'email',
      label: 'Clicked our email',
      experience: 'regular',
      intent: 'utm',
      when: { any: [{ utm: { medium: '^e-?mail$' } }, { utm: { source: 'klaviyo' } }, { referrer: ['klaviyo.com', 'klclick.com', 'klclick1.com'] }] },
      goal: { click: `${PRODUCT}|${RETAIL}` },
      goalLabel: 'open a product or find a store',
    },
    {
      id: 'found-a-store-before',
      label: 'Looked up where to buy before',
      experience: 'regular',
      intent: 'memory',
      when: { signedIn: true },
      // not in Optel: views that click Where to Buy today are recognised on their next visit
      model: { click: 'store-locator|where-to-buy' },
      goal: { click: RETAIL },
      goalLabel: 'find a store',
    },
    {
      id: 'campaign',
      label: 'Clicked an ad',
      experience: 'shopper',
      intent: 'utm',
      when: { any: [{ paid: true }, { utm: { medium: '^(paid|cpc|ppc|display|paid[_-]?social)$' } }] },
      goal: { click: `${RETAIL}|${PRODUCT}` },
      goalLabel: 'find a store or open the product',
      support: { click: 'review|testimonial' },
      supportLabel: 'reviews',
    },
    {
      id: 'social',
      label: 'Came from social media',
      experience: 'shopper',
      when: { source: 'social' },
      goal: { click: `${RETAIL}|${PRODUCT}` },
      goalLabel: 'find a store or open the product',
      support: { click: 'review|testimonial' },
      supportLabel: 'reviews',
    },
    {
      id: 'returning-need',
      label: 'Back with a need',
      experience: 'regular',
      intent: 'memory',
      when: { visits: { min: 2 }, interest: true, source: ['direct', 'search', 'other'] },
      // not in Optel: views that click into a need or product today come back with that need
      model: { clickIntent: true },
      goal: { click: `${PRODUCT}|${RETAIL}` },
      goalLabel: 'open a product or find a store',
    },
    {
      id: 'mobile-first-visit',
      label: 'First visit on a phone',
      experience: 'mobile',
      when: { device: 'mobile', visits: { max: 1 } },
      goal: { navigate: true },
      goalLabel: 'go on to another page',
    },
  ],

  scenarios: [
    ['No signal', {}],
    ['First visit on a phone', { cohort: 'mobile-first-visit' }],
    ['Back for sleep support', {}, { visits: 3, interests: { sleep: 4 } }],
    ['Found a store before', {}, { visits: 2, signedIn: true, interests: { hair: 2 } }],
    ['Instagram ad: hair growth', {
      utm_source: 'instagram', utm_medium: 'paid_social', utm_campaign: 'hair-growth-3-months', fbclid: 'demo',
    }],
    ['Google ad: sleep', {
      utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'sleep3-melatonin', gclid: 'demo',
    }],
    ['From ChatGPT', { utm_source: 'chatgpt.com' }],
    ['From Healthline', { ref: 'www.healthline.com' }],
    ['Klaviyo email: immune', { utm_source: 'klaviyo', utm_medium: 'email', utm_campaign: 'immune-season' }],
    ['A personal AI agent', { agent: 'chatgpt-agent' }],
  ],
};
