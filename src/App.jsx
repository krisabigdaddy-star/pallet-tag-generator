import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Activity, CheckCircle, Clock, AlertTriangle, Users, Calendar, BarChart3, Wrench, PlayCircle, FileSpreadsheet, Target, Timer, Trophy, ShieldCheck, Sparkles, PieChart, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';

// --- Configuration & Constants ---
const DEFAULT_SLA_MAP = {
  'LOW': 30,
  'MEDIUM': 14,
  'HIGH': 5,
  'CRITICAL': 2
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

// --- Utility Functions ---
function parseDateValue(rawDate) {
  if (!rawDate) return '';
  if (rawDate instanceof Date) {
    let year = rawDate.getFullYear();
    if (year < 2000) return ''; 
    return `${year}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`;
  } 
  else if (typeof rawDate === 'number' && rawDate > 10000) {
    const d = new Date((rawDate - 25569) * 86400 * 1000);
    if (d.getFullYear() < 2000) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } 
  else if (typeof rawDate === 'string') {
    let str = rawDate.split(' ')[0].trim();
    let parts = str.includes('/') ? str.split('/') : str.includes('-') ? str.split('-') : null;
    if (parts && parts.length === 3) {
      let y = parts[2].length === 4 ? parts[2] : (parts[0].length === 4 ? parts[0] : `20${parts[2]}`);
      let m = parts[1];
      let d = parts[2].length === 4 ? parts[0] : (parts[0].length === 4 ? parts[2] : parts[0]);
      let yearInt = parseInt(y);
      if (yearInt > 2500) y = (yearInt - 543).toString();
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return str.replace(/\//g, '-');
  }
  return String(rawDate);
}

// --- MultiSelect Dropdown Component ---
function MultiSelectDropdown({ label, options, selected, onChange, placeholder = "ทั้งหมด (All)", formatOption = (opt) => opt }) {
  const [isOpen, setIsOpen] = useState(false);
  const isAll = selected.length === 0;

  const toggleOption = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-3 rounded-2xl outline-none transition-all flex justify-between items-center text-left font-medium text-sm
            ${isOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-800 ring-2 ring-indigo-100' : 'bg-slate-50/80 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'}`}
        >
          <span className="truncate pr-2">
            {isAll ? placeholder : <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">เลือกแล้ว {selected.length}</span>}
          </span>
          <span className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-xl max-h-64 overflow-y-auto transform origin-top animate-[fadeInUp_0.3s_ease-out]">
              <div className="p-2 border-b border-slate-50 sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-indigo-700 hover:bg-indigo-50 p-2.5 rounded-xl transition-colors">
                  <input type="checkbox" checked={isAll} onChange={() => onChange([])} className="rounded-md border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                  เลือกทั้งหมด
                </label>
              </div>
              <div className="p-1.5">
                {options.map(opt => (
                  <label key={opt} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-600 rounded-xl transition-colors">
                    <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                    {formatOption(opt)}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Trend Chart Component ---
function TrendChart({ data, color }) {
  if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-slate-300 text-xs">ไม่มีข้อมูลในช่วงเวลานี้</div>;
  
  const validData = data.filter(d => d.val !== null);
  if (validData.length === 0) return <div className="h-full w-full flex items-center justify-center text-slate-300 text-xs">ไม่มีข้อมูลประเมินผลได้</div>;
  
  const maxVal = Math.max(...validData.map(d => d.val));
  const minVal = Math.min(...validData.map(d => d.val));
  const range = (maxVal - minVal) === 0 ? maxVal || 1 : maxVal - minVal;
  
  const w = 240, h = 100;
  const pT = 15, pB = 20, pL = 25, pR = 15;
  const iW = w - pL - pR;
  const iH = h - pT - pB;

  const points = data.map((d, i) => {
      if (d.val === null) return null;
      const x = pL + (i / (data.length - 1 || 1)) * iW;
      const y = pT + iH - (((d.val - minVal) / range) * iH);
      return { x, y, val: d.val, label: d.label, index: i };
  }).filter(Boolean);

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible mt-2">
          <text x={pL - 4} y={pT + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{maxVal.toFixed(maxVal < 10 ? 1 : 0)}</text>
          <text x={pL - 4} y={pT + iH + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{minVal.toFixed(minVal < 10 ? 1 : 0)}</text>
          
          <line x1={pL} y1={pT} x2={w - pR} y2={pT} stroke="#f1f5f9" strokeWidth="1" />
          <line x1={pL} y1={pT + iH} x2={w - pR} y2={pT + iH} stroke="#cbd5e1" strokeWidth="1" />
          <line x1={pL} y1={pT} x2={pL} y2={pT + iH} stroke="#cbd5e1" strokeWidth="1" />

          {points.length > 1 && <polyline points={polylineStr} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 drop-shadow-sm" />}
          
          {points.map((p, i) => {
              const isLast = p.index === data.length - 1;
              const showXLabel = data.length <= 6 || p.index % Math.ceil(data.length / 5) === 0 || isLast;
              return (
                  <g key={i}>
                      <circle cx={p.x} cy={p.y} r={isLast ? "4" : "3"} fill={isLast ? color : '#fff'} stroke={color} strokeWidth="2" className={isLast ? "animate-pulse" : ""} />
                      <text x={p.x} y={p.y - 6} fontSize="9" fill={color} textAnchor="middle" fontWeight={isLast ? "bold" : "normal"}>{p.val.toFixed(p.val < 10 ? 1 : 0)}</text>
                      {showXLabel && (
                          <text x={p.x} y={h - 2} fontSize="8" fill="#64748b" textAnchor="middle" transform={data.length > 3 ? `rotate(-15 ${p.x} ${h-2})` : ""}>{p.label.split(' ')[0]}</text>
                      )}
                  </g>
              );
          })}
      </svg>
  );
}

// --- Mini Cumulative Stacked Bar ---
function MiniCumulativeBar({ data }) {
  if (!data || data.length === 0) return <div className="h-12 w-full border-b border-dashed border-slate-200 mt-2"></div>;
  const maxTotal = Math.max(...data.map(d => d.total)) || 1;
  
  return (
      <div className="flex items-end h-full gap-2 w-full pt-8">
          {data.map((d, i) => {
              const innerTotal = d.total || 1;
              const hComp = (d.comp / innerTotal) * 100;
              const hProg = (d.prog / innerTotal) * 100;
              const hNew = (d.new / innerTotal) * 100;
              const hOther = (d.other / innerTotal) * 100;
              const isLast = i === data.length - 1;
              
              return (
                  <div key={i} className={`flex flex-col h-full flex-1 group ${isLast ? 'opacity-100' : 'opacity-70 hover:opacity-100'} transition-all cursor-pointer`}>
                      <div className="relative w-full flex-1">
                          <div className="absolute bottom-0 left-0 w-full flex flex-col-reverse rounded-t-md overflow-hidden bg-slate-100 shadow-sm" style={{ height: `${(d.total/maxTotal)*100}%`, minHeight: '4px' }}>
                              {hComp > 0 && <div style={{ height: `${hComp}%` }} className="bg-emerald-500 w-full hover:brightness-110 transition-all flex items-center justify-center overflow-hidden" title={`เสร็จ: ${d.comp} (${hComp.toFixed(1)}%)`}>
                                  {hComp > 15 && <span className="text-[8px] font-bold text-white/90 scale-75 origin-center">{hComp.toFixed(0)}%</span>}
                              </div>}
                              {hProg > 0 && <div style={{ height: `${hProg}%` }} className="bg-amber-400 w-full hover:brightness-110 transition-all flex items-center justify-center overflow-hidden" title={`กำลังทำ: ${d.prog} (${hProg.toFixed(1)}%)`}>
                                  {hProg > 15 && <span className="text-[8px] font-bold text-amber-900/70 scale-75 origin-center">{hProg.toFixed(0)}%</span>}
                              </div>}
                              {hNew > 0 && <div style={{ height: `${hNew}%` }} className="bg-rose-500 w-full hover:brightness-110 transition-all flex items-center justify-center overflow-hidden" title={`งานใหม่: ${d.new} (${hNew.toFixed(1)}%)`}>
                                  {hNew > 15 && <span className="text-[8px] font-bold text-white/90 scale-75 origin-center">{hNew.toFixed(0)}%</span>}
                              </div>}
                              {hOther > 0 && <div style={{ height: `${hOther}%` }} className="bg-slate-400 w-full hover:brightness-110 transition-all flex items-center justify-center overflow-hidden" title={`อื่นๆ: ${d.other} (${hOther.toFixed(1)}%)`}></div>}
                          </div>
                          
                          {/* Label and Percentage above bar */}
                          <div className="absolute w-full flex flex-col items-center justify-end text-center transition-all group-hover:-translate-y-1" style={{ bottom: `calc(${(d.total/maxTotal)*100}% + 4px)` }}>
                              <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-800 leading-none mb-1">{d.total}</span>
                              {d.total > 0 && (
                                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/60 shadow-sm leading-none whitespace-nowrap" title="อัตรางานที่เสร็จสมบูรณ์ (Completion Rate)">
                                      {Math.round((d.comp/d.total)*100)}%
                                  </span>
                              )}
                          </div>
                      </div>
                      <div className="h-6 mt-1 border-t-2 border-slate-100 pt-1.5 text-[10px] font-bold text-slate-500 text-center truncate w-full group-hover:text-indigo-600 transition-colors group-hover:border-indigo-200">
                          {d.label.split(' ')[0]}
                      </div>
                  </div>
              );
          })}
      </div>
  );
}

// --- Main Application ---
export default function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('ยังไม่มีข้อมูล (กรุณาอัปโหลดไฟล์)');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stdDurations, setStdDurations] = useState(DEFAULT_SLA_MAP);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(null);
  
  // Filters
  const [filterYears, setFilterYears] = useState([]);
  const [filterMonths, setFilterMonths] = useState([]);
  const [filterDays, setFilterDays] = useState([]);
  const [filterAssignees, setFilterAssignees] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 500);
  }, []);

  // Handle File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');
    setFileName(file.name);
    setMounted(false);

    if (!window.XLSX) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error("Failed to load XLSX script", error);
        setErrorMsg("ไม่สามารถโหลดไลบรารีอ่านไฟล์ Excel ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
        setLoading(false);
        return;
      }
    }

    const XLSX = window.XLSX;
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const fileData = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });
        
        const validData = parsedData.filter(row => Object.keys(row).length > 0 && Object.values(row).some(v => String(v).trim() !== ''));

        // Load Standard Durations if available
        const stdSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('standard'));
        let newStdDurMap = { ...stdDurations }; 
        if (stdSheetName) {
            const stdData = XLSX.utils.sheet_to_json(workbook.Sheets[stdSheetName]);
            stdData.forEach(row => {
                const prioKey = Object.keys(row).find(k => k.toLowerCase().includes('priority'));
                const valKey = Object.keys(row).find(k => k.toLowerCase().includes('duration') || k.toLowerCase().includes('std') || k.toLowerCase().includes('day'));
                if (prioKey && valKey && row[prioKey]) {
                    const pVal = String(row[prioKey]).toUpperCase().trim();
                    const dVal = parseFloat(row[valKey]);
                    if (!isNaN(dVal)) newStdDurMap[pVal] = dVal;
                }
            });
            setStdDurations(newStdDurMap);
        }

        if (validData.length > 0) {
          const cleanedData = parsedData.map(row => ({ 
              ...row, 
              REQUEST_DATE: parseDateValue(row.REQUEST_DATE || row['วันที่แจ้ง']),
              APPROVE_REQ_DATE: parseDateValue(row.APPROVE_REQ_DATE || row['วันที่อนุมัติแจ้งซ่อม'] || row.REQUEST_DATE || row['วันที่แจ้ง']),
              ASSIGNED_DATE: parseDateValue(row.ASSIGNED_DATE || row['วันที่จ่ายงาน']),
              DUE_DATE: parseDateValue(row.DUE_DATE || row['วันที่กำหนดเสร็จ']),
              COMPLETION_DATE: parseDateValue(row.COMPLETION_DATE || row['วันที่แล้วเสร็จ']),
              JOB_STATUS: (row.JOB_STATUS || 'UNKNOWN').toUpperCase().trim(),
              PRIORITY: (row.PRIORITY || 'UNKNOWN').toUpperCase().trim(),
          }));
          
          setData(cleanedData);
          setFilterYears([]); setFilterMonths([]); setFilterDays([]); setFilterAssignees([]);
          setShowWelcomeModal(false);
          setUploadSuccessCount(cleanedData.length); 
          setTimeout(() => setMounted(true), 300);
        } else {
          setErrorMsg('ไม่พบข้อมูลในไฟล์ หรือรูปแบบไฟล์ไม่ถูกต้อง');
        }
      } catch (error) {
        console.error("Error reading file:", error);
        setErrorMsg("เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ Excel ค่ะ");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Filtering Options ---
  const { years, months, days, assignees } = useMemo(() => {
    const ySet = new Set(), mSet = new Set(), dSet = new Set(), aSet = new Set();
    data.forEach(item => {
      const dateStr = item.APPROVE_REQ_DATE;
      if (dateStr && dateStr.length >= 10) {
        const parts = dateStr.split('-');
        if (parts.length >= 3) {
          ySet.add(parts[0]); mSet.add(parts[1]); dSet.add(parts[2].substring(0,2)); 
        }
      }
      const assignedToStr = item.ASSIGNED_TO ? String(item.ASSIGNED_TO).trim() : '';
      let names = assignedToStr ? assignedToStr.split(',').map(n => n.trim()).filter(n => n && n !== '-' && n.toUpperCase() !== 'N/A') : [];
      if (names.length === 0) aSet.add('Not Assigned');
      else names.forEach(name => aSet.add(name));
    });
    return { 
      years: Array.from(ySet).sort(), 
      months: Array.from(mSet).sort(), 
      days: Array.from(dSet).sort(),
      assignees: Array.from(aSet).sort((a, b) => a === 'Not Assigned' ? -1 : b === 'Not Assigned' ? 1 : a.localeCompare(b))
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dateStr = item.APPROVE_REQ_DATE || '';
      let matchYear = filterYears.length === 0;
      let matchMonth = filterMonths.length === 0;
      let matchDay = filterDays.length === 0;

      if (dateStr && dateStr.length >= 10) {
          const parts = dateStr.split('-');
          matchYear = filterYears.length === 0 || filterYears.includes(parts[0]);
          matchMonth = filterMonths.length === 0 || filterMonths.includes(parts[1]);
          matchDay = filterDays.length === 0 || filterDays.includes(parts[2].substring(0,2));
      }

      let matchAssignee = true;
      if (filterAssignees.length > 0) {
          const assignedToStr = item.ASSIGNED_TO ? String(item.ASSIGNED_TO).trim() : '';
          let names = assignedToStr ? assignedToStr.split(',').map(n => n.trim()).filter(n => n && n !== '-' && n.toUpperCase() !== 'N/A') : [];
          if (names.length === 0) matchAssignee = filterAssignees.includes('Not Assigned');
          else matchAssignee = names.some(name => filterAssignees.includes(name));
      }

      return matchYear && matchMonth && matchDay && matchAssignee;
    });
  }, [data, filterYears, filterMonths, filterDays, filterAssignees]);

  // --- Executive Snapshot (Cumulative Trends) ---
  const trendStats = useMemo(() => {
     if (filteredData.length === 0) return null;

     let minMonth = '9999-99';
     let hasValidDate = false;
     filteredData.forEach(item => {
         if (item.APPROVE_REQ_DATE) {
             const m = item.APPROVE_REQ_DATE.substring(0, 7);
             if (m < minMonth) minMonth = m;
             hasValidDate = true;
         }
     });
     if (!hasValidDate) {
         const d = new Date();
         minMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
     }

     const monthlyGroups = {};
     filteredData.forEach(item => {
         const mKey = item.APPROVE_REQ_DATE ? item.APPROVE_REQ_DATE.substring(0, 7) : minMonth;
         if (!monthlyGroups[mKey]) monthlyGroups[mKey] = { items: [] };
         monthlyGroups[mKey].items.push(item);
     });

     const sortedMonths = Object.keys(monthlyGroups).sort();
     const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
     const formatM = (k) => {
         const [y, m] = k.split('-');
         return `${monthNames[parseInt(m)-1]} ${y.substring(2)}`;
     };

     const historyData = sortedMonths.map(mKey => {
         const itemsUpToMonth = filteredData.filter(item => {
             const itemMKey = item.APPROVE_REQ_DATE ? item.APPROVE_REQ_DATE.substring(0, 7) : minMonth;
             return itemMKey <= mKey;
         });

         let slaTotal = 0, slaHit = 0, leadTotal = 0, leadCount = 0;
         let accComp = 0, accProg = 0, accNew = 0, accOther = 0;

         itemsUpToMonth.forEach(item => {
             const status = (item.JOB_STATUS || '').toUpperCase().trim();
             
             if (status === 'COMPLETED') accComp++;
             else if (status.includes('NEW')) accNew++;
             else if (status.includes('IN PROGRESS') || status.includes('ASSIGNED')) accProg++;
             else accOther++; 

             if (status === 'COMPLETED') {
                 if (item.COMPLETION_DATE && item.DUE_DATE) {
                     const comp = new Date(item.COMPLETION_DATE);
                     const due = new Date(item.DUE_DATE);
                     if (!isNaN(comp) && !isNaN(due)) {
                         comp.setHours(0,0,0,0); due.setHours(0,0,0,0);
                         slaTotal++;
                         if (comp <= due) slaHit++;
                     }
                 }
                 if (item.APPROVE_REQ_DATE && item.COMPLETION_DATE) {
                     const s = new Date(item.APPROVE_REQ_DATE);
                     const e = new Date(item.COMPLETION_DATE);
                     if (!isNaN(s) && !isNaN(e)) {
                         const d = (e - s) / 86400000;
                         if (d >= 0 && d <= 365) { leadTotal += d; leadCount++; }
                     }
                 }
             }
         });

         return {
             monthKey: mKey, 
             label: formatM(mKey),
             sla: slaTotal > 0 ? (slaHit / slaTotal) * 100 : null,
             lead: leadCount > 0 ? leadTotal / leadCount : null,
             comp: accComp, 
             prog: accProg, 
             new: accNew, 
             other: accOther,
             total: accComp + accProg + accNew + accOther
         };
     });

     const lastMonth = historyData[historyData.length - 1];

     const counts = {};
     filteredData.forEach(d => {
         if((d.JOB_STATUS || '').toUpperCase().trim() === 'COMPLETED' && d.ASSIGNED_TO) {
             const names = d.ASSIGNED_TO.split(',').map(n=>n.trim());
             names.forEach(n => {
                 if(n && n !== '-' && n !== 'N/A') counts[n] = (counts[n] || 0) + 1;
             });
         }
     });
     let topCloser = { name: '-', count: 0 };
     Object.entries(counts).forEach(([n, c]) => { if(c > topCloser.count) topCloser = { name: n, count: c }; });

     return {
         summaryPeriod: sortedMonths.length > 1 ? `${formatM(sortedMonths[0])} - ${formatM(sortedMonths[sortedMonths.length-1])}` : formatM(sortedMonths[0]),
         sla: { val: lastMonth.sla, history: historyData.map(d => ({ label: d.label, val: d.sla })) },
         lead: { val: lastMonth.lead, history: historyData.map(d => ({ label: d.label, val: d.lead })) },
         clear: { incoming: lastMonth.total, completed: lastMonth.comp },
         cumulative: historyData, 
         topCloser
     };
  }, [filteredData]);

  // --- General KPIs ---
  const kpis = useMemo(() => {
    let total = 0, completed = 0, newJobs = 0, inProgress = 0;
    let totalActualDays = 0, jobsWithDays = 0;

    filteredData.forEach(item => {
      total++;
      const status = (item.JOB_STATUS || '').toUpperCase().trim();
      if (status === 'COMPLETED') {
        completed++;
        if (item.APPROVE_REQ_DATE && item.COMPLETION_DATE) {
           const start = new Date(item.APPROVE_REQ_DATE);
           const end = new Date(item.COMPLETION_DATE);
           if (!isNaN(start) && !isNaN(end)) {
               start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
               const diffDays = (end - start) / 86400000;
               if (diffDays >= 0 && diffDays <= 365) {
                 totalActualDays += diffDays;
                 jobsWithDays++;
               }
           }
        }
      } else if (status.includes('NEW')) newJobs++;
      else inProgress++;
    });

    return { total, completed, newJobs, inProgress, avgWorkingDays: jobsWithDays > 0 ? (totalActualDays / jobsWithDays).toFixed(1) : 0 };
  }, [filteredData]);

  const efficiencyData = useMemo(() => {
    let onTimeCount = 0, lateCount = 0, slaTotal = 0;
    let noSlaDataCount = 0; 
    let activeOverdueCount = 0, activeOnTrackCount = 0, activeNoDueCount = 0, activeTotalWithDue = 0;
    
    // New Pipeline Variables
    let totalAssignDays = 0, validAssignCount = 0;
    let totalRepairDays = 0, validRepairCount = 0;
    let totalLeadDays = 0, validLeadCount = 0;
    
    const today = new Date(); today.setHours(0,0,0,0);

    filteredData.forEach(item => {
      const status = (item.JOB_STATUS || '').toUpperCase().trim();

      // Pipeline: Assign Time (Approve -> Assign)
      if (item.APPROVE_REQ_DATE && item.ASSIGNED_DATE) {
          const req = new Date(item.APPROVE_REQ_DATE);
          const ass = new Date(item.ASSIGNED_DATE);
          if (!isNaN(req) && !isNaN(ass)) {
              const diff = (ass - req) / 86400000;
              if (diff >= 0 && diff <= 365) {
                  totalAssignDays += diff;
                  validAssignCount++;
              }
          }
      }

      if (status === 'COMPLETED') {
        // SLA Logic
        if (item.COMPLETION_DATE && item.DUE_DATE) {
          const comp = new Date(item.COMPLETION_DATE);
          const due = new Date(item.DUE_DATE);
          if (!isNaN(comp) && !isNaN(due)) {
            comp.setHours(0,0,0,0); due.setHours(0,0,0,0);
            if (comp <= due) onTimeCount++; else lateCount++;
            slaTotal++;
          } else noSlaDataCount++;
        } else noSlaDataCount++; 

        // Pipeline: Repair Time (Assign -> Complete)
        if (item.ASSIGNED_DATE && item.COMPLETION_DATE) {
            const ass = new Date(item.ASSIGNED_DATE);
            const comp = new Date(item.COMPLETION_DATE);
            if (!isNaN(ass) && !isNaN(comp)) {
                const diff = (comp - ass) / 86400000;
                if (diff >= 0 && diff <= 365) { 
                    totalRepairDays += diff; 
                    validRepairCount++; 
                }
            }
        }

        // Pipeline: Total Lead Time (Approve -> Complete)
        if (item.APPROVE_REQ_DATE && item.COMPLETION_DATE) {
            const req = new Date(item.APPROVE_REQ_DATE);
            const comp = new Date(item.COMPLETION_DATE);
            if (!isNaN(req) && !isNaN(comp)) {
                const diff = (comp - req) / 86400000;
                if (diff >= 0 && diff <= 365) {
                    totalLeadDays += diff;
                    validLeadCount++;
                }
            }
        }
      } else if (!status.includes('CANCEL')) {
         if (item.DUE_DATE) {
             const due = new Date(item.DUE_DATE);
             if (!isNaN(due.getTime())) {
                 due.setHours(0,0,0,0);
                 activeTotalWithDue++;
                 if (due < today) activeOverdueCount++;
                 else activeOnTrackCount++;
             } else activeNoDueCount++;
         } else activeNoDueCount++;
      }
    });

    return {
      onTimeCount, lateCount, slaTotal, noSlaDataCount,
      onTimePct: slaTotal > 0 ? (onTimeCount / slaTotal) * 100 : 0,
      activeOverdueCount, activeOnTrackCount, activeNoDueCount, activeTotalWithDue,
      overduePct: activeTotalWithDue > 0 ? (activeOverdueCount / activeTotalWithDue) * 100 : 0,
      onTrackPct: activeTotalWithDue > 0 ? (activeOnTrackCount / activeTotalWithDue) * 100 : 0,
      avgAssignDays: validAssignCount > 0 ? (totalAssignDays / validAssignCount).toFixed(1) : 0,
      avgRepairDays: validRepairCount > 0 ? (totalRepairDays / validRepairCount).toFixed(1) : 0,
      avgTotalLeadTime: validLeadCount > 0 ? (totalLeadDays / validLeadCount).toFixed(1) : 0
    };
  }, [filteredData]);

  const dynamicPieStatusData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      let status = item.JOB_STATUS ? String(item.JOB_STATUS).toUpperCase().trim() : 'UNKNOWN';
      if (status === '') status = 'UNKNOWN';
      counts[status] = (counts[status] || 0) + 1;
    });
    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
    const sorted = Object.entries(counts).map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 })).sort((a, b) => b.count - a.count);
    const colorMap = { 'COMPLETED': '#10b981', 'NEW': '#f43f5e', 'IN PROGRESS': '#f59e0b', 'ASSIGNED': '#3b82f6', 'PENDING': '#8b5cf6', 'WAITING': '#ec4899', 'CANCELLED': '#94a3b8' };
    const fallbackColors = ['#0ea5e9', '#d946ef', '#14b8a6', '#f97316', '#84cc16', '#6366f1', '#eab308'];
    let fallbackIdx = 0; let accumulatedOffset = 100;
    return {
      total,
      items: sorted.map(item => {
        let color = colorMap[item.name] || colorMap[Object.keys(colorMap).find(k => item.name.includes(k))];
        if (!color) { color = fallbackColors[fallbackIdx % fallbackColors.length]; fallbackIdx++; }
        const offset = accumulatedOffset; accumulatedOffset -= item.pct;
        return { ...item, color, offset };
      })
    };
  }, [filteredData]);

  const deptData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const dept = item.REQUESTER_DEPT || 'Unknown';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredData]);
  const maxDeptCount = deptData.length > 0 ? Math.max(...deptData.map(d => d.count)) : 1;

  const priorityDataStats = useMemo(() => {
    const stats = {
      CRITICAL: { key: 'CRITICAL', label: 'CRITICAL (วิกฤต)', total: 0, uncompleted: 0, completed: 0, totalDays: 0, 
                  styles: { bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-600', ring: 'ring-purple-500/20' } },
      HIGH: { key: 'HIGH', label: 'HIGH (สูง)', total: 0, uncompleted: 0, completed: 0, totalDays: 0, 
              styles: { bg: 'bg-gradient-to-br from-rose-50 to-red-50', border: 'border-rose-200', text: 'text-rose-800', icon: 'text-rose-600', ring: 'ring-rose-500/20' } },
      MEDIUM: { key: 'MEDIUM', label: 'MEDIUM (ปานกลาง)', total: 0, uncompleted: 0, completed: 0, totalDays: 0, 
                styles: { bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-600', ring: 'ring-amber-500/20' } },
      LOW: { key: 'LOW', label: 'LOW (ต่ำ)', total: 0, uncompleted: 0, completed: 0, totalDays: 0, 
             styles: { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600', ring: 'ring-emerald-500/20' } },
      'NOT ASSIGNED': { key: 'NOT ASSIGNED', label: 'NOT ASSIGNED', total: 0, uncompleted: 0, completed: 0, totalDays: 0, 
                     styles: { bg: 'bg-gradient-to-br from-slate-50 to-gray-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-500', ring: 'ring-slate-500/20' } }
    };

    filteredData.forEach(item => {
      let prio = (item.PRIORITY || '').toUpperCase().trim();
      let key = 'NOT ASSIGNED';
      if (prio.includes('CRITICAL')) key = 'CRITICAL';
      else if (prio.includes('HIGH')) key = 'HIGH';
      else if (prio.includes('MEDIUM')) key = 'MEDIUM';
      else if (prio.includes('LOW')) key = 'LOW';

      stats[key].total++;
      const status = (item.JOB_STATUS || '').toUpperCase().trim();
      if (status === 'COMPLETED') {
         stats[key].completed++;
         if (item.APPROVE_REQ_DATE && item.COMPLETION_DATE) {
           const start = new Date(item.APPROVE_REQ_DATE);
           const end = new Date(item.COMPLETION_DATE);
           if (!isNaN(start) && !isNaN(end)) {
               start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
               const diffDays = (end - start) / 86400000;
               if (diffDays >= 0 && diffDays <= 365) stats[key].totalDays += diffDays;
           }
         }
      } else if (!status.includes('CANCEL')) {
         stats[key].uncompleted++;
      }
    });

    const order = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4, 'NOT ASSIGNED': 5 };
    return Object.values(stats).filter(s => s.total > 0).map(s => ({
      ...s, avgDays: s.completed > 0 ? (s.totalDays / s.completed).toFixed(1) : 0
    })).sort((a,b) => order[a.key] - order[b.key]);
  }, [filteredData]);

  const stdComplianceStats = useMemo(() => {
    const stats = {
      CRITICAL: { key: 'CRITICAL', label: 'CRITICAL', stdDays: stdDurations.CRITICAL || 2, total: 0, passed: 0, failed: 0, colors: { text: 'text-purple-700', bg: 'from-purple-500 to-fuchsia-500', border: 'border-purple-100', iconBg: 'bg-purple-100', shadow: 'shadow-purple-200/50' } },
      HIGH: { key: 'HIGH', label: 'HIGH', stdDays: stdDurations.HIGH || 5, total: 0, passed: 0, failed: 0, colors: { text: 'text-rose-700', bg: 'from-rose-500 to-red-500', border: 'border-rose-100', iconBg: 'bg-rose-100', shadow: 'shadow-rose-200/50' } },
      MEDIUM: { key: 'MEDIUM', label: 'MEDIUM', stdDays: stdDurations.MEDIUM || 14, total: 0, passed: 0, failed: 0, colors: { text: 'text-amber-700', bg: 'from-amber-500 to-orange-500', border: 'border-amber-100', iconBg: 'bg-amber-100', shadow: 'shadow-amber-200/50' } },
      LOW: { key: 'LOW', label: 'LOW', stdDays: stdDurations.LOW || 30, total: 0, passed: 0, failed: 0, colors: { text: 'text-emerald-700', bg: 'from-emerald-500 to-teal-500', border: 'border-emerald-100', iconBg: 'bg-emerald-100', shadow: 'shadow-emerald-200/50' } },
      'NOT ASSIGNED': { key: 'NOT ASSIGNED', label: 'NOT ASSIGNED', stdDays: stdDurations['NOT ASSIGNED'] || '-', total: 0, passed: 0, failed: 0, colors: { text: 'text-slate-700', bg: 'from-slate-400 to-gray-500', border: 'border-slate-200', iconBg: 'bg-slate-100', shadow: 'shadow-slate-200/50' } },
    };

    filteredData.forEach(item => {
      if ((item.JOB_STATUS || '').toUpperCase().trim() !== 'COMPLETED') return; 

      let prio = (item.PRIORITY || '').toUpperCase().trim();
      let key = 'NOT ASSIGNED';
      if (prio.includes('CRITICAL')) key = 'CRITICAL';
      else if (prio.includes('HIGH')) key = 'HIGH';
      else if (prio.includes('MEDIUM')) key = 'MEDIUM';
      else if (prio.includes('LOW')) key = 'LOW';

      const reqDate = item.APPROVE_REQ_DATE;
      const compDate = item.COMPLETION_DATE;
      if (reqDate && compDate) {
          const start = new Date(reqDate);
          const end = new Date(compDate);
          if (!isNaN(start) && !isNaN(end)) {
              start.setHours(0,0,0,0); end.setHours(0,0,0,0);
              const diffDays = (end - start) / 86400000;
              if (diffDays >= 0 && diffDays <= 365) {
                  stats[key].total++;
                  const targetDays = isNaN(stats[key].stdDays) ? 30 : stats[key].stdDays;
                  if (diffDays <= targetDays) stats[key].passed++;
                  else stats[key].failed++;
              }
          }
      }
    });

    const order = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4, 'NOT ASSIGNED': 5 };
    return Object.values(stats).filter(s => s.total > 0).map(s => ({
        ...s, passRate: s.total > 0 ? (s.passed / s.total) * 100 : 0
    })).sort((a,b) => order[a.key] - order[b.key]);
  }, [filteredData, stdDurations]);

  const workerCombinedData = useMemo(() => {
    const stats = {};
    let validTotalJobs = 0;

    filteredData.forEach(item => {
      validTotalJobs++;

      let statusCat = 'OTHER';
      const status = (item.JOB_STATUS || '').toUpperCase().trim();
      if (status === 'COMPLETED') statusCat = 'COMPLETED';
      else if (status.includes('NEW')) statusCat = 'NEW';
      else if (status.includes('IN PROGRESS') || status.includes('ASSIGNED')) statusCat = 'IN PROGRESS';

      const assignedTo = item.ASSIGNED_TO ? String(item.ASSIGNED_TO).trim() : '';
      const coAssignedTo = item.CO_ASSIGNED_TO ? String(item.CO_ASSIGNED_TO).trim() : '';

      let mainNames = assignedTo ? assignedTo.split(',').map(n => n.trim()).filter(n => n && n !== '-' && n.toUpperCase() !== 'N/A') : [];
      let coNames = coAssignedTo ? coAssignedTo.split(',').map(n => n.trim()).filter(n => n && n !== '-' && n.toUpperCase() !== 'N/A') : [];
      if (mainNames.length === 0 && coNames.length === 0) mainNames = ["ยังไม่มอบหมาย (Unassigned)"];

      mainNames.forEach(name => {
         if (!stats[name]) stats[name] = { name, main: { NEW: 0, 'IN PROGRESS': 0, OTHER: 0, COMPLETED: 0, total: 0 }, co: { NEW: 0, 'IN PROGRESS': 0, OTHER: 0, COMPLETED: 0, total: 0 }, totalMain: 0, totalCo: 0, grandTotal: 0, activeTotal: 0 };
         stats[name]['main'][statusCat]++; stats[name]['main'].total++; stats[name].totalMain++; stats[name].grandTotal++;
         if (statusCat !== 'COMPLETED') stats[name].activeTotal++;
      });
      coNames.forEach(name => {
         if (!stats[name]) stats[name] = { name, main: { NEW: 0, 'IN PROGRESS': 0, OTHER: 0, COMPLETED: 0, total: 0 }, co: { NEW: 0, 'IN PROGRESS': 0, OTHER: 0, COMPLETED: 0, total: 0 }, totalMain: 0, totalCo: 0, grandTotal: 0, activeTotal: 0 };
         stats[name]['co'][statusCat]++; stats[name]['co'].total++; stats[name].totalCo++; stats[name].grandTotal++;
         if (statusCat !== 'COMPLETED') stats[name].activeTotal++;
      });
    });

    const workers = Object.values(stats);
    const workloadWorkers = [...workers].sort((a, b) => b.grandTotal - a.grandTotal);
    const maxWorkload = workloadWorkers.length > 0 ? workloadWorkers[0].grandTotal : 1;
    workloadWorkers.forEach(w => w.pct = validTotalJobs > 0 ? (w.grandTotal / validTotalJobs) * 100 : 0);

    const tableWorkers = [...workers].sort((a, b) => {
       if (b.activeTotal !== a.activeTotal) return b.activeTotal - a.activeTotal;
       return b.grandTotal - a.grandTotal; 
    });

    return { workloadWorkers, tableWorkers, maxWorkload, validTotalJobs };
  }, [filteredData]);

  const workerPerformanceData = useMemo(() => {
    const stats = {};
    const today = new Date(); today.setHours(0,0,0,0);

    filteredData.forEach(item => {
      const status = (item.JOB_STATUS || '').toUpperCase().trim();
      const dueDateStr = item.DUE_DATE;
      
      let isCancelled = false, isNoDueDate = false, isCompletedOverdue = false, isActiveOverdue = false, isCompletedOnTime = false, isActiveOnTrack = false;
      if (status.includes('CANCEL')) isCancelled = true;
      else if (!dueDateStr) isNoDueDate = true;
      else {
        const due = new Date(dueDateStr);
        if (isNaN(due.getTime())) isNoDueDate = true;
        else {
          due.setHours(0,0,0,0);
          if (status === 'COMPLETED') {
            const compDateStr = item.COMPLETION_DATE;
            if (compDateStr) {
              const comp = new Date(compDateStr);
              if (!isNaN(comp.getTime())) {
                comp.setHours(0,0,0,0);
                if (comp > due) isCompletedOverdue = true;
                else isCompletedOnTime = true;
              } else isNoDueDate = true; 
            } else isNoDueDate = true; 
          } else {
            if (today > due) isActiveOverdue = true;
            else isActiveOnTrack = true;
          }
        }
      }

      const assignedTo = item.ASSIGNED_TO ? String(item.ASSIGNED_TO).trim() : '';
      let names = assignedTo ? assignedTo.split(',').map(n => n.trim()).filter(n => n && n !== '-' && n.toUpperCase() !== 'N/A') : [];
      if (names.length === 0) names = ["ยังไม่มอบหมาย (Unassigned)"];

      names.forEach(name => {
         if (!stats[name]) stats[name] = { name, completedOverdue: 0, activeOverdue: 0, completedOnTime: 0, activeOnTrack: 0, noDueDate: 0, cancelled: 0, totalMeasurable: 0, grandTotal: 0 };
         if (isCompletedOverdue) { stats[name].completedOverdue++; stats[name].totalMeasurable++; }
         else if (isActiveOverdue) { stats[name].activeOverdue++; stats[name].totalMeasurable++; }
         else if (isCompletedOnTime) { stats[name].completedOnTime++; stats[name].totalMeasurable++; }
         else if (isActiveOnTrack) { stats[name].activeOnTrack++; stats[name].totalMeasurable++; }
         else if (isNoDueDate) stats[name].noDueDate++; 
         else if (isCancelled) stats[name].cancelled++; 
         stats[name].grandTotal++;
      });
    });

    const sorted = Object.values(stats).sort((a, b) => {
      const bOverdue = b.activeOverdue + b.completedOverdue;
      const aOverdue = a.activeOverdue + a.completedOverdue;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      return b.grandTotal - a.grandTotal;
    });
    const maxTotal = sorted.length > 0 ? Math.max(...sorted.map(s => s.grandTotal)) : 1;
    return { workers: sorted, maxTotal };
  }, [filteredData]);

  const latestJobs = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const timeA = a.APPROVE_REQ_DATE ? new Date(a.APPROVE_REQ_DATE).getTime() : 0;
      const timeB = b.APPROVE_REQ_DATE ? new Date(b.APPROVE_REQ_DATE).getTime() : 0;
      return timeB - timeA; 
    }).slice(0, 10);
  }, [filteredData]);

  const newJobsList = useMemo(() => {
    return [...filteredData].filter(item => (item.JOB_STATUS || '').toUpperCase().trim().includes('NEW'))
    .sort((a, b) => {
      const timeA = a.APPROVE_REQ_DATE ? new Date(a.APPROVE_REQ_DATE).getTime() : 0;
      const timeB = b.APPROVE_REQ_DATE ? new Date(b.APPROVE_REQ_DATE).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredData]);

  const inProgressJobsList = useMemo(() => {
    return [...filteredData].filter(item => {
      const status = (item.JOB_STATUS || '').toUpperCase().trim();
      return !status.includes('NEW') && !status.includes('COMPLETED') && !status.includes('CANCEL');
    }).sort((a, b) => {
      const timeA = a.APPROVE_REQ_DATE ? new Date(a.APPROVE_REQ_DATE).getTime() : 0;
      const timeB = b.APPROVE_REQ_DATE ? new Date(b.APPROVE_REQ_DATE).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredData]);

  const jobTypePieData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      let val = item.JOB_TYPE ? String(item.JOB_TYPE).toUpperCase().trim() : '';
      if (val === '') val = 'ไม่ระบุ (Unspecified)';
      counts[val] = (counts[val] || 0) + 1;
    });
    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
    const sorted = Object.entries(counts).map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 })).sort((a, b) => b.count - a.count);
    const colors = ['#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b', '#f43f5e', '#94a3b8'];
    let offset = 100;
    return {
      total,
      items: sorted.map((item, idx) => {
        const color = item.name === 'ไม่ระบุ (Unspecified)' ? '#cbd5e1' : colors[idx % colors.length];
        const currOffset = offset;
        offset -= item.pct;
        return { ...item, color, offset: currOffset };
      })
    };
  }, [filteredData]);

  const repairSourcePieData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      let val = item.REPAIR_SOURCE ? String(item.REPAIR_SOURCE).toUpperCase().trim() : '';
      if (val === '') val = 'ไม่ระบุ (Unspecified)';
      counts[val] = (counts[val] || 0) + 1;
    });
    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
    const sorted = Object.entries(counts).map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 })).sort((a, b) => b.count - a.count);
    const colors = { 'INTERNAL': '#3b82f6', 'EXTERNAL': '#f97316', 'ไม่ระบุ (Unspecified)': '#cbd5e1' };
    let offset = 100;
    return {
      total,
      items: sorted.map((item, idx) => {
        const color = colors[item.name] || '#10b981';
        const currOffset = offset;
        offset -= item.pct;
        return { ...item, color, offset: currOffset };
      })
    };
  }, [filteredData]);

  return (
    <div className="min-h-screen relative pb-12 bg-slate-50 font-sans" style={{ backgroundImage: 'radial-gradient(at 0% 0%, hsla(253,16%,7%,0.03) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,0.03) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,0.03) 0, transparent 50%)', backgroundAttachment: 'fixed' }}>
      
      {/* --- Modal Dialogs --- */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeInUp_0.4s_ease-out]">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-indigo-50">
              <Wrench size={44} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">ยินดีต้อนรับสู่ VITA Factory - Maintenance Dashboard</h2>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">
              กรุณาอัปโหลดไฟล์ Excel <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">"Maintenance Job"</span> ที่ Update ข้อมูลล่าสุดกับ Sharepoint List แล้ว
            </p>
            <div className="relative">
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" id="initial-upload" onChange={(e) => { handleFileUpload(e); setShowWelcomeModal(false); }} />
              <label htmlFor="initial-upload" className="block w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer">
                 เริ่มต้นอัปโหลดไฟล์
              </label>
            </div>
          </div>
        </div>
      )}

      {uploadSuccessCount !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-[fadeInUp_0.4s_ease-out]">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50">
              <CheckCircle size={44} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">อัปโหลดสำเร็จ!</h2>
            <p className="text-slate-600 mb-6 leading-relaxed font-medium">พบข้อมูลงานซ่อมบำรุงที่สมบูรณ์</p>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-8 drop-shadow-sm">{uploadSuccessCount} <span className="text-xl font-bold text-slate-400">รายการ</span></div>
            <button onClick={() => setUploadSuccessCount(null)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:scale-95">
              เริ่มแสดงผลแดชบอร์ด
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-10 pt-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
              <Activity size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">Maintenance Analytics</h1>
              <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ไฟล์ปัจจุบัน: <span className="font-bold text-indigo-600">{fileName}</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <label className={`cursor-pointer ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20'} text-white px-6 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex-1 md:flex-none justify-center`}>
              <Upload size={20} />
              {loading ? 'กำลังโหลด...' : 'อัปโหลดข้อมูล (Excel)'}
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
          </div>
        </div>
        
        {errorMsg && (
          <div className="mt-4 p-4 bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border-l-4 border-l-rose-500 text-rose-700 rounded-2xl flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0 text-rose-500" />
            <span className="font-semibold text-sm">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="ml-auto font-black text-slate-400 hover:text-rose-700 text-xl">×</button>
          </div>
        )}
      </div>

      {data.length > 0 && (
      <div className="max-w-7xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8">
          
        {/* Slicers */}
        <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 items-center relative z-50">
          <div className="flex items-center gap-3 text-indigo-900 font-black whitespace-nowrap bg-indigo-50/50 px-4 py-2 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span>กรองข้อมูล (วันที่แผนกอนุมัติแจ้งซ่อม)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
            <MultiSelectDropdown label="ผู้รับผิดชอบ (Assignee)" options={assignees} selected={filterAssignees} onChange={setFilterAssignees} />
            <MultiSelectDropdown label="ปี (Year)" options={years} selected={filterYears} onChange={setFilterYears} />
            <MultiSelectDropdown label="เดือน (Month)" options={months} selected={filterMonths} onChange={setFilterMonths} formatOption={(m) => `เดือน ${m}`} />
            <MultiSelectDropdown label="วันที่ (Day)" options={days} selected={filterDays} onChange={setFilterDays} formatOption={(d) => `วันที่ ${d}`} />
          </div>
        </div>

        {/* ================= SECTION 1: EXECUTIVE SNAPSHOT ================= */}
        {trendStats && (
        <section>
          <div className="relative inline-flex items-center gap-3 mb-6 pl-4">
             <div className="absolute left-0 top-[10%] h-[80%] w-1 rounded bg-gradient-to-b from-amber-500 to-red-500"></div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <Sparkles className="text-amber-500" size={28} /> สรุปภาพรวม (Filtered Snapshot)
             </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-6 pl-10">แสดงเทรนด์ข้อมูลและผลรวมในช่วงเวลา <span className="font-bold text-indigo-600">[{trendStats.summaryPeriod}]</span> ที่คุณเลือก</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* 1. SLA Trend */}
             <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] p-5 rounded-3xl relative overflow-hidden group flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex justify-between items-start mb-2">
                     <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Target size={24} /></div>
                     <span className="text-2xl font-black text-slate-800">{trendStats.sla.val !== null ? trendStats.sla.val.toFixed(0) : '-'} <span className="text-sm text-slate-400">%</span></span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">ส่งมอบตรงเวลา (SLA) รวม</h4>
                </div>
                <div className="flex-1 w-full mt-4 h-[140px]">
                   <TrendChart data={trendStats.sla.history} color="#10b981" />
                </div>
             </div>

             {/* 2. Lead Time Trend */}
             <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] p-5 rounded-3xl relative overflow-hidden group flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex justify-between items-start mb-2">
                     <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Timer size={24} /></div>
                     <span className="text-2xl font-black text-slate-800">{trendStats.lead.val !== null ? trendStats.lead.val.toFixed(1) : '-'} <span className="text-sm text-slate-400">วัน</span></span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">เวลาซ่อมเฉลี่ยรวม</h4>
                </div>
                <div className="flex-1 w-full mt-4 h-[140px]">
                   <TrendChart data={trendStats.lead.history} color="#3b82f6" />
                </div>
             </div>

             {/* 3. Cumulative Bar Chart */}
             <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] p-5 rounded-3xl relative overflow-hidden group flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex justify-between items-start mb-1">
                     <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><BarChart3 size={24} /></div>
                     <span className="text-2xl font-black text-slate-800">{trendStats.clear?.incoming || 0} <span className="text-sm text-slate-400">งานสะสม</span></span>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">ปริมาณงานค้างและสะสาง (ยอดสะสม)</h4>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400 mt-2">
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div>เสร็จ ({trendStats.clear?.completed || 0})</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-400"></div>กำลังทำ</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-rose-500"></div>งานใหม่</span>
                  </div>
                </div>
                <div className="flex-1 w-full mt-2 h-[140px] flex items-end">
                   <MiniCumulativeBar data={trendStats.cumulative} />
                </div>
             </div>

             {/* 4. Top Closer */}
             <div className="bg-gradient-to-br from-indigo-900 to-slate-900 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-6 rounded-3xl relative overflow-hidden group flex flex-col justify-center min-h-[260px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="p-3 bg-white/10 text-amber-400 rounded-xl backdrop-blur-sm border border-white/10"><Trophy size={24} /></div>
                   <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20 uppercase tracking-widest">Top Closer</div>
                </div>
                <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1 relative z-10">ผู้ปิดงานได้มากที่สุด</h4>
                <div className="text-[10px] font-medium text-slate-400 mb-2 relative z-10">จากช่วงเวลาที่กรองทั้งหมด</div>
                <div className="flex flex-col gap-1 relative z-10 mt-2">
                   <span className="text-2xl font-black text-white truncate" title={trendStats.topCloser?.name || '-'}>{trendStats.topCloser?.name || '-'}</span>
                   <span className="text-sm font-bold text-emerald-400">{trendStats.topCloser?.count || 0} งานที่ปิดจบได้</span>
                </div>
             </div>
          </div>
        </section>
        )}

        {/* Main KPIs (Filtered) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'งานในระบบทั้งหมด', val: kpis.total, unit: 'รายการ', icon: FileText, color: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/20' },
            { label: 'ดำเนินการเสร็จสิ้น', val: kpis.completed, unit: 'รายการ', icon: CheckCircle, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/20' },
            { label: 'งานแจ้งใหม่', val: kpis.newJobs, unit: 'รายการ', icon: AlertTriangle, color: 'from-rose-400 to-red-500', shadow: 'shadow-rose-500/20' },
            { label: 'เวลาเฉลี่ยต่อชิ้นงาน', val: kpis.avgWorkingDays, unit: 'วัน', icon: Clock, color: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/20' }
          ].map((kpi, i) => {
            const IconComponent = kpi.icon;
            return (
            <div key={i} className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl cursor-default">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.color} opacity-10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
              <div className="flex items-center gap-5 relative z-10">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${kpi.color} text-white shadow-lg ${kpi.shadow}`}>
                  <IconComponent size={28} />
                </div>
                <div className="flex flex-col">
                  <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{kpi.val}</h3>
                    <span className="text-sm font-bold text-slate-400">{kpi.unit}</span>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* ================= SECTION 2: SLA & TIME PERFORMANCE ================= */}
        <section>
          <div className="relative inline-flex items-center gap-3 mb-6 pl-4 mt-6">
             <div className="absolute left-0 top-[10%] h-[80%] w-1 rounded bg-gradient-to-b from-blue-500 to-purple-500"></div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <Timer className="text-indigo-600" size={28} /> ประสิทธิภาพและมาตรฐานเวลา (SLA & Lead Time)
             </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SLA Card */}
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 flex flex-col items-center justify-center relative">
              <div className="flex w-full items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={22} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">อัตราการส่งมอบตรงเวลา (SLA)</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">เทียบเฉพาะงาน <span className="font-bold text-emerald-600">COMPLETED</span></p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-10 w-full justify-center">
                <div className="relative w-44 h-44">
                  {efficiencyData.slaTotal > 0 ? (
                    <>
                      <svg viewBox="0 0 42 42" className="w-full h-full drop-shadow-md -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                        {efficiencyData.onTimePct > 0 && (
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="url(#emeraldGrad)" strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${mounted ? efficiencyData.onTimePct : 0} 100`} strokeDashoffset={100} className="transition-all duration-1000 ease-out">
                          </circle>
                        )}
                        {efficiencyData.onTimePct < 100 && efficiencyData.slaTotal > 0 && (
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${mounted ? 100 - efficiencyData.onTimePct : 0} 100`} strokeDashoffset={100 - efficiencyData.onTimePct} className="transition-all duration-1000 ease-out">
                          </circle>
                        )}
                        <defs>
                          <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full pointer-events-none">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{efficiencyData.onTimePct.toFixed(0)}<span className="text-xl">%</span></span>
                        <span className="text-xs font-bold text-slate-400 mt-1 uppercase">ตรงเวลา</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400 bg-slate-50 rounded-full border-2 border-dashed border-slate-200">ไม่มีข้อมูล</div>
                  )}
                </div>

                <div className="flex flex-col gap-5 w-full sm:w-auto">
                  <div className="bg-white/60 backdrop-blur border border-emerald-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">เสร็จทันเวลา</p>
                      <p className="text-2xl font-black text-slate-800">{efficiencyData.onTimeCount} <span className="text-xs font-bold text-slate-400">งาน</span></p>
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur border border-amber-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                      <Timer size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">เสร็จล่าช้า</p>
                      <p className="text-2xl font-black text-slate-800">{efficiencyData.lateCount} <span className="text-xs font-bold text-slate-400">งาน</span></p>
                    </div>
                  </div>
                </div>
              </div>
              {efficiencyData.noSlaDataCount > 0 && <p className="text-[10px] font-medium text-slate-400 mt-6 text-center">* มีงานอีก {efficiencyData.noSlaDataCount} รายการ ที่ถูกตัดออกเนื่องจากขาดข้อมูลวันที่</p>}
            </div>

            {/* Overdue Card */}
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 flex flex-col items-center justify-center relative">
              <div className="flex w-full items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={22} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">สถานะงานค้าง (Active Overdue)</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">วัดเฉพาะงานที่ <span className="font-bold text-rose-500">ยังไม่เสร็จ</span> เทียบกับวันนี้</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-10 w-full justify-center">
                <div className="relative w-44 h-44">
                  {efficiencyData.activeTotalWithDue > 0 ? (
                    <>
                      <svg viewBox="0 0 42 42" className="w-full h-full drop-shadow-md -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                        {efficiencyData.overduePct > 0 && (
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="url(#roseGrad)" strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${mounted ? efficiencyData.overduePct : 0} 100`} strokeDashoffset={100} className="transition-all duration-1000 ease-out">
                          </circle>
                        )}
                        {efficiencyData.onTrackPct > 0 && (
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${mounted ? efficiencyData.onTrackPct : 0} 100`} strokeDashoffset={100 - (mounted ? efficiencyData.overduePct : 0)} className="transition-all duration-1000 ease-out">
                          </circle>
                        )}
                        <defs>
                          <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#e11d48" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full pointer-events-none">
                        <span className="text-4xl font-black text-rose-600 tracking-tighter">{efficiencyData.activeOverdueCount}</span>
                        <span className="text-xs font-bold text-slate-400 mt-1 uppercase">เกินกำหนด</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400 bg-slate-50 rounded-full border-2 border-dashed border-slate-200">ไม่มีข้อมูล</div>
                  )}
                </div>

                <div className="flex flex-col gap-5 w-full sm:w-auto">
                  <div className="bg-white/60 backdrop-blur border border-rose-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">เกินกำหนด</p>
                      <p className="text-2xl font-black text-slate-800">{efficiencyData.activeOverdueCount} <span className="text-xs font-bold text-slate-400">งาน</span></p>
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur border border-blue-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Activity size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">อยู่ในกำหนด</p>
                      <p className="text-2xl font-black text-slate-800">{efficiencyData.activeOnTrackCount} <span className="text-xs font-bold text-slate-400">งาน</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Time Pipeline */}
          <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 mt-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white shadow-lg shadow-indigo-200"><Activity size={24} /></div>
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-slate-800">ไทม์ไลน์ระยะเวลา (Lead Time Pipeline)</h3>
                <p className="text-sm font-medium text-slate-500">เส้นทางเฉลี่ยจากวันที่แผนกอนุมัติ จนถึง งานแล้วเสร็จ</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-8 relative max-w-5xl mx-auto px-4 pb-6">
              <div className="absolute top-8 left-10 right-10 h-2 bg-slate-100 rounded-full z-0 overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-blue-400 via-amber-400 to-emerald-400 w-full opacity-60"></div>
              </div>

              <div className="flex justify-between relative z-10">
                <div className="flex flex-col items-center w-32 group">
                  <div className="w-16 h-16 bg-white border-4 border-blue-500 rounded-2xl flex items-center justify-center text-blue-500 mb-3 shadow-xl group-hover:-translate-y-2 transition-transform duration-300">
                    <Calendar size={28} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">อนุมัติงาน</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">APPROVED</span>
                </div>

                <div className="flex flex-col items-center justify-start pt-3 flex-1 relative">
                  <div className="bg-white px-4 py-2 rounded-xl text-sm font-black text-slate-700 border border-slate-200 shadow-md transform -translate-y-2 z-20">
                    {efficiencyData.avgAssignDays} <span className="text-[11px] font-semibold text-slate-400">วัน</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-2 text-center">รอมอบหมาย<br/>(Pending)</span>
                </div>

                <div className="flex flex-col items-center w-32 group">
                  <div className="w-16 h-16 bg-white border-4 border-amber-500 rounded-2xl flex items-center justify-center text-amber-500 mb-3 shadow-xl group-hover:-translate-y-2 transition-transform duration-300">
                    <Wrench size={28} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">ลงมือซ่อม</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">ASSIGNED</span>
                </div>

                <div className="flex flex-col items-center justify-start pt-3 flex-1 relative">
                  <div className="bg-white px-4 py-2 rounded-xl text-sm font-black text-slate-700 border border-slate-200 shadow-md transform -translate-y-2 z-20">
                    {efficiencyData.avgRepairDays} <span className="text-[11px] font-semibold text-slate-400">วัน</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-2 text-center">ใช้เวลาทำจริง<br/>(Repairing)</span>
                </div>

                <div className="flex flex-col items-center w-32 group">
                  <div className="w-16 h-16 bg-white border-4 border-emerald-500 rounded-2xl flex items-center justify-center text-emerald-500 mb-3 shadow-xl group-hover:-translate-y-2 transition-transform duration-300">
                    <CheckCircle size={28} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">เสร็จสิ้น</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">COMPLETED</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-6 border-t border-slate-200/60 flex justify-center items-center">
              <div className="bg-indigo-50/80 px-6 py-3 rounded-2xl flex items-center gap-4 border border-indigo-100 shadow-inner">
                <span className="text-sm font-bold text-indigo-900 tracking-wide uppercase">Lead Time (รวมเฉลี่ย) :</span>
                <span className="text-3xl font-black text-indigo-600">{efficiencyData.avgTotalLeadTime} <span className="text-sm font-bold text-indigo-400">วัน / งาน</span></span>
              </div>
            </div>
          </div>

          {/* Priority & Compliance Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl"><AlertTriangle size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">ปริมาณงานตามความเร่งด่วน (Priority)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {priorityDataStats.map((p, idx) => (
                  <div key={idx} className={`border ${p.styles.border} ${p.styles.bg} p-5 rounded-2xl flex flex-col relative overflow-hidden group`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 ${p.styles.bg} opacity-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`font-black ${p.styles.text} text-sm`}>{p.label}</span>
                        <span className={`bg-white px-2.5 py-1 rounded-lg text-sm font-black ${p.styles.text} shadow-sm ring-1 ${p.styles.ring}`}>{p.total}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-white/60">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ยังไม่เสร็จ</p>
                          <p className="font-black text-rose-500 text-xl">{p.uncompleted}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ซ่อมเฉลี่ย</p>
                          <p className="font-black text-emerald-600 text-xl">{p.avgDays}<span className="text-xs ml-1 font-semibold text-emerald-600/50">d</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {priorityDataStats.length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 font-medium">ไม่พบข้อมูล Priority</div>}
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl"><ShieldCheck size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">มาตรฐานเวลาซ่อม (Standard Compliance)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stdComplianceStats.map((stat, idx) => (
                  <div key={idx} className={`border ${stat.colors.border} rounded-2xl p-5 flex flex-col bg-white shadow-sm hover:shadow-md transition-all group`}>
                     <div className="flex justify-between items-start mb-4">
                       <div>
                          <span className={`font-black ${stat.colors.text} text-sm`}>{stat.label}</span>
                          <div className="text-xs font-semibold text-slate-500 mt-1 bg-slate-50 px-2 py-0.5 rounded-md inline-block">เกณฑ์: {stat.stdDays} วัน</div>
                       </div>
                       <div className="text-right">
                          <span className={`text-4xl font-black ${stat.colors.text} leading-none tracking-tighter`}>{stat.passRate.toFixed(0)}<span className="text-lg font-bold opacity-50">%</span></span>
                       </div>
                     </div>
                     
                     <div className="w-full bg-slate-100 rounded-full h-3 mb-4 mt-auto shadow-inner overflow-hidden">
                       <div className={`bg-gradient-to-r ${stat.colors.bg} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: mounted ? `${stat.passRate}%` : '0%' }}></div>
                     </div>

                     <div className="flex justify-between text-[11px] font-bold bg-slate-50/80 border border-slate-100 px-3 py-2.5 rounded-xl">
                       <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle size={14} /> ผ่าน: {stat.passed}</span>
                       <span className="text-rose-500 flex items-center gap-1.5"><AlertTriangle size={14} /> เกิน: {stat.failed}</span>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 3: JOB DISTRIBUTION ================= */}
        <section>
          <div className="relative inline-flex items-center gap-3 mb-6 pl-4 mt-6">
             <div className="absolute left-0 top-[10%] h-[80%] w-1 rounded bg-gradient-to-b from-emerald-500 to-blue-500"></div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <PieChart className="text-blue-500" size={28} /> สัดส่วนและประเภทงาน (Job Distribution)
             </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"><BarChart3 size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">Top 5 แผนกแจ้งซ่อม</h3>
              </div>
              <div className="space-y-5">
                {deptData.length > 0 ? deptData.map((dept, index) => (
                  <div key={index} className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-slate-700">{dept.name}</span>
                      <span className="font-black text-blue-600">{dept.count} <span className="text-xs font-semibold text-slate-400">งาน</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                      <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${(dept.count / maxDeptCount) * 100}%` : '0%' }}></div>
                    </div>
                  </div>
                )) : <div className="text-center py-8 text-slate-400 font-medium">ไม่พบข้อมูล</div>}
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl"><PieChart size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">สัดส่วนสถานะงานซ่อม</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                {dynamicPieStatusData.total > 0 ? (
                  <>
                    <div className="relative w-48 h-48 flex-shrink-0 transform hover:scale-105 transition-transform duration-500">
                      <svg viewBox="0 0 42 42" className="w-full h-full drop-shadow-xl -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="5"></circle>
                        {dynamicPieStatusData.items.map((item, idx) => (
                          item.pct > 0 && (
                            <circle key={idx} cx="21" cy="21" r="15.915" fill="transparent" stroke={item.color} strokeWidth="5" strokeLinecap="round"
                              strokeDasharray={`${mounted ? item.pct : 0} 100`} strokeDashoffset={item.offset} className="transition-all duration-1000 ease-out hover:stroke-[6px] cursor-pointer">
                              <title>{item.name}: {item.count} งาน ({item.pct.toFixed(1)}%)</title>
                            </circle>
                          )
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full pointer-events-none bg-white/20 backdrop-blur-[2px] m-4">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{dynamicPieStatusData.total}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ทั้งหมด</span>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex-1 grid grid-cols-1 gap-2.5 max-h-[240px] overflow-y-auto pr-2">
                      {dynamicPieStatusData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-default group">
                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs font-bold text-slate-700 truncate" title={item.name}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[11px] text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded-md">{item.count} งาน</span>
                            <span className="text-sm font-black text-slate-800 w-12 text-right">{item.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="text-center text-slate-400 w-full py-8 font-medium">ไม่พบข้อมูล</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Job Type Pie */}
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><PieChart size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">สัดส่วนงานตามประเภท (JOB_TYPE)</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                {jobTypePieData.total > 0 ? (
                  <>
                    <div className="relative w-48 h-48 flex-shrink-0 transform hover:scale-105 transition-transform duration-500">
                      <svg viewBox="0 0 42 42" className="w-full h-full drop-shadow-xl -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="5"></circle>
                        {jobTypePieData.items.map((item, idx) => (
                          item.pct > 0 && (
                            <circle key={idx} cx="21" cy="21" r="15.915" fill="transparent" stroke={item.color} strokeWidth="5" strokeLinecap="round"
                              strokeDasharray={`${mounted ? item.pct : 0} 100`} strokeDashoffset={item.offset} className="transition-all duration-1000 ease-out hover:stroke-[6px] cursor-pointer">
                              <title>{item.name}: {item.count} งาน ({item.pct.toFixed(1)}%)</title>
                            </circle>
                          )
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full pointer-events-none bg-white/20 backdrop-blur-[2px] m-4">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{jobTypePieData.total}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ทั้งหมด</span>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex-1 grid grid-cols-1 gap-2.5 max-h-[240px] overflow-y-auto pr-2">
                      {jobTypePieData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-default group">
                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs font-bold text-slate-700 truncate" title={item.name}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[11px] text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded-md">{item.count} งาน</span>
                            <span className="text-sm font-black text-slate-800 w-12 text-right">{item.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="text-center text-slate-400 w-full py-8 font-medium">ไม่พบข้อมูล</div>}
              </div>
            </div>

            {/* Repair Source Pie */}
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl"><PieChart size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">สัดส่วนตามแหล่งซ่อม (REPAIR_SOURCE)</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                {repairSourcePieData.total > 0 ? (
                  <>
                    <div className="relative w-48 h-48 flex-shrink-0 transform hover:scale-105 transition-transform duration-500">
                      <svg viewBox="0 0 42 42" className="w-full h-full drop-shadow-xl -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="5"></circle>
                        {repairSourcePieData.items.map((item, idx) => (
                          item.pct > 0 && (
                            <circle key={idx} cx="21" cy="21" r="15.915" fill="transparent" stroke={item.color} strokeWidth="5" strokeLinecap="round"
                              strokeDasharray={`${mounted ? item.pct : 0} 100`} strokeDashoffset={item.offset} className="transition-all duration-1000 ease-out hover:stroke-[6px] cursor-pointer">
                              <title>{item.name}: {item.count} งาน ({item.pct.toFixed(1)}%)</title>
                            </circle>
                          )
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full pointer-events-none bg-white/20 backdrop-blur-[2px] m-4">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{repairSourcePieData.total}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ทั้งหมด</span>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex-1 grid grid-cols-1 gap-2.5 max-h-[240px] overflow-y-auto pr-2">
                      {repairSourcePieData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-default group">
                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-inner" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs font-bold text-slate-700 truncate" title={item.name}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[11px] text-slate-500 font-semibold bg-slate-50 px-2 py-1 rounded-md">{item.count} งาน</span>
                            <span className="text-sm font-black text-slate-800 w-12 text-right">{item.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="text-center text-slate-400 w-full py-8 font-medium">ไม่พบข้อมูล</div>}
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 4: TEAM WORKLOAD & PERFORMANCE ================= */}
        <section>
          <div className="relative inline-flex items-center gap-3 mb-6 pl-4 mt-6">
             <div className="absolute left-0 top-[10%] h-[80%] w-1 rounded bg-gradient-to-b from-purple-500 to-pink-500"></div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <Users className="text-purple-600" size={28} /> การวิเคราะห์การทำงานของทีม (Team Analytics)
             </h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Workload Distribution */}
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><Activity size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">ภาระงานรวม (Workload)</h3>
              </div>

              <div className="overflow-y-auto max-h-[400px] pr-3 space-y-3">
                {workerCombinedData.workloadWorkers.length > 0 ? workerCombinedData.workloadWorkers.map((worker, idx) => {
                  const isUnassigned = worker.name === "ยังไม่มอบหมาย (Unassigned)";
                  const avatarClass = isUnassigned ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-gradient-to-br from-purple-100 to-fuchsia-100 text-purple-700 border-purple-200";
                  return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-300 hover:shadow-md transition-all">
                    <div className="w-full sm:w-1/3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner ${avatarClass}`}>
                        {isUnassigned ? "??" : worker.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700 truncate text-sm" title={worker.name}>{worker.name}</span>
                    </div>
                    
                    <div className="w-full sm:w-1/2 flex flex-col justify-center">
                      <div className="flex justify-between text-[11px] font-bold mb-2">
                        <div className="flex gap-3">
                          <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded">หลัก: {worker.totalMain}</span>
                          <span className="text-sky-500 bg-sky-50 px-1.5 rounded">ช่วย: {worker.totalCo}</span>
                        </div>
                        <span className="text-slate-700">{worker.grandTotal} งาน</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${(worker.totalMain / workerCombinedData.maxWorkload) * 100}%` : '0%' }} title={`หลัก: ${worker.totalMain}`}></div>
                        <div className="bg-gradient-to-r from-sky-400 to-sky-500 h-full transition-all duration-1000 ease-out border-l border-white/20" style={{ width: mounted ? `${(worker.totalCo / workerCombinedData.maxWorkload) * 100}%` : '0%' }} title={`ช่วย: ${worker.totalCo}`}></div>
                      </div>
                    </div>
                    <div className="w-full sm:w-1/6 flex justify-end">
                      <span className="text-sm font-black text-slate-800">{worker.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  )
                }) : <div className="text-center py-8 text-slate-400">ไม่พบข้อมูล</div>}
              </div>
            </div>

            {/* Task Performance */}
            <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">ประสิทธิภาพการส่งงาน (Performance)</h3>
              </div>

              <div className="overflow-y-auto max-h-[400px] pr-3 space-y-3">
                {workerPerformanceData.workers.length > 0 ? workerPerformanceData.workers.map((worker, idx) => {
                  const isUnassigned = worker.name === "ยังไม่มอบหมาย (Unassigned)";
                  const avatarClass = isUnassigned ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 border-indigo-200";
                  return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all">
                    <div className="w-full sm:w-1/3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-inner ${avatarClass}`}>
                        {isUnassigned ? "??" : worker.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700 truncate text-sm" title={worker.name}>{worker.name}</span>
                    </div>
                    
                    <div className="w-full sm:w-1/2 flex flex-col justify-center">
                      <div className="flex justify-between text-[11px] font-bold mb-2">
                         <div className="flex gap-1.5 flex-wrap">
                            {worker.completedOnTime > 0 && <span className="text-emerald-700 bg-emerald-50 px-1 rounded">เสร็จทัน:{worker.completedOnTime}</span>}
                            {worker.activeOnTrack > 0 && <span className="text-blue-700 bg-blue-50 px-1 rounded">ในกำหนด:{worker.activeOnTrack}</span>}
                            {worker.completedOverdue > 0 && <span className="text-amber-700 bg-amber-50 px-1 rounded">เสร็จช้า:{worker.completedOverdue}</span>}
                            {worker.activeOverdue > 0 && <span className="text-rose-700 bg-rose-50 px-1 rounded">เกินกำหนด:{worker.activeOverdue}</span>}
                         </div>
                         <span className="text-slate-700 whitespace-nowrap ml-2">{worker.grandTotal}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden shadow-inner">
                        {worker.completedOnTime > 0 && <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${(worker.completedOnTime / workerPerformanceData.maxTotal) * 100}%` : '0%' }}></div>}
                        {worker.activeOnTrack > 0 && <div className="bg-blue-400 h-full transition-all duration-1000 ease-out border-l border-white/20" style={{ width: mounted ? `${(worker.activeOnTrack / workerPerformanceData.maxTotal) * 100}%` : '0%' }}></div>}
                        {worker.completedOverdue > 0 && <div className="bg-amber-400 h-full transition-all duration-1000 ease-out border-l border-white/20" style={{ width: mounted ? `${(worker.completedOverdue / workerPerformanceData.maxTotal) * 100}%` : '0%' }}></div>}
                        {worker.activeOverdue > 0 && <div className="bg-rose-500 h-full transition-all duration-1000 ease-out border-l border-white/20" style={{ width: mounted ? `${(worker.activeOverdue / workerPerformanceData.maxTotal) * 100}%` : '0%' }}></div>}
                        {worker.noDueDate > 0 && <div className="bg-slate-300 h-full transition-all duration-1000 ease-out border-l border-white/20" style={{ width: mounted ? `${(worker.noDueDate / workerPerformanceData.maxTotal) * 100}%` : '0%' }}></div>}
                        {worker.cancelled > 0 && <div className="bg-slate-200 h-full transition-all duration-1000 ease-out border-l border-white/20" style={{ width: mounted ? `${(worker.cancelled / workerPerformanceData.maxTotal) * 100}%` : '0%' }}></div>}
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-1/6 flex justify-end">
                      {(() => {
                        if (worker.totalMeasurable === 0) return <span className="text-slate-400 font-bold text-sm">N/A</span>;
                        const sr = ((worker.completedOnTime + worker.activeOnTrack) / worker.totalMeasurable) * 100;
                        let color = 'text-emerald-600';
                        if (sr < 80) color = 'text-amber-500';
                        if (sr < 50) color = 'text-rose-600';
                        return <span className={`text-xl font-black ${color}`}>{sr.toFixed(0)}<span className="text-[10px] font-bold">%</span></span>;
                      })()}
                    </div>
                  </div>
                  )
                }) : <div className="text-center py-8 text-slate-400">ไม่พบข้อมูล</div>}
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><FileText size={20} /></div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-800">รายละเอียดงานรายบุคคล (Detailed Status)</h3>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">ชื่อพนักงาน</th>
                    <th className="p-4 font-bold border-r border-slate-200">บทบาท</th>
                    <th className="p-4 font-bold text-center text-rose-600">NEW</th>
                    <th className="p-4 font-bold text-center text-amber-600">IN PROGRESS</th>
                    <th className="p-4 font-bold text-center text-slate-500">OTHER</th>
                    <th className="p-4 font-bold text-center text-emerald-600">COMPLETED</th>
                    <th className="p-4 font-bold text-center bg-slate-100/50">รวมแยกบทบาท</th>
                    <th className="p-4 font-bold text-center bg-indigo-50 text-indigo-800 border-l border-slate-200">รวมทั้งหมด</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {workerCombinedData.tableWorkers.length > 0 ? workerCombinedData.tableWorkers.map((worker, idx) => {
                    const isUnassigned = worker.name === "ยังไม่มอบหมาย (Unassigned)";
                    return (
                    <React.Fragment key={idx}>
                      {worker.totalMain > 0 && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-700 whitespace-nowrap border-b border-slate-100" rowSpan={worker.totalCo > 0 ? 2 : 1}>
                              {worker.name}
                          </td>
                          <td className="p-4 text-indigo-600 font-bold text-xs border-r border-slate-100">หลัก (Main)</td>
                          <td className="p-4 text-center font-semibold text-slate-600">{worker.main.NEW || '-'}</td>
                          <td className="p-4 text-center font-semibold text-slate-600">{worker.main['IN PROGRESS'] || '-'}</td>
                          <td className="p-4 text-center font-semibold text-slate-600">{worker.main.OTHER || '-'}</td>
                          <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/20">{worker.main.COMPLETED || '-'}</td>
                          <td className="p-4 text-center font-black text-slate-700 bg-slate-50/50">{worker.totalMain}</td>
                          <td className="p-4 text-center font-black text-indigo-700 bg-indigo-50/50 border-b border-slate-100 border-l border-slate-100 text-lg" rowSpan={worker.totalCo > 0 ? 2 : 1}>
                            {worker.grandTotal}
                          </td>
                        </tr>
                      )}
                      {worker.totalCo > 0 && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          {worker.totalMain === 0 && (
                            <td className="p-4 font-bold text-slate-700 whitespace-nowrap border-b border-slate-100">
                              {worker.name}
                            </td>
                          )}
                          <td className="p-4 text-sky-500 font-bold text-xs border-r border-slate-100">ผู้ช่วย (Co)</td>
                          <td className="p-4 text-center font-semibold text-slate-600">{worker.co.NEW || '-'}</td>
                          <td className="p-4 text-center font-semibold text-slate-600">{worker.co['IN PROGRESS'] || '-'}</td>
                          <td className="p-4 text-center font-semibold text-slate-600">{worker.co.OTHER || '-'}</td>
                          <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/20">{worker.co.COMPLETED || '-'}</td>
                          <td className="p-4 text-center font-black text-slate-700 bg-slate-50/50">{worker.totalCo}</td>
                          {worker.totalMain === 0 && (
                            <td className="p-4 text-center font-black text-indigo-700 bg-indigo-50/50 border-b border-slate-100 border-l border-slate-100 text-lg">
                              {worker.grandTotal}
                            </td>
                          )}
                        </tr>
                      )}
                    </React.Fragment>
                    )
                  }) : <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-medium">ไม่พบข้อมูล</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================= SECTION 5: JOB TRACKING BOARDS ================= */}
        <section>
          <div className="relative inline-flex items-center gap-3 mb-6 pl-4 mt-6">
             <div className="absolute left-0 top-[10%] h-[80%] w-1 rounded bg-gradient-to-b from-slate-500 to-slate-800"></div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
               กระดานติดตามงาน (Job Tracking Boards)
             </h2>
          </div>

          {/* Data Table: NEW Jobs */}
          <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">รายการงานซ่อมใหม่ที่ยังไม่ได้ดำเนินการ (Status: NEW)</h3>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">ทั้งหมด {newJobsList.length} รายการ</span>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider shadow-sm">
                    <th className="p-4 font-bold">เลขที่งาน</th>
                    <th className="p-4 font-bold">วันที่อนุมัติ</th>
                    <th className="p-4 font-bold">แผนก</th>
                    <th className="p-4 font-bold w-1/3">รายละเอียด</th>
                    <th className="p-4 font-bold text-center">ประเภท</th>
                    <th className="p-4 font-bold text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {newJobsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-indigo-900">{item['ชื่อเรื่อง'] || item.Job_ID || '-'}</td>
                      <td className="p-4 font-medium text-slate-500">{item.APPROVE_REQ_DATE || '-'}</td>
                      <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 shadow-sm">{item.REQUESTER_DEPT || '-'}</span></td>
                      <td className="p-4 text-slate-600 truncate max-w-xs font-medium" title={item.JOB_DESCRIPTION}>{item.JOB_DESCRIPTION || '-'}</td>
                      <td className="p-4 text-center"><span className="text-[11px] font-black text-slate-400 tracking-widest">{item.JOB_TYPE || '-'}</span></td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm uppercase tracking-wide">New</span>
                      </td>
                    </tr>
                  ))}
                  {newJobsList.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">เยี่ยมมาก! ไม่มีงานใหม่ค้างอยู่ในระบบ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Table: IN PROGRESS Jobs */}
          <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Activity size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">รายการงานที่ยังดำเนินการไม่เสร็จ (In Progress / Active)</h3>
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">ทั้งหมด {inProgressJobsList.length} รายการ</span>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider shadow-sm">
                    <th className="p-4 font-bold">เลขที่งาน</th>
                    <th className="p-4 font-bold">วันที่อนุมัติ</th>
                    <th className="p-4 font-bold">แผนก</th>
                    <th className="p-4 font-bold w-1/3">รายละเอียด</th>
                    <th className="p-4 font-bold text-center">ประเภท</th>
                    <th className="p-4 font-bold text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {inProgressJobsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-indigo-900">{item['ชื่อเรื่อง'] || item.Job_ID || '-'}</td>
                      <td className="p-4 font-medium text-slate-500">{item.APPROVE_REQ_DATE || '-'}</td>
                      <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 shadow-sm">{item.REQUESTER_DEPT || '-'}</span></td>
                      <td className="p-4 text-slate-600 truncate max-w-xs font-medium" title={item.JOB_DESCRIPTION}>{item.JOB_DESCRIPTION || '-'}</td>
                      <td className="p-4 text-center"><span className="text-[11px] font-black text-slate-400 tracking-widest">{item.JOB_TYPE || '-'}</span></td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm uppercase tracking-wide">
                          {item.JOB_STATUS || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {inProgressJobsList.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">ไม่มีงานที่กำลังดำเนินการอยู่</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Table Latest */}
          <div className="bg-white/85 backdrop-blur-md border border-white/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Calendar size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">ประวัติรายการงานล่าสุด (Latest Approved)</h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">แสดงผล {latestJobs.length} จาก {filteredData.length} รายการ</span>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">เลขที่งาน</th>
                    <th className="p-4 font-bold">วันที่อนุมัติ</th>
                    <th className="p-4 font-bold">แผนก</th>
                    <th className="p-4 font-bold w-1/3">รายละเอียด</th>
                    <th className="p-4 font-bold text-center">ประเภท</th>
                    <th className="p-4 font-bold text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {latestJobs.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-indigo-900">{item['ชื่อเรื่อง'] || item.Job_ID || '-'}</td>
                      <td className="p-4 font-medium text-slate-500">{item.APPROVE_REQ_DATE || '-'}</td>
                      <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 shadow-sm">{item.REQUESTER_DEPT || '-'}</span></td>
                      <td className="p-4 text-slate-600 truncate max-w-xs font-medium" title={item.JOB_DESCRIPTION}>{item.JOB_DESCRIPTION || '-'}</td>
                      <td className="p-4 text-center"><span className="text-[11px] font-black text-slate-400 tracking-widest">{item.JOB_TYPE || '-'}</span></td>
                      <td className="p-4 text-center">
                        {(() => {
                          const status = (item.JOB_STATUS || '').toUpperCase();
                          if (status.includes('COMPLETED')) return <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm uppercase tracking-wide">Completed</span>;
                          if (status.includes('NEW')) return <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm uppercase tracking-wide">New</span>;
                          return <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm uppercase tracking-wide">{status || 'Pending'}</span>;
                        })()}
                      </td>
                    </tr>
                  ))}
                  {latestJobs.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">ไม่พบข้อมูล</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
      )}
    </div>
  );
}
