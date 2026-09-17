import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
// The model is pure TypeScript; transpile in memory to avoid a new test dependency.
async function moduleAt(path) {
 const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
 return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { buildSystemFlows } = await moduleAt('src/lib/systemFlows.ts');
const { layoutSystemFlows } = await moduleAt('src/lib/systemFlowLayout.ts');
const describe = (_column, key) => ({ label:key, color:'#000' });
const base = {
 revenue: { A: { total:80, by_type:{Assessed:80} }, B:{ total:30, by_type:{Assessed:30} } },
 contributors: { G:{ group:'Government', contributions:{ A:{Assessed:100}, B:{Assessed:30} } }, Refund:{group:'Non-Government', contributions:{A:{Assessed:-20}}} },
 spending:{ year:2024, entities:{ A:{total:70,geography:[],goals:[{key:'1',label:'SDG1',amount:50}],geographyDifference:70,goalsDifference:20},B:{total:40,geography:[],goals:[{key:'2',label:'SDG2',amount:45}],geographyDifference:40,goalsDifference:-5} } },
 functions:{ A:{development:70},B:{development:40} },
 entities:{A:{label:'A',category:'Agencies',color:'#000'},B:{label:'B',category:'Funds',color:'#111'}}
};
test('signed inflows and both signs of missing coverage reconcile without clipping',()=>{
 const graph=buildSystemFlows(base,{funding:'contributor',organization:'organization',spending:'goal',limit:12},describe);
 for (const [id,rev,exp] of [['1:A',80,70],['1:B',30,40]]) {
 assert.equal(graph.links.filter(l=>l.target===id).reduce((s,l)=>s+l.value,0),rev);
 assert.equal(graph.links.filter(l=>l.source===id).reduce((s,l)=>s+l.value,0),exp);
 }
 assert.ok(graph.links.some(l=>l.value===-20)); assert.ok(graph.links.some(l=>l.value===-5));
 const layout=layoutSystemFlows(graph), a=layout.nodes.find(n=>n.id==='1:A');
 assert.equal(a.left,100);assert.equal(a.revenue,80);assert.equal(a.spending,70);
 assert.ok(layout.links.every(l=>!l.path.includes('NaN')));
});
test('tail aggregation and category views preserve net totals',()=>{
 for (const organization of ['organization','category']) {
 const graph=buildSystemFlows(base,{funding:'contributor',organization,spending:'goal',limit:1},describe);
 const mid=new Set(graph.nodes.filter(n=>n.column===1).map(n=>n.id));
 assert.equal(graph.links.filter(l=>mid.has(l.target)).reduce((s,l)=>s+l.value,0),110);
 assert.equal(graph.links.filter(l=>mid.has(l.source)).reduce((s,l)=>s+l.value,0),110);
 }
});
test('real exports reconcile for every supported year and all selectors',()=>{
 const read=name=>JSON.parse(fs.readFileSync(`public/data/${name}.json`));
 const expense=read('system-flow-spending'), fn=read('function-expenses');
 for(const spending of expense.data) {
 const year=spending.year,revenue=read(`entity-revenue-${year}`),contributors=read(`donors-${year}`);
 for(const [name, contributor] of Object.entries(contributors)) contributor.group=name==='Unattributed'?'Unattributed':['member','observer','nonmember'].includes(contributor.status)?'Government':'Non-Government';
 const input={revenue,contributors,spending,functions:fn.data.find(r=>r.year===year).entities,entities:{}};
 for(const funding of ['contributor','category','instrument'])for(const dimension of ['region','country','function','goal']) {
 const graph=buildSystemFlows(input,{funding,organization:'organization',spending:dimension,limit:12},describe);
 const mid=new Set(graph.nodes.filter(n=>n.column===1).map(n=>n.id));
 const total=(side)=>graph.links.filter(l=>mid.has(l[side])).reduce((s,l)=>s+l.value,0);
 const rev=Object.values(revenue).reduce((s,r)=>s+r.total,0),exp=Object.values(spending.entities).reduce((s,r)=>s+(r.total??0),0);
 assert.ok(Math.abs(total('target')-rev)<1,`${year}/${funding}/${dimension} revenue`);
 assert.ok(Math.abs(total('source')-exp)<1,`${year}/${funding}/${dimension} spending`);
 }
 }
});
test('known regional labels survive missing parent region',()=>{
 const input=structuredClone(base);
 input.spending.entities.A.geography=[{key:'GLOBAL',label:'Global - Enabling Function',region:'',kind:'region',amount:70}];
 const graph=buildSystemFlows(input,{funding:'instrument',organization:'category',spending:'region',limit:12},describe);
 assert.ok(graph.nodes.some(n=>n.label==='Global - Enabling Function'));
});

test('contributor categories use the broad groups and preserve signed amounts',()=>{
 const graph=buildSystemFlows(base,{funding:'category',organization:'organization',spending:'function',limit:12},describe);
 assert.deepEqual(graph.nodes.filter(n=>n.column===0).map(n=>n.label).sort(),['Government','Non-Government']);
 assert.equal(graph.links.filter(l=>l.source==='0:Government').reduce((s,l)=>s+l.value,0),130);
 assert.equal(graph.links.filter(l=>l.source==='0:Non-Government').reduce((s,l)=>s+l.value,0),-20);
});
test('explicit instrument order overrides magnitude in the layout',()=>{
 const names=['Assessed','Voluntary un-earmarked','Voluntary earmarked','Other'];
 const graph={nodes:[...names.map((label,order)=>({id:label,label,column:0,color:'#000',order})),{id:'org',label:'org',column:1,color:'#000'}],links:names.map((name,i)=>({source:name,target:'org',value:[2,1,100,10][i]}))};
 assert.deepEqual(layoutSystemFlows(graph).nodes.filter(n=>n.column===0).sort((a,b)=>a.y-b.y).map(n=>n.label),names);
});
const { getFlowDetails } = await moduleAt('src/lib/systemFlowDetails.ts');
test('tooltips keep adjustments separate and suppress misleading percentages',()=>{
 const graph=buildSystemFlows(base,{funding:'contributor',organization:'organization',spending:'goal',limit:12},describe);
 const a=getFlowDetails(graph,{kind:'node',id:'1:A'});
 assert.equal(a.totals.find(r=>r.label==='Revenue').amount,80);
 assert.equal(a.totals.find(r=>r.label==='Expenditure').amount,70);
 assert.deepEqual(a.adjustments,[{label:'Revenue adjustments (included)',amount:-20}]);
 const bad=getFlowDetails(graph,{kind:'edge',source:'0:G',target:'1:A'});
 assert.equal(bad.percentages.length,0);
 const good=getFlowDetails(graph,{kind:'edge',source:'0:G',target:'1:B'});
 assert.equal(good.percentages.length,2);
 assert.ok(good.percentages.every(r=>r.share>0&&r.share<=1));
});
test('generated aggregate retains all included items and their totals',()=>{
 const graph=buildSystemFlows(base,{funding:'contributor',organization:'organization',spending:'goal',limit:1},describe);
 for(const node of graph.nodes.filter(n=>n.isAggregate)){
 assert.ok(node.members.length);
 const side=node.column===2?'target':'source';
 const total=graph.links.filter(l=>l[side]===node.id).reduce((sum,l)=>sum+l.value,0);
 assert.equal(node.members.reduce((sum,m)=>sum+(node.column===0?m.revenue:m.spending),0),total);
 }
});
test('only named contributors get sidebar links and aggregates retain metadata',()=>{
 const input=structuredClone(base);input.contributors.Refund.is_other=true;
 const full=buildSystemFlows(input,{funding:'contributor',organization:'organization',spending:'function',limit:12},describe);
 assert.deepEqual(full.nodes.find(n=>n.id==='0:G').detail,{kind:'donor',value:'G'});
 assert.equal(full.nodes.find(n=>n.id==='0:Refund').detail,undefined);
 assert.match(full.nodes.find(n=>n.id==='0:Refund').note,/aggregate/);
 const grouped=buildSystemFlows(input,{funding:'contributor',organization:'organization',spending:'function',limit:1},describe);
 assert.ok(grouped.nodes.find(n=>n.id==='1:remaining').members[0].node.detail);
});
