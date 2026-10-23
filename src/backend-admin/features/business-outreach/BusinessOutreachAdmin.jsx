import React, { useMemo, useState } from 'react';

const INITIAL = [
  {
    "name": "Entripy",
    "website": "https://www.entripy.com",
    "type": "Company Hiring",
    "platform": "Unverified",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "https://storejobs.dev/jobs/mg-3873-adobe-commerce-developer",
    "role": "Adobe Commerce Developer",
    "contact": "",
    "notes": "Posting availability and employer match must be verified."
  },
  {
    "name": "Newprint",
    "website": "https://www.newprint.ca",
    "type": "Company Hiring",
    "platform": "Unverified",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "https://www.newprint.ca/job-posting-web-developer",
    "role": "Magento Web Developer",
    "contact": "",
    "notes": "Posting availability and employer match must be verified."
  },
  {
    "name": "Allegro Central Vacuum Systems",
    "website": "",
    "type": "Company Hiring",
    "platform": "Unverified",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "https://ca.indeed.com/q-ecommerce-coordinator-l-oakville%2C-on-jobs.html",
    "role": "E-commerce Coordinator",
    "contact": "",
    "notes": "Posting availability and employer match must be verified."
  },
  {
    "name": "eMacity Leads",
    "website": "",
    "type": "Company Hiring",
    "platform": "Unverified",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "https://ca.indeed.com/q-magento-developer-l-ontario-jobs.html",
    "role": "Magento Developer",
    "contact": "",
    "notes": "Posting availability and employer match must be verified."
  },
  {
    "name": "Papagino Foods",
    "website": "",
    "type": "Company Hiring",
    "platform": "Unverified",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "https://ca.indeed.com/viewjob?jk=e6b8ee7f2587abae",
    "role": "E-commerce & Administrative Coordinator",
    "contact": "",
    "notes": "Posting availability and employer match must be verified."
  },
  {
    "name": "Just Jeeps",
    "website": "https://www.justjeeps.com",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Starkmans",
    "website": "https://www.starkmans.com",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "MapTrove",
    "website": "https://www.maptrove.ca",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "John Bead",
    "website": "https://www.johnbead.com",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Lawlor Safety",
    "website": "https://www.lawlorsafety.ca",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Avron",
    "website": "https://www.avron.ca",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "J.C. Cayer",
    "website": "https://www.jccayer.com",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Bahr Saddlery",
    "website": "https://www.bahrsaddlery.com",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Pen Blanks",
    "website": "https://www.penblanks.ca",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Flexo Products",
    "website": "https://www.flexoproducts.com",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  },
  {
    "name": "Dynamic Gift",
    "website": "https://www.dynamicgift.ca",
    "type": "Potential Client",
    "platform": "Magento (verify)",
    "status": "Not Contacted",
    "location": "Ontario",
    "jobUrl": "",
    "contact": "",
    "notes": "Platform and opportunity not independently verified."
  }
];
const KEY = 'justindematteis-business-outreach-v1';
const statuses = ['Not Contacted','Contacted','Follow-Up','Responded','Closed'];
const load = () => { try { const saved = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(saved) ? saved : INITIAL; } catch { return INITIAL; } };
export default function BusinessOutreachAdmin() {
 const [items,setItems] = useState(load);
 const [type,setType] = useState('All');
 const [query,setQuery] = useState('');
 const [editing,setEditing] = useState(null);
 const save = next => { setItems(next); try { localStorage.setItem(KEY,JSON.stringify(next)); } catch {} };
 const filtered = useMemo(()=>items.map((item,index)=>({...item,index})).filter(item=>(type==='All'||item.type===type)&&[item.name,item.role,item.location,item.notes].join(' ').toLowerCase().includes(query.toLowerCase())),[items,type,query]);
 const change = (index,field,value)=>save(items.map((item,i)=>i===index?{...item,[field]:value}:item));
 const add = ()=>{const next={name:'New company',website:'',type:type==='All'?'Potential Client':type,platform:'Unverified',status:'Not Contacted',location:'',jobUrl:'',role:'',contact:'',notes:'',lastContact:'',followUp:''};save([...items,next]);setEditing(items.length);};
 const input=(label,field)=> <label style={{display:'grid',gap:5}}>{label}<input style={{padding:10,border:'1px solid #aaa',borderRadius:6,width:'100%'}} value={items[editing]?.[field]||''} onChange={e=>change(editing,field,e.target.value)}/></label>;
 return <main style={{padding:'24px',maxWidth:1200,margin:'auto'}}><h1>Business Outreach</h1><p>Track companies hiring, Magento prospects, freelance projects and follow-ups. Records are stored in this browser only; export a backup before switching devices.</p><div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:20}}><select aria-label="Category" value={type} onChange={e=>setType(e.target.value)}>{['All','Company Hiring','Potential Client'].map(v=><option key={v}>{v}</option>)}</select><input aria-label="Search companies" placeholder="Search companies" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={add}>Add company</button><button onClick={()=>{const blob=new Blob([JSON.stringify(items,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='business-outreach.json';a.click();URL.revokeObjectURL(url);}}>Export JSON</button><label>Import JSON <input type="file" accept="application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data)||!data.every(x=>x&&typeof x.name==='string'))throw Error();if(window.confirm('Replace existing outreach records with imported data?'))save(data);}catch{window.alert('Invalid outreach JSON file');}e.target.value='';}}/></label></div><p>{filtered.length} companies · {items.filter(x=>x.type==='Company Hiring').length} hiring leads · {items.filter(x=>x.type==='Potential Client').length} potential clients</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Company','Category','Role / Platform','Status','Website / Posting','Actions'].map(h=><th key={h} style={{textAlign:'left',padding:10,borderBottom:'1px solid #aaa'}}>{h}</th>)}</tr></thead><tbody>{filtered.map(item=><tr key={item.index}><td style={{padding:10}}>{item.name}</td><td>{item.type}</td><td>{item.role||item.platform}</td><td><select value={item.status} onChange={e=>change(item.index,'status',e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td><td>{item.website&&<a href={item.website} target="_blank" rel="noopener noreferrer">Website</a>} {item.jobUrl&&<a href={item.jobUrl} target="_blank" rel="noopener noreferrer">Job posting</a>}</td><td><button onClick={()=>setEditing(item.index)}>Edit</button></td></tr>)}</tbody></table></div>{editing!==null&&items[editing]&&<section style={{marginTop:24,padding:20,border:'1px solid #aaa',borderRadius:10}}><h2>Edit company</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14}}>{['name','website','location','platform','role','jobUrl','contact','lastContact','followUp','notes'].map(k=><React.Fragment key={k}>{input(k,k)}</React.Fragment>)}<label>Category<select value={items[editing].type} onChange={e=>change(editing,'type',e.target.value)}>{['Company Hiring','Potential Client'].map(v=><option key={v}>{v}</option>)}</select></label></div><div style={{display:'flex',gap:12,marginTop:16}}><button onClick={()=>setEditing(null)}>Done</button><button onClick={()=>{if(window.confirm('Delete this company?')){save(items.filter((_,i)=>i!==editing));setEditing(null);}}}>Delete</button></div></section>}</main>;
}
