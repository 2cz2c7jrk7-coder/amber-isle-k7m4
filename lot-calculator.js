/* Integer-fen cash ledger. Each ETF buy is constrained by its own target budget. */
(function(root){
  'use strict';
  function calculateAllocation({capital,weights,quotes,costBps=10,minFee=0}){
    if(!Number.isFinite(capital)||capital<0||capital>1e9)throw Error('资金须为 0 至 10 亿元');
    if(!Number.isFinite(costBps)||costBps<0||costBps>100||!Number.isFinite(minFee)||minFee<0||minFee>10000)throw Error('费用假设超出范围');
    if(!Array.isArray(weights)||weights.some(w=>!Number.isFinite(w.weight)||w.weight<0)||Math.abs(weights.reduce((s,w)=>s+w.weight,0)-1)>1e-8)throw Error('权重须非负且合计 100%');
    const capitalFen=Math.round(capital*100),minimumFen=Math.ceil(minFee*100),rate=costBps/10000;
    const rows=quotes.assets.map(q=>{
      const weight=weights.find(w=>w.code===q.code)?.weight||0;
      const priceMills=Math.round(q.close*1000),lotFen=priceMills*q.lot_size/10;
      if(q.close<=0||Math.abs(q.close*1000-priceMills)>1e-7||!Number.isSafeInteger(lotFen)||lotFen<=0)throw Error('价格或交易单位无效');
      const budgetFen=Math.floor(capitalFen*weight+1e-8);
      const feeFor=lots=>lots===0?0:Math.max(minimumFen,Math.ceil(lots*lotFen*rate-1e-9));
      let lo=0,hi=Math.floor(budgetFen/lotFen);
      while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(mid*lotFen+feeFor(mid)<=budgetFen)lo=mid;else hi=mid-1;}
      const valueFen=lo*lotFen,feeFen=feeFor(lo);
      return {...q,weight,target_budget:budgetFen/100,units:lo*q.lot_size,lots:lo,value:valueFen/100,fee:feeFen/100,spend:(valueFen+feeFen)/100,budget_remainder:(budgetFen-valueFen-feeFen)/100,value_fen:valueFen,fee_fen:feeFen};
    });
    const valueFen=rows.reduce((s,r)=>s+r.value_fen,0),feeFen=rows.reduce((s,r)=>s+r.fee_fen,0),cashFen=capitalFen-valueFen-feeFen;
    if(cashFen<0)throw Error('预算核算失败');
    return {capital:capitalFen/100,cost_bps:costBps,min_fee:minFee,quote_date:quotes.as_of,allocation_date:'2026-10-09',allocation_strategy:'第一轮 RDEU + 静态 HS VaR 收盘漂移持仓',rows,invested:valueFen/100,fees:feeFen/100,cash:cashFen/100,equity_weight:capitalFen?valueFen/capitalFen:0,scope:'从现金开始买入；费用包含在各 ETF 目标预算内；不改变连续权重回测，也不是调仓订单'};
  }
  root.calculateAllocation=calculateAllocation;
  if(typeof module==='object'&&module.exports)module.exports={calculateAllocation};
})(typeof window==='object'?window:globalThis);
