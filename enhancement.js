'use strict';
function initEnhancement(baseData){
  const money2=n=>new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  let allocation;
  function renderAllocation(){
    try{
      allocation=calculateAllocation({capital:Number($('#lot-capital').value),weights:baseData.latest_weights,quotes:window.ALLOCATION_QUOTES,costBps:Number($('#lot-fee').value),minFee:Number($('#lot-min-fee').value)});
      $('#lot-error').hidden=true;
      text($('#quote-date'),'原价及持仓日期 '+allocation.quote_date);
      table($('#lot-table'),['ETF / 代码','未复权收盘价','配置预算 元','买入份额','估算市值 元','估算费用 元'],allocation.rows.map(r=>[r.label+' / '+r.code,r.close.toFixed(3),money2(r.target_budget),money(r.units)+' 份',money2(r.value),money2(r.fee)]));
      const items=[['买入 ETF 市值','¥ '+money2(allocation.invested),'占起始资金 '+pct(allocation.equity_weight)],['估算费用','¥ '+money2(allocation.fees),allocation.cost_bps+' bps / 最低 ¥ '+money2(allocation.min_fee)],['剩余现金','¥ '+money2(allocation.cash),'包含配置现金和不足一手余额'],['已用资金','¥ '+money2(allocation.invested+allocation.fees),'买入金额与费用合计']];
      $('#lot-summary').replaceChildren(...items.map(([label,val,note])=>{const n=node('div',null,'stat');n.append(node('div',label,'stat-label'),node('div',val,'stat-value'),node('small',note));return n}));
    }catch(e){allocation=null;$('#lot-error').hidden=false;text($('#lot-error'),e.message);$('#lot-summary').replaceChildren();$('#lot-table').replaceChildren();}
  }
  ['lot-capital','lot-fee','lot-min-fee'].forEach(id=>$('#'+id).addEventListener('input',renderAllocation));
  renderAllocation();
  const e=window.ENHANCEMENT_DATA;
  if(!e?.periods?.length){text($('#enhancement-finding'),'实验快照暂时无法载入。');return;}
  const select=$('#enhancement-period'),periods=e.periods;
  select.replaceChildren(...periods.map(p=>{const o=node('option',p.label);o.value=p.key;return o}));select.value='holdout';
  const colors=['#B8AA9B','#8C7F72','#D9773F','#39342F','#E9AF87','#62584E','#B3ADA6'];
  const dashes=['3 3','7 3','','2 3','7 3 2 3','','10 4'];
  const pvalue=v=>v==null?'—':Number(v).toFixed(4);
  function render(){
    const p=periods.find(p=>p.key===select.value),m=p.metrics;
    table($('#enhancement-table'),['策略','累计收益','最大回撤','平均现金','活跃日突破率','覆盖 p','不可行调仓'],m.map(r=>[r.label,pct(r.total_return),pct(r.max_drawdown),pct(r.avg_cash_weight),pct(r.active_var_exception_rate),pvalue(r.active_kupiec_pvalue),String(r.infeasible_rebalance_events)]));
    table($('#coverage-table'),['策略','突破 / 活跃日','n00 / n01 / n10 / n11','独立性 p','条件覆盖 p','聚集排列 p','最长连续突破'],m.map(r=>[r.label,r.active_var_exceptions+' / '+r.active_var_observations,[r.n00,r.n01,r.n10,r.n11].join(' / '),pvalue(r.independence_pvalue),pvalue(r.conditional_coverage_pvalue),pvalue(r.cluster_permutation_pvalue),r.max_consecutive_exceptions]));
    const f=m.find(r=>r.strategy==='fhs_exec_rdeu'),h=m.find(r=>r.strategy==='hs_exec_rdeu'),eu=m.find(r=>r.strategy==='fhs_exec_eu'),eq=m.find(r=>r.strategy==='equal_var_hs_exec');
    text($('#enhancement-finding'),p.actual_start+' — '+p.actual_end+'：FHS 执行匹配 RDEU 收益 '+pct(f.total_return)+'、活跃日突破率 '+pct(f.active_var_exception_rate)+'；同效用 HS 执行匹配为 '+pct(h.total_return)+' / '+pct(h.active_var_exception_rate)+'。同 FHS 风险预测下 EU 收益 '+pct(eu.total_return)+'，HS 同预算等权收益 '+pct(eq.total_return)+'。单个区间的改进不能证明稳定超额收益。该段 FHS-RDEU 仍有 '+f.estimated_budget_breach_days+' 日预测风险超预算、'+f.budget_exceedances+' 日实际净亏损超预算。');
    const first=e.series.findIndex(r=>r.date>=p.start),last=e.series.findLastIndex(r=>r.date<=p.end),rows=e.series.slice(Math.max(0,first-1),last+1),svg=$('#enhancement-chart');svg.replaceChildren();
    if(rows.length<2)return;
    const keys=m.map(r=>r.strategy),W=980,H=310,L=52,R=17,T=15,B=35,lines=keys.map((key,i)=>({key,color:colors[i],dash:dashes[i],label:m[i].label,values:rows.map(r=>r[key]/rows[0][key])})),values=lines.flatMap(l=>l.values),min=Math.min(...values,.98),max=Math.max(...values,1.02),pad=(max-min)*.08,low=min-pad,high=max+pad,x=i=>L+i/(rows.length-1)*(W-L-R),y=v=>T+(high-v)/(high-low)*(H-T-B);
    for(let i=0;i<=4;i++){const v=low+(high-low)*i/4;svg.append(svgEl('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:'#E8E1D8'}),svgEl('text',{x:L-10,y:y(v)+4,'text-anchor':'end',fill:'#82776B','font-size':10},v.toFixed(2)));const idx=Math.round((rows.length-1)*i/4);svg.append(svgEl('text',{x:x(idx),y:H-8,'text-anchor':i===0?'start':i===4?'end':'middle',fill:'#82776B','font-size':10},rows[idx].date.slice(0,7)));}
    for(const l of lines){svg.append(svgEl('path',{d:l.values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1)).join(' '),fill:'none',stroke:l.color,'stroke-dasharray':l.dash,'stroke-linecap':'round','stroke-linejoin':'round','stroke-width':l.key==='fhs_exec_rdeu'?2.6:1.4,opacity:l.key==='fhs_exec_rdeu'?1:.75}));}
    $('#enhancement-legend').replaceChildren(...lines.map(l=>{const s=node('span'),i=node('i');i.style.borderTop='2px '+(l.dash?'dashed':'solid')+' '+l.color;s.append(i,node('span',l.label));return s}));
  }
  select.addEventListener('change',render);render();
}
