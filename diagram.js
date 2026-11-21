/* RepoMind Architecture Explorer — inferred file/import graph, no external libraries. */
(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';
let graph=null, scale=1, offset={x:0,y:0}, selected=null, drag=null;
const $=s=>document.querySelector(s);
const svgEl=(name,attributes={})=>{const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attributes))el.setAttribute(k,String(v));return el};
const text=(x,y,value,attributes={})=>{const el=svgEl('text',{x,y,...attributes});el.textContent=value;return el};
const shorten=(value,max=23)=>value.length>max?value.slice(0,max-1)+'…':value;
function fileGraph(files){
 const included=files.filter(f=>f.content).sort((a,b)=>a.path.localeCompare(b.path));
 const preferred=files.filter(f=>!f.content&&(/(^|\/)(README|package\.json|index\.html|main\.|app\.|src\/)/i.test(f.path))).slice(0,6);
 const list=[...included.slice(0,32),...preferred].slice(0,36);
 const modules=new Map(list.map((f,i)=>[f.path,{id:i,path:f.path,name:f.path.split('/').pop(),content:f.content||'',size:f.size||0,folder:f.path.includes('/')?f.path.split('/')[0]:'root'}]));
 const edges=[],edgeSet=new Set();
 function link(from,to,kind){if(from===to||!modules.has(from)||!modules.has(to))return;const key=from+'|'+to;if(edgeSet.has(key))return;edgeSet.add(key);edges.push({from,to,kind})}
 for(const f of list){
  if(!f.content)continue;
  const imported=/\b(?:import\s*(?:[^'"]+?\s*from\s*)?|require\s*\(|import\s*\()\s*['"]([^'"]+)['"]/g;
  for(const match of f.content.matchAll(imported)){
   const ref=match[1];if(!ref.startsWith('.'))continue;
   const resolved=[];for(const p of f.path.split('/').slice(0,-1).concat(ref.split('/'))){if(p==='..')resolved.pop();else if(p&&p!=='.')resolved.push(p)}
   const name=resolved.join('/');
   const found=[name,name+'.js',name+'.ts',name+'.tsx',name+'.jsx',name+'/index.js',name+'/index.ts'].find(x=>modules.has(x));
   if(found)link(f.path,found,'import');
  }
  const asset=/\b(?:src|href)\s*=\s*["']\.\/([^"']+\.(?:js|css))["']/g;
  if(/\.html?$/.test(f.path))for(const m of f.content.matchAll(asset)){const dest=(f.path.includes('/')?f.path.slice(0,f.path.lastIndexOf('/')+1):'')+m[1];link(f.path,dest,'reference')}
 }
 if(edges.length===0){const groups=new Map();for(const f of list){const dir=f.path.includes('/')?f.path.split('/')[0]:'root';if(!groups.has(dir))groups.set(dir,[]);groups.get(dir).push(f.path)}for(const members of groups.values())for(let i=1;i<Math.min(members.length,8);i++)link(members[0],members[i],'same module')}
 const folders=[...new Set(list.map(f=>f.path.split('/').length>1?f.path.split('/')[0]:'root'))];
 const columns=Math.min(4,Math.max(2,Math.ceil(Math.sqrt(list.length/2))));
 const nodes=list.map((f,i)=>{const col=i%columns,row=Math.floor(i/columns);return {...modules.get(f.path),x:36+col*284,y:75+row*112}});
 return {nodes,edges,folders,width:columns*284+15,height:Math.ceil(nodes.length/columns)*112+135};
}
function render(files,repo){
 graph=fileGraph(files);selected=null;scale=1;offset={x:0,y:0};$('#diagram-count').textContent=graph.nodes.length+' components · '+graph.edges.length+' inferred connections';$('#diagram-info-title').textContent='Select a component';$('#diagram-info-body').textContent='Click a node to inspect file details and open the source in GitHub. Solid lines are detected imports or references; dashed lines indicate same-folder grouping.';$('#diagram-open-source').hidden=true;$('#diagram-explain').disabled=true;
 const svg=$('#architecture-svg');svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${graph.width} ${graph.height}`);svg.setAttribute('aria-label','Inferred repository architecture');const defs=svgEl('defs');
 const pattern=svgEl('pattern',{id:'rm-grid',width:26,height:26,patternUnits:'userSpaceOnUse'});pattern.append(svgEl('circle',{cx:1,cy:1,r:1,fill:'#2e3e60'}));defs.append(pattern);
 const marker=svgEl('marker',{id:'rm-arrow',markerWidth:9,markerHeight:9,refX:8,refY:4,orient:'auto',markerUnits:'userSpaceOnUse'});marker.append(svgEl('path',{d:'M0 0 L8 4 L0 8',fill:'none',stroke:'#6c83ac','stroke-width':1.3}));defs.append(marker);svg.append(defs);
 const viewport=svgEl('g',{id:'diagram-viewport'});viewport.append(svgEl('rect',{width:graph.width,height:graph.height,fill:'url(#rm-grid)'}));
 for(const e of graph.edges){const from=graph.nodes.find(n=>n.path===e.from),to=graph.nodes.find(n=>n.path===e.to);if(!from||!to)continue;const x1=from.x+112,y1=from.y+32,x2=to.x+112,y2=to.y+32;const edge=svgEl('path',{d:`M${x1} ${y1} C${x1+46} ${(y1+y2)/2},${x2-46} ${(y1+y2)/2},${x2} ${y2}`,fill:'none',stroke:e.kind==='same module'?'#465572':'#7f88c6','stroke-width':e.kind==='same module'?1.2:1.7,'stroke-dasharray':e.kind==='same module'?'4 6':'none','marker-end':'url(#rm-arrow)',opacity:.8});const tip=svgEl('title');tip.textContent=e.from+' → '+e.to+' ('+e.kind+')';edge.append(tip);viewport.append(edge)}
 for(const node of graph.nodes){const group=svgEl('g',{class:'diagram-node',transform:`translate(${node.x} ${node.y})`,tabindex:'0',role:'button','aria-label':'Inspect '+node.path,'data-file':node.path});const fill=node.path.match(/\.html$/)?'#203c4e':node.path.match(/\.(css|scss)$/)?'#30264e':node.path.match(/\.(json|yaml|yml|toml)$/)?'#3e2f35':'#1e2948';group.append(svgEl('rect',{width:224,height:68,rx:13,fill,stroke:'#4c5c8d','stroke-width':1.2}));group.append(svgEl('rect',{x:12,y:14,width:38,height:38,rx:10,fill:'#50477c'}));group.append(text(31,40,node.name.match(/\.(css|scss)$/)?'◫':node.name.match(/\.html$/)?'◇':'⌘',{'text-anchor':'middle','font-size':19,fill:'#e0d2ff'}));group.append(text(61,29,shorten(node.name,19),{'font-size':13,'font-weight':'700',fill:'#ecedff'}));group.append(text(61,47,shorten(node.folder+' · '+(node.content?'indexed':'path only'),25),{'font-size':10,fill:'#acb9d5'}));const tip=svgEl('title');tip.textContent=node.path;group.append(tip);group.addEventListener('click',()=>select(node.path,repo));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(node.path,repo)}});viewport.append(group)}
 svg.append(viewport);applyTransform();$('#diagram-empty').hidden=true;$('#diagram-display').hidden=false;
}
function select(path,repo){selected=graph.nodes.find(n=>n.path===path);if(!selected)return;document.querySelectorAll('.diagram-node').forEach(el=>{const active=el.getAttribute('data-file')===path;el.querySelector('rect').setAttribute('stroke',active?'#bcb1ff':'#4c5c8d');el.querySelector('rect').setAttribute('stroke-width',active?2.8:1.2)});$('#diagram-info-title').textContent=selected.path;const connects=graph.edges.filter(e=>e.from===path||e.to===path);$('#diagram-info-body').textContent=(selected.content?'Source indexed · ':'Path only · ')+selected.size.toLocaleString()+' bytes · '+connects.length+' inferred relationships.\n\n'+(connects.map(e=>(e.from===path?'→ '+e.to:'← '+e.from)+' ('+e.kind+')').join('\n')||'No detectable imports or references in the indexed subset.');const branch=encodeURIComponent(repo.default_branch);$('#diagram-open-source').href='https://github.com/'+repo.full_name+'/blob/'+branch+'/'+selected.path.split('/').map(encodeURIComponent).join('/');$('#diagram-open-source').hidden=false;$('#diagram-explain').disabled=!selected.content}
function applyTransform(){const el=$('#diagram-viewport');if(el)el.setAttribute('transform',`translate(${offset.x} ${offset.y}) scale(${scale})`)}
function zoom(amount){scale=Math.max(.35,Math.min(2.5,scale*amount));applyTransform();$('#diagram-zoom-label').textContent=Math.round(scale*100)+'%'}
function reset(){scale=1;offset={x:0,y:0};applyTransform();$('#diagram-zoom-label').textContent='100%'}
function mermaid(){if(!graph)return'';const ids=new Map(graph.nodes.map((n,i)=>[n.path,'N'+i]));const lines=['flowchart LR',...graph.nodes.map(n=>'  '+ids.get(n.path)+'["'+n.name.replace(/["\\]/g,'')+'"]'),...graph.edges.map(e=>'  '+ids.get(e.from)+' --> '+ids.get(e.to))];return lines.join('\n')}
function downloadSvg(){const source=$('#architecture-svg');if(!graph)return;const copy=source.cloneNode(true);copy.setAttribute('xmlns',NS);const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='repomind-architecture.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener('DOMContentLoaded',()=>{$('#diagram-zoom-in').onclick=()=>zoom(1.2);$('#diagram-zoom-out').onclick=()=>zoom(1/1.2);$('#diagram-reset').onclick=reset;$('#diagram-export').onclick=downloadSvg;$('#diagram-copy').onclick=async()=>{try{await navigator.clipboard.writeText(mermaid());$('#diagram-count').textContent='Mermaid diagram copied ✓'}catch{$('#diagram-count').textContent='Copy unavailable. Use HTTPS browser permissions.'}};const svg=$('#architecture-svg');svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.1:1/1.1)},{passive:false});svg.addEventListener('pointerdown',e=>{if(e.target.closest('.diagram-node'))return;drag={x:e.clientX,y:e.clientY,startX:offset.x,startY:offset.y};svg.setPointerCapture(e.pointerId)});svg.addEventListener('pointermove',e=>{if(!drag)return;const bounds=svg.getBoundingClientRect();const w=graph?.width||1;const ratio=w/bounds.width;offset.x=drag.startX+(e.clientX-drag.x)*ratio;offset.y=drag.startY+(e.clientY-drag.y)*ratio;applyTransform()});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null)});
window.RepoDiagram={render,getSelected:()=>selected,mermaid};
})();