import { describe, it, expect } from 'vitest';
import { metrics, cases, email } from '@/data/content';
describe('Approved portfolio facts',()=>{
 it('reports 94.6% lead-scoring accuracy',()=>expect(cases.find(c=>c.slug==='lead-engine')?.metric).toBe('94.6%'));
 it('reports approximately ₹50L unit revenue',()=>expect(metrics.find(m=>m.slug==='kpi-system')?.value).toBe('~₹50L'));
 it('reports 10 currently managed people',()=>expect(metrics.find(m=>m.slug===null)?.value).toBe('10'));
 it('reports 65 shop-floor people',()=>expect(metrics.find(m=>m.slug==='shop-floor')?.value).toBe('65'));
 it('uses the provided contact address',()=>expect(email).toBe('mahidhara.s@outlook.com'));
});
