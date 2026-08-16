import{u as T}from"./useStats-MhYXOg54.js";import{a as V,e as x,c as g,$,n as C,d as B,h,a0 as L,a1 as O,f as R,u as k,i as j,a2 as M,j as _,w as N,a3 as P,a4 as E,a5 as H,k as I,_ as D,F as W,a6 as K,G as z,I as F,K as U,L as r,T as S,H as t,W as u,U as G,O as X,P as Y,a7 as q,V as w}from"./index-CDXgW5FJ.js";import"./useTasks-D-tgx2ES.js";function A(a){const{opacityDisabled:d,heightTiny:s,heightSmall:i,heightMedium:m,heightLarge:o,heightHuge:c,primaryColor:l,fontSize:n}=a;return{fontSize:n,textColor:l,sizeTiny:s,sizeSmall:i,sizeMedium:m,sizeLarge:o,sizeHuge:c,color:l,opacitySpinning:d}}const J={common:V,self:A},Q=x([x("@keyframes spin-rotate",`
 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 `),g("spin-container",`
 position: relative;
 `,[g("spin-body",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 `,[$()])]),g("spin-body",`
 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 `),g("spin",`
 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 `,[C("rotate",`
 animation: spin-rotate 2s linear infinite;
 `)]),g("spin-description",`
 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 `),g("spin-content",`
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 `,[C("spinning",`
 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 `)])]),Z={small:20,medium:18,large:16},tt=Object.assign(Object.assign(Object.assign({},k.props),{contentClass:String,contentStyle:[Object,String],description:String,size:{type:[String,Number],default:"medium"},show:{type:Boolean,default:!0},rotate:{type:Boolean,default:!0},spinning:{type:Boolean,validator:()=>!0,default:void 0},delay:Number}),E),st=B({name:"Spin",props:tt,slots:Object,setup(a){const{mergedClsPrefixRef:d,inlineThemeDisabled:s}=R(a),i=k("Spin","-spin",Q,J,a,d),m=_(()=>{const{size:n}=a,{common:{cubicBezierEaseInOut:p},self:v}=i.value,{opacitySpinning:e,color:y,textColor:f}=v,b=typeof n=="number"?H(n):v[I("size",n)];return{"--n-bezier":p,"--n-opacity-spinning":e,"--n-size":b,"--n-color":y,"--n-text-color":f}}),o=s?j("spin",_(()=>{const{size:n}=a;return typeof n=="number"?String(n):n[0]}),m,a):void 0,c=P(a,["spinning","show"]),l=N(!1);return M(n=>{let p;if(c.value){const{delay:v}=a;if(v){p=window.setTimeout(()=>{l.value=!0},v),n(()=>{clearTimeout(p)});return}}l.value=c.value}),{mergedClsPrefix:d,active:l,mergedStrokeWidth:_(()=>{const{strokeWidth:n}=a;if(n!==void 0)return n;const{size:p}=a;return Z[typeof p=="number"?"medium":p]}),cssVars:s?void 0:m,themeClass:o==null?void 0:o.themeClass,onRender:o==null?void 0:o.onRender}},render(){var a,d;const{$slots:s,mergedClsPrefix:i,description:m}=this,o=s.icon&&this.rotate,c=(m||s.description)&&h("div",{class:`${i}-spin-description`},m||((a=s.description)===null||a===void 0?void 0:a.call(s))),l=s.icon?h("div",{class:[`${i}-spin-body`,this.themeClass]},h("div",{class:[`${i}-spin`,o&&`${i}-spin--rotate`],style:s.default?"":this.cssVars},s.icon()),c):h("div",{class:[`${i}-spin-body`,this.themeClass]},h(L,{clsPrefix:i,style:s.default?"":this.cssVars,stroke:this.stroke,"stroke-width":this.mergedStrokeWidth,radius:this.radius,scale:this.scale,class:`${i}-spin`}),c);return(d=this.onRender)===null||d===void 0||d.call(this),s.default?h("div",{class:[`${i}-spin-container`,this.themeClass],style:this.cssVars},h("div",{class:[`${i}-spin-content`,this.active&&`${i}-spin-content--spinning`,this.contentClass],style:this.contentStyle},s),h(O,{name:"fade-in-transition"},{default:()=>this.active?l:null})):l}}),et={class:"stats"},it={class:"stats-grid"},nt={class:"stat-card"},at={class:"stat-num"},ot={class:"stat-sub"},lt={class:"stat-card"},rt={class:"stat-num"},ct={class:"stat-sub"},dt={class:"stat-card"},ut={class:"stat-num"},mt={class:"stat-card"},pt={class:"stat-num"},vt={class:"stat-sub"},ht={class:"chart-card"},ft={class:"bar-chart"},gt={class:"bar-count"},yt={__name:"StatsView",setup(a){const{loading:d,today:s,week:i,total:m,last7Days:o,taskStats:c,load:l}=T();W(()=>{l(),document.addEventListener("visibilitychange",n)}),K(()=>{document.removeEventListener("visibilitychange",n)});function n(){document.visibilityState==="visible"&&l()}function p(v){const e=Math.max(...o.value.map(y=>y.count),1);return`${Math.max(6,Math.round(v/e*96))}px`}return(v,e)=>{const y=st;return S(),z("div",et,[F(y,{show:r(d)},{default:U(()=>[t("div",it,[t("div",nt,[e[0]||(e[0]=t("div",{class:"stat-label"},"今日番茄",-1)),t("div",at,u(r(s).count),1),t("div",ot,"专注 "+u(r(s).minutes)+" 分钟",1)]),t("div",lt,[e[1]||(e[1]=t("div",{class:"stat-label"},"本周番茄",-1)),t("div",rt,u(r(i).count),1),t("div",ct,"专注 "+u(r(i).minutes)+" 分钟",1)]),t("div",dt,[e[2]||(e[2]=t("div",{class:"stat-label"},"累计番茄",-1)),t("div",ut,u(r(m)),1),e[3]||(e[3]=t("div",{class:"stat-sub"},"全部记录在本地",-1))]),t("div",mt,[e[5]||(e[5]=t("div",{class:"stat-label"},"任务完成率",-1)),t("div",pt,[G(u(r(c).rate),1),e[4]||(e[4]=t("span",{class:"stat-percent"},"%",-1))]),t("div",vt,u(r(c).done)+" / "+u(r(c).total)+" 已完成",1)])]),t("div",ht,[e[6]||(e[6]=t("div",{class:"chart-title"},"近 7 天",-1)),t("div",ft,[(S(!0),z(X,null,Y(r(o),(f,b)=>(S(),z("div",{key:f.label,class:"bar-item"},[t("div",gt,u(f.count||""),1),t("div",{class:w(["bar",{empty:f.count===0,today:b===r(o).length-1}]),style:q({height:p(f.count)})},null,6),t("div",{class:w(["bar-label",{today:b===r(o).length-1}])},u(f.label),3)]))),128))])])]),_:1},8,["show"])])}}},St=D(yt,[["__scopeId","data-v-af03413b"]]);export{St as default};
