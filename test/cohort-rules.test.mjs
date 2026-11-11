import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRule } from '../scripts/cohorts.js';
import rules from '../scripts/cohort-rules.js';

const s = (o) => ({
  refHost: '', source: 'direct', utm: {}, paid: [], device: 'desktop', bot: false, memory: {}, ...o,
});
const m = (o) => matchRule(rules, s(o));

test('no signal keeps the original homepage', () => assert.equal(m({}).rule, null));
test('bots get the original homepage', () => assert.equal(m({ bot: true, device: 'mobile' }).rule, null));
test('personal agents come first', () => assert.equal(m({ agent: 'chatgpt-agent', source: 'ai' }).experience, 'agent'));
test('AI assistants send learners', () => assert.equal(m({ refHost: 'chatgpt.com', source: 'ai', device: 'mobile' }).rule, 'ai-referred'));
test('health sites send learners', () => assert.equal(m({ refHost: 'healthline.com', source: 'other' }).rule, 'health-info'));
test('email clicks are regulars with the campaign need', () => {
  const r = m({ utm: { source: 'klaviyo', medium: 'email', campaign: 'immune-season' } });
  assert.equal(r.rule, 'email');
  assert.deepEqual(r.keys, ['regular:immune', 'regular', 'default']);
});
test('a store lookup before makes a regular', () => assert.equal(m({ memory: { signedIn: true, visits: 2 } }).rule, 'found-a-store-before'));
test('an ad repeats its promise', () => {
  const r = m({ paid: ['facebook'], utm: { source: 'instagram', medium: 'paid_social', campaign: 'hair-growth-3-months' } });
  assert.equal(r.rule, 'campaign');
  assert.equal(r.intent, 'hair');
});
test('social visitors are shoppers', () => assert.equal(m({ refHost: 'instagram.com', source: 'social' }).rule, 'social'));
test('returning with a need', () => {
  const r = m({ memory: { visits: 3, interests: { sleep: 4 } } });
  assert.equal(r.rule, 'returning-need');
  assert.equal(r.intent, 'sleep');
});
test('first visit on a phone gets quick tasks', () => assert.equal(m({ device: 'mobile' }).experience, 'mobile'));
test('a returning phone visit without a need keeps the original', () => assert.equal(m({ device: 'mobile', memory: { visits: 2 } }).rule, null));
