"use client";
import Image from "next/image";
import {useEffect,useState} from "react";
import {DEFAULT_WALLPAPER_ID,getWallpaper,getWallpaperUrl,preloadWallpaper,readWallpaperPreference,WALLPAPER_STORAGE_KEY,type Wallpaper} from "../../lib/wallpapers";
type Layer={wallpaper:Wallpaper;url:string;key:number};type Mode="dark"|"light";
const mode=():Mode=>document.documentElement.classList.contains("dark")?"dark":"light";
export default function DesktopBackground(){
 const [active,setActive]=useState<Layer|null>(null),[previous,setPrevious]=useState<Layer|null>(null),[visible,setVisible]=useState(false),[theme,setTheme]=useState<Mode>(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light");
 useEffect(()=>{let cancelled=false,key=0,request=0,current:Layer|null=null;
 const apply=async(id:string,t=mode())=>{const token=++request,w=getWallpaper(id),url=getWallpaperUrl(w,t);setTheme(t);if(current?.url===url)return;let next=w,nextUrl=url,fallbackUsed=false;
 try{await preloadWallpaper(url);}catch{if(cancelled||token!==request)return;next=getWallpaper(DEFAULT_WALLPAPER_ID);nextUrl=getWallpaperUrl(next,t);fallbackUsed=true;if(current?.url===nextUrl)return;try{await preloadWallpaper(nextUrl);}catch{return;}}
 if(cancelled||token!==request||(!fallbackUsed&&getWallpaperUrl(getWallpaper(readWallpaperPreference()),mode())!==nextUrl))return;
 const layer={wallpaper:next,url:nextUrl,key:++key};setPrevious(current);current=layer;setVisible(false);setActive(layer);};
 const change=(e:Event)=>void apply((e as CustomEvent<string>).detail||readWallpaperPreference());
 const storage=(e:StorageEvent)=>{if(e.key===WALLPAPER_STORAGE_KEY)void apply(e.newValue||DEFAULT_WALLPAPER_ID);};
 const observer=new MutationObserver(()=>void apply(readWallpaperPreference(),mode()));observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
 window.addEventListener("utoolity:wallpaper-changed",change);window.addEventListener("storage",storage);
 let channel:BroadcastChannel|undefined;if("BroadcastChannel"in window){channel=new BroadcastChannel("utoolity:wallpaper");channel.onmessage=e=>{if(e.data?.id)void apply(e.data.id);};}
 void apply(readWallpaperPreference(),mode());
 return()=>{cancelled=true;observer.disconnect();window.removeEventListener("utoolity:wallpaper-changed",change);window.removeEventListener("storage",storage);channel?.close();};
 },[]);
 useEffect(()=>{if(!active)return;const f=requestAnimationFrame(()=>setVisible(true)),t=setTimeout(()=>setPrevious(null),900);return()=>{cancelAnimationFrame(f);clearTimeout(t);};},[active]);
 const render=(l:Layer,on:boolean)=>{const opacity=on?(visible?"opacity-100":"opacity-0"):"opacity-100";return l.wallpaper.kind==="live"?<video key={l.key} aria-hidden className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[850ms] ease-in-out motion-reduce:transition-none ${opacity}`} src={l.url} autoPlay muted loop playsInline preload="auto"/>:<div key={l.key} aria-hidden className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[850ms] ease-in-out motion-reduce:transition-none ${opacity}`} style={{backgroundImage:`url("${l.url}")`}}/>;};
 return <div aria-hidden className="desktop-background pointer-events-none fixed inset-0 z-0 isolate overflow-hidden bg-background" data-wallpaper-theme={theme}>{previous&&render(previous,false)}{active&&render(active,true)}<div className="absolute inset-0 top-[75%] left-[85%]"><Image src="/Logo.svg" alt="" width={36} height={36} priority className="desktop-logo h-[min(12vw,42vh,360px)] w-[min(10vw,42vh,360px)] object-contain opacity-90"/></div></div>;
}
