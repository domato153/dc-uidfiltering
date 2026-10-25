import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parse} from 'acorn';

const source=await readFile(new URL('../../src/targets/mobile/header-shell-host-adapter.js',import.meta.url),'utf8');
test('one pure header policy preserves list/view, password and unsupported contexts',()=>{
 const ast=parse(source,{ecmaVersion:'latest'}),names=new Set(['__dcufHeaderContextSets','__dcufHeaderPresentationContexts','__dcufReadHeaderPresentationContexts']);
 const nodes=ast.body.filter(n=>n.type==='FunctionDeclaration'?names.has(n.id.name):n.type==='VariableDeclaration'&&n.declarations.some(d=>names.has(d.id.name)));
 assert.equal(nodes.length,3,'Header applicability has one shared policy and target input reader');
 const context=vm.createContext({});vm.runInContext(nodes.map(n=>source.slice(n.start,n.end)).join('\n'),context);
 for(const[state,expected]of [['password',['modify']],['write-editor',['modify']],[null,[]]]){
  context.page={type:'modify',hasListSurface:false,isModify:true,isDelete:false};context.state=state;
  assert.deepEqual(Array.from(vm.runInContext('__dcufHeaderPresentationContexts(page,state)',context)),expected);
 }
 for(const type of['list','view']){context.page={type,hasListSurface:true};context.state=null;assert.deepEqual(Array.from(vm.runInContext('__dcufHeaderPresentationContexts(page,state)',context)),['list-surface'])}
 context.page={type:'delete',hasListSurface:false,isDelete:true};context.state='password';assert.deepEqual(Array.from(vm.runInContext('__dcufHeaderPresentationContexts(page,state)',context)),['delete']);
 context.page={type:'write',hasListSurface:false,isWrite:true};context.state='write-editor';assert.deepEqual(Array.from(vm.runInContext('__dcufHeaderPresentationContexts(page,state)',context)),['write']);
 context.page={type:'delete',hasListSurface:false,isDelete:true};assert.equal(vm.runInContext('__dcufHeaderPresentationContexts(page,state).length',context),0);
 for(const type of['write','other','delete','modify']){context.page={type,hasListSurface:false};context.state='password';assert.equal(vm.runInContext('__dcufHeaderPresentationContexts(page,state).length',context),0)}
 context.page=null;assert.equal(vm.runInContext('__dcufHeaderPresentationContexts(page,state).length',context),0);
 assert.equal(vm.runInContext('Object.isFrozen(__dcufHeaderPresentationContexts({hasListSurface:true},null))',context),true);
 assert.equal(vm.runInContext('__dcufHeaderPresentationContexts({hasListSurface:true},null)===__dcufHeaderPresentationContexts({hasListSurface:true},null)',context),true,'List hot path reuses immutable context data');
 context.window={__dcufPageContext:{hasListSurface:true}};context.document={get body(){throw Error('List context must not read native-form DOM')}};
 assert.deepEqual(Array.from(vm.runInContext('__dcufReadHeaderPresentationContexts()',context)),['list-surface']);
});
