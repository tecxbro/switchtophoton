import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import {createKeikiAdapter} from './flux-adapter.mjs';
const pin = '59ba68a5e95e3c1a97fc31dc4a2f6fe49a34ce40';
assert.ok(process.env.FLUX_FIXTURE_REPO, 'Set FLUX_FIXTURE_REPO to the upstream pinned checkout');
const git = (...args) => execFileSync('git', ['-C', process.env.FLUX_FIXTURE_REPO, ...args], {encoding:'utf8'});
assert.equal(git('rev-parse', 'HEAD').trim(), pin);
const read = p => git('show', `${pin}:src/${p}`);
const quiet = {log(){}, error(){}};
const index = read('index.ts');
const start = index.indexOf('async (message) => {', index.indexOf('async function runProd'));
const end = index.indexOf('\n  });', start);
const callbackSource = index.slice(start,end) + '\n}';
assert.ok(start>0 && end>start);
const splitSource = read('flux-client.ts').match(/function splitIntoMessages[\s\S]*?\n}/)[0];
const splitIntoMessages = new Function(stripTypeScriptTypes(splitSource)+'; return splitIntoMessages;')();
const Memory = new Function(stripTypeScriptTypes(read('memory.ts')).replaceAll('export ', '')+'; return Memory;')();
const fixtures = [
  {userPhoneNumber:'+15555550101',messageGuid:'a',text:'hello'},
  {userPhoneNumber:'+15555550101',messageGuid:'b',text:'again'},
  {userPhoneNumber:'+15555550102',messageGuid:'c',text:'other'},
  {userPhoneNumber:'+15555550101',messageGuid:'d',text:'empty'},
  {userPhoneNumber:'+15555550101',messageGuid:'e',text:'error'},
];
Date.now = () => 1700000000000;
function application() {
 const memory = new Memory(), inputs=[];
 const agent={invoke:async input=>{inputs.push(structuredClone(input)); if(input.message==='error')throw Error('mock'); return input.message==='empty'?'':` first ${input.message} \n\n second `;}};
 const onMessage = new Function('agent','memory','console',stripTypeScriptTypes(`const cb = (${callbackSource});`) + "; return cb;")(agent,memory,quiet);
 return {memory,inputs,agent,onMessage};
}
const old = application(), oldSent=[], ack=[];
// Evaluate actual FluxClient with only gRPC and service creation replaced by deterministic mocks.
let resolveDone; const done = new Promise(r=>resolveDone=r);
const stream=Object.assign(async ({ack:id})=>ack.push(id),{async *[Symbol.asyncIterator](){for(const m of fixtures)yield [m]; resolveDone();}});
const service={registerAgent:async()=>({success:true}),messageStream:stream,sendMessage:async m=>{oldSent.push(m);return {success:true};}};
const clientSource=stripTypeScriptTypes(read('flux-client.ts')).replace(/^import .*;\n/gm,'').replace('export class FluxClient','class FluxClient');
const FluxClient=new Function('createGrpcClient','FluxService','console',clientSource+';return FluxClient;')(async()=>({FluxService:service}),{Client:x=>x},quiet);
const flux=new FluxClient('+15555550999','synthetic-flux-token',old.onMessage);
await flux.connect(); await flux.register(); await done;
assert.deepEqual(ack,fixtures.map(m=>m.messageGuid));
const next=application(), requests=[], newSent=[];
const post=async(url,headers,body)=>{assert.equal(headers.authorization,'Bearer synthetic-turn-token');requests.push({url,body});if(url.endsWith('/messages'))newSent.push({userPhoneNumber:currentPhone,text:body.text});return {ok:true};};
// A fixture-injected identity crosswalk; never calculate production identity using a phone.
const binding = new Map(fixtures.map(m => [`conversation-${m.userPhoneNumber}`, m.userPhoneNumber]));
const run=createKeikiAdapter({...next,splitIntoMessages,post,binding,origin:'https://keiki.invalid',agentId:'synthetic-agent'});
let currentPhone;
const turnFor=(id,ms)=>({type:'keiki.turn',version:1,turnId:id,agentId:'synthetic-agent',conversationId:`conversation-${ms[0].userPhoneNumber}`,keiki:{turnUrl:`https://keiki.invalid/api/v1/turns/${id}`},messages:ms.map(m=>({text:m.text,content:m.text,messageId:m.messageGuid}))});
// Two inbound messages share the first turn; repeated conversation in later turn retains state.
const groups=[fixtures.slice(0,2),fixtures.slice(2,3),fixtures.slice(3)];
for (const [i,ms] of groups.entries()){currentPhone=ms[0].userPhoneNumber;await run(turnFor('turn-'+i,ms),'synthetic-turn-token');}
assert.deepEqual(newSent,oldSent,'ordered bubble trace parity');
assert.deepEqual(next.inputs,old.inputs,'invoke args/history parity');
for(const phone of new Set(fixtures.map(m=>m.userPhoneNumber)))assert.deepEqual(next.memory.get(phone),old.memory.get(phone),'final memory parity');
assert.equal(newSent.length,7); // 3 two-bubble replies + source error fallback; empty returns no send.
assert.equal(requests.filter(x=>x.url.endsWith('/complete')).length,3);
assert.equal(new Set(requests.filter(x=>x.body.idempotencyKey).map(x=>x.body.idempotencyKey)).size,7);
const before=requests.length;assert.equal(await run(turnFor('turn-0',groups[0]),'synthetic-turn-token'),'duplicate');assert.equal(requests.length,before);
assert.throws(()=>createKeikiAdapter({...next,agent:{...next.agent,onInit:async()=>{}},splitIntoMessages}),/INDEPENDENT_CALLBACKS_UNMAPPED/);
await assert.rejects(run({...turnFor('bad',groups[0]),agentId:'other'},'synthetic-turn-token'),/BINDING/);
await assert.rejects(run({...turnFor('wrong-chat',groups[0]),conversationId:'unknown'},'synthetic-turn-token'),/BINDING/);
await assert.rejects(run({...turnFor('media',groups[0]),messages:[{text:'photo',attachments:[{}]}]},'synthetic-turn-token'),/OUTSIDE_TEXT_SUBSET/);
let attempts=0, settlements=[];
const failing=createKeikiAdapter({...application(),splitIntoMessages,binding,origin:'https://keiki.invalid',agentId:'synthetic-agent',post:async(url,h,b)=>{if(url.endsWith('/messages')){attempts++;return {ok:false};}settlements.push(b);return {ok:true};}});
await assert.rejects(failing(turnFor('unknown',[fixtures[0]]),'synthetic-turn-token'),/DELIVERY_NOT_CONFIRMED/);
assert.equal(await failing(turnFor('unknown',[fixtures[0]]),'synthetic-turn-token'),'duplicate');assert.equal(attempts,1);assert.equal(settlements[0].status,'failed');
if (process.env.FLUX_TRACE_PATH) writeFileSync(process.env.FLUX_TRACE_PATH,JSON.stringify({sourceSends:oldSent,targetSends:newSent,invokeInputs:next.inputs,targetRequests:requests},null,2));
console.log('PASS: actual Flux callback + Memory + FluxClient; 5 inputs, 3 turns, 7 bubbles, histories and state equal; duplicate, isolation, unsupported media/onInit, unknown outcome assertions pass.');
